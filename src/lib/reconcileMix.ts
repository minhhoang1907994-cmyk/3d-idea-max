import type { IdeaData } from '../data/bundledData';
import type { AttributeAxisId, AttributeOption, MixResult } from '../types';

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

  const product =
    category.products.find((item) => item.id === mix.product.id) ?? category.products[0];
  if (!product) {
    throw new Error(`Danh mục "${category.label}" không còn sản phẩm nào.`);
  }

  const attributes = {} as Record<AttributeAxisId, AttributeOption>;
  for (const axis of data.attributeAxes) {
    const currentOption = mix.attributes[axis.id];
    const option = axis.options.find((item) => item.id === currentOption?.id) ?? axis.options[0];
    if (!option) {
      throw new Error(`Thuộc tính "${axis.label}" không còn option nào.`);
    }
    attributes[axis.id] = option;
  }

  const size =
    data.technicalAxes.sizes.find((item) => item.id === mix.size.id) ?? data.technicalAxes.sizes[0];
  const detail =
    data.technicalAxes.details.find((item) => item.id === mix.detail.id) ??
    data.technicalAxes.details[0];
  const strength =
    data.technicalAxes.strengths.find((item) => item.id === mix.strength.id) ??
    data.technicalAxes.strengths[0];

  if (!size || !detail || !strength) {
    throw new Error(
      'technicalAxes.json thiếu dữ liệu: cần ít nhất 1 size, 1 detail và 1 strength.',
    );
  }

  // Các chiều sáng tạo: chỉ đồng bộ khi mix hiện tại đang bật chúng.
  // Option bị xóa mà không còn gì thay thế thì tắt chiều đó, không throw —
  // mất một cơ chế không đáng làm hỏng cả trang.
  const mechanism = mix.mechanism
    ? (data.mechanisms.find((item) => item.id === mix.mechanism?.id) ?? data.mechanisms[0] ?? null)
    : null;

  const secondaryCategory = mix.secondaryCategory
    ? (data.categories.find((item) => item.id === mix.secondaryCategory?.id) ?? null)
    : null;
  const secondaryProduct = secondaryCategory
    ? (secondaryCategory.products.find((item) => item.id === mix.secondaryProduct?.id) ??
      secondaryCategory.products[0] ??
      null)
    : null;
  const fusion = mix.fusion
    ? (data.fusionFormulas.find((item) => item.id === mix.fusion?.id) ??
      data.fusionFormulas[0] ??
      null)
    : null;

  const character = mix.character
    ? (data.characters.find((item) => item.id === mix.character?.id) ?? data.characters[0] ?? null)
    : null;
  const personalization = mix.personalization
    ? (data.personalizations.find((item) => item.id === mix.personalization?.id) ??
      data.personalizations[0] ??
      null)
    : null;

  const unchanged =
    category === mix.category &&
    product === mix.product &&
    size === mix.size &&
    detail === mix.detail &&
    strength === mix.strength &&
    mechanism === mix.mechanism &&
    secondaryCategory === mix.secondaryCategory &&
    secondaryProduct === mix.secondaryProduct &&
    fusion === mix.fusion &&
    character === mix.character &&
    personalization === mix.personalization &&
    data.attributeAxes.every((axis) => attributes[axis.id] === mix.attributes[axis.id]);

  return unchanged
    ? mix
    : {
        ...mix,
        category,
        product,
        attributes,
        size,
        detail,
        strength,
        mechanism,
        secondaryCategory,
        secondaryProduct,
        fusion,
        character,
        personalization,
      };
}
