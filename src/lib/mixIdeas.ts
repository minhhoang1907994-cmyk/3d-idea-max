import type { IdeaData } from '../data/bundledData';
import type {
  AttributeAxisId,
  AttributeOption,
  CreativityLevel,
  Filament,
  MixResult,
  ProductCategory,
} from '../types';

/**
 * Nguồn random được inject để test được — KHÔNG gọi Math.random() trong file này.
 * Hợp đồng: trả về số trong khoảng [0, 1).
 */
export type RandomFn = () => number;

/** Chọn ngẫu nhiên một phần tử. Throw khi mảng rỗng thay vì trả undefined ngầm. */
export function pickRandom<T>(items: readonly T[], random: RandomFn): T {
  if (items.length === 0) {
    throw new Error('pickRandom: danh sách rỗng, không có gì để chọn');
  }
  const index = Math.floor(random() * items.length);
  // Chặn trường hợp random() trả về đúng 1 hoặc số ngoài hợp đồng
  const safeIndex = Math.min(Math.max(index, 0), items.length - 1);
  return items[safeIndex] as T;
}

export type MixInput = IdeaData & { filaments: readonly Filament[] };

/**
 * Chọn danh mục thứ hai để lai ghép.
 *
 * Ở mức sáng tạo cao nhất, ưu tiên danh mục KHÁC DOMAIN với danh mục chính: va chạm
 * giữa hai lĩnh vực xa nhau (dụng cụ × đồ chơi) cho ý tưởng bất ngờ hơn hẳn so với
 * hai danh mục cùng loại (đồ bếp × đồ phòng tắm). Nếu không còn lựa chọn khác domain
 * thì lùi về "chỉ cần khác danh mục".
 */
export function pickSecondaryCategory(
  categories: readonly ProductCategory[],
  primary: ProductCategory,
  random: RandomFn,
  preferDistant: boolean,
): ProductCategory | null {
  const others = categories.filter((item) => item.id !== primary.id);
  if (others.length === 0) return null;

  if (preferDistant) {
    const distant = others.filter((item) => item.domain !== primary.domain);
    if (distant.length > 0) return pickRandom(distant, random);
  }
  return pickRandom(others, random);
}

/**
 * Random TOÀN BỘ lựa chọn (quyết định đã chốt #1) — ghi đè mọi lựa chọn trước đó.
 *
 * `creativity` quyết định bật thêm chiều nào:
 * 1 chỉ sản phẩm + thẩm mỹ · 2 thêm cơ chế · 3 thêm lai ghép · 4 thêm nhân vật + cá nhân hóa.
 */
export function mixIdeas(
  input: MixInput,
  random: RandomFn,
  creativity: CreativityLevel = 1,
): MixResult {
  const category = pickRandom(input.categories, random);
  const product = pickRandom(category.products, random);

  const attributes = {} as Record<AttributeAxisId, AttributeOption>;
  for (const axis of input.attributeAxes) {
    attributes[axis.id] = pickRandom(axis.options, random);
  }

  const mechanism = creativity >= 2 ? pickRandom(input.mechanisms, random) : null;

  let secondaryCategory: ProductCategory | null = null;
  let secondaryProduct = null;
  let fusion = null;
  if (creativity >= 3) {
    secondaryCategory = pickSecondaryCategory(
      input.categories,
      category,
      random,
      creativity >= 4, // chỉ mức cao nhất mới ép chọn domain xa
    );
    if (secondaryCategory) {
      secondaryProduct = pickRandom(secondaryCategory.products, random);
      fusion = pickRandom(input.fusionFormulas, random);
    }
  }

  const character = creativity >= 4 ? pickRandom(input.characters, random) : null;
  const personalization = creativity >= 4 ? pickRandom(input.personalizations, random) : null;

  return {
    creativity,
    category,
    product,
    attributes,
    size: pickRandom(input.technicalAxes.sizes, random),
    detail: pickRandom(input.technicalAxes.details, random),
    strength: pickRandom(input.technicalAxes.strengths, random),
    filament: pickRandom(input.filaments, random),
    mechanism,
    secondaryCategory,
    secondaryProduct,
    fusion,
    character,
    personalization,
  };
}
