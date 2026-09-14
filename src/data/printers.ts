import type { Printer } from '../types';

/**
 * Nguồn sự thật: docs/research/bambu-print-parameters.md
 *
 * `notRecommendedFilamentIds` KHÔNG có nghĩa là "không in được" — nghĩa là Bambu Lab
 * không khuyến nghị tổ hợp đó. App vẫn hiển thị kết quả kèm cảnh báo lý do,
 * không âm thầm loại bỏ.
 */

export const PRINTERS: Printer[] = [
  {
    id: 'a1',
    label: 'Bambu Lab A1',
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
    buildVolumeMm: { x: 180, y: 180, z: 180 },
    isEnclosed: false,
    supportedFilamentIds: ['pla-basic', 'petg-hf', 'tpu', 'pla-cf', 'petg-cf'],
    notRecommendedFilamentIds: ['abs', 'asa', 'pc', 'asa-cf'],
    sourceUrl: 'https://wiki.bambulab.com/en/a1-mini/manual/faq',
  },
  {
    id: 'p1s',
    label: 'Bambu Lab P1S',
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
];

export const PRINTERS_BY_ID: Record<string, Printer> = Object.fromEntries(
  PRINTERS.map((printer) => [printer.id, printer]),
);

export const DEFAULT_PRINTER_ID = 'a1';
