import type { AttributeAxisId, MixResult } from '../types';

/**
 * Các axis chỉ có nghĩa với sản phẩm dạng nhân vật: một bình hoa không có thế đứng,
 * không có biểu cảm và không mặc áo. Ghép chúng vào prompt cho mọi sản phẩm sẽ sinh ra
 * câu vô nghĩa kiểu "a vase wearing a hoodie with a grumpy expression".
 *
 * `base` (đế trưng bày) cũng nằm ở đây: nó chỉ đáng mô tả khi chủ thể có thế đứng — với
 * hộp bút hay khay đựng thì bản thân đáy sản phẩm đã là mặt tiếp bàn, thêm đế là thừa.
 *
 * Thứ tự trong mảng cũng là thứ tự ghép vào câu prompt.
 */
export const CHARACTER_TRAIT_AXIS_IDS = [
  'pose',
  'expression',
  'outfit',
  'costume',
  'base',
] as const;

/**
 * Option "không mặc bộ cosplay nào" trong axis `costume`.
 *
 * Phải là một option thật trong danh sách (có promptText hợp lệ) để Mix random vẫn ra được
 * nhân vật mặc đồ đời thường, nhưng promptText của nó KHÔNG bao giờ vào prompt — khi chọn
 * option này thì axis `outfit` mới là thứ mô tả trang phục.
 */
export const NO_COSTUME_ID = 'none';

/**
 * Option "để model tự quyết" của axis `pose`, `expression` và `base`.
 *
 * Cùng cơ chế với [NO_COSTUME_ID]: là option thật trong danh sách (Mix random vẫn chọn
 * được), nhưng promptText của nó KHÔNG bao giờ vào prompt — chọn nó nghĩa là không mô tả
 * thế đứng / biểu cảm, để Gemini tự chọn thứ hợp với chủ thể.
 */
export const DEFAULT_TRAIT_OPTION_ID = 'default';

/** Axis nhân vật cho phép gõ text tự do thay cho lựa chọn từ danh sách. */
export const FREE_TEXT_TRAIT_AXIS_IDS = ['pose', 'expression'] as const;

export function allowsFreeText(axisId: AttributeAxisId): boolean {
  return (FREE_TEXT_TRAIT_AXIS_IDS as readonly string[]).includes(axisId);
}

export type CharacterTraitAxisId = (typeof CHARACTER_TRAIT_AXIS_IDS)[number];

export function isCharacterTraitAxis(axisId: AttributeAxisId): axisId is CharacterTraitAxisId {
  return (CHARACTER_TRAIT_AXIS_IDS as readonly string[]).includes(axisId);
}

/**
 * Ý tưởng này có nhân vật để mô tả thế đứng / biểu cảm / trang phục / bộ cosplay hay không.
 *
 * Ba nguồn:
 * - danh mục được đánh dấu là danh mục nhân vật (Đồ chơi & mô hình) — mọi sản phẩm trong đó
 * - sản phẩm lẻ được đánh dấu ở danh mục khác (móc treo hình thú, trang trí bánh cưới)
 * - mix đang bật lớp nhân vật (`character` hoặc text tự do người dùng gõ)
 */
export function isCharacterSubject(mix: MixResult): boolean {
  return (
    mix.category.isCharacter === true ||
    mix.product.isCharacter === true ||
    mix.character !== null ||
    (mix.characterOverride?.trim() ?? '') !== ''
  );
}

/**
 * promptText của các chiều nhân vật, theo thứ tự ghép vào câu.
 *
 * Bộ cosplay là TRỌN BỘ trang phục nên nó ghi đè axis `outfit` — mô tả cùng lúc "mặc áo
 * giáp samurai" và "mặc áo hoodie" sẽ cho Gemini hai bộ đồ mâu thuẫn.
 * Axis có thể đã bị xóa bên trang Quản lý dữ liệu nên chỗ nào cũng phải chịu được `undefined`.
 *
 * Đế đứng cuối vì nó là thứ chủ thể đặt lên, tả sau khi chủ thể đã đủ hình hài thì câu
 * đọc thuận hơn là chèn giữa thế đứng và trang phục.
 */
export function characterTraitTexts(mix: MixResult): string[] {
  const { outfit, costume } = mix.attributes;

  const costumeText = costume && costume.id !== NO_COSTUME_ID ? costume.promptText : undefined;
  const clothing = costumeText ?? outfit?.promptText;

  return [
    traitText(mix, 'pose'),
    traitText(mix, 'expression'),
    clothing,
    traitText(mix, 'base'),
  ].filter((text): text is string => typeof text === 'string' && text !== '');
}

/**
 * Text của một axis nhân vật: text tự do người dùng gõ được ưu tiên, rồi mới tới option
 * đã chọn. Option "mặc định" trả `undefined` — không mô tả gì cả.
 */
function traitText(mix: MixResult, axisId: AttributeAxisId): string | undefined {
  const override = mix.attributeOverrides?.[axisId]?.trim();
  if (override) return override;

  const option = mix.attributes[axisId];
  if (!option || option.id === DEFAULT_TRAIT_OPTION_ID) return undefined;
  return option.promptText;
}
