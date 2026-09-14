import type { MixResult } from '../types';

/**
 * Ghép prompt cho Gemini.
 *
 * Gemini yêu cầu CÂU VĂN TỰ NHIÊN mô tả cảnh, không phải danh sách keyword nối bằng
 * dấu phẩy, và không có cú pháp tham số (--ar, --v) hay negative prompt.
 * Công thức Google đưa ra: [Subject] + [Action] + [Location/context] + [Composition] + [Style]
 * Nguồn: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana
 *
 * Các slot Action / Location / Composition cố định vì đây luôn là ảnh chụp sản phẩm đơn lẻ.
 */

const ACTION = 'resting on';
const LOCATION = 'a seamless light grey studio backdrop';
const COMPOSITION =
  'Three-quarter view, centered in frame, medium product shot with soft even lighting';

/**
 * Câu chốt: ràng buộc Gemini vẽ MỘT vật thể liền khối in được.
 * Viết ở dạng khẳng định — Google nêu rõ nên mô tả cảnh mong muốn thay vì phủ định.
 */
const PRINTABILITY_CLAUSE =
  'The object is a single solid piece with a flat stable base, shaped so it can be 3D printed';

export function buildPrompt(mix: MixResult): string {
  const { product, attributes, size, detail, strength, filament } = mix;

  const subject = [
    `A single ${product.promptText}`,
    size.promptText,
    `made of ${filament.promptText}`,
    strength.promptText,
  ].join(', ');

  const style = [
    `Rendered ${attributes.style.promptText}`,
    attributes.surface.promptText,
    attributes.color.promptText,
    detail.promptText,
  ].join(', ');

  return [
    `${subject}, ${ACTION} ${LOCATION}.`,
    `${COMPOSITION}.`,
    `${style}.`,
    `${PRINTABILITY_CLAUSE}.`,
  ].join(' ');
}
