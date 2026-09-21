import { useCallback, useEffect, useState } from 'react';
import {
  BUNDLED_COMPANY_DATA,
  COMPANY_DATA_FILES,
  cloneCompanyData,
  type CompanyData,
} from '../data/companyData';
import {
  mergeCompanyDocuments,
  splitCompanyDocuments,
  type CompanyDocumentVersions,
} from '../lib/companyDocuments';
import { downloadJsonFile } from '../lib/fileSystemStore';
import {
  COMPANY_DOCUMENT_NAMES,
  NeonConflictError,
  fetchDocuments,
  getDatabaseUrl,
  getQueryFunction,
  saveDocument,
  type CompanyDocumentName,
} from '../lib/neonStore';

/** Tên nhóm dữ liệu trong CompanyData — cũng là khoá dùng ở mọi thao tác thêm/sửa/xoá. */
export type CollectionKey = keyof CompanyData;

/** Nhóm nào nằm ở document nào trên Neon — dùng để chỉ ghi phần đã sửa. */
const DOCUMENT_BY_COLLECTION: Record<CollectionKey, CompanyDocumentName> = {
  expenses: 'companyExpenses',
  incomes: 'companyIncomes',
  notes: 'companyNotes',
  products: 'companyProducts',
  finishedGoods: 'companyFinishedGoods',
};

export type CompanyStatus = {
  source: 'bundle' | 'neon';
  loading: boolean;
  /** Bản build này có chuỗi kết nối Neon không */
  online: boolean;
  saving: boolean;
  dirty: boolean;
  /** Document chưa có trên Neon — phải chạy seed một lần trước khi lưu được */
  missing: CompanyDocumentName[];
  message: string | null;
  error: string | null;
};

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Quản lý Sổ công ty (thu, chi, note, sản phẩm, thành phẩm).
 *
 * Cùng mô hình với useIdeaData: nguồn chính là Neon, mất mạng thì rơi về bản đóng gói
 * sẵn trong bundle để không trắng màn hình. Tách hook riêng vì trang Sổ công ty không
 * cần tới dữ liệu ý tưởng, và ngược lại — gộp chung sẽ bắt mỗi trang tải phần của trang kia.
 *
 * Xoá dòng: role `app_editor` KHÔNG có quyền DELETE trên Neon (cố ý — xem
 * db/migrations/002_app_editor_role.sql). Ở đây "xoá" là bỏ phần tử khỏi mảng rồi ghi
 * đè cả document, nên vẫn nằm trong quyền UPDATE và trigger lịch sử vẫn giữ bản cũ.
 */
