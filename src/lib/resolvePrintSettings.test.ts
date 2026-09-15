import { describe, expect, it } from 'vitest';
import { FILAMENTS_BY_ID } from '../data/filaments';
import { PRINTERS_BY_ID } from '../data/printers';
import { BUNDLED_DATA } from '../data/bundledData';
import { resolvePrintSettings } from './resolvePrintSettings';
import type {
  AttributeAxisId,
  AttributeOption,
  Filament,
  MixResult,
  PrintSettings,
  SizeOption,
} from '../types';

// Dữ liệu giờ nằm trong JSON — lấy qua BUNDLED_DATA, giữ nguyên tên cũ cho phần test bên dưới
const PRODUCT_CATEGORIES = BUNDLED_DATA.categories;
const ATTRIBUTE_AXES = BUNDLED_DATA.attributeAxes;
const {
  sizes: SIZE_OPTIONS,
  details: DETAIL_OPTIONS,
  strengths: STRENGTH_OPTIONS,
} = BUNDLED_DATA.technicalAxes;

/** Lấy option đầu của một axis theo id — bền hơn chỉ số mảng khi thêm axis mới. */
function firstOption(axisId: AttributeAxisId): AttributeOption {
  const axis = ATTRIBUTE_AXES.find((item) => item.id === axisId);
  const option = axis?.options[0];
  if (!option) throw new Error(`fixture sai: attributes.json thiếu axis "${axisId}"`);
  return option;
}

const category = PRODUCT_CATEGORIES[0]!;

function makeMix(overrides: { filament: Filament; size?: SizeOption }): MixResult {
  return {
    category,
    product: category.products[0]!,
    attributes: {
      style: firstOption('style'),
      surface: firstOption('surface'),
      color: firstOption('color'),
      pose: firstOption('pose'),
      expression: firstOption('expression'),
      outfit: firstOption('outfit'),
      costume: firstOption('costume'),
    },
    size: overrides.size ?? SIZE_OPTIONS[1]!,
    detail: DETAIL_OPTIONS[1]!,
    strength: STRENGTH_OPTIONS[1]!,
    filament: overrides.filament,
    creativity: 1,
    mechanism: null,
    secondaryCategory: null,
    secondaryProduct: null,
    fusion: null,
    character: null,
    personalization: null,
    secondaryOverride: null,
    characterOverride: null,
  };
}

const pla = FILAMENTS_BY_ID['pla-basic']!;
const abs = FILAMENTS_BY_ID['abs']!;
const plaCf = FILAMENTS_BY_ID['pla-cf']!;
const a1 = PRINTERS_BY_ID['a1']!;
const a1Mini = PRINTERS_BY_ID['a1-mini']!;
const x1c = PRINTERS_BY_ID['x1c']!;
const kobraX = PRINTERS_BY_ID['kobra-x']!;

/** Bảng của slicer chính hãng — luôn đứng đầu danh sách. */
function nativeSlicer(settings: PrintSettings) {
  return settings.slicers[0]!;
}

/** Tìm một tham số theo đúng nhãn trong slicer, không quan tâm nó nằm tab nào. */
function findRow(settings: PrintSettings, label: string) {
  return nativeSlicer(settings)
    .tabs.flatMap((tab) => tab.groups.flatMap((group) => group.rows))
    .find((row) => row.label === label);
}

describe('resolvePrintSettings — tổ hợp hợp lệ', () => {
  it('PLA trên A1 không sinh cảnh báo mức warning', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(settings.warnings.filter((w) => w.level === 'warning')).toHaveLength(0);
  });

  it('lấy layer height từ detail và wall loops từ strength', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(findRow(settings, 'Layer height')?.value).toBe(`${DETAIL_OPTIONS[1]!.layerHeightMm} mm`);
    expect(findRow(settings, 'Wall loops')?.value).toBe(String(STRENGTH_OPTIONS[1]!.wallLoops));
    expect(findRow(settings, 'Sparse infill density')?.value).toBe(
      `${STRENGTH_OPTIONS[1]!.sparseInfillDensityPercent} %`,
    );
  });
});

