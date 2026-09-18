import type { AttributeAxis, AttributeOption } from '../types';
import {
  CHARACTER_TRAIT_AXIS_IDS,
  DEFAULT_TRAIT_OPTION_ID,
  NO_COSTUME_ID,
  type CharacterTraitAxisId,
} from './characterTraits';
import { pickRandom, type RandomFn } from './mixIdeas';

/**
 * Biến thể cho trang Phân tích ảnh.
 *
 * Khác hẳn trang Mix: ở đây ảnh người dùng tải lên LÀ chủ thể, nên prompt phải bám sát
 * ảnh — cùng con vật/nhân vật, cùng phong cách, cùng màu, cùng vật liệu — và chỉ đổi
 * đúng nhóm chiều nhân vật (thế đứng, biểu cảm, trang phục, đế). Đổi phong cách hay màu
 * sẽ ra một sản phẩm khác hẳn, đúng thứ người dùng phàn nàn là "khác xa ảnh mẫu".
 */

/** Nguồn quyết định biến thể: chọn từ dữ liệu của app, hay để Gemini tự chọn. */
export type VariantSource = 'data' | 'model';

/** Axis có thể đã bị xóa bên trang Quản lý dữ liệu nên chiều nào cũng có thể vắng mặt. */
export type VariantTraits = Partial<Record<CharacterTraitAxisId, AttributeOption>>;

/** Các axis nhân vật có thật trong dữ liệu hiện tại, theo thứ tự đã định ở characterTraits. */
export function characterTraitAxes(axes: readonly AttributeAxis[]): AttributeAxis[] {
  return CHARACTER_TRAIT_AXIS_IDS.map((axisId) => axes.find((axis) => axis.id === axisId)).filter(
    (axis): axis is AttributeAxis => axis !== undefined && axis.options.length > 0,
  );
}

/**
 * Random một bộ biến thể. Random đều trên toàn bộ option — kể cả "— Mặc định —" và
 * "— Không có —" — giống hệt Mix, để một chiều vẫn có cơ hội giữ nguyên như ảnh gốc.
 */
export function pickVariantTraits(axes: readonly AttributeAxis[], random: RandomFn): VariantTraits {
  const traits: VariantTraits = {};
  for (const axis of characterTraitAxes(axes)) {
    traits[axis.id as CharacterTraitAxisId] = pickRandom(axis.options, random);
  }
  return traits;
}

/** Một dòng thay đổi gửi cho Gemini: nhãn tiếng Anh + mô tả lấy từ promptText. */
export type VariantChange = { label: string; text: string };

const CHANGE_LABELS: Record<'pose' | 'expression' | 'clothing' | 'base', string> = {
  pose: 'Pose',
  expression: 'Facial expression',
  clothing: 'Clothing',
  base: 'Display base',
};

/**
 * Các thay đổi thật sự gửi đi.
 *
 * Bộ cosplay ghi đè Trang phục (quyết định đã chốt ở CLAUDE.md) — mô tả cùng lúc hai bộ
 * đồ sẽ cho Gemini yêu cầu mâu thuẫn. Option "— Mặc định —" và "— Không có —" không sinh
 * dòng nào: chọn chúng nghĩa là không yêu cầu đổi chiều đó.
 */
export function variantChanges(traits: VariantTraits): VariantChange[] {
  const costumeText =
    traits.costume && traits.costume.id !== NO_COSTUME_ID ? traits.costume.promptText : undefined;
  const clothing = costumeText ?? optionText(traits.outfit);

  const rows: (VariantChange | null)[] = [
    toChange(CHANGE_LABELS.pose, optionText(traits.pose)),
    toChange(CHANGE_LABELS.expression, optionText(traits.expression)),
    toChange(CHANGE_LABELS.clothing, clothing),
    toChange(CHANGE_LABELS.base, optionText(traits.base)),
  ];

  return rows.filter((row): row is VariantChange => row !== null);
}

function optionText(option: AttributeOption | undefined): string | undefined {
  if (!option || option.id === DEFAULT_TRAIT_OPTION_ID) return undefined;
  return option.promptText.trim() === '' ? undefined : option.promptText.trim();
}

function toChange(label: string, text: string | undefined): VariantChange | null {
  return text === undefined ? null : { label, text };
}

const PREAMBLE = `You are helping design a 3D printable product.

Look at the object in this image and write ONE image-generation prompt in English that recreates THAT SAME object: same subject, same character or species, same art style, same proportions, same colour scheme, same material and finish, same 3D printing mechanism. Describe it closely enough that someone who never saw the photo would picture the same object.`;

const FALLBACK_BLOCK = `Keep every detail faithful to the photo — no changes requested this time.`;

const MODEL_BLOCK = `Change only the following, choosing each one yourself at random, and keep everything else exactly as in the photo:
- the pose
- the facial expression
- the clothing and any worn accessories
- the display base it stands on

Pick choices that differ clearly from the photo, and keep them plausible for this object.`;

const TAIL = `If the object has no face, arms or legs — a vase, a pen holder, a bracket — ignore any change above that cannot apply to it and keep the rest of the description faithful to the photo.

Write flowing natural sentences following [Subject] + [Action] + [Location/context] + [Composition] + [Style], never a comma-separated keyword list.
- Describe what IS in the scene, never what is absent.
- Keep the material and finish suitable for FDM 3D printing.
- End with a sentence stating it is a 3D printed object.
- No parameters like --ar or --v. No negative prompts. No markdown, no quotes, no preamble.

Reply with the prompt text only.`;

/**
 * Ghép instruction gửi kèm ảnh. Pure function — không đọc state, không gọi random,
 * để test được toàn bộ phần chữ nghĩa quyết định chất lượng prompt.
 */
export function buildVariantInstruction(options: {
  source: VariantSource;
  traits: VariantTraits;
}): string {
  const { source, traits } = options;

  if (source === 'model') {
    return [PREAMBLE, MODEL_BLOCK, TAIL].join('\n\n');
  }

  const changes = variantChanges(traits);
  if (changes.length === 0) {
    return [PREAMBLE, FALLBACK_BLOCK, TAIL].join('\n\n');
  }

  const list = changes.map((change) => `- ${change.label}: ${change.text}`).join('\n');
  const block = `Apply exactly these changes and change nothing else:\n${list}`;

  return [PREAMBLE, block, TAIL].join('\n\n');
}
