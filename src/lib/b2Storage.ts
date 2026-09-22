/**
 * Tải ảnh lên Backblaze B2 thẳng từ trình duyệt, không qua backend.
 *
 * Vì sao phải tự ký thay vì dùng SDK: project không có server (xem CLAUDE.md), mà
 * `aws-sdk` là dependency mới — quy tắc project cấm tự thêm. SigV4 ký được bằng
 * `crypto.subtle` có sẵn trong trình duyệt nên không cần thêm gì.
 *
 * Vì sao đi đường S3-compatible chứ không phải B2 native API: Backblaze ghi rõ CORS
 * không áp dụng cho phần lớn native API, trong đó có `b2_authorize_account`, và B2 từ
 * chối luôn preflight dùng token của hàm đó.
 * https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules
 *
 * Vì sao bucket để Private mà vẫn xem được ảnh: cột "Hình ảnh" lưu **object key**, còn
 * URL đọc được ký lại ngay lúc render. Thẻ `<img>` tải ảnh khác origin không bị CORS
 * chặn (chỉ đọc pixel qua canvas mới cần), nên presigned GET dán vào `src` là đủ.
 *
 * ⚠️ Key nằm trong bundle — ai xem source trang web cũng lấy được. Bắt buộc dùng
 * application key giới hạn đúng một bucket và KHÔNG cấp `deleteFiles`, cùng tinh thần
 * với role `app_editor` của Neon. Xem docs/backblaze-setup.md.
 */

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
const REQUEST_TYPE = 'aws4_request';
/** Chuỗi B2/S3 quy ước cho "không ký nội dung body" — bắt buộc với presigned URL. */
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

/** Endpoint B2 luôn dạng s3.<region>.backblazeb2.com — region nằm ở khúc giữa. */
const ENDPOINT_PATTERN = /^s3\.([a-z0-9-]+)\.backblazeb2\.com$/i;

/** Ảnh lớn hơn mức này thì chặn ngay ở client: sổ chi tiêu không cần ảnh nặng hơn thế. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Hạn của URL đọc. Ngắn hơn nhiều so với mức B2 cho phép vì ký lại mỗi lần render. */
const READ_URL_TTL_SECONDS = 60 * 60;

/** Hạn của URL ghi — chỉ cần đủ cho một lần tải file lên. */
const WRITE_URL_TTL_SECONDS = 10 * 60;

export type B2Config = {
  /** keyID của application key */
  keyId: string;
  applicationKey: string;
  bucket: string;
  /** Host, ví dụ 's3.us-east-005.backblazeb2.com' */
  endpoint: string;
  /** Suy ra từ endpoint, ví dụ 'us-east-005' */
  region: string;
};

/**
 * Cấu hình lấy từ biến môi trường lúc build (xem .env.example).
 * Thiếu bất kỳ giá trị nào → trả `null`, UI rơi về ô dán link như trước.
 */
export function getB2Config(): B2Config | null {
  const keyId = readEnv('VITE_B2_KEY_ID');
  const applicationKey = readEnv('VITE_B2_APPLICATION_KEY');
  const bucket = readEnv('VITE_B2_BUCKET');
  const endpoint = readEnv('VITE_B2_ENDPOINT');
  if (!keyId || !applicationKey || !bucket || !endpoint) return null;

  const region = regionFromEndpoint(endpoint);
  if (!region) return null;

  return { keyId, applicationKey, bucket, endpoint, region };
}

function readEnv(name: string): string | null {
  const raw = (import.meta.env as Record<string, unknown>)[name];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** 's3.us-east-005.backblazeb2.com' → 'us-east-005'. Không khớp dạng → null. */
export function regionFromEndpoint(endpoint: string): string | null {
  const region = ENDPOINT_PATTERN.exec(endpoint.trim())?.[1];
  return region ? region.toLowerCase() : null;
}

// ----- Ký SigV4 -----

/**
 * Mã hoá theo đúng luật UriEncode của AWS, KHÔNG dùng `encodeURIComponent`:
 * hàm sẵn có bỏ sót `!`, `'`, `(`, `)`, `*` nên chữ ký sẽ lệch.
 *
 * `encodeSlash = false` dùng cho đường dẫn object — dấu `/` ngăn cách thư mục
 * phải giữ nguyên.
 */
export function uriEncode(value: string, encodeSlash = true): string {
  let out = '';
  for (const byte of new TextEncoder().encode(value)) {
    const char = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-._~]/.test(char)) {
      out += char;
    } else if (char === '/' && !encodeSlash) {
      out += char;
    } else {
      out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    }
  }
  return out;
}

