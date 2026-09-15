import { DEFAULT_NOZZLE_MM, findFilamentSpeedAdvice, findSpeedPreset } from '../data/speedPresets';
import type {
  MixResult,
  Range,
  PrintSettings,
  PrintWarning,
  Printer,
  SettingRow,
  SettingsTab,
  SlicerId,
  SlicerSettings,
} from '../types';

/**
 * Suy ra thông số in từ kết quả Mix + máy in đã chọn, tổ chức theo 5 tab của slicer.
 *
 * Nguyên tắc (CLAUDE.md > Quy tắc của project):
 * - Trường nào app có cơ sở để tính (từ axis detail/strength/filament) thì đưa giá trị.
 * - Trường nào phụ thuộc preset máy/nozzle hoặc hình dạng mô hình mà app không biết thì
 *   để `value: null` + ghi rõ lý do. KHÔNG đoán số.
 * - Tổ hợp có vấn đề vẫn hiển thị kèm cảnh báo, không âm thầm loại bỏ.
 */

/** Phần mềm cắt lớp chính hãng của từng dòng máy. */
const SLICERS: Record<SlicerId, { label: string; sourceUrl: string }> = {
  'bambu-studio': {
    label: 'Bambu Studio',
    sourceUrl: 'https://bambulab.com/en/download',
  },
  'anycubic-slicer-next': {
    label: 'Anycubic Slicer Next',
    sourceUrl: 'https://www.anycubic.com/slicerNextDownload',
  },
};

/**
 * Bậc chất lượng theo layer height, đúng như tên file process preset (nozzle 0.4) trong
 * bộ profile chính thức của Anycubic Slicer Next:
 * `resources/profiles/Anycubic/process/` — https://github.com/ANYCUBIC-3D/AnycubicSlicerNext
 *
 * Layer height nào không có trong bảng thì trả `null` — không tự đặt tên bậc mới.
 * Lưu ý 0.28mm: Kobra 3 gọi "SuperDraft", Kobra 2 Pro gọi "Draft" — lấy theo thế hệ mới.
 */
const ANYCUBIC_QUALITY_TIERS: Record<string, string> = {
  '0.08': 'HighDetail',
  '0.10': 'Detail',
  '0.12': 'Detail',
  '0.16': 'Optimal',
  '0.20': 'Standard',
  '0.24': 'Draft',
  '0.28': 'SuperDraft',
};

/**
 * Tên preset theo quy ước của từng slicer, `null` khi không dựng được tên có cơ sở.
 * - Bambu Studio: `0.20mm Standard @BBL A1 [0.6 nozzle]` — nozzle 0.4 không có hậu tố
 * - Anycubic Slicer Next: `0.20mm Standard @Anycubic Kobra 3 0.4 nozzle` — máy đời mới
 *   LUÔN có hậu tố nozzle
 */
export function buildPresetName(
  layerHeightMm: number,
  printer: Printer,
  nozzleMm: number,
): string | null {
  const layer = layerHeightMm.toFixed(2);

  if (printer.slicerId === 'anycubic-slicer-next') {
    const tier = ANYCUBIC_QUALITY_TIERS[layer];
    if (!tier) return null;
    return `${layer}mm ${tier} @${printer.label} ${nozzleMm} nozzle`;
  }

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
        ? `${printer.label} không có buồng in kín phù hợp cho ${filament.label} — ${printer.vendor} không khuyến nghị tổ hợp này (dễ cong vênh, giảm độ bền liên lớp).`
        : `${printer.vendor} không khuyến nghị in ${filament.label} trên ${printer.label} — xem tài liệu máy trước khi in.`,
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

  warnings.push(...tpuWarnings(mix, printer));

  if (filament.nozzleTempC === null || filament.bedTempC === null) {
    warnings.push({
      level: 'info',
      message: `Chưa có dữ liệu nhiệt độ đầy đủ cho ${filament.label} từ tài liệu chính hãng — tra cứu trước khi in, không tự đoán.`,
    });
  }

  return warnings;
}

const ANYCUBIC_TPU_GUIDE =
  'https://wiki.anycubic.com/en/home/knowledge-sharing/tpu-printing-recommendations';

/** Layer height tối thiểu Anycubic khuyến nghị cho TPU — mỏng hơn thì TPU khó ép phẳng. */
const TPU_MIN_LAYER_HEIGHT_MM = 0.16;

/**
 * Khuyến nghị TPU của Anycubic — chỉ áp cho máy Anycubic vì nguồn là wiki của hãng đó,
 * viết cho Anycubic Slicer Next.
 */
