import { describe, expect, it, vi } from 'vitest';
import { NeonConflictError, fetchDocuments, saveDocument } from './neonDataApi';

const BASE_URL = 'https://ep-test.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1';

function jsonResponse(body: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchDocuments', () => {
  it('gọi đúng endpoint và trả về danh sách document', async () => {
    const rows = [{ name: 'categories', content: [{ id: 'toys' }], version: 3 }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rows));

    const result = await fetchDocuments(BASE_URL, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/idea_documents?select=name,content,version`,
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(result).toEqual(rows);
  });

  it('ném lỗi kèm message của PostgREST khi request hỏng', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'permission denied for table idea_documents' }, { status: 401 }),
      );

    await expect(fetchDocuments(BASE_URL, fetchMock)).rejects.toThrow(
      'permission denied for table idea_documents',
    );
  });

  it('ném lỗi khi Neon trả về thứ không phải mảng', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ unexpected: true }));

    await expect(fetchDocuments(BASE_URL, fetchMock)).rejects.toThrow('không đúng định dạng');
  });
});

describe('saveDocument', () => {
  it('ghi kèm filter version và trả về version mới', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ version: 4 }]));

    const version = await saveDocument(BASE_URL, 'categories', [{ id: 'toys' }], 3, fetchMock);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/idea_documents?name=eq.categories&version=eq.3`);
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ content: [{ id: 'toys' }] }));
    expect(version).toBe(4);
  });

  it('báo xung đột khi không dòng nào khớp version', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));

    await expect(saveDocument(BASE_URL, 'attributes', [], 2, fetchMock)).rejects.toBeInstanceOf(
      NeonConflictError,
    );
  });

  it('ném lỗi khi server từ chối ghi', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: 'new row violates row-level security policy' }, { status: 403 }),
      );

    await expect(saveDocument(BASE_URL, 'characters', [], 1, fetchMock)).rejects.toThrow(
      'row-level security',
    );
  });
});
