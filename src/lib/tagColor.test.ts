import { describe, expect, it } from 'vitest';
import { tagColor } from './tagColor';

describe('tagColor', () => {
  it('trả null khi chưa điền loại', () => {
    expect(tagColor('')).toBeNull();
    expect(tagColor('   ')).toBeNull();
  });

  it('cùng tên loại thì cùng màu, bất kể hoa thường hay khoảng trắng thừa', () => {
    expect(tagColor('trick')).toEqual(tagColor('  Trick '));
  });

  it('loại khác nhau thì nhận màu khác nhau', () => {
    expect(tagColor('Trick')).not.toEqual(tagColor('Tài liệu'));
  });
});
