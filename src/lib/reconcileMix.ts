import type { IdeaData } from '../data/bundledData';
import type { AttributeAxisId, MixResult } from '../types';

/**
 * Dữ liệu có thể đổi bên trang Quản lý trong lúc trang Mix đang mở, khiến lựa chọn
 * hiện tại trỏ vào option đã bị xóa hoặc đã sửa nội dung.
 *
 * Hàm này đồng bộ lại: giữ nguyên lựa chọn nào còn hợp lệ, thay lựa chọn không còn
 * tồn tại bằng phần tử đầu tiên. Deterministic — KHÔNG random lại, để user không bị
 * nhảy sang ý tưởng khác chỉ vì vừa sửa một nhãn.
 *
 * Trả về đúng object cũ khi mọi thứ còn hợp lệ, để React bỏ qua re-render không cần thiết.
 */
export function reconcileMix(mix: MixResult, data: IdeaData): MixResult {
  const category =
    data.categories.find((item) => item.id === mix.category.id) ?? data.categories[0];
  if (!category) {
    throw new Error('Dữ liệu danh mục rỗng — cần ít nhất một danh mục trong categories.json');
  }

  const product = category.products.find((item) => item.id === mix.product.id) ?? category.products[0];
  if (!product) {
    throw new Error(`Danh mục "${category.label}" không còn sản phẩm nào.`);
  }

  const attributes = {} as Record<AttributeAxisId, (typeof data.attributeAxes)[number]['options'][number]>;
  for (const axis of data.attributeAxes) {
    const currentOption = mix.attributes[axis.id];
    const option = axis.options.find((item) => item.id === currentOption?.id) ?? axis.options[0];
    if (!option) {
      throw new Error(`Thuộc tính "${axis.label}" không còn option nào.`);
    }
    attributes[axis.id] = option;
  }

  const size = data.technicalAxes.sizes.find((item) => item.id === mix.size.id) ?? data.technicalAxes.sizes[0];
  const detail =
    data.technicalAxes.details.find((item) => item.id === mix.detail.id) ?? data.technicalAxes.details[0];
  const strength =
    data.technicalAxes.strengths.find((item) => item.id === mix.strength.id) ??
    data.technicalAxes.strengths[0];

  if (!size || !detail || !strength) {
    throw new Error('technicalAxes.json thiếu dữ liệu: cần ít nhất 1 size, 1 detail và 1 strength.');
  }

  const unchanged =
    category === mix.category &&
    product === mix.product &&
    size === mix.size &&
    detail === mix.detail &&
    strength === mix.strength &&
    data.attributeAxes.every((axis) => attributes[axis.id] === mix.attributes[axis.id]);

  return unchanged ? mix : { ...mix, category, product, attributes, size, detail, strength };
}
