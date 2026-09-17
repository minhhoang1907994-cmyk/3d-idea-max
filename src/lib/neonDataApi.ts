/**
 * Đọc/ghi dữ liệu ý tưởng trên Neon qua Data API.
 *
 * Data API là một cài đặt PostgREST chạy thẳng trong proxy của Neon, nói HTTPS
 * nên gọi được từ trình duyệt mà không cần driver Postgres hay backend riêng.
 * Nguồn: https://neon.com/docs/data-api/overview
 *
 * ⚠️ Request ở đây KHÔNG kèm header Authorization, nên Neon chạy chúng dưới role
 * `anonymous`. Quyền của role đó do db/migrations/001_idea_documents.sql quyết
 * định: đọc + ghi 7 document, không xoá. Nghĩa là bất kỳ ai mở được trang web
 * đều sửa được dữ liệu — đây là lựa chọn có chủ đích của chủ project, bù lại
 * bằng bảng lịch sử trong migration và bản JSON gốc còn trong repo.
 * Nguồn: https://neon.com/docs/data-api/manage
 *
 * URL endpoint KHÔNG phải secret theo nghĩa mật khẩu (nó nằm trong bundle),
 * nhưng vẫn nên giới hạn CORS về đúng domain thật trong Neon Console.
 */

/** Tên 7 document trên Neon — khớp khoá của DATA_FILES trong data/bundledData.ts */
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

export type StoredDocument = {
  name: DocumentName;
  content: unknown;
  /** Server tự tăng mỗi lần ghi — dùng để phát hiện ghi đè lẫn nhau */
  version: number;
};

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
 * Địa chỉ Data API, lấy từ biến môi trường lúc build (xem .env.example).
 * Trả về null khi chưa cấu hình — app vẫn chạy được bằng dữ liệu đóng gói sẵn.
 */
export function getDataApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_NEON_DATA_API_URL;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

type FetchLike = typeof fetch;

function endpoint(baseUrl: string, query: string): string {
  return `${baseUrl}/idea_documents${query}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  // PostgREST trả lỗi dạng { message, details, hint, code }
  try {
    const body = (await response.json()) as { message?: string; hint?: string };
    if (typeof body.message === 'string' && body.message.length > 0) {
      return body.hint ? `${body.message} (${body.hint})` : body.message;
    }
  } catch {
    // Body không phải JSON — rơi xuống thông báo mặc định bên dưới
  }
  return `Neon trả về lỗi ${response.status}.`;
}

/** Tải cả 7 document trong một request. */
export async function fetchDocuments(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<StoredDocument[]> {
  const response = await fetchImpl(endpoint(baseUrl, '?select=name,content,version'), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const rows = (await response.json()) as StoredDocument[];
  if (!Array.isArray(rows)) {
    throw new Error('Neon trả về dữ liệu không đúng định dạng — mong đợi một mảng document.');
  }
  return rows;
}

/**
 * Ghi đè một document, chỉ khi bản trên server vẫn đúng `expectedVersion`.
 * Trả về version mới. Không khớp version → NeonConflictError.
 */
export async function saveDocument(
  baseUrl: string,
  name: DocumentName,
  content: unknown,
  expectedVersion: number,
  fetchImpl: FetchLike = fetch,
): Promise<number> {
  const query =
    `?name=eq.${encodeURIComponent(name)}` + `&version=eq.${encodeURIComponent(expectedVersion)}`;

  const response = await fetchImpl(endpoint(baseUrl, query), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // Xin trả lại dòng vừa ghi để biết version mới và biết có ghi trúng không
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const rows = (await response.json()) as { version: number }[];
  // Mảng rỗng = không dòng nào khớp filter → version trên server đã khác
  const updated = rows[0];
  if (!updated) {
    throw new NeonConflictError(name);
  }
  return updated.version;
}
