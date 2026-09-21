/**
 * Đọc/ghi dữ liệu ý tưởng trên Neon Postgres bằng SQL qua HTTP.
 *
 * Dùng `@neondatabase/serverless`: driver chính thức của Neon, gửi câu lệnh SQL qua
 * HTTP thay vì mở kết nối TCP, nên chạy được trong trình duyệt mà không cần backend.
 *
 * ⚠️ Vì sao KHÔNG dùng Neon Data API (REST) như dự định ban đầu: Data API trên project
 * này từ chối mọi request không kèm JWT với lỗi "missing authentication credentials",
 * kể cả sau khi đặt `db_anon_role = anonymous`, refresh schema cache và bật/tắt lại
 * Data API. Chi tiết quá trình kiểm chứng: docs/neon-setup.md.
 *
 * ⚠️ CONNECTION STRING NẰM TRONG BUNDLE — ai xem source trang web cũng lấy được.
 * Nó PHẢI là chuỗi của role `app_editor` (chỉ select/insert/update trên idea_documents),
 * TUYỆT ĐỐI KHÔNG dùng chuỗi của `neondb_owner` vì role đó xoá được cả database.
 * Quyền của app_editor xem db/migrations/002_app_editor_role.sql.
 */

import { neon } from '@neondatabase/serverless';

/** Tên 7 document ý tưởng trên Neon — khớp khoá của DATA_FILES trong data/bundledData.ts */
export const DOCUMENT_NAMES = [
  'categories',
  'attributes',
  'technicalAxes',
  'mechanisms',
  'characters',
  'personalizations',
  'fusionFormulas',
] as const;

export type DocumentName = (typeof DOCUMENT_NAMES)[number];

/**
 * Tên 5 document của Sổ công ty — khớp khoá của COMPANY_DATA_FILES trong
 * data/companyData.ts. Nằm chung bảng `idea_documents` vì cùng một mô hình lưu trữ
 * (mỗi document là một file JSON) và cùng một cơ chế khoá lạc quan; tách bảng riêng
 * sẽ phải nhân đôi trigger lịch sử và policy RLS mà không đổi được gì.
 *
 * ⚠️ Thêm tên mới ở đây PHẢI kèm migration nới danh sách `name` trong policy RLS,
 * nếu không Neon từ chối ghi — xem db/migrations/003_company_documents.sql và
 * db/migrations/004_finished_goods_document.sql.
 */
export const COMPANY_DOCUMENT_NAMES = [
  'companyExpenses',
  'companyIncomes',
  'companyNotes',
  'companyProducts',
  'companyFinishedGoods',
] as const;

export type CompanyDocumentName = (typeof COMPANY_DOCUMENT_NAMES)[number];

/** Mọi tên document app đọc/ghi được. */
export type AnyDocumentName = DocumentName | CompanyDocumentName;

export type StoredDocument = {
  name: AnyDocumentName;
  content: unknown;
  /** Trigger phía server tăng mỗi lần ghi — dùng để phát hiện ghi đè lẫn nhau */
  version: number;
};

/**
 * Hàm chạy SQL. Tách ra thành tham số để test inject được bản giả, khỏi phải
 * mock module driver hay gọi database thật.
 */
export type QueryFunction = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

/** Ném ra khi có người khác đã ghi đè trong lúc mình đang sửa. */
export class NeonConflictError extends Error {
  constructor(public readonly documentName: string) {
    super(
      `Dữ liệu "${documentName}" đã bị người khác sửa sau lúc bạn tải trang. ` +
        'Tải lại trang để lấy bản mới nhất rồi sửa lại — nếu ghi đè bây giờ sẽ mất thay đổi của họ.',
    );
    this.name = 'NeonConflictError';
  }
}

/**
 * Connection string lấy từ biến môi trường lúc build (xem .env.example).
 * Trả về null khi chưa cấu hình — app vẫn chạy được bằng dữ liệu đóng gói sẵn.
 */
export function getDatabaseUrl(): string | null {
  const raw = import.meta.env.VITE_NEON_DATABASE_URL;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

let cachedQuery: QueryFunction | null = null;

/**
 * Hàm chạy SQL dùng chung cho cả phiên. Trả về null khi chưa cấu hình database.
 *
 * `disableWarningInBrowsers`: driver mặc định cảnh báo khi chạy trong trình duyệt vì
 * connection string bị lộ. Ở đây đó là lựa chọn có chủ đích với một role hạn chế quyền
 * (xem đầu file), nên tắt cảnh báo để console không bị nhiễu.
 */
export function getQueryFunction(): QueryFunction | null {
  if (cachedQuery) return cachedQuery;

  const url = getDatabaseUrl();
  if (!url) return null;

  const sql = neon(url, { disableWarningInBrowsers: true });
  cachedQuery = (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>;
  return cachedQuery;
}

function toStoredDocument(row: Record<string, unknown>): StoredDocument {
  return {
    name: row.name as AnyDocumentName,
    content: row.content,
    version: Number(row.version),
  };
}

/**
 * Tải document trong một câu lệnh. Không truyền `names` thì lấy hết;
 * truyền vào thì chỉ lấy đúng những document đó (trang nào tải phần của trang đó).
 */
export async function fetchDocuments(
  query: QueryFunction,
  names?: readonly AnyDocumentName[],
): Promise<StoredDocument[]> {
  const rows = names
    ? await query('select name, content, version from idea_documents where name = any($1)', [
        [...names],
      ])
    : await query('select name, content, version from idea_documents', []);
  if (!Array.isArray(rows)) {
    throw new Error('Neon trả về dữ liệu không đúng định dạng — mong đợi một mảng document.');
  }
  return rows.map(toStoredDocument);
}

/**
 * Ghi đè một document, chỉ khi bản trên server vẫn đúng `expectedVersion`.
 * Trả về version mới. Không khớp version → NeonConflictError.
 *
 * `content` phải stringify trước: driver gửi tham số dưới dạng text, còn cột là jsonb
 * nên cần ép kiểu tường minh bằng `$1::jsonb`.
 */
export async function saveDocument(
  query: QueryFunction,
  name: AnyDocumentName,
  content: unknown,
  expectedVersion: number,
): Promise<number> {
  const rows = await query(
    'update idea_documents set content = $1::jsonb where name = $2 and version = $3 returning version',
    [JSON.stringify(content), name, expectedVersion],
  );

  // Mảng rỗng = không dòng nào khớp điều kiện → version trên server đã khác
  const updated = rows[0];
  if (!updated) {
    throw new NeonConflictError(name);
  }
  return Number(updated.version);
}
