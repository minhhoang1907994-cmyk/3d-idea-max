import { DEFAULT_NOZZLE_MM, findSpeedPreset } from '../data/speedPresets';
import type {
  MixResult,
  PrintSettings,
  PrintWarning,
  Printer,
  SettingRow,
  SettingsTab,
} from '../types';

/**
 * Suy ra thông số in từ kết quả Mix + máy in đã chọn, tổ chức theo 5 tab của Bambu Studio.
 *
 * Nguyên tắc (CLAUDE.md > Quy tắc của project):
 * - Trường nào app có cơ sở để tính (từ axis detail/strength/filament) thì đưa giá trị.
 * - Trường nào phụ thuộc preset máy/nozzle hoặc hình dạng mô hình mà app không biết thì
 *   để `value: null` + ghi rõ lý do. KHÔNG đoán số.
 * - Tổ hợp có vấn đề vẫn hiển thị kèm cảnh báo, không âm thầm loại bỏ.
 */

/** Tên preset theo quy ước Bambu: `0.20mm Standard @BBL A1 [0.6 nozzle]` */
export function buildPresetName(layerHeightMm: number, printer: Printer, nozzleMm: number): string {
  const layer = layerHeightMm.toFixed(2);
  const model = printer.label.replace(/^Bambu Lab /, '').replace('X1-Carbon', 'X1C');
  const nozzleSuffix = nozzleMm === DEFAULT_NOZZLE_MM ? '' : ` ${nozzleMm} nozzle`;
  return `${layer}mm Standard @BBL ${model}${nozzleSuffix}`;
}

function buildWarnings(mix: MixResult, printer: Printer): PrintWarning[] {
  const { filament, size } = mix;
  const warnings: PrintWarning[] = [];

  if (printer.notRecommendedFilamentIds.includes(filament.id)) {
    warnings.push({
      level: 'warning',
      message: filament.requiresEnclosure
        ? `${printer.label} không có buồng in kín phù hợp cho ${filament.label} — Bambu không khuyến nghị tổ hợp này (dễ cong vênh, giảm độ bền liên lớp).`
        : `Bambu không khuyến nghị in ${filament.label} trên ${printer.label} — xem tài liệu máy trước khi in.`,
    });
  }

  if (filament.requiresEnclosure && !printer.isEnclosed) {
    warnings.push({
      level: 'warning',
      message: `${filament.label} cần buồng in kín, nhưng ${printer.label} là máy hở.`,
    });
  }

  if (filament.requiresHardenedNozzle) {
    warnings.push({
      level: 'info',
      message: `${filament.label} chứa hạt cứng — cần đầu phun hardened steel, đầu stainless sẽ mòn nhanh.`,
    });
  }

  const longestBuildEdgeMm = Math.max(
    printer.buildVolumeMm.x,
    printer.buildVolumeMm.y,
    printer.buildVolumeMm.z,
  );
  if (size.longestEdgeMm > longestBuildEdgeMm) {
    warnings.push({
      level: 'warning',
      message: `Kích thước ~${size.longestEdgeMm}mm vượt khổ in ${longestBuildEdgeMm}mm của ${printer.label} — cần chia nhỏ mô hình rồi ghép lại.`,
    });
  }

  if (filament.nozzleTempC === null || filament.bedTempC === null) {
    warnings.push({
      level: 'info',
      message: `Chưa có dữ liệu nhiệt độ đầy đủ cho ${filament.label} từ tài liệu Bambu chính thức — tra cứu trước khi in, không tự đoán.`,
    });
  }

  return warnings;
}

