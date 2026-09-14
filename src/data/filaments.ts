import type { Filament } from '../types';

/**
 * Nguồn sự thật: docs/research/bambu-print-parameters.md
 *
 * QUY TẮC BẮT BUỘC: `null` nghĩa là CHƯA VERIFY được từ tài liệu Bambu Lab chính thức.
 * KHÔNG thay `null` bằng số đoán. Thông số in sai làm hỏng bản in thật.
 * Mỗi lần bổ sung giá trị phải cập nhật cả file research kèm URL nguồn.
 */

const WIKI_FILAMENT_GUIDE = 'https://wiki.bambulab.com/en/general/filament-guide-material-table';

export const FILAMENTS: Filament[] = [
  {
    id: 'pla-basic',
    label: 'PLA Basic',
    promptText: 'matte PLA plastic',
    nozzleTempC: { min: 190, max: 230 },
    bedTempC: null, // chưa verify
    requiresEnclosure: false,
    requiresHardenedNozzle: false,
    sourceUrl:
      'https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_pla_basic_technical_data_sheet.pdf',
  },
  {
    id: 'petg-hf',
    label: 'PETG HF',
    promptText: 'semi-glossy PETG plastic',
    nozzleTempC: { min: 230, max: 260 },
    bedTempC: { min: 60, max: 80 },
    requiresEnclosure: false,
    requiresHardenedNozzle: false,
    sourceUrl: 'https://bambulab.com/en-ca/filament/petg-hf',
  },
  {
    id: 'tpu',
    label: 'TPU (dẻo)',
    promptText: 'soft flexible TPU rubber',
    nozzleTempC: { min: 220, max: 240 },
    bedTempC: { min: 30, max: 35 },
    requiresEnclosure: false,
    requiresHardenedNozzle: false,
    sourceUrl: WIKI_FILAMENT_GUIDE,
  },
  {
    id: 'pla-cf',
    label: 'PLA-CF (sợi carbon)',
    promptText: 'textured carbon-fiber reinforced PLA',
    nozzleTempC: { min: 210, max: 240 },
    bedTempC: { min: 45, max: 65 },
    requiresEnclosure: false,
    requiresHardenedNozzle: true,
    sourceUrl: WIKI_FILAMENT_GUIDE,
  },
  {
    id: 'petg-cf',
    label: 'PETG-CF (sợi carbon)',
    promptText: 'matte carbon-fiber reinforced PETG',
    nozzleTempC: { min: 220, max: 240 },
    bedTempC: null, // chưa verify
    requiresEnclosure: false,
    requiresHardenedNozzle: true,
    sourceUrl: WIKI_FILAMENT_GUIDE,
  },
  {
    id: 'asa-cf',
    label: 'ASA-CF (sợi carbon)',
    promptText: 'rugged carbon-fiber reinforced ASA',
    nozzleTempC: { min: 250, max: 280 },
    bedTempC: null, // chưa verify
    requiresEnclosure: true,
    requiresHardenedNozzle: true,
    sourceUrl:
      'https://wiki.bambulab.com/filament-acc/asacf-pahtcf/bambus_asa-cf_technical_data_sheet.pdf',
  },
  {
    id: 'abs',
    label: 'ABS',
    promptText: 'durable ABS plastic',
    nozzleTempC: null, // chưa verify — WebFetch bị chặn, xem docs/research
    bedTempC: null,
    requiresEnclosure: true,
    requiresHardenedNozzle: false,
    sourceUrl:
      'https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_abs_technical_data_sheet_v3.pdf',
  },
  {
    id: 'asa',
    label: 'ASA (chịu UV)',
    promptText: 'weather-resistant ASA plastic',
    nozzleTempC: null, // chưa verify
    bedTempC: null,
    requiresEnclosure: true,
    requiresHardenedNozzle: false,
    sourceUrl:
      'https://wiki.bambulab.com/filament-acc/abs-asa-pc/6eaf4c432d1d4014a1975e55a55ed00b.pdf',
  },
  {
    id: 'pc',
    label: 'PC (polycarbonate)',
    promptText: 'tough translucent polycarbonate',
    nozzleTempC: null, // chưa verify
    bedTempC: null,
    requiresEnclosure: true,
    requiresHardenedNozzle: false,
    sourceUrl:
      'https://wiki.bambulab.com/filament-acc/abs-asa-pc/a52afdccddfd448583d119587122c8c5.pdf',
  },
];

export const FILAMENTS_BY_ID: Record<string, Filament> = Object.fromEntries(
  FILAMENTS.map((filament) => [filament.id, filament]),
);
