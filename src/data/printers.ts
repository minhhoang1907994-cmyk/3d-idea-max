import type { Printer } from '../types';

/**
 * Nguồn sự thật:
 * - Máy Bambu Lab: docs/research/bambu-print-parameters.md
 * - Máy Anycubic:  docs/research/anycubic-print-parameters.md
 *
 * `notRecommendedFilamentIds` KHÔNG có nghĩa là "không in được" — nghĩa là hãng máy
 * không khuyến nghị tổ hợp đó. App vẫn hiển thị kết quả kèm cảnh báo lý do,
 * không âm thầm loại bỏ.
 */

export const PRINTERS: Printer[] = [
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
  {
    id: 'a1-mini',
    label: 'Bambu Lab A1 mini',
    vendor: 'Bambu Lab',
    slicerId: 'bambu-studio',
    buildVolumeMm: { x: 180, y: 180, z: 180 },
    isEnclosed: false,
    supportedFilamentIds: ['pla-basic', 'petg-hf', 'tpu', 'pla-cf', 'petg-cf'],
    notRecommendedFilamentIds: ['abs', 'asa', 'pc', 'asa-cf'],
    sourceUrl: 'https://wiki.bambulab.com/en/a1-mini/manual/faq',
  },
  {
    id: 'p1s',
    label: 'Bambu Lab P1S',
    vendor: 'Bambu Lab',
    slicerId: 'bambu-studio',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    isEnclosed: true,
    supportedFilamentIds: ['pla-basic', 'petg-hf', 'tpu', 'abs', 'asa', 'pc'],
    // Fiber-reinforced cần nâng cấp extruder + hotend
    notRecommendedFilamentIds: ['pla-cf', 'petg-cf', 'asa-cf'],
    sourceUrl: 'https://wiki.bambulab.com/en/p1/manual/faq',
  },
  {
    id: 'x1c',
    label: 'Bambu Lab X1-Carbon',
    vendor: 'Bambu Lab',
    slicerId: 'bambu-studio',
    buildVolumeMm: { x: 256, y: 256, z: 256 },
    isEnclosed: true,
    // Có sẵn hardened nozzle + drive gear → in được cả CF/GF
    supportedFilamentIds: [
      'pla-basic',
      'petg-hf',
      'tpu',
      'abs',
      'asa',
      'pc',
      'pla-cf',
      'petg-cf',
      'asa-cf',
    ],
    notRecommendedFilamentIds: [],
    sourceUrl: 'https://bambulab.com/en-us/x1',
  },
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
];

export const PRINTERS_BY_ID: Record<string, Printer> = Object.fromEntries(
  PRINTERS.map((printer) => [printer.id, printer]),
);

export const DEFAULT_PRINTER_ID = 'a1';
