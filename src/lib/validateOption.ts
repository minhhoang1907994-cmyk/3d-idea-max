/**
 * Kiểm tra dữ liệu người dùng nhập ở trang Quản lý trước khi ghi vào file JSON.
 *
 * `id` phải kebab-case và duy nhất vì nó là khoá bất biến — đổi hoặc trùng `id`
 * sẽ phá dữ liệu cũ (xem CLAUDE.md > Data Model).
 */

export type OptionDraft = {
  id: string;
  label: string;
  promptText: string;
};

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateOptionDraft(
  draft: OptionDraft,
  existingIds: readonly string[],
): ValidationResult {
  const errors: string[] = [];

  const id = draft.id.trim();
  if (id.length === 0) {
    errors.push('ID không được để trống.');
  } else if (!KEBAB_CASE.test(id)) {
    errors.push('ID phải là kebab-case: chỉ chữ thường, số và dấu gạch ngang (ví dụ: desk-lamp).');
  } else if (existingIds.includes(id)) {
    errors.push(`ID "${id}" đã tồn tại — mỗi ID phải là duy nhất.`);
  }

  if (draft.label.trim().length === 0) {
    errors.push('Nhãn hiển thị không được để trống.');
  }

  const promptText = draft.promptText.trim();
  if (promptText.length === 0) {
    errors.push('Prompt text không được để trống.');
  } else if (!/^[\x20-\x7E]*$/.test(promptText)) {
    // Prompt gửi cho Gemini phải là tiếng Anh — ký tự ngoài ASCII in được
    // gần như luôn là dấu tiếng Việt lọt vào nhầm ô
    errors.push('Prompt text phải viết bằng tiếng Anh, không dấu tiếng Việt.');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** Gợi ý id kebab-case từ nhãn tiếng Anh người dùng gõ. */
export function suggestId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
