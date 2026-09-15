import type { Range } from '../types';

/**
 * Preset tốc độ in.
 *
 * ⚠️ NGUỒN: ảnh chụp giao diện Bambu Studio do user cung cấp (2026-09-14), preset
 * `0.30mm Standard @BBL X1C 0.6 nozzle`. Đây là preset của X1C với đầu phun 0.6mm —
 * KHÔNG áp dụng cho máy khác hay nozzle khác, tốc độ phụ thuộc trực tiếp vào cả hai.
 *
 * Máy/nozzle không có trong bảng này thì trả về null và UI hiển thị "chưa có dữ liệu",
 * kèm hướng dẫn user tự mở preset tương ứng trong Bambu Studio.
 * Xem docs/research/bambu-print-parameters.md mục 8.
 */

export type SpeedPreset = {
  firstLayerMmS: number;
  firstLayerInfillMmS: number;
  initialLayerTravelSpeed: string;
  numberOfSlowLayers: number;
  outerWallMmS: number;
  innerWallMmS: number;
  smallPerimeters: string;
  sparseInfillMmS: number;
  internalSolidInfillMmS: number;
  topSurfaceMmS: number;
  gapInfillMmS: number;
  slowDownForOverhangs: boolean;
};

/** Khoá: `{printerId}@{nozzleMm}` */
const SPEED_PRESETS: Record<string, SpeedPreset> = {
  'x1c@0.6': {
    firstLayerMmS: 35,
    firstLayerInfillMmS: 55,
    initialLayerTravelSpeed: '100%',
    numberOfSlowLayers: 0,
    outerWallMmS: 120,
    innerWallMmS: 150,
    smallPerimeters: '50%',
    sparseInfillMmS: 100,
    internalSolidInfillMmS: 150,
    topSurfaceMmS: 150,
    gapInfillMmS: 50,
    slowDownForOverhangs: true,
  },
};

export const DEFAULT_NOZZLE_MM = 0.4;

export function findSpeedPreset(printerId: string, nozzleMm: number): SpeedPreset | null {
  return SPEED_PRESETS[`${printerId}@${nozzleMm}`] ?? null;
}

/**
 * Khuyến nghị tốc độ theo VẬT LIỆU do chính hãng máy công bố — áp cho mọi máy của hãng đó,
 * không phụ thuộc nozzle. Khác `SPEED_PRESETS` (preset của một máy + một nozzle cụ thể),
 * nên hiển thị ở nhóm riêng chứ không trộn vào các ô preset.
 */
export type FilamentSpeedAdvice = {
  firstLayer: Range;
  outerWall: Range;
  /** Hãng gọi là "core speed" — tốc độ phần thân mô hình */
  core: Range;
  sourceUrl: string;
};

/** Khoá: `{vendor}@{filamentId}` */
const FILAMENT_SPEED_ADVICE: Record<string, FilamentSpeedAdvice> = {
  'Anycubic@tpu': {
    firstLayer: { min: 10, max: 15 },
    outerWall: { min: 15, max: 20 },
    core: { min: 20, max: 30 },
    sourceUrl: 'https://wiki.anycubic.com/en/home/knowledge-sharing/tpu-printing-recommendations',
  },
};

export function findFilamentSpeedAdvice(
  vendor: string,
  filamentId: string,
): FilamentSpeedAdvice | null {
  return FILAMENT_SPEED_ADVICE[`${vendor}@${filamentId}`] ?? null;
}