function qualityTab(mix: MixResult): SettingsTab {
  const { detail } = mix;
  return {
    id: 'quality',
    label: 'Quality',
    groups: [
      {
        title: 'Layer height',
        rows: [
          {
            label: 'Layer height',
            value: `${detail.layerHeightMm} mm`,
            note: `Theo mức chi tiết "${detail.label}"`,
          },
          {
            label: 'Initial layer height',
            value: null,
            note: 'Theo preset máy — mở preset trong Bambu Studio để xem',
          },
        ],
      },
      {
        title: 'Wall generator',
        rows: [{ label: 'Wall generator', value: 'Classic', note: 'Mặc định của preset Standard' }],
      },
      {
        title: 'Advanced',
        rows: [
          { label: 'Order of walls', value: 'inner/outer', note: 'Mặc định preset Standard' },
          { label: 'Print infill first', value: 'tắt' },
          { label: 'Bridge flow', value: '1' },
          { label: 'Top surface flow ratio', value: '1' },
          { label: 'Initial layer flow ratio', value: '1' },
          { label: 'Top area threshold', value: '100 %' },
          { label: 'Detect overhang walls', value: 'bật' },
          { label: 'Smooth coefficient', value: '80' },
        ],
      },
    ],
  };
}

function strengthTab(mix: MixResult): SettingsTab {
  const { strength } = mix;
  return {
    id: 'strength',
    label: 'Strength',
    groups: [
      {
        title: 'Walls',
        rows: [
          {
            label: 'Wall loops',
            value: String(strength.wallLoops),
            note: `Theo mục đích "${strength.label}"`,
          },
          { label: 'Detect thin wall', value: 'tắt' },
        ],
      },
      {
        title: 'Top/bottom shells',
        rows: [
          { label: 'Top surface pattern', value: 'Monotonic' },
          {
            label: 'Top shell layers',
            value: String(strength.topShellLayers),
            note: `Theo mục đích "${strength.label}"`,
          },
          { label: 'Bottom surface pattern', value: 'Monotonic' },
          {
            label: 'Bottom shell layers',
            value: String(strength.bottomShellLayers),
            note: `Theo mục đích "${strength.label}"`,
          },
          { label: 'Internal solid infill pattern', value: 'Rectilinear' },
        ],
      },
      {
        title: 'Sparse infill',
        rows: [
          {
            label: 'Sparse infill density',
            value: `${strength.sparseInfillDensityPercent} %`,
            note: `Theo mục đích "${strength.label}"`,
          },
          {
            label: 'Sparse infill pattern',
            value: strength.sparseInfillPattern,
            note:
              strength.sparseInfillPattern === 'Gyroid'
                ? 'Chịu lực đa hướng tốt, đầu phun không va quẹt'
                : undefined,
          },
          { label: 'Length of sparse infill anchor', value: '400 %' },
        ],
      },
      {
        title: 'Advanced',
        rows: [
          { label: 'Infill/Wall overlap', value: '15 %' },
          { label: 'Infill direction', value: '45 °' },
          { label: 'Minimum sparse infill threshold', value: '15 mm²' },
          { label: 'Ensure vertical shell thickness', value: 'Enabled' },
        ],
      },
    ],
  };
}

function speedTab(printer: Printer, nozzleMm: number): SettingsTab {
  const preset = findSpeedPreset(printer.id, nozzleMm);

  if (!preset) {
    const missing = (label: string): SettingRow => ({
      label,
      value: null,
      note: `Chưa có dữ liệu preset cho ${printer.label} + nozzle ${nozzleMm}mm`,
    });
    return {
      id: 'speed',
      label: 'Speed',
      groups: [
        {
          title: 'First layer speed',
          rows: [missing('First layer'), missing('First layer infill')],
        },
        {
          title: 'Other layers speed',
          rows: [
            missing('Outer wall'),
            missing('Inner wall'),
            missing('Sparse infill'),
            missing('Internal solid infill'),
            missing('Top surface'),
            missing('Gap infill'),
          ],
        },
      ],
    };
  }

  return {
    id: 'speed',
    label: 'Speed',
    groups: [
      {
        title: 'First layer speed',
        rows: [
          { label: 'First layer', value: `${preset.firstLayerMmS} mm/s` },
          { label: 'First layer infill', value: `${preset.firstLayerInfillMmS} mm/s` },
          { label: 'Initial layer travel speed', value: preset.initialLayerTravelSpeed },
          { label: 'Number of slow layers', value: String(preset.numberOfSlowLayers) },
        ],
      },
      {
        title: 'Other layers speed',
        rows: [
          {
            label: 'Outer wall',
            value: `${preset.outerWallMmS} mm/s`,
            note: 'Giảm thêm nếu muốn bề mặt ngoài mịn hơn',
          },
          { label: 'Inner wall', value: `${preset.innerWallMmS} mm/s` },
          { label: 'Small perimeters', value: preset.smallPerimeters },
          { label: 'Sparse infill', value: `${preset.sparseInfillMmS} mm/s` },
          { label: 'Internal solid infill', value: `${preset.internalSolidInfillMmS} mm/s` },
          { label: 'Top surface', value: `${preset.topSurfaceMmS} mm/s` },
          { label: 'Gap infill', value: `${preset.gapInfillMmS} mm/s` },
        ],
      },
      {
        title: 'Overhang speed',
        rows: [
          {
            label: 'Slow down for overhangs',
            value: preset.slowDownForOverhangs ? 'bật' : 'tắt',
          },
        ],
      },
    ],
  };
}