describe('resolvePrintSettings — tổ hợp không hợp lệ', () => {
  it('cảnh báo khi filament không được khuyến nghị trên máy đó', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), a1);
    expect(settings.warnings.some((w) => w.level === 'warning')).toBe(true);
  });

  it('cảnh báo khi filament cần buồng kín nhưng máy là máy hở', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), a1);
    expect(settings.warnings.some((w) => w.message.includes('buồng in kín'))).toBe(true);
  });

  it('không cảnh báo buồng kín khi in ABS trên máy kín', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), x1c);
    expect(settings.warnings.some((w) => w.message.includes('máy hở'))).toBe(false);
  });

  it('cảnh báo khi kích thước vượt khổ in', () => {
    const oversized = SIZE_OPTIONS.find((s) => s.longestEdgeMm > 256)!;
    const settings = resolvePrintSettings(makeMix({ filament: pla, size: oversized }), a1);
    expect(settings.warnings.some((w) => w.message.includes('vượt khổ in'))).toBe(true);
  });

  it('A1 mini có khổ nhỏ hơn nên cảnh báo sớm hơn A1 với cùng kích thước', () => {
    const size = SIZE_OPTIONS.find((s) => s.longestEdgeMm === 240)!;
    const onA1 = resolvePrintSettings(makeMix({ filament: pla, size }), a1);
    const onMini = resolvePrintSettings(makeMix({ filament: pla, size }), a1Mini);
    expect(onA1.warnings.some((w) => w.message.includes('vượt khổ in'))).toBe(false);
    expect(onMini.warnings.some((w) => w.message.includes('vượt khổ in'))).toBe(true);
  });

  it('nhắc đổi hardened nozzle với filament chứa sợi carbon', () => {
    const settings = resolvePrintSettings(makeMix({ filament: plaCf }), a1);
    expect(settings.warnings.some((w) => w.message.includes('hardened steel'))).toBe(true);
  });
});

describe('resolvePrintSettings — dữ liệu chưa verify', () => {
  it('giữ nguyên null thay vì điền số đoán', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), x1c);
    expect(settings.temperature.nozzleC).toBeNull();
    expect(settings.temperature.bedC).toBeNull();
  });

  it('báo cho user biết là chưa có dữ liệu nhiệt độ', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), x1c);
    expect(settings.warnings.some((w) => w.message.includes('Chưa có dữ liệu nhiệt độ'))).toBe(
      true,
    );
  });

  it('không báo thiếu dữ liệu với filament đã verify đủ', () => {
    const petg = FILAMENTS_BY_ID['petg-hf']!;
    const settings = resolvePrintSettings(makeMix({ filament: petg }), a1);
    expect(settings.warnings.some((w) => w.message.includes('Chưa có dữ liệu nhiệt độ'))).toBe(
      false,
    );
  });
});

describe('resolvePrintSettings — cấu trúc 5 tab của slicer', () => {
  it('có đủ 5 tab đúng tên như trong Bambu Studio', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(nativeSlicer(settings).tabs.map((tab) => tab.label)).toEqual([
      'Quality',
      'Strength',
      'Speed',
      'Support',
      'Others',
    ]);
  });

  it('sinh tên preset theo quy ước Bambu', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(nativeSlicer(settings).presetName).toBe('0.20mm Standard @BBL A1');
  });

  it('thêm hậu tố nozzle khi khác 0.4mm', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), x1c, 0.6);
    expect(nativeSlicer(settings).presetName).toBe('0.20mm Standard @BBL X1C 0.6 nozzle');
  });

  it('lấy số lớp vỏ trên/dưới từ mục đích sử dụng', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(findRow(settings, 'Top shell layers')?.value).toBe(
      String(STRENGTH_OPTIONS[1]!.topShellLayers),
    );
    expect(findRow(settings, 'Bottom shell layers')?.value).toBe(
      String(STRENGTH_OPTIONS[1]!.bottomShellLayers),
    );
  });
});

