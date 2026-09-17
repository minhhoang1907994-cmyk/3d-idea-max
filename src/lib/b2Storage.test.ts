import { describe, expect, it } from 'vitest';
import {
  buildObjectKey,
  formatAmzDate,
  presignObjectUrl,
  regionFromEndpoint,
  uriEncode,
  type B2Config,
} from './b2Storage';

const CONFIG: B2Config = {
  keyId: '005TESTKEYID0000000000',
  applicationKey: 'K005TESTAPPLICATIONKEY0000000000000',
  bucket: 'h2t-cobra',
  endpoint: 's3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
};

const FIXED_NOW = new Date('2026-09-17T06:39:04.000Z');

describe('regionFromEndpoint', () => {
  it('lấy region ở khúc giữa endpoint', () => {
    expect(regionFromEndpoint('s3.us-east-005.backblazeb2.com')).toBe('us-east-005');
    expect(regionFromEndpoint('s3.eu-central-003.backblazeb2.com')).toBe('eu-central-003');
  });

  it('trả null cho endpoint không phải Backblaze', () => {
    expect(regionFromEndpoint('s3.us-east-1.amazonaws.com')).toBeNull();
    expect(regionFromEndpoint('backblazeb2.com')).toBeNull();
  });
});

describe('uriEncode', () => {
  it('mã hoá cả những ký tự encodeURIComponent bỏ sót', () => {
    // encodeURIComponent giữ nguyên 5 ký tự này — giữ nguyên là chữ ký lệch
    expect(uriEncode("!'()*")).toBe('%21%27%28%29%2A');
  });

  it('giữ nguyên ký tự unreserved', () => {
    expect(uriEncode('aZ0-._~')).toBe('aZ0-._~');
  });

  it('mã hoá khoảng trắng thành %20 chứ không phải dấu cộng', () => {
    expect(uriEncode('a b')).toBe('a%20b');
  });

  it('giữ dấu / trong đường dẫn object khi được yêu cầu', () => {
    expect(uriEncode('expenses/2026-09/a.jpg', false)).toBe('expenses/2026-09/a.jpg');
    expect(uriEncode('expenses/2026-09/a.jpg')).toBe('expenses%2F2026-09%2Fa.jpg');
  });

  it('mã hoá tiếng Việt theo từng byte UTF-8', () => {
    expect(uriEncode('đ')).toBe('%C4%91');
  });
});

describe('formatAmzDate', () => {
  it('cho ra hai dạng ngày mà SigV4 cần', () => {
    expect(formatAmzDate(FIXED_NOW)).toEqual({ date: '20260917', dateTime: '20260917T063904Z' });
  });
});