function supportTab(mix: MixResult): SettingsTab {
  // App không biết hình dạng mô hình nên không chốt được có cần support hay không.
  // Chỉ đưa giá trị cấu trúc mặc định + nhắc user tự kiểm tra phần nhô.
  const needsSupportHint = mix.detail.layerHeightMm <= 0.12;

  return {
    id: 'support',
    label: 'Support',
    groups: [
      {
        title: 'Support',
        rows: [
          {
            label: 'Enable support',
            value: null,
            note: 'Tùy hình dạng mô hình — bật nếu có phần nhô quá 45° so với phương thẳng đứng',
          },
          {
            label: 'Type',
            value: 'tree(auto)',
            note: 'Tree ít để lại vết trên bề mặt hơn normal',
          },
          { label: 'Threshold angle', value: '30 °' },
          { label: 'On build plate only', value: 'bật' },
          { label: 'Remove small overhangs', value: 'bật' },
        ],
      },
      {
        title: 'Advanced',
        rows: [
          { label: 'Tree support branch distance', value: '5 mm' },
          { label: 'Tree support branch diameter', value: '2 mm' },
          { label: 'Tree support branch angle', value: '45 °' },
          {
            label: 'Top Z distance',
            value: '0.15 mm',
            note: needsSupportHint
              ? 'Mô hình chi tiết cao: giữ khoảng cách nhỏ để bề mặt tiếp xúc đẹp hơn'
              : undefined,
          },
          { label: 'Bottom Z distance', value: '0.2 mm' },
          { label: 'Top/Bottom interface layers', value: '2 layers' },
          { label: 'Top interface spacing', value: '0.3 mm' },
          { label: 'Support/object xy distance', value: '0.15 mm' },
        ],
      },
    ],
  };
}

function othersTab(): SettingsTab {
  return {
    id: 'others',
    label: 'Others',
    groups: [
      {
        title: 'Special mode',
        rows: [
          { label: 'Slicing Mode', value: 'Regular' },
          {
            label: 'Print sequence',
            value: 'By layer',
            note: 'Đổi sang "By object" khi in nhiều vật cùng lúc và cần tránh dính sợi',
          },
          {
            label: 'Spiral vase',
            value: 'tắt',
            note: 'Chỉ bật cho vật thể thành mỏng một lớp như bình, cốc trang trí',
          },
          { label: 'Timelapse', value: 'Traditional' },
          { label: 'Fuzzy Skin', value: 'None' },
        ],
      },
    ],
  };
}

export function resolvePrintSettings(
  mix: MixResult,
  printer: Printer,
  nozzleMm: number = DEFAULT_NOZZLE_MM,
): PrintSettings {
  return {
    printer,
    filament: mix.filament,
    presetName: buildPresetName(mix.detail.layerHeightMm, printer, nozzleMm),
    tabs: [
      qualityTab(mix),
      strengthTab(mix),
      speedTab(printer, nozzleMm),
      supportTab(mix),
      othersTab(),
    ],
    temperature: {
      nozzleC: mix.filament.nozzleTempC,
      bedC: mix.filament.bedTempC,
    },
    warnings: buildWarnings(mix, printer),
  };
}
