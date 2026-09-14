import { describe, expect, it } from 'vitest';
import { buildCreateErrorMessage, toPromptFragment } from './translateLabel';
import { validateOptionDraft } from './validateOption';

describe('toPromptFragment', () => {
  it('hạ chữ cái đầu và thêm mạo từ "a"', () => {
    expect(toPromptFragment('Foldable desk lamp')).toBe('a foldable desk lamp');
  });

  it('dùng "an" trước nguyên âm', () => {
    expect(toPromptFragment('Owl figurine')).toBe('an owl figurine');
  });

  it('bỏ dấu chấm cuối câu máy dịch hay thêm', () => {
    expect(toPromptFragment('A small vase.')).toBe('a small vase');
  });

  it('không thêm mạo từ khi bản dịch đã có sẵn', () => {
    expect(toPromptFragment('A set of measuring spoons')).toBe('a set of measuring spoons');
    expect(toPromptFragment('The wooden box')).toBe('the wooden box');
  });

  it('không thêm mạo từ trước từ hạn định số lượng', () => {
    expect(toPromptFragment('Set of three cups')).toBe('set of three cups');
    expect(toPromptFragment('Pair of earrings')).toBe('pair of earrings');
  });

  it('giữ nguyên chữ viết tắt toàn hoa', () => {
    expect(toPromptFragment('LED night light')).toBe('an LED night light');
    expect(toPromptFragment('USB cable holder')).toBe('a USB cable holder');
  });

  it('gộp khoảng trắng thừa', () => {
    expect(toPromptFragment('  wall   mounted   hook  ')).toBe('a wall mounted hook');
  });

  it('trả chuỗi rỗng khi bản dịch rỗng', () => {
    expect(toPromptFragment('   ')).toBe('');
  });

  it('kết quả luôn qua được validateOptionDraft', () => {
    const samples = ['Foldable desk lamp', 'Owl figurine', 'LED night light', 'A small vase.'];
    for (const sample of samples) {
      const promptText = toPromptFragment(sample);
      const result = validateOptionDraft({ id: 'test-id', label: 'Nhãn', promptText }, []);
      expect(result).toEqual({ ok: true });
    }
  });

  it('không để lọt dấu tiếng Việt vào prompt', () => {
    // Nếu máy dịch trả về nguyên tiếng Việt thì validate phải bắt được
    const promptText = toPromptFragment('Đèn bàn');
    const result = validateOptionDraft({ id: 'test-id', label: 'Nhãn', promptText }, []);
    expect(result.ok).toBe(false);
  });
});

describe('toPromptFragment — chọn mạo từ theo âm đọc', () => {
  it('viết tắt đọc bắt đầu bằng nguyên âm dùng "an"', () => {
    expect(toPromptFragment('LED strip')).toBe('an LED strip');
    expect(toPromptFragment('SD card holder')).toBe('an SD card holder');
    expect(toPromptFragment('RGB lamp')).toBe('an RGB lamp');
  });

  it('viết tắt đọc bắt đầu bằng phụ âm dùng "a"', () => {
    expect(toPromptFragment('USB cable holder')).toBe('a USB cable holder');
    expect(toPromptFragment('PLA spool rack')).toBe('a PLA spool rack');
    expect(toPromptFragment('QR code tile')).toBe('a QR code tile');
  });

  it('u đọc thành "diu" dùng "a" dù là nguyên âm', () => {
    expect(toPromptFragment('Unicorn figurine')).toBe('a unicorn figurine');
    expect(toPromptFragment('Universal joint')).toBe('a universal joint');
  });

  it('h câm dùng "an"', () => {
    expect(toPromptFragment('Hour glass')).toBe('an hour glass');
  });

  it('nguyên âm thường vẫn dùng "an"', () => {
    expect(toPromptFragment('Umbrella stand')).toBe('an umbrella stand');
    expect(toPromptFragment('Egg cup')).toBe('an egg cup');
  });
});

describe('buildCreateErrorMessage', () => {
  it('trạng thái unavailable thì hướng dẫn kiểm tra Chrome và gói ngôn ngữ', () => {
    const message = buildCreateErrorMessage('unavailable', new Error('boom'));
    expect(message).toContain('138');
    expect(message).toContain('on-device-translation-internals');
    expect(message).toContain('boom');
  });

  it('trạng thái downloadable thì bảo bấm lại để tải', () => {
    expect(buildCreateErrorMessage('downloadable', null)).toContain('tải');
  });

  it('trạng thái available mà vẫn lỗi thì bảo tải lại trang', () => {
    expect(buildCreateErrorMessage('available', null)).toContain('tải lại trang');
  });

  it('không kèm dấu ngoặc rỗng khi không có lỗi gốc', () => {
    expect(buildCreateErrorMessage('downloadable', null)).not.toContain('()');
  });
});