function tpuWarnings(mix: MixResult, printer: Printer): PrintWarning[] {
  if (mix.filament.id !== 'tpu' || printer.vendor !== 'Anycubic') return [];

  const warnings: PrintWarning[] = [
    {
      level: 'info',
      message:
        'TPU hút ẩm rất mạnh — sấy 50–55 °C trong 4–6 giờ trước khi in, nếu không sẽ nổ lách tách, bề mặt rỗ và bám lớp kém.',
      sourceUrl: ANYCUBIC_TPU_GUIDE,
    },
    {
      level: 'info',
      message:
        'Đặt trong phần Filament của Anycubic Slicer Next: retraction 0.5–1.5 mm ở 20–30 mm/s, quạt làm mát 0–30 %, flow ratio 95–105 %.',
      sourceUrl: ANYCUBIC_TPU_GUIDE,
    },
    {
      level: 'info',
      message:
        'Chọn TPU từ 95A trở lên; loại 85A trở xuống dễ bị bẹt trong extruder gây tắc, và TPU không nên nạp qua ACE Pro.',
      sourceUrl: ANYCUBIC_TPU_GUIDE,
    },
  ];

  if (mix.detail.layerHeightMm < TPU_MIN_LAYER_HEIGHT_MM) {
    warnings.push({
      level: 'warning',
      message: `Layer height ${mix.detail.layerHeightMm} mm quá mỏng cho TPU — Anycubic khuyến nghị 0.16–0.2 mm, mỏng hơn thì TPU đàn hồi khó ép phẳng.`,
      sourceUrl: ANYCUBIC_TPU_GUIDE,
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

function speedTab(mix: MixResult, printer: Printer, nozzleMm: number): SettingsTab {
  const preset = findSpeedPreset(printer.id, nozzleMm);
  // Chưa có preset máy nhưng hãng có khuyến nghị theo vật liệu thì vẫn còn cái để điền —
  // đây là DẢI khuyến nghị cho vật liệu, không phải số trong preset máy, nên note nói rõ.
  const advice = findFilamentSpeedAdvice(printer.vendor, mix.filament.id);

  if (!preset) {
    const missing = (label: string): SettingRow => ({
      label,
      value: null,
      note: `Chưa có dữ liệu preset cho ${printer.label} + nozzle ${nozzleMm}mm`,
    });
    const advised = (label: string, value: Range, why: string): SettingRow => ({
      label,
      value: `${value.min} – ${value.max} mm/s`,
      note: `${printer.vendor} khuyến nghị dải này cho ${mix.filament.label} — ${why}`,
    });
    const firstLayer = advice
      ? advised('First layer', advice.firstLayer, 'chậm nhất để lớp đầu bám chắc')
      : missing('First layer');
    const outerWall = advice
      ? advised('Outer wall', advice.outerWall, 'chậm hơn phần thân cho bề mặt đẹp')
      : missing('Outer wall');
    // Hãng chỉ nói "core speed — tốc độ phần thân", không tách từng ô như slicer.
    const core = (label: string) =>
      advice ? advised(label, advice.core, 'hãng gọi chung là tốc độ phần thân') : missing(label);

    return {
      id: 'speed',
      label: 'Speed',
      groups: [
        {
          title: 'First layer speed',
          rows: [firstLayer, missing('First layer infill')],
        },
        {
          title: 'Other layers speed',
          rows: [
            outerWall,
            core('Inner wall'),
            core('Sparse infill'),
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

/**
 * Cùng một bộ tham số, trình bày theo từng slicer.
 *
 * Tên tham số dùng chung được vì Anycubic Slicer Next là bản fork của OrcaSlicer, mà
 * OrcaSlicer fork từ Bambu Studio — xem docs/research/anycubic-print-parameters.md.
 * Thứ khác nhau thật sự là preset máy: chỉ slicer chính hãng của máy mới có profile.
 */
function buildSlicerSettings(
  slicerId: SlicerId,
  printer: Printer,
  layerHeightMm: number,
  nozzleMm: number,
  tabs: SettingsTab[],
): SlicerSettings {
  const { label, sourceUrl } = SLICERS[slicerId];
  const isNative = printer.slicerId === slicerId;

  if (!isNative) {
    return {
      id: slicerId,
      label,
      presetName: null,
      presetNote: `${label} không có profile cho ${printer.label} — bảng dưới chỉ để đối chiếu tên tham số.`,
      supportsSelectedPrinter: false,
      sourceUrl,
      tabs,
    };
  }

  const presetName = buildPresetName(layerHeightMm, printer, nozzleMm);

  if (!presetName) {
    return {
      id: slicerId,
      label,
      presetName: null,
      presetNote: `${label} chưa có preset công bố cho layer height ${layerHeightMm} mm — mở phần mềm, chọn ${printer.label} + nozzle ${nozzleMm} mm rồi lấy bậc gần nhất.`,
      supportsSelectedPrinter: true,
      sourceUrl,
      tabs,
    };
  }

  return {
    id: slicerId,
    label,
    presetName,
    // Kobra X là máy mới, chưa có mặt trong bộ profile công bố — tên dựng theo đúng quy ước
    // của các máy Anycubic đời mới, nên vẫn cần user đối chiếu một lần trong phần mềm.
    presetNote:
      slicerId === 'anycubic-slicer-next'
        ? 'Tên dựng theo quy ước bộ profile chính thức của Anycubic Slicer Next — đối chiếu lại trong phần mềm nếu không thấy đúng tên này.'
        : undefined,
    supportsSelectedPrinter: true,
    sourceUrl,
    tabs,
  };
}

export function resolvePrintSettings(
  mix: MixResult,
  printer: Printer,
  nozzleMm: number = DEFAULT_NOZZLE_MM,
): PrintSettings {
  const tabs: SettingsTab[] = [
    qualityTab(mix),
    strengthTab(mix),
    speedTab(mix, printer, nozzleMm),
    supportTab(mix),
    othersTab(),
  ];

  // Slicer chính hãng của máy đang chọn đứng trước — đó là bảng user thật sự dùng.
  const slicerIds: SlicerId[] = [
    printer.slicerId,
    ...(Object.keys(SLICERS) as SlicerId[]).filter((id) => id !== printer.slicerId),
  ];

  return {
    printer,
    filament: mix.filament,
    slicers: slicerIds.map((slicerId) =>
      buildSlicerSettings(slicerId, printer, mix.detail.layerHeightMm, nozzleMm, tabs),
    ),
    temperature: {
      nozzleC: mix.filament.nozzleTempC,
      bedC: mix.filament.bedTempC,
    },
    warnings: buildWarnings(mix, printer),
  };
}
