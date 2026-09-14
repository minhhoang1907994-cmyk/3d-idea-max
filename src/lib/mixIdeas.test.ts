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

const input: MixInput = { ...BUNDLED_DATA, filaments: FILAMENTS };

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

describe('mixIdeas — thang sáng tạo', () => {
  it('mức 1 chỉ có sản phẩm, không bật chiều sáng tạo nào', () => {
    const result = mixIdeas(input, () => 0.5, 1);
    expect(result.mechanism).toBeNull();
    expect(result.secondaryProduct).toBeNull();
    expect(result.fusion).toBeNull();
    expect(result.character).toBeNull();
    expect(result.personalization).toBeNull();
  });

  it('mức 2 bật cơ chế nhưng chưa lai ghép', () => {
    const result = mixIdeas(input, () => 0.5, 2);
    expect(result.mechanism).not.toBeNull();
    expect(result.fusion).toBeNull();
    expect(result.character).toBeNull();
  });

  it('mức 3 bật lai ghép nhưng chưa có nhân vật', () => {
    const result = mixIdeas(input, () => 0.5, 3);
    expect(result.fusion).not.toBeNull();
    expect(result.secondaryProduct).not.toBeNull();
    expect(result.character).toBeNull();
    expect(result.personalization).toBeNull();
  });

  it('mức 4 bật đủ mọi chiều', () => {
    const result = mixIdeas(input, () => 0.5, 4);
    expect(result.mechanism).not.toBeNull();
    expect(result.fusion).not.toBeNull();
    expect(result.character).not.toBeNull();
    expect(result.personalization).not.toBeNull();
  });
});

describe('mixIdeas — chọn thực thể thứ hai', () => {
  it('thực thể thứ hai luôn thuộc danh mục khác danh mục chính', () => {
    for (let step = 0; step < 60; step += 1) {
      const result = mixIdeas(input, () => step / 60, 3);
      if (result.secondaryCategory) {
        expect(result.secondaryCategory.id).not.toBe(result.category.id);
      }
    }
  });

  it('sản phẩm phụ thuộc đúng danh mục phụ', () => {
    for (let step = 0; step < 40; step += 1) {
      const result = mixIdeas(input, () => step / 40, 4);
      if (result.secondaryCategory && result.secondaryProduct) {
        expect(result.secondaryCategory.products).toContain(result.secondaryProduct);
      }
    }
  });

  it('mức 4 ưu tiên danh mục KHÁC DOMAIN để ý tưởng va chạm xa hơn', () => {
    let distantCount = 0;
    let total = 0;
    for (let step = 0; step < 60; step += 1) {
      const result = mixIdeas(input, () => step / 60, 4);
      if (result.secondaryCategory) {
        total += 1;
        if (result.secondaryCategory.domain !== result.category.domain) distantCount += 1;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(distantCount).toBe(total);
  });

  it('danh mục nào cũng có domain hợp lệ', () => {
    const valid = ['functional', 'decorative', 'playful', 'mechanical', 'nature'];
    for (const category of PRODUCT_CATEGORIES) {
      expect(valid).toContain(category.domain);
    }
  });
});
