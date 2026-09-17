import { useCallback, useEffect, useState } from 'react';
import { BUNDLED_DATA, DATA_FILES, cloneData, type IdeaData } from '../data/bundledData';
import {
  connectDirectory,
  downloadJsonFile,
  isConnected,
  isFileSystemAccessSupported,
  readJsonFile,
  writeJsonFile,
} from '../lib/fileSystemStore';
import { mergeDocuments, splitDocuments, type DocumentVersions } from '../lib/ideaDocuments';
import {
  DOCUMENT_NAMES,
  NeonConflictError,
  fetchDocuments,
  getDataApiBaseUrl,
  saveDocument,
  type DocumentName,
} from '../lib/neonDataApi';
import type { AttributeAxis, ProductCategory } from '../types';

/** Dữ liệu đang hiển thị lấy từ đâu. */
export type DataSource = 'bundle' | 'neon' | 'disk';

export type DataStatus = {
  source: DataSource;
  /** Đang tải từ Neon */
  loading: boolean;
  /** Bản build này có địa chỉ Neon Data API không */
  online: boolean;
  saving: boolean;
  /** Đã kết nối thư mục data trên đĩa (đường ghi file phụ) */
  connected: boolean;
  directoryName: string | null;
  /** Có thay đổi chưa lưu */
  dirty: boolean;
  message: string | null;
  error: string | null;
};

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Quản lý dữ liệu ý tưởng.
 *
 * Nguồn chính là Neon (xem lib/neonDataApi.ts): mở app thì tải về, bấm Lưu thì ghi lên.
 * Neon chưa cấu hình, đang ngủ hay mất mạng thì rơi về bộ dữ liệu đóng gói sẵn trong
 * bundle — chỉ mất phần sửa mới nhất, không trắng màn hình.
 *
 * Đường ghi file JSON qua File System Access API vẫn giữ: đó là cách đưa dữ liệu trên
 * Neon về lại repo để commit, và là bản sao lưu khi có người ghi đè bừa.
 */
