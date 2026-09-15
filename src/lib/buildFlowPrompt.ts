import type { BuildFlowPromptOptions, MixResult } from '../types';
import {
  buildStyleClause,
  buildSubjectPhrase,
  printabilityClauses,
  STUDIO_BACKDROP,
} from './buildPrompt';

/**
 * Ghép prompt ẢNH cho Google Flow (flow.google).
 *
 * Flow sinh ảnh mặc định bằng Nano Banana Pro — cùng họ model với prompt Gemini, nên theo
 * đúng một bộ quy tắc: câu văn tự nhiên, mô tả khẳng định, không cú pháp tham số.
 * Nguồn: https://support.google.com/flow/answer/16729550
 *
 * Vì sao vẫn cần prompt riêng thay vì copy nguyên prompt Gemini: tool image→3D dựng mesh
 * sát hơn hẳn khi có NHIỀU GÓC NHÌN của cùng một vật thể, và nhiều góc cũng là cách duy
 * nhất thấy mặt sau — chỗ hình dạng bất khả thi hay trốn. Prompt này yêu cầu tất cả các góc
 * nằm trong MỘT ảnh, nên được đúng lợi ích đó mà trả giá ảnh thay vì giá video.
 */

/**
 * Bố cục 4 góc trong một ảnh. Nêu rõ số ô và vị trí từng góc — để mặc cho model tự quyết
 * thì nó hay trả về ba góc gần giống nhau, không phủ được mặt sau.
 */
const MULTIVIEW_COMPOSITION =
  'One image laid out as a four-view turntable sheet in a two-by-two grid: front view, left side view, three-quarter view and back view, evenly spaced, equally sized and softly lit from every side';

/**
 * Ràng buộc quan trọng nhất của prompt nhiều góc: bốn ô phải là CÙNG một vật thể.
 * Mỗi ô một hình khác nhau thì tool dựng mesh nhận dữ liệu mâu thuẫn, kết quả còn tệ hơn
 * dùng một ảnh đơn.
 */
const CONSISTENCY_CLAUSE =
  'Every view shows the same object with identical shape, proportions and colour';

/** Viết khẳng định, đúng quy tắc của họ model này — phông trống thay vì "không có props". */
const CLEAN_BACKDROP_CLAUSE = 'The backdrop stays plain and empty behind all four views';

export function buildFlowPrompt(mix: MixResult, options: BuildFlowPromptOptions = {}): string {
  const { printability = true, source = 'text' } = options;

  if (source === 'image') {
    // Ảnh Gemini đã khoá chủ thể, phong cách và hình dạng. Tả lại cả ba chỉ tốn chỗ và mở
    // đường cho model vẽ chệch đi — chỉ yêu cầu trải vật thể đó ra thành các góc nhìn.
    return [
      'Keep the object in the attached image exactly as it is.',
      `Lay it out as ${MULTIVIEW_COMPOSITION.replace(/^One image laid out as /, '')}.`,
      `${CONSISTENCY_CLAUSE}.`,
      `${CLEAN_BACKDROP_CLAUSE}.`,
    ].join(' ');
  }

  const sentences = [
    `${buildSubjectPhrase(mix)}, shown from four angles on ${STUDIO_BACKDROP}.`,
    `${MULTIVIEW_COMPOSITION}.`,
    `${CONSISTENCY_CLAUSE}.`,
    `${buildStyleClause(mix)}.`,
  ];

  if (printability) {
    // Dùng chung nguyên bộ với prompt Gemini: đây cũng là ảnh, không bị bó thời lượng như
    // clip, và hai prompt ảnh lệch ràng buộc nhau thì không còn đối chiếu được kết quả.
    sentences.push(`${printabilityClauses(mix).join('. ')}.`);
  }

  sentences.push(`${CLEAN_BACKDROP_CLAUSE}.`);

  return sentences.join(' ');
}