describe('resolvePrintSettings — tốc độ chỉ có cho preset đã biết', () => {
  it('trả về số thật cho X1C + nozzle 0.6 (preset có trong ảnh nguồn)', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), x1c, 0.6);
    expect(findRow(settings, 'Outer wall')?.value).toBe('120 mm/s');
    expect(findRow(settings, 'First layer')?.value).toBe('35 mm/s');
  });

  it('KHÔNG suy số tốc độ của máy khác từ preset X1C 0.6', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(findRow(settings, 'Outer wall')?.value).toBeNull();
    expect(findRow(settings, 'First layer')?.value).toBeNull();
  });

  it('nêu rõ lý do khi thiếu dữ liệu tốc độ', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(findRow(settings, 'Outer wall')?.note).toContain('Chưa có dữ liệu preset');
  });

  it('cùng máy nhưng nozzle khác thì không dùng lại preset', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), x1c, 0.4);
    expect(findRow(settings, 'Outer wall')?.value).toBeNull();
  });
});

describe('resolvePrintSettings — không chốt thứ app không biết', () => {
  it('để trống Enable support vì phụ thuộc hình dạng mô hình', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    const row = findRow(settings, 'Enable support');
    expect(row?.value).toBeNull();
    expect(row?.note).toContain('hình dạng mô hình');
  });

  it('để Spiral vase tắt mặc định — bật nhầm sẽ in hỏng vật thể thường', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(findRow(settings, 'Spiral vase')?.value).toBe('tắt');
  });
});

describe('resolvePrintSettings — nhiều slicer', () => {
  it('đưa slicer chính hãng của máy lên đầu', () => {
    const onA1 = resolvePrintSettings(makeMix({ filament: pla }), a1);
    const onKobra = resolvePrintSettings(makeMix({ filament: pla }), kobraX);
    expect(nativeSlicer(onA1).id).toBe('bambu-studio');
    expect(nativeSlicer(onKobra).id).toBe('anycubic-slicer-next');
  });

  it('có cả hai bảng slicer để đối chiếu tên tham số', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), kobraX);
    expect(settings.slicers.map((item) => item.label)).toEqual([
      'Anycubic Slicer Next',
      'Bambu Studio',
    ]);
  });

  it('đánh dấu slicer không có profile cho máy đang chọn', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), kobraX);
    const bambu = settings.slicers.find((item) => item.id === 'bambu-studio')!;
    expect(bambu.supportsSelectedPrinter).toBe(false);
    expect(bambu.presetName).toBeNull();
    expect(bambu.presetNote).toContain('không có profile');
  });

  it('sinh tên preset theo quy ước bộ profile Anycubic Slicer Next', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), kobraX);
    const anycubic = nativeSlicer(settings);
    expect(anycubic.supportsSelectedPrinter).toBe(true);
    // Máy Anycubic đời mới LUÔN có hậu tố nozzle, khác Bambu (0.4 thì không có)
    expect(anycubic.presetName).toBe('0.20mm Standard @Anycubic Kobra X 0.4 nozzle');
    expect(anycubic.presetNote).toContain('đối chiếu lại');
  });

  it('dùng đúng bậc chất lượng của Anycubic theo layer height', () => {
    const tiers = DETAIL_OPTIONS.map((detail) => {
      const settings = resolvePrintSettings({ ...makeMix({ filament: pla }), detail }, kobraX);
      return nativeSlicer(settings).presetName;
    });
    expect(tiers).toEqual([
      '0.28mm SuperDraft @Anycubic Kobra X 0.4 nozzle',
      '0.20mm Standard @Anycubic Kobra X 0.4 nozzle',
      '0.12mm Detail @Anycubic Kobra X 0.4 nozzle',
      '0.08mm HighDetail @Anycubic Kobra X 0.4 nozzle',
    ]);
  });
});

