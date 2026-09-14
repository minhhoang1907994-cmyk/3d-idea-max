import { describe, expect, it } from 'vitest';
import { suggestId, validateOptionDraft } from './validateOption';

const valid = { id: 'desk-lamp', label: 'Đèn bàn', promptText: 'a small desk lamp' };

describe('validateOptionDraft', () => {
  it('chấp nhận draft hợp lệ', () => {
    expect(validateOptionDraft(valid, [])).toEqual({ ok: true });
  });

  it('từ chối id trùng — id là khoá bất biến', () => {
    const result = validateOptionDraft(valid, ['desk-lamp']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain('đã tồn tại');
  });

  it('từ chối id không phải kebab-case', () => {
    const result = validateOptionDraft({ ...valid, id: 'Desk_Lamp' }, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain('kebab-case');
  });

  it('từ chối id rỗng', () => {
    expect(validateOptionDraft({ ...valid, id: '  ' }, []).ok).toBe(false);
  });

  it('từ chối nhãn rỗng', () => {
    expect(validateOptionDraft({ ...valid, label: '' }, []).ok).toBe(false);
  });

  it('từ chối prompt text rỗng', () => {
    expect(validateOptionDraft({ ...valid, promptText: '' }, []).ok).toBe(false);
  });

  it('từ chối prompt text có dấu tiếng Việt — prompt gửi Gemini phải tiếng Anh', () => {
    const result = validateOptionDraft({ ...valid, promptText: 'một cái đèn bàn' }, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join()).toContain('tiếng Anh');
  });

  it('gom nhiều lỗi cùng lúc thay vì báo từng cái', () => {
    const result = validateOptionDraft({ id: 'BAD ID', label: '', promptText: '' }, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('suggestId', () => {
  it('bỏ dấu tiếng Việt và chuyển sang kebab-case', () => {
    expect(suggestId('Đèn bàn gấp gọn')).toBe('den-ban-gap-gon');
  });

  it('gộp ký tự đặc biệt thành một dấu gạch', () => {
    expect(suggestId('Hộp  bút / kệ')).toBe('hop-but-ke');
  });

  it('không để lại dấu gạch thừa ở hai đầu', () => {
    expect(suggestId('  --Test--  ')).toBe('test');
  });

  it('kết quả luôn qua được validateOptionDraft', () => {
    const id = suggestId('Giá đỡ điện thoại');
    expect(validateOptionDraft({ id, label: 'x', promptText: 'a phone stand' }, []).ok).toBe(true);
  });
});
