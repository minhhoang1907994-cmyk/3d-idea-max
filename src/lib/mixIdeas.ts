import type {
  AttributeAxis,
  AttributeAxisId,
  AttributeOption,
  DetailOption,
  Filament,
  MixResult,
  ProductCategory,
  SizeOption,
  StrengthOption,
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

export type MixInput = {
  categories: readonly ProductCategory[];
  attributeAxes: readonly AttributeAxis[];
  sizes: readonly SizeOption[];
  details: readonly DetailOption[];
  strengths: readonly StrengthOption[];
  filaments: readonly Filament[];
};

/**
 * Random TOÀN BỘ lựa chọn (quyết định đã chốt #1) — ghi đè mọi lựa chọn trước đó.
 * Danh mục và sản phẩm là cascading: chọn danh mục trước, rồi chọn sản phẩm bên trong.
 */
export function mixIdeas(input: MixInput, random: RandomFn): MixResult {
  const category = pickRandom(input.categories, random);
  const product = pickRandom(category.products, random);

  const attributes = {} as Record<AttributeAxisId, AttributeOption>;
  for (const axis of input.attributeAxes) {
    attributes[axis.id] = pickRandom(axis.options, random);
  }

  return {
    category,
    product,
    attributes,
    size: pickRandom(input.sizes, random),
    detail: pickRandom(input.details, random),
    strength: pickRandom(input.strengths, random),
    filament: pickRandom(input.filaments, random),
  };
}
