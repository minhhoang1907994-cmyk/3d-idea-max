import type { MixResult } from '../types';
import { characterTraitTexts, isCharacterSubject } from './characterTraits';

/**
 * Ghép prompt cho Gemini.
 *
 * Gemini yêu cầu CÂU VĂN TỰ NHIÊN mô tả cảnh, không phải danh sách keyword nối bằng
 * dấu phẩy, và không có cú pháp tham số (--ar, --v) hay negative prompt.
 * Công thức Google đưa ra: [Subject] + [Action] + [Location/context] + [Composition] + [Style]
 * Nguồn: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana
 *
 * Slot Subject là nơi diễn ra lai ghép — càng nhiều chiều sáng tạo bật thì Subject càng dày.
 * Action / Location / Composition cố định vì đây luôn là ảnh chụp sản phẩm đơn lẻ.
 */

const ACTION = 'resting on';
const LOCATION = 'a seamless light grey studio backdrop';
const COMPOSITION =
  'Three-quarter view, centered in frame, medium product shot with soft even lighting';

/**
 * Câu chốt cho mức sáng tạo thấp: ràng buộc Gemini vẽ một vật thể in được.
 * Viết khẳng định — Google nêu rõ nên mô tả cảnh mong muốn thay vì phủ định.
 */
const GROUNDED_CLAUSE =
  'The object is a single solid piece with a flat stable base, shaped so it can be 3D printed';

/**
 * Ở mức lai ghép trở lên, ưu tiên ý tưởng hơn tính khả thi khi in (quyết định của user),
 * nên chỉ giữ ràng buộc "là một vật thể in 3D" mà bỏ yêu cầu liền khối và đế phẳng.
 */
const CREATIVE_CLAUSE =
  'The result is one imaginative 3D printed object, bold and unexpected in form';

/** Thay {A} và {B} trong template của công thức lai. */
export function applyFusionTemplate(template: string, a: string, b: string): string {
  return template.replaceAll('{A}', a).replaceAll('{B}', b);
}

/**
 * Bỏ mạo từ đầu câu. Cần vì mọi promptText đều mở đầu bằng "a"/"an" để ghép được vào
 * câu tự nhiên, nhưng khi đặt sau "A single" thì thành "A single a vase".
 */
export function stripLeadingArticle(text: string): string {
  return text.replace(/^(a|an|the)\s+/i, '');
}

export function buildPrompt(mix: MixResult): string {
  const {
    product,
    attributes,
    size,
    detail,
    strength,
    filament,
    mechanism,
    secondaryProduct,
    fusion,
    character,
    personalization,
  } = mix;

  // ----- Subject: nơi lai ghép diễn ra -----
  let subject = product.promptText;

  // Text tự do người dùng gõ được ưu tiên hơn lựa chọn từ danh sách
  const secondaryText = mix.secondaryOverride?.trim() || secondaryProduct?.promptText;
  if (fusion && secondaryText) {
    subject = applyFusionTemplate(fusion.template, subject, secondaryText);
  }

  const characterText = mix.characterOverride?.trim() || character?.promptText;
  if (characterText) {
    // Nhân vật lai vào sau công thức chính, tạo lớp ý tưởng thứ hai
    subject = `${subject}, styled as ${characterText}`;
  }

  const subjectParts = [`A single ${stripLeadingArticle(subject)}`];

  // Thế đứng / biểu cảm / trang phục chỉ có nghĩa khi chủ thể là nhân vật —
  // với bình hoa hay hộp bút thì bỏ qua, xem lib/characterTraits.ts
  if (isCharacterSubject(mix)) {
    subjectParts.push(...characterTraitTexts(mix));
  }

  subjectParts.push(size.promptText, `made of ${filament.promptText}`);

  if (mechanism) {
    subjectParts.push(mechanism.promptText);
  }

  subjectParts.push(strength.promptText);

  if (personalization) {
    subjectParts.push(personalization.promptText);
  }

  // ----- Style -----
  const style = [
    `Rendered ${attributes.style.promptText}`,
    attributes.surface.promptText,
    attributes.color.promptText,
    detail.promptText,
  ].join(', ');

  const closing = mix.creativity >= 3 ? CREATIVE_CLAUSE : GROUNDED_CLAUSE;

  return [
    `${subjectParts.join(', ')}, ${ACTION} ${LOCATION}.`,
    `${COMPOSITION}.`,
    `${style}.`,
    `${closing}.`,
  ].join(' ');
}
