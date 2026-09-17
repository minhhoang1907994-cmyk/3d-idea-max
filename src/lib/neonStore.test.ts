import { describe, expect, it, vi } from 'vitest';
import { NeonConflictError, fetchDocuments, saveDocument } from './neonStore';

describe('fetchDocuments', () => {
  it('chạy đúng câu lệnh và trả về danh sách document', async () => {
    const query = vi
      .fn()
      .mockResolvedValue([{ name: 'categories', content: [{ id: 'toys' }], version: 3 }]);

    const result = await fetchDocuments(query);

    expect(query).toHaveBeenCalledWith('select name, content, version from idea_documents', []);
    expect(result).toEqual([{ name: 'categories', content: [{ id: 'toys' }], version: 3 }]);
  });

  it('ép version về number khi driver trả về chuỗi', async () => {
    const query = vi.fn().mockResolvedValue([{ name: 'attributes', content: [], version: '7' }]);

    const result = await fetchDocuments(query);

    expect(result[0]?.version).toBe(7);
  });

  it('để lỗi của database nổi lên nguyên vẹn', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('permission denied for table idea_documents'));

    await expect(fetchDocuments(query)).rejects.toThrow(
      'permission denied for table idea_documents',
    );
  });
});

describe('saveDocument', () => {
  it('ghi kèm điều kiện version và trả về version mới', async () => {
    const query = vi.fn().mockResolvedValue([{ version: 4 }]);

    const version = await saveDocument(query, 'categories', [{ id: 'toys' }], 3);

    const [text, params] = query.mock.calls[0] as [string, unknown[]];
    expect(text).toContain('where name = $2 and version = $3');
    expect(text).toContain('returning version');
    // content phải là chuỗi JSON: cột là jsonb, driver gửi tham số dạng text
    expect(params).toEqual([JSON.stringify([{ id: 'toys' }]), 'categories', 3]);
    expect(version).toBe(4);
  });

  it('báo xung đột khi không dòng nào khớp version', async () => {
    const query = vi.fn().mockResolvedValue([]);

    await expect(saveDocument(query, 'attributes', [], 2)).rejects.toBeInstanceOf(
      NeonConflictError,
    );
  });

  it('nêu rõ tên document trong thông báo xung đột', async () => {
    const query = vi.fn().mockResolvedValue([]);

    await expect(saveDocument(query, 'characters', [], 1)).rejects.toThrow('characters');
  });
});