export function useIdeaData() {
  const [data, setData] = useState<IdeaData>(() => cloneData(BUNDLED_DATA));
  const [versions, setVersions] = useState<DocumentVersions>({});
  const [dirtyDocuments, setDirtyDocuments] = useState<DocumentName[]>([]);
  const [status, setStatus] = useState<DataStatus>(() => {
    const online = getDataApiBaseUrl() !== null;
    return {
      source: 'bundle',
      loading: online,
      online,
      saving: false,
      connected: false,
      directoryName: null,
      dirty: false,
      message: null,
      error: null,
    };
  });

  const markDirty = useCallback((name: DocumentName) => {
    setDirtyDocuments((current) => (current.includes(name) ? current : [...current, name]));
    setStatus((current) => ({ ...current, dirty: true, message: null }));
  }, []);

  const loadFromNeon = useCallback(async (options?: { silent?: boolean }) => {
    const baseUrl = getDataApiBaseUrl();
    if (!baseUrl) return;

    setStatus((current) => ({ ...current, loading: true, error: null }));
    try {
      const documents = await fetchDocuments(baseUrl);
      const merged = mergeDocuments(documents, BUNDLED_DATA);

      setData(merged.data);
      setVersions(merged.versions);
      setDirtyDocuments([]);
      setStatus((current) => ({
        ...current,
        source: 'neon',
        loading: false,
        dirty: false,
        error: null,
        message:
          merged.missing.length > 0
            ? `Đã tải dữ liệu từ Neon. ${merged.missing.length} phần chưa có trên Neon nên đang dùng bản đóng gói sẵn — chạy "npm run neon:seed" để đẩy lên.`
            : options?.silent
              ? current.message
              : 'Đã tải dữ liệu mới nhất từ Neon.',
      }));
    } catch (error) {
      // Giữ nguyên dữ liệu đang hiển thị (bundle hoặc bản tải trước đó)
      setStatus((current) => ({
        ...current,
        loading: false,
        error: `Không tải được dữ liệu từ Neon nên đang dùng bản đóng gói sẵn trong app. ${describeError(error, 'Lỗi không rõ.')}`,
      }));
    }
  }, []);

  // Tải lần đầu khi mở app
  useEffect(() => {
    void loadFromNeon({ silent: true });
  }, [loadFromNeon]);

  /** Ghi các phần đã sửa lên Neon. */
  const saveToNeon = useCallback(async () => {
    const baseUrl = getDataApiBaseUrl();
    if (!baseUrl) {
      setStatus((current) => ({
        ...current,
        error:
          'Bản build này chưa có địa chỉ Neon Data API (VITE_NEON_DATA_API_URL) — xem docs/neon-setup.md.',
      }));
      return;
    }
    if (dirtyDocuments.length === 0) return;

    setStatus((current) => ({ ...current, saving: true, error: null, message: null }));

    const contents = splitDocuments(data);
    const savedNames: DocumentName[] = [];

    try {
      // Ghi tuần tự: hỏng giữa chừng thì biết chính xác phần nào đã lên
      for (const name of dirtyDocuments) {
        const expectedVersion = versions[name];
        if (expectedVersion === undefined) {
          throw new Error(
            `Phần "${name}" chưa có trên Neon. Chạy "npm run neon:seed" một lần để đẩy dữ liệu gốc lên trước.`,
          );
        }
        const nextVersion = await saveDocument(baseUrl, name, contents[name], expectedVersion);
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

  // ----- Đường ghi file JSON trên đĩa (sao lưu / đưa dữ liệu về repo) -----

  const connect = useCallback(async () => {
    try {
      const name = await connectDirectory();
      if (name === null) return; // user bấm hủy

      const [
        categories,
        attributeAxes,
        technicalAxes,
        mechanisms,
        characters,
        personalizations,
        fusionFormulas,
      ] = await Promise.all([
        readJsonFile<ProductCategory[]>(DATA_FILES.categories),
        readJsonFile<AttributeAxis[]>(DATA_FILES.attributes),
        readJsonFile<IdeaData['technicalAxes']>(DATA_FILES.technicalAxes),
        readJsonFile<IdeaData['mechanisms']>(DATA_FILES.mechanisms),
        readJsonFile<IdeaData['characters']>(DATA_FILES.characters),
        readJsonFile<IdeaData['personalizations']>(DATA_FILES.personalizations),
        readJsonFile<IdeaData['fusionFormulas']>(DATA_FILES.fusionFormulas),
      ]);

      setData({
        categories,
        attributeAxes,
        technicalAxes,
        mechanisms,
        characters,
        personalizations,
        fusionFormulas,
      });
      // Dữ liệu trên đĩa không còn khớp version đã tải từ Neon — xoá version để
      // không ghi đè mất bản mới hơn của người khác; muốn ghi lên thì tải lại trước
      setVersions({});
      setDirtyDocuments([]);
      setStatus((current) => ({
        ...current,
        source: 'disk',
        connected: true,
        directoryName: name,
        dirty: false,
        message: `Đã đọc dữ liệu từ thư mục "${name}" trên máy. Muốn đẩy bản này lên Neon thì chạy "npm run neon:seed".`,
        error: null,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: describeError(error, 'Không kết nối được thư mục.'),
      }));
    }
  }, []);

  const saveToDisk = useCallback(async () => {
    try {
      if (!isConnected()) {
        throw new Error('Chưa kết nối thư mục dữ liệu — chưa ghi được xuống đĩa.');
      }
      const contents = splitDocuments(data);
      await Promise.all(
        DOCUMENT_NAMES.map((name) => writeJsonFile(DATA_FILES[name], contents[name])),
      );
      setStatus((current) => ({
        ...current,
        message: 'Đã ghi 7 file JSON xuống thư mục đã kết nối.',
        error: null,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: describeError(error, 'Ghi file thất bại.'),
      }));
    }
  }, [data]);

  const downloadAll = useCallback(() => {
    const contents = splitDocuments(data);
    for (const name of DOCUMENT_NAMES) {
      downloadJsonFile(DATA_FILES[name], contents[name]);
    }
    setStatus((current) => ({
      ...current,
      message: 'Đã tải 7 file JSON về máy — chép đè vào src/data/json/ để đưa vào repo.',
    }));
  }, [data]);

  // ----- Thao tác trên sản phẩm của một danh mục -----

  const addProduct = useCallback(
    (categoryId: string, product: { id: string; label: string; promptText: string }) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? { ...category, products: [...category.products, product] }
            : category,
        ),
      }));
      markDirty('categories');
    },
    [markDirty],
  );

  const updateProduct = useCallback(
    (
      categoryId: string,
      productId: string,
      patch: Partial<{ label: string; promptText: string }>,
    ) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                products: category.products.map((product) =>
                  product.id === productId ? { ...product, ...patch } : product,
                ),
              }
            : category,
        ),
      }));
      markDirty('categories');
    },
    [markDirty],
  );

  const deleteProduct = useCallback(
    (categoryId: string, productId: string) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                products: category.products.filter((product) => product.id !== productId),
              }
            : category,
        ),
      }));
      markDirty('categories');
    },
    [markDirty],
  );

  // ----- Thao tác trên option của một axis thẩm mỹ -----

  const addAxisOption = useCallback(
    (axisId: string, option: { id: string; label: string; promptText: string }) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId ? { ...axis, options: [...axis.options, option] } : axis,
        ),
      }));
      markDirty('attributes');
    },
    [markDirty],
  );

  const updateAxisOption = useCallback(
    (axisId: string, optionId: string, patch: Partial<{ label: string; promptText: string }>) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId
            ? {
                ...axis,
                options: axis.options.map((option) =>
                  option.id === optionId ? { ...option, ...patch } : option,
                ),
              }
            : axis,
        ),
      }));
      markDirty('attributes');
    },
    [markDirty],
  );

  const deleteAxisOption = useCallback(
    (axisId: string, optionId: string) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId
            ? { ...axis, options: axis.options.filter((option) => option.id !== optionId) }
            : axis,
        ),
      }));
      markDirty('attributes');
    },
    [markDirty],
  );

  return {
    data,
    status,
    supportsFileSystem: isFileSystemAccessSupported(),
    reload: loadFromNeon,
    saveToNeon,
    connect,
    saveToDisk,
    downloadAll,
    addProduct,
    updateProduct,
    deleteProduct,
    addAxisOption,
    updateAxisOption,
    deleteAxisOption,
  };
}
