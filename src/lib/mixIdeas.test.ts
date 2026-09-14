import { describe, expect, it } from 'vitest';
import { FILAMENTS } from '../data/filaments';
import { BUNDLED_DATA } from '../data/bundledData';
import { mixIdeas, pickRandom, type MixInput } from './mixIdeas';

// Dữ liệu giờ nằm trong JSON — lấy qua BUNDLED_DATA, giữ nguyên tên cũ cho phần test bên dưới
const PRODUCT_CATEGORIES = BUNDLED_DATA.categories;
const ATTRIBUTE_AXES = BUNDLED_DATA.attributeAxes;
const {
  sizes: SIZE_OPTIONS,
  details: DETAIL_OPTIONS,
  strengths: STRENGTH_OPTIONS,
} = BUNDLED_DATA.technicalAxes;

const input: MixInput = {
  categories: PRODUCT_CATEGORIES,
  attributeAxes: ATTRIBUTE_AXES,
  sizes: SIZE_OPTIONS,
  details: DETAIL_OPTIONS,
  strengths: STRENGTH_OPTIONS,
  filaments: FILAMENTS,
};

describe('pickRandom', () => {
  it('chọn phần tử đầu khi random trả về 0', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
  });

  it('chọn phần tử cuối khi random tiến sát 1', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0.999)).toBe('c');
  });

  it('không vượt biên khi random trả về đúng 1 (ngoài hợp đồng)', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 1)).toBe('c');
  });

  it('throw khi danh sách rỗng thay vì trả undefined', () => {
    expect(() => pickRandom([], () => 0)).toThrow(/rỗng/);
  });
});

describe('mixIdeas', () => {
  it('luôn chọn sản phẩm thuộc đúng danh mục đã chọn (cascading)', () => {
    // Quét nhiều giá trị random để phủ nhiều nhánh cascading khác nhau
    for (let step = 0; step < 100; step += 1) {
      const value = step / 100;
      const result = mixIdeas(input, () => value);
      expect(result.category.products).toContain(result.product);
    }
  });

  it('điền đủ mọi axis thẩm mỹ đã khai báo', () => {
    const result = mixIdeas(input, () => 0.5);
    for (const axis of ATTRIBUTE_AXES) {
      expect(result.attributes[axis.id]).toBeDefined();
      expect(axis.options).toContain(result.attributes[axis.id]);
    }
  });

  it('cùng một nguồn random cố định cho ra cùng một kết quả', () => {
    const a = mixIdeas(input, () => 0.3);
    const b = mixIdeas(input, () => 0.3);
    expect(a).toEqual(b);
  });

  it('lựa chọn kỹ thuật luôn nằm trong tập dữ liệu tương ứng', () => {
    const result = mixIdeas(input, () => 0.75);
    expect(SIZE_OPTIONS).toContain(result.size);
    expect(DETAIL_OPTIONS).toContain(result.detail);
    expect(STRENGTH_OPTIONS).toContain(result.strength);
    expect(FILAMENTS).toContain(result.filament);
  });
});