export function useCompanyLedger() {
  const [data, setData] = useState<CompanyData>(() => cloneCompanyData(BUNDLED_COMPANY_DATA));
  const [versions, setVersions] = useState<CompanyDocumentVersions>({});
  const [dirtyDocuments, setDirtyDocuments] = useState<CompanyDocumentName[]>([]);
  const [status, setStatus] = useState<CompanyStatus>(() => {
    const online = getDatabaseUrl() !== null;
    return {
      source: 'bundle',
      loading: online,
      online,
      saving: false,
      dirty: false,
      missing: [],
      message: null,
      error: null,
    };
  });

  const markDirty = useCallback((collection: CollectionKey) => {
    const name = DOCUMENT_BY_COLLECTION[collection];
    setDirtyDocuments((current) => (current.includes(name) ? current : [...current, name]));
    setStatus((current) => ({ ...current, dirty: true, message: null }));
  }, []);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const query = getQueryFunction();
    if (!query) return;

    setStatus((current) => ({ ...current, loading: true, error: null }));
    try {
      const documents = await fetchDocuments(query, COMPANY_DOCUMENT_NAMES);
      const merged = mergeCompanyDocuments(documents, BUNDLED_COMPANY_DATA);

      setData(merged.data);
      setVersions(merged.versions);
      setDirtyDocuments([]);
      setStatus((current) => ({
        ...current,
        source: 'neon',
        loading: false,
        dirty: false,
        missing: merged.missing,
        error: null,
        message: options?.silent ? current.message : 'Đã tải sổ mới nhất từ Neon.',
      }));
    } catch (error) {
      // Giữ nguyên dữ liệu đang hiển thị (bundle hoặc bản tải trước đó)
      setStatus((current) => ({
        ...current,
        loading: false,
        error: `Không tải được sổ từ Neon nên đang dùng bản đóng gói sẵn trong app. ${describeError(error, 'Lỗi không rõ.')}`,
      }));
    }
  }, []);

  useEffect(() => {
    void load({ silent: true });
  }, [load]);

  const save = useCallback(async () => {
    const query = getQueryFunction();
    if (!query) {
      setStatus((current) => ({
        ...current,
        error:
          'Bản build này chưa có chuỗi kết nối Neon (VITE_NEON_DATABASE_URL) — xem docs/neon-setup.md.',
      }));
      return;
    }
    if (dirtyDocuments.length === 0) return;

    setStatus((current) => ({ ...current, saving: true, error: null, message: null }));

    const contents = splitCompanyDocuments(data);
    const savedNames: CompanyDocumentName[] = [];

    try {
      // Ghi tuần tự: hỏng giữa chừng thì biết chính xác phần nào đã lên
      for (const name of dirtyDocuments) {
        const expectedVersion = versions[name];
        if (expectedVersion === undefined) {
          throw new Error(
            `Phần "${name}" chưa có trên Neon. Chạy "npm run neon:seed:company" một lần để đẩy dữ liệu gốc lên (và chạy db/migrations/003_company_documents.sql nếu chưa chạy).`,
          );
        }
        const nextVersion = await saveDocument(query, name, contents[name], expectedVersion);
        setVersions((current) => ({ ...current, [name]: nextVersion }));
        savedNames.push(name);
      }

      setDirtyDocuments([]);
      setStatus((current) => ({
        ...current,
        saving: false,
        dirty: false,
        source: 'neon',
        message: 'Đã lưu lên Neon. Mọi người mở web sẽ thấy bản này.',
      }));
    } catch (error) {
      setDirtyDocuments((current) => current.filter((name) => !savedNames.includes(name)));
      setStatus((current) => ({
        ...current,
        saving: false,
        dirty: true,
        error:
          error instanceof NeonConflictError
            ? `${error.message} (Bấm "Tải lại từ Neon" để lấy bản mới.)`
            : describeError(error, 'Lưu lên Neon thất bại.'),
      }));
    }
  }, [data, dirtyDocuments, versions]);

  const downloadAll = useCallback(() => {
    const contents = splitCompanyDocuments(data);
    for (const name of COMPANY_DOCUMENT_NAMES) {
      downloadJsonFile(COMPANY_DATA_FILES[name], contents[name]);
    }
    setStatus((current) => ({
      ...current,
      message: `Đã tải ${COMPANY_DOCUMENT_NAMES.length} file JSON về máy — chép đè vào src/data/json/ để đưa vào repo.`,
    }));
  }, [data]);

  // ----- Thêm / sửa / xoá dòng -----

  const addRow = useCallback(
    <K extends CollectionKey>(collection: K, row: CompanyData[K][number]) => {
      setData((current) => ({
        ...current,
        [collection]: [...current[collection], row],
      }));
      markDirty(collection);
    },
    [markDirty],
  );

  const updateRow = useCallback(
    <K extends CollectionKey>(
      collection: K,
      id: string,
      patch: Partial<CompanyData[K][number]>,
    ) => {
      setData((current) => ({
        ...current,
        [collection]: current[collection].map((row) => (row.id === id ? { ...row, ...patch } : row)),
      }));
      markDirty(collection);
    },
    [markDirty],
  );

  const deleteRow = useCallback(
    (collection: CollectionKey, id: string) => {
      setData((current) => ({
        ...current,
        [collection]: current[collection].filter((row) => row.id !== id),
      }));
      markDirty(collection);
    },
    [markDirty],
  );

  return { data, status, reload: load, save, downloadAll, addRow, updateRow, deleteRow };
}
