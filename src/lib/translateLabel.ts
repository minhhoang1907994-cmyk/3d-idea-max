/**
 * Sinh `promptText` tiếng Anh từ nhãn tiếng Việt, dùng Translator API có sẵn trong Chrome.
 *
 * Dịch chạy NGAY TRONG TRÌNH DUYỆT (on-device), không gọi server — giữ đúng kiến trúc
 * không backend. Lần đầu dùng, Chrome tải gói ngôn ngữ về, có thể mất một lúc.
 *
 * Nguồn: https://developer.mozilla.org/en-US/docs/Web/API/Translator_and_Language_Detector_APIs/Using
 * Hỗ trợ: Chrome 138+ trên desktop. Firefox/Safari và Chrome mobile KHÔNG có API này —
 * khi đó UI phải cho user tự gõ tiếng Anh.
 */

export type TranslationSupport = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export function isTranslatorSupported(): boolean {
  return typeof self !== 'undefined' && 'Translator' in self;
}

export async function getTranslationAvailability(): Promise<TranslationSupport> {
  if (!isTranslatorSupported()) return 'unavailable';
  try {
    return await Translator.availability({ sourceLanguage: 'vi', targetLanguage: 'en' });
  } catch {
    return 'unavailable';
  }
}

/**
 * Chuẩn hoá kết quả dịch thành mảnh câu ghép được vào prompt Gemini.
 *
 * Máy dịch trả về câu kiểu "Foldable desk lamp" — nhưng promptText phải là mảnh câu
 * chèn được vào giữa câu tự nhiên, nên cần chữ thường và mạo từ đứng đầu.
 */
export function toPromptFragment(translated: string): string {
  const cleaned = translated
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');

  if (cleaned === '') return '';

  // Giữ nguyên chữ hoa của danh từ riêng, chỉ hạ chữ cái đầu nếu từ đó không phải
  // toàn chữ hoa (tránh phá "LED", "USB", "QR")
  const firstWord = cleaned.split(' ')[0] ?? '';
  const body =
    firstWord === firstWord.toUpperCase() && firstWord.length > 1
      ? cleaned
      : cleaned.charAt(0).toLowerCase() + cleaned.slice(1);

  // Đã có mạo từ hoặc từ hạn định thì không thêm nữa
  if (/^(a|an|the|some|one|two|three|set|pair)\b/i.test(body)) return body;

  return `${startsWithVowelSound(firstWord) ? 'an' : 'a'} ${body}`;
}

/**
 * Mạo từ a/an chọn theo ÂM ĐỌC chứ không theo chữ cái đầu:
 * "an LED" (eo-i-đi) nhưng "a USB" (diu-ét-bi), "an hour" (âm h câm) nhưng "a unicorn".
 */
function startsWithVowelSound(word: string): boolean {
  if (word === '') return false;

  // Viết tắt đọc từng chữ cái: các chữ này đọc lên bắt đầu bằng nguyên âm
  const isAcronym = word.length > 1 && word === word.toUpperCase() && /^[A-Z]/.test(word);
  if (isAcronym) {
    return 'AEFHILMNORSX'.includes(word.charAt(0));
  }

  const lower = word.toLowerCase();

  // h câm
  if (/^(hour|honest|honou?r|heir)/.test(lower)) return true;

  // u đọc thành "diu" → dùng "a"
  if (/^(uni|use|usu|uti|eu|ewe)/.test(lower)) return false;

  // "one" đọc "wăn" → dùng "a"
  if (/^one/.test(lower)) return false;

  return /^[aeiou]/.test(lower);
}

/**
 * Dịch nhãn tiếng Việt sang mảnh câu tiếng Anh dùng được làm promptText.
 * Throw kèm thông điệp tiếng Việt rõ ràng khi không dịch được — để UI hiển thị thẳng.
 */
export async function translateLabelToPrompt(
  label: string,
  onDownloadProgress?: (percent: number) => void,
): Promise<string> {
  const text = label.trim();
  if (text === '') {
    throw new Error('Nhãn trống, không có gì để dịch.');
  }

  if (!isTranslatorSupported()) {
    throw new Error(
      'Trình duyệt này không có sẵn công cụ dịch (cần Chrome 138+ trên máy tính). Bạn tự gõ prompt tiếng Anh giúp.',
    );
  }

  // QUAN TRỌNG: gọi create() NGAY, không await gì trước đó.
  // Chrome đòi transient user activation để tải gói ngôn ngữ lần đầu; mọi `await`
  // xen vào giữa cú click và create() đều làm mất activation và create sẽ throw
  // "Unable to create translator for the given source and target language".
  let translator: TranslatorInstance;
  try {
    translator = await Translator.create({
      sourceLanguage: 'vi',
      targetLanguage: 'en',
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', (event) => {
          onDownloadProgress?.(Math.floor(event.loaded * 100));
        });
      },
    });
  } catch (error) {
    // Hỏi trạng thái sau khi đã fail, để thông điệp nói đúng nguyên nhân
    const availability = await getTranslationAvailability();
    throw new Error(buildCreateErrorMessage(availability, error), { cause: error });
  }

  try {
    const translated = await translator.translate(text);
    const fragment = toPromptFragment(translated);
    if (fragment === '') {
      throw new Error('Dịch ra chuỗi rỗng — thử viết nhãn rõ ràng hơn.');
    }
    return fragment;
  } finally {
    translator.destroy();
  }
}

/** Thông điệp nói rõ nguyên nhân thay vì lặp lại lỗi gốc khó hiểu của Chrome. */
export function buildCreateErrorMessage(availability: TranslationSupport, error: unknown): string {
  const detail = error instanceof Error ? ` (${error.message})` : '';

  switch (availability) {
    case 'unavailable':
      return `Chrome trên máy này không dịch được Việt → Anh. Kiểm tra: Chrome phải từ bản 138 trở lên, chạy trên máy tính (không phải điện thoại), và vào chrome://on-device-translation-internals để tải gói tiếng Việt. Tạm thời bạn tự gõ prompt tiếng Anh giúp.${detail}`;
    case 'downloadable':
    case 'downloading':
      return `Chrome đang cần tải gói ngôn ngữ Việt → Anh. Bấm Thêm lần nữa để bắt đầu tải, hoặc chờ tải xong rồi thử lại.${detail}`;
    case 'available':
      return `Gói ngôn ngữ đã sẵn sàng nhưng vẫn không tạo được bộ dịch — thử tải lại trang rồi bấm Thêm lại.${detail}`;
  }
}