describe('buildObjectKey', () => {
  const random = () => 0.5;
  const now = () => 1_758_090_000_000;

  it('xếp ảnh vào thư mục theo tháng và lấy đuôi file từ content type', () => {
    expect(buildObjectKey('image/jpeg', '2026-09', random, now)).toMatch(
      /^expenses\/2026-09\/[a-z0-9]+\.jpg$/,
    );
    expect(buildObjectKey('image/png', '2026-09', random, now)).toMatch(/\.png$/);
  });

  it('dồn vào thư mục unsorted khi chưa biết tháng', () => {
    expect(buildObjectKey('image/webp', '', random, now)).toMatch(/^expenses\/unsorted\//);
    expect(buildObjectKey('image/webp', 'linh tinh', random, now)).toMatch(/^expenses\/unsorted\//);
  });

  it('dùng đuôi bin cho kiểu ảnh lạ thay vì đoán bừa', () => {
    expect(buildObjectKey('image/heic', '2026-09', random, now)).toMatch(/\.bin$/);
  });

  it('hai lần gọi với random khác nhau ra key khác nhau', () => {
    const first = buildObjectKey('image/jpeg', '2026-09', () => 0.1, now);
    const second = buildObjectKey('image/jpeg', '2026-09', () => 0.9, now);
    expect(first).not.toBe(second);
  });
});

describe('presignObjectUrl', () => {
  it('gắn đủ tham số SigV4 và trỏ đúng bucket theo path-style', async () => {
    const url = await presignObjectUrl({
      config: CONFIG,
      method: 'GET',
      objectKey: 'expenses/2026-09/abc.jpg',
      expiresInSeconds: 3600,
      now: FIXED_NOW,
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://s3.us-east-005.backblazeb2.com');
    expect(parsed.pathname).toBe('/h2t-cobra/expenses/2026-09/abc.jpg');
    expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(parsed.searchParams.get('X-Amz-Credential')).toBe(
      `${CONFIG.keyId}/20260917/us-east-005/s3/aws4_request`,
    );
    expect(parsed.searchParams.get('X-Amz-Date')).toBe('20260917T063904Z');
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('3600');
    expect(parsed.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    expect(parsed.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ký thêm content-type khi tải file lên', async () => {
    const url = await presignObjectUrl({
      config: CONFIG,
      method: 'PUT',
      objectKey: 'expenses/2026-09/abc.jpg',
      expiresInSeconds: 600,
      extraHeaders: { 'Content-Type': 'image/jpeg' },
      now: FIXED_NOW,
    });

    // Sắp xếp theo alphabet: content-type trước host
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
  });

  it('cùng input cho ra cùng chữ ký, khác method thì khác chữ ký', async () => {
    const base = {
      config: CONFIG,
      objectKey: 'expenses/2026-09/abc.jpg',
      expiresInSeconds: 3600,
      now: FIXED_NOW,
    } as const;

    const [firstGet, secondGet, put] = await Promise.all([
      presignObjectUrl({ ...base, method: 'GET' }),
      presignObjectUrl({ ...base, method: 'GET' }),
      presignObjectUrl({ ...base, method: 'PUT' }),
    ]);

    expect(firstGet).toBe(secondGet);
    expect(signatureOf(put)).not.toBe(signatureOf(firstGet));
  });

  it('đổi bất kỳ đầu vào nào cũng đổi chữ ký', async () => {
    const base = {
      config: CONFIG,
      method: 'GET',
      objectKey: 'expenses/2026-09/abc.jpg',
      expiresInSeconds: 3600,
      now: FIXED_NOW,
    } as const;

    const original = signatureOf(await presignObjectUrl(base));
    const variants = await Promise.all([
      presignObjectUrl({ ...base, objectKey: 'expenses/2026-09/abd.jpg' }),
      presignObjectUrl({ ...base, expiresInSeconds: 3601 }),
      presignObjectUrl({ ...base, now: new Date('2026-09-17T06:39:05.000Z') }),
      presignObjectUrl({ ...base, config: { ...CONFIG, applicationKey: 'K005OTHER' } }),
      presignObjectUrl({ ...base, config: { ...CONFIG, bucket: 'other-bucket' } }),
    ]);

    for (const variant of variants) {
      expect(signatureOf(variant)).not.toBe(original);
    }
  });

  it('mã hoá ký tự lạ trong object key nhưng giữ dấu gạch chéo thư mục', async () => {
    const url = await presignObjectUrl({
      config: CONFIG,
      method: 'GET',
      objectKey: 'expenses/2026-09/hoá đơn (1).jpg',
      expiresInSeconds: 3600,
      now: FIXED_NOW,
    });

    expect(url).toContain('/h2t-cobra/expenses/2026-09/ho%C3%A1%20%C4%91%C6%A1n%20%281%29.jpg?');
  });

  it('từ chối object key rỗng thay vì ký một URL vô nghĩa', async () => {
    await expect(
      presignObjectUrl({
        config: CONFIG,
        method: 'GET',
        objectKey: '',
        expiresInSeconds: 3600,
        now: FIXED_NOW,
      }),
    ).rejects.toThrow(/object key/i);
  });
});

function signatureOf(url: string): string {
  return new URL(url).searchParams.get('X-Amz-Signature') ?? '';
}