describe('resolvePrintSettings — Anycubic Kobra X', () => {
  it('dùng khổ in 260mm: kích thước 240mm vẫn lọt, không cảnh báo', () => {
    const size = SIZE_OPTIONS.find((s) => s.longestEdgeMm === 240)!;
    const settings = resolvePrintSettings(makeMix({ filament: pla, size }), kobraX);
    expect(settings.warnings.some((w) => w.message.includes('vượt khổ in'))).toBe(false);
  });

  it('cảnh báo ABS trên máy hở và ghi đúng tên hãng', () => {
    const settings = resolvePrintSettings(makeMix({ filament: abs }), kobraX);
    expect(settings.warnings.some((w) => w.message.includes('Anycubic không khuyến nghị'))).toBe(
      true,
    );
    expect(settings.warnings.some((w) => w.message.includes('máy hở'))).toBe(true);
  });

  it('chưa có preset tốc độ cho Kobra X — không mượn số của máy Bambu', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), kobraX);
    expect(findRow(settings, 'Outer wall')?.value).toBeNull();
  });
});

describe('resolvePrintSettings — khuyến nghị TPU của Anycubic', () => {
  const tpu = FILAMENTS_BY_ID['tpu']!;

  it('điền dải tốc độ TPU vào tab Speed của máy Anycubic dù chưa có preset máy', () => {
    const settings = resolvePrintSettings(makeMix({ filament: tpu }), kobraX);
    expect(findRow(settings, 'First layer')?.value).toBe('10 – 15 mm/s');
    expect(findRow(settings, 'Outer wall')?.value).toBe('15 – 20 mm/s');
    expect(findRow(settings, 'Sparse infill')?.value).toBe('20 – 30 mm/s');
    expect(findRow(settings, 'Outer wall')?.note).toContain('Anycubic khuyến nghị');
  });

  it('ô không có khuyến nghị vẫn để trống, không suy từ dải có sẵn', () => {
    const settings = resolvePrintSettings(makeMix({ filament: tpu }), kobraX);
    expect(findRow(settings, 'Top surface')?.value).toBeNull();
    expect(findRow(settings, 'First layer infill')?.value).toBeNull();
  });

  it('KHÔNG áp khuyến nghị của Anycubic cho máy hãng khác', () => {
    const settings = resolvePrintSettings(makeMix({ filament: tpu }), a1);
    expect(findRow(settings, 'Outer wall')?.value).toBeNull();
  });

  it('nhắc sấy filament kèm link nguồn chính hãng', () => {
    const settings = resolvePrintSettings(makeMix({ filament: tpu }), kobraX);
    const drying = settings.warnings.find((w) => w.message.includes('sấy 50–55 °C'));
    expect(drying?.sourceUrl).toContain('wiki.anycubic.com');
  });

  it('cảnh báo khi layer height mỏng hơn ngưỡng Anycubic khuyến nghị cho TPU', () => {
    const thin = DETAIL_OPTIONS.find((d) => d.layerHeightMm < 0.16)!;
    const mix = { ...makeMix({ filament: tpu }), detail: thin };
    const settings = resolvePrintSettings(mix, kobraX);
    expect(
      settings.warnings.some(
        (w) => w.level === 'warning' && w.message.includes('quá mỏng cho TPU'),
      ),
    ).toBe(true);
  });

  it('không cảnh báo layer height khi đã ở 0.16mm trở lên', () => {
    const ok = DETAIL_OPTIONS.find((d) => d.layerHeightMm >= 0.16)!;
    const mix = { ...makeMix({ filament: tpu }), detail: ok };
    const settings = resolvePrintSettings(mix, kobraX);
    expect(settings.warnings.some((w) => w.message.includes('quá mỏng cho TPU'))).toBe(false);
  });
});
