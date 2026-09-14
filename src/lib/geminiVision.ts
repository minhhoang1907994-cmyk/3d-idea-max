/**
 * Phân tích ảnh sản phẩm bằng Gemini API và sinh prompt tạo ảnh tương tự.
 *
 * ⚠️ API KEY: do người dùng tự nhập trong app và lưu ở localStorage của chính máy họ.
 * Key KHÔNG nằm trong source, KHÔNG commit vào repo. Xem CLAUDE.md > Quy tắc của project.
 *
 * Endpoint: https://ai.google.dev/gemini-api/docs/image-understanding
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Model mặc định; đổi được trong UI nếu key không có quyền dùng model này. */
export const DEFAULT_VISION_MODEL = 'gemini-2.5-flash';

export const STORAGE_KEY_API = '3d-idea-max.gemini-api-key';
export const STORAGE_KEY_MODEL = '3d-idea-max.gemini-model';

/**
 * Yêu cầu gửi kèm ảnh. Ép Gemini trả về đúng một prompt tiếng Anh theo công thức
 * dành cho tạo ảnh, để dán thẳng sang Gemini/Imagen mà không phải sửa.
 */
const INSTRUCTION = `You are helping design a 3D printable product.

Look at the product in this image and write ONE image-generation prompt in English that would produce a NEW product in the same spirit — same craft, same charm, same kind of mechanism — but not an identical copy.

Follow this structure in flowing natural sentences, never a comma-separated keyword list:
[Subject] + [Action] + [Location/context] + [Composition] + [Style]

Rules:
- Describe what IS in the scene, never what is absent.
- Name the 3D printing mechanism you can see (articulated segments, interlocking tiles, snap-fit parts, living hinge, swappable inserts, and so on) if there is one.
- Mention material and finish that suit FDM 3D printing.
- End with a sentence stating it is a 3D printed object.
- No parameters like --ar or --v. No negative prompts. No markdown, no quotes, no preamble.

Reply with the prompt text only.`;

export type VisionResult = {
  prompt: string;
  /** Mô tả ngắn tiếng Việt về những gì model nhận ra, để user đối chiếu */
  observed: string | null;
};

/** Đọc file ảnh thành base64 thuần (bỏ tiền tố data:...;base64,). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Không đọc được file ảnh.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.readAsDataURL(file);
  });
}

/** Dịch lỗi HTTP của Gemini sang thông điệp nói rõ phải làm gì. */
export function describeApiError(status: number, body: string): string {
  switch (status) {
    case 400:
      return `Yêu cầu không hợp lệ — thường do ảnh quá lớn hoặc sai định dạng. (${body.slice(0, 200)})`;
    case 401:
    case 403:
      return 'API key sai hoặc chưa được cấp quyền. Kiểm tra lại key trong Google AI Studio.';
    case 404:
      return 'Không tìm thấy model — key của bạn có thể chưa dùng được model này. Thử đổi tên model trong ô cấu hình.';
    case 429:
      return 'Vượt hạn mức gọi API. Chờ một lúc rồi thử lại, hoặc kiểm tra quota của key.';
    default:
      return status >= 500
        ? 'Máy chủ Gemini đang lỗi, thử lại sau ít phút.'
        : `Gọi API thất bại (HTTP ${status}). ${body.slice(0, 200)}`;
  }
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

export async function analyzeImage(options: {
  base64Image: string;
  mimeType: string;
  apiKey: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<VisionResult> {
  const { base64Image, mimeType, apiKey, model = DEFAULT_VISION_MODEL, signal } = options;

  if (apiKey.trim() === '') {
    throw new Error('Chưa có API key. Nhập key Gemini ở phần cấu hình phía trên.');
  }

  const response = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey.trim(),
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inlineData: { mimeType, data: base64Image } }, { text: INSTRUCTION }],
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(describeApiError(response.status, body));
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.promptFeedback?.blockReason) {
    throw new Error(
      `Gemini từ chối xử lý ảnh này (lý do: ${data.promptFeedback.blockReason}). Thử ảnh khác.`,
    );
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini trả về rỗng — thử lại hoặc dùng ảnh rõ nét hơn.');
  }

  return { prompt: cleanPromptText(text), observed: null };
}

/**
 * Model đôi khi bọc kết quả trong dấu nháy hoặc khối markdown dù đã dặn không —
 * bóc ra để prompt dán được thẳng.
 */
export function cleanPromptText(raw: string): string {
  let text = raw.trim();

  // Khối ```...```
  const fenced = /^```[a-z]*\n([\s\S]*?)\n?```$/i.exec(text);
  if (fenced?.[1]) text = fenced[1].trim();

  // Nháy kép/đơn bao cả chuỗi
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  // Tiền tố kiểu "Prompt:" model hay thêm
  text = text.replace(/^(prompt|image prompt)\s*:\s*/i, '');

  return text.trim();
}
