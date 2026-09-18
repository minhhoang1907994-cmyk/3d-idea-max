import type { Printer } from '../types';

/**
 * Nguồn sự thật:
 * - Máy Bambu Lab: docs/research/bambu-print-parameters.md
 * - Máy Anycubic:  docs/research/anycubic-print-parameters.md
 *
 * Chỉ giữ hai máy nhóm đang dùng thật. A1 mini / P1S / X1-Carbon đã gỡ khỏi danh sách
 * chọn; thông số của chúng vẫn còn trong hai file research nếu cần thêm lại.
 *
 * `notRecommendedFilamentIds` KHÔNG có nghĩa là "không in được" — nghĩa là hãng máy
 * không khuyến nghị tổ hợp đó. App vẫn hiển thị kết quả kèm cảnh báo lý do,
 * không âm thầm loại bỏ.
 */

export const PRINTERS: Printer[] = [
  {
    id: 'kobra-x',
    label: 'Anycubic Kobra X',
    vendor: 'Anycubic',
    slicerId: 'anycubic-slicer-next',
    buildVolumeMm: { x: 260, y: 260, z: 260 },
    // Khung hở kiểu bedslinger, không có buồng kín
    isEnclosed: false,
    supportedFilamentIds: ['pla-basic', 'petg-hf', 'tpu', 'pla-cf', 'petg-cf'],
    // Máy hở → vật liệu co ngót mạnh dễ cong vênh. Anycubic có nạp sẵn profile ABS/ASA
    // trong Anycubic Slicer Next, nhưng tài liệu máy chỉ nêu PLA/PETG/TPU → giữ cảnh báo.
    notRecommendedFilamentIds: ['abs', 'asa', 'pc', 'asa-cf'],
    sourceUrl: 'https://store.anycubic.com/products/kobra-x',
  },
  {
    id: 'a1',
    label: 'Bambu Lab A1',
    vendor: 'Bambu Lab',
    slicerId: 'bambu-studio',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    isEnclosed: false,
    supportedFilamentIds: ['pla-basic', 'petg-hf', 'tpu', 'pla-cf', 'petg-cf'],
    // Open-frame, nhiệt buồng thấp → giảm độ bền liên lớp, cong vênh với vật liệu nhiệt cao
    notRecommendedFilamentIds: ['abs', 'asa', 'pc', 'asa-cf'],
    sourceUrl: 'https://wiki.bambulab.com/en/a1/manual/faq',
  },
];

export const PRINTERS_BY_ID: Record<string, Printer> = Object.fromEntries(
  PRINTERS.map((printer) => [printer.id, printer]),
);

export const DEFAULT_PRINTER_ID = 'kobra-x';