/** '2026-09-17T06:39:04Z' → { date: '20260917', dateTime: '20260917T063904Z' } */
export function formatAmzDate(now: Date): { date: string; dateTime: string } {
  const dateTime = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  return { date: dateTime.slice(0, 8), dateTime };
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

function toBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** kDate → kRegion → kService → kSigning, đúng thứ tự AWS quy định. */
async function deriveSigningKey(
  applicationKey: string,
  date: string,
  region: string,
): Promise<ArrayBuffer> {
  const kDate = await hmac(toBuffer(`AWS4${applicationKey}`), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, REQUEST_TYPE);
}

export type PresignOptions = {
  config: B2Config;
  method: 'GET' | 'PUT';
  objectKey: string;
  expiresInSeconds: number;
  /** Header sẽ được ký — `host` tự thêm, phần còn lại phải gửi y hệt lúc request */
  extraHeaders?: Record<string, string>;
  now?: Date;
};

/**
 * Sinh presigned URL (SigV4 qua query string) cho một object.
 *
 * Nhận `now` làm tham số thay vì gọi `new Date()` bên trong để test được — cùng quy
 * ước với `random` ở các lib khác của project.
 *
 * Dùng path-style (`https://<endpoint>/<bucket>/<key>`); B2 hỗ trợ cả path-style lẫn
 * virtual-hosted-style, path-style đỡ phải lo tên bucket có hợp lệ làm hostname không.
 */
export async function presignObjectUrl(options: PresignOptions): Promise<string> {
  const { config, method, objectKey, expiresInSeconds, extraHeaders, now = new Date() } = options;
  if (objectKey.length === 0) throw new Error('Thiếu object key khi ký URL Backblaze.');

  const { date, dateTime } = formatAmzDate(now);
  const scope = `${date}/${config.region}/${SERVICE}/${REQUEST_TYPE}`;

  const headers: Record<string, string> = { host: config.endpoint, ...lowercaseKeys(extraHeaders) };
  const headerNames = Object.keys(headers).sort();
  const canonicalHeaders = headerNames
    .map((name) => `${name}:${(headers[name] ?? '').trim()}\n`)
    .join('');
  const signedHeaders = headerNames.join(';');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': ALGORITHM,
    'X-Amz-Credential': `${config.keyId}/${scope}`,
    'X-Amz-Date': dateTime,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  // Sắp xếp sau khi mã hoá, đúng thứ tự AWS yêu cầu cho canonical query string
  const canonicalQuery = Object.keys(query)
    .map((name) => [uriEncode(name), uriEncode(query[name] ?? '')] as const)
    .sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');

  const canonicalUri = `/${uriEncode(config.bucket)}/${uriEncode(objectKey, false)}`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    UNSIGNED_PAYLOAD,
  ].join('\n');

  const stringToSign = [ALGORITHM, dateTime, scope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await deriveSigningKey(config.applicationKey, date, config.region);
  const signature = toHex(await hmac(signingKey, stringToSign));

  return `https://${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function lowercaseKeys(headers?: Record<string, string>): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  );
}

// ----- Object key -----

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Thư mục gốc mặc định — cột Hình ảnh của tab Tổng chi có trước nên giữ tên cũ. */
export const DEFAULT_IMAGE_PREFIX = 'expenses';

/**
 * Sinh đường dẫn lưu ảnh: `expenses/2026-09/<ngẫu nhiên>.jpg`.
 *
 * `prefix` tách ảnh theo tab đang nhập (chi, sản phẩm...) để về sau nhìn bucket còn
 * biết ảnh thuộc đâu. Không giữ tên file gốc: tên tiếng Việt có dấu và khoảng trắng
 * làm URL khó đọc, mà tên do người dùng đặt cũng dễ trùng nhau giữa hai máy cùng
 * thêm dòng một lúc.
 */
export function buildObjectKey(
  contentType: string,
  month: string,
  random: () => number = Math.random,
  now: () => number = Date.now,
  prefix: string = DEFAULT_IMAGE_PREFIX,
): string {
  const extension = EXTENSION_BY_TYPE[contentType.toLowerCase()] ?? 'bin';
  const folder = /^\d{4}-\d{2}$/.test(month) ? month : 'unsorted';
  const stamp = now().toString(36);
  const noise = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
  return `${prefix}/${folder}/${stamp}${noise}.${extension}`;
}

// ----- Tải lên / đọc về -----

export class B2UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'B2UploadError';
  }
}

/**
 * Tải một ảnh lên B2, trả về object key để ghi vào sổ.
 *
 * Content-Type được ký cùng chữ ký và gửi lại y hệt — ký rồi mà gửi khác là lỗi
 * SignatureDoesNotMatch, nên hai chỗ phải dùng chung một biến.
 */
export async function uploadImage(
  file: File,
  config: B2Config,
  options?: { month?: string; prefix?: string; now?: Date },
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new B2UploadError(`"${file.name}" không phải file ảnh.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const limitMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    throw new B2UploadError(`Ảnh nặng hơn ${limitMb} MB — hãy giảm kích thước rồi tải lại.`);
  }

  const contentType = file.type;
  const objectKey = buildObjectKey(
    contentType,
    options?.month ?? '',
    Math.random,
    Date.now,
    options?.prefix ?? DEFAULT_IMAGE_PREFIX,
  );
  const url = await presignObjectUrl({
    config,
    method: 'PUT',
    objectKey,
    expiresInSeconds: WRITE_URL_TTL_SECONDS,
    extraHeaders: { 'content-type': contentType },
    now: options?.now,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
  } catch (error) {
    // fetch chỉ ném khi chưa nhận được HTTP response: mất mạng hoặc CORS chặn
    throw new B2UploadError(
      'Không gọi được Backblaze. Kiểm tra mạng, và kiểm tra bucket đã có CORS rule cho ' +
        `origin ${location.origin} với thao tác "S3 Put Object" chưa (xem docs/backblaze-setup.md). ` +
        `Chi tiết: ${error instanceof Error ? error.message : 'lỗi không rõ'}`,
    );
  }

  if (!response.ok) {
    throw new B2UploadError(
      `Backblaze từ chối lưu ảnh (HTTP ${response.status}). ${await describeS3Error(response)}`,
    );
  }
  return objectKey;
}

/** B2 trả lỗi dạng XML — lấy phần <Message> cho dễ đọc, hỏng thì trả nguyên văn. */
async function describeS3Error(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return /<Message>([^<]+)<\/Message>/.exec(body)?.[1] ?? body.slice(0, 200);
  } catch {
    return 'Không đọc được nội dung lỗi.';
  }
}

/**
 * URL đọc ảnh, ký lại khi cần. Cache theo object key để cuộn bảng không ký lại liên tục
 * và để `<img src>` không đổi mỗi lần render (đổi src là trình duyệt tải lại ảnh).
 */
const readUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getImageUrl(objectKey: string, config: B2Config): Promise<string> {
  const cached = readUrlCache.get(objectKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.url;

  const url = await presignObjectUrl({
    config,
    method: 'GET',
    objectKey,
    expiresInSeconds: READ_URL_TTL_SECONDS,
  });
  // Hết hạn sớm hơn chữ ký một phút để không đưa ra URL vừa kịp chết
  readUrlCache.set(objectKey, { url, expiresAt: now + (READ_URL_TTL_SECONDS - 60) * 1000 });
  return url;
}
