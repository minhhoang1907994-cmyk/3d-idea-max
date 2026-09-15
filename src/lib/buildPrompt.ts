import { DEFAULT_NOZZLE_MM } from '../data/speedPresets';
import type { BuildPromptOptions, MixResult } from '../types';
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
/** Dùng chung với prompt video — cùng một phông thì hai kết quả còn đối chiếu được với nhau. */
export const STUDIO_BACKDROP = 'a seamless light grey studio backdrop';
const COMPOSITION =
  'Three-quarter view, centered in frame, medium product shot with soft even lighting';

/**
 * Câu nới ràng buộc, chỉ thêm từ mức Lai ghép trở lên: nói rõ với Gemini rằng ý tưởng
 * được phép táo bạo. KHÔNG còn thay thế ràng buộc hình học như trước — hai thứ này là
 * hai núm điều khiển riêng, xem `BuildPromptOptions.printability`.
 */
const CREATIVE_CLAUSE =
  'The result is one imaginative 3D printed object, bold and unexpected in form';

/**
 * Số vòng tường tối thiểu để một chi tiết còn tồn tại sau khi slice.
 * Mỏng hơn mức này thì slicer hoặc bỏ qua hẳn, hoặc in ra một lớp đơn gãy khi gỡ support.
 */
const MIN_WALL_LOOPS = 2;

/**
 * Bề dày tối thiểu in được, suy từ đường kính đầu phun (DEFAULT_NOZZLE_MM trong
 * src/data/speedPresets.ts). Đây là giá trị tính được, không phải số đoán.
 */
export function minFeatureMm(nozzleMm: number = DEFAULT_NOZZLE_MM): number {
  return Number((MIN_WALL_LOOPS * nozzleMm).toFixed(2));
}

/**
 * Bề dày tối thiểu quy đổi thành % chiều dài lớn nhất của vật thể.
 * Ảnh không mang đơn vị mm, nên tỉ lệ là cách duy nhất ràng buộc được Gemini;
 * mm đi kèm chỉ để người đọc đối chiếu. Dùng % thay vì phân số vì "one 188th"
 * vừa khó đọc vừa khó cho model bám vào.
 */
export function minFeaturePercent(
  longestEdgeMm: number,
  nozzleMm: number = DEFAULT_NOZZLE_MM,
): number {
  if (longestEdgeMm <= 0) {
    throw new Error(`minFeaturePercent: longestEdgeMm phải dương, nhận được ${longestEdgeMm}`);
  }
  const percent = (minFeatureMm(nozzleMm) / longestEdgeMm) * 100;
  // Làm tròn 2 chữ số có nghĩa: 2 / 1 / 0.53 / 0.33 / 0.25
  return Number(percent.toPrecision(2));
}

/**
 * Ràng buộc hình học để mô hình dựng từ ảnh này in được.
 *
 * Mỗi câu chặn một lỗi cụ thể của khâu ảnh → STL → slicer:
 * 1. vật thể rời rạc / lơ lửng  2. chi tiết chìa ra không có gì đỡ
 * 3. overhang quá dốc phải cắm support  4. chi tiết mỏng hơn đường phun
 * 5. chi tiết chỉ là hoạ tiết vẽ phẳng lên mặt, tool dựng mesh trả về khối trơn
 * 6. vật thể bị cắt cụt ngoài khung, tool dựng mesh phải bịa phần thiếu
 *
 * Viết KHẲNG ĐỊNH, không dùng "no/without/avoid" — Google nêu rõ nên mô tả cảnh mong
 * muốn thay vì phủ định thứ không muốn.
 */
export function printabilityClauses(mix: MixResult): string[] {
  const percent = minFeaturePercent(mix.size.longestEdgeMm);
  return [
    'The object is a single 3D printed solid, one connected mass resting on a flat stable base',
    'Limbs, tails and accessories stay tucked against the body so every part rests on something beneath it',
    'Overhanging surfaces tilt at most 45 degrees away from vertical, letting the shape hold itself up',
    `Every feature is at least ${minFeatureMm()} mm thick at this scale, roughly ${percent}% of the object's width, sturdy rather than spindly`,
    'Surface details are carved into the form as real raised or recessed geometry with measurable depth, sculpted volume rather than a flat pattern painted on',
    'The whole object sits inside the frame, evenly lit so its silhouette reads clearly',
  ];
}

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

/**
 * Slot Subject — nơi lai ghép diễn ra. Tách riêng để prompt ảnh và prompt video dùng
 * chung một chủ thể; hai prompt mô tả lệch nhau thì không còn đối chiếu được kết quả.
 */
export function buildSubjectPhrase(mix: MixResult): string {
  const { product, size, filament, mechanism, secondaryProduct, fusion, character, strength } = mix;

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

  const parts = [`A single ${stripLeadingArticle(subject)}`];

  // Thế đứng / biểu cảm / trang phục chỉ có nghĩa khi chủ thể là nhân vật —
  // với bình hoa hay hộp bút thì bỏ qua, xem lib/characterTraits.ts
  if (isCharacterSubject(mix)) {
    parts.push(...characterTraitTexts(mix));
  }

  parts.push(size.promptText, `made of ${filament.promptText}`);

  if (mechanism) {
    parts.push(mechanism.promptText);
  }

  parts.push(strength.promptText);

  if (mix.personalization) {
    parts.push(mix.personalization.promptText);
  }

  return parts.join(', ');
}

/** Slot Style — cũng dùng chung giữa prompt ảnh và prompt video. */
export function buildStyleClause(mix: MixResult): string {
  const { attributes, detail } = mix;
  return [
    `Rendered ${attributes.style.promptText}`,
    attributes.surface.promptText,
    attributes.color.promptText,
    detail.promptText,
  ].join(', ');
}

export function buildPrompt(mix: MixResult, options: BuildPromptOptions = {}): string {
  const { printability = true } = options;

  const subject = buildSubjectPhrase(mix);
  const style = buildStyleClause(mix);

  // Mức sáng tạo quyết định độ táo bạo của Ý TƯỞNG; printability quyết định ràng buộc
  // HÌNH HỌC. Hai núm độc lập — mức 4 vẫn giữ được ràng buộc in được.
  const closingClauses: string[] = [];
  if (mix.creativity >= 3) {
    closingClauses.push(CREATIVE_CLAUSE);
  }
  if (printability) {
    closingClauses.push(...printabilityClauses(mix));
  } else if (closingClauses.length === 0) {
    closingClauses.push(CREATIVE_CLAUSE);
  }

  return [
    `${subject}, ${ACTION} ${STUDIO_BACKDROP}.`,
    `${COMPOSITION}.`,
    `${style}.`,
    `${closingClauses.join('. ')}.`,
  ].join(' ');
}
