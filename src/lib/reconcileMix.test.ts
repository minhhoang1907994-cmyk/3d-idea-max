import { describe, expect, it } from 'vitest';
import { BUNDLED_DATA, cloneData } from '../data/bundledData';
import { FILAMENTS } from '../data/filaments';
import { mixIdeas, type MixInput } from './mixIdeas';
import { reconcileMix } from './reconcileMix';

const input: MixInput = {
  categories: BUNDLED_DATA.categories,
  attributeAxes: BUNDLED_DATA.attributeAxes,
  sizes: BUNDLED_DATA.technicalAxes.sizes,
  details: BUNDLED_DATA.technicalAxes.details,
  strengths: BUNDLED_DATA.technicalAxes.strengths,
  filaments: FILAMENTS,
};

const mix = mixIdeas(input, () => 0.4);

describe('reconcileMix', () => {
  it('trả về đúng object cũ khi dữ liệu không đổi', () => {
    expect(reconcileMix(mix, BUNDLED_DATA)).toBe(mix);
  });

  it('thay sản phẩm bằng phần tử đầu khi sản phẩm đang chọn bị xóa', () => {
    const data = cloneData(BUNDLED_DATA);
    const category = data.categories.find((item) => item.id === mix.category.id);
    if (!category) throw new Error('fixture sai: không tìm thấy danh mục');
    category.products = category.products.filter((item) => item.id !== mix.product.id);

    const result = reconcileMix(mix, data);
    expect(result.product.id).not.toBe(mix.product.id);
    expect(category.products).toContainEqual(result.product);
  });

  it('chuyển sang danh mục đầu khi cả danh mục bị xóa', () => {
    const data = cloneData(BUNDLED_DATA);
    data.categories = data.categories.filter((item) => item.id !== mix.category.id);

    const result = reconcileMix(mix, data);
    expect(result.category.id).toBe(data.categories[0]?.id);
    expect(result.category.products).toContainEqual(result.product);
  });

  it('giữ nguyên lựa chọn khác khi chỉ một axis bị xóa option', () => {
    const data = cloneData(BUNDLED_DATA);
    const axis = data.attributeAxes.find((item) => item.id === 'color');
    if (!axis) throw new Error('fixture sai: không tìm thấy axis color');
    axis.options = axis.options.filter((item) => item.id !== mix.attributes.color.id);

    const result = reconcileMix(mix, data);
    expect(result.attributes.color.id).not.toBe(mix.attributes.color.id);
    expect(result.attributes.style.id).toBe(mix.attributes.style.id);
    expect(result.product.id).toBe(mix.product.id);
  });

  it('KHÔNG random lại — sửa nhãn không làm nhảy sang ý tưởng khác', () => {
    const data = cloneData(BUNDLED_DATA);
    const category = data.categories.find((item) => item.id === mix.category.id);
    const product = category?.products.find((item) => item.id === mix.product.id);
    if (!product) throw new Error('fixture sai: không tìm thấy sản phẩm');
    product.label = 'Tên mới do user vừa sửa';

    const result = reconcileMix(mix, data);
    expect(result.product.id).toBe(mix.product.id);
    expect(result.product.label).toBe('Tên mới do user vừa sửa');
  });

  it('báo lỗi rõ ràng khi dữ liệu danh mục rỗng', () => {
    const data = cloneData(BUNDLED_DATA);
    data.categories = [];
    expect(() => reconcileMix(mix, data)).toThrow(/danh mục rỗng/);
  });

  it('báo lỗi rõ ràng khi danh mục không còn sản phẩm nào', () => {
    const data = cloneData(BUNDLED_DATA);
    const category = data.categories.find((item) => item.id === mix.category.id);
    if (!category) throw new Error('fixture sai');
    category.products = [];
    expect(() => reconcileMix(mix, data)).toThrow(/không còn sản phẩm/);
  });
});
