import { describe, expect, it } from 'vitest';
import { cleanPromptText, describeApiError } from './geminiVision';

describe('cleanPromptText', () => {
  it('giữ nguyên prompt sạch', () => {
    const text = 'A single articulated dragon keychain resting on a grey backdrop.';
    expect(cleanPromptText(text)).toBe(text);
  });

  it('bóc khối markdown model hay bọc quanh', () => {
    expect(cleanPromptText('```\nA small vase.\n```')).toBe('A small vase.');
    expect(cleanPromptText('```text\nA small vase.\n```')).toBe('A small vase.');
  });

  it('bóc nháy kép bao cả chuỗi', () => {
    expect(cleanPromptText('"A small vase."')).toBe('A small vase.');
  });

  it('bóc nháy đơn bao cả chuỗi', () => {
    expect(cleanPromptText("'A small vase.'")).toBe('A small vase.');
  });

  it('không bóc nháy nằm giữa câu', () => {
    const text = 'A sign reading "open" on a shelf.';
    expect(cleanPromptText(text)).toBe(text);
  });

  it('bỏ tiền tố "Prompt:" model hay thêm', () => {
    expect(cleanPromptText('Prompt: A small vase.')).toBe('A small vase.');
    expect(cleanPromptText('Image prompt: A small vase.')).toBe('A small vase.');
  });

  it('xử lý được nhiều lớp bọc cùng lúc', () => {
    expect(cleanPromptText('```\n"A small vase."\n```')).toBe('A small vase.');
  });

  it('cắt khoảng trắng thừa hai đầu', () => {
    expect(cleanPromptText('   A small vase.   ')).toBe('A small vase.');
  });
});

describe('describeApiError', () => {
  it('401 và 403 chỉ đúng vào vấn đề key', () => {
    expect(describeApiError(401, '')).toContain('API key');
    expect(describeApiError(403, '')).toContain('API key');
  });

  it('404 gợi ý đổi model chứ không đổ tại key', () => {
    expect(describeApiError(404, '')).toContain('model');
  });

  it('429 nói rõ là vượt hạn mức', () => {
    expect(describeApiError(429, '')).toContain('hạn mức');
  });

  it('lỗi 5xx bảo thử lại sau', () => {
    expect(describeApiError(500, '')).toContain('thử lại');
    expect(describeApiError(503, '')).toContain('thử lại');
  });

  it('400 nhắc ảnh quá lớn hoặc sai định dạng', () => {
    expect(describeApiError(400, 'bad request')).toContain('ảnh');
  });

  it('cắt ngắn body dài, không đổ nguyên khối lỗi ra màn hình', () => {
    const message = describeApiError(400, 'x'.repeat(1000));
    expect(message.length).toBeLessThan(300);
  });
});
