import { describe, expect, it } from 'vitest';
import { FILAMENTS_BY_ID } from '../data/filaments';
import { PRINTERS_BY_ID } from '../data/printers';
import { BUNDLED_DATA } from '../data/bundledData';
import { resolvePrintSettings } from './resolvePrintSettings';
import type { Filament, MixResult, PrintSettings, SizeOption } from '../types';

// Dữ liệu giờ nằm trong JSON — lấy qua BUNDLED_DATA, giữ nguyên tên cũ cho phần test bên dưới
const PRODUCT_CATEGORIES = BUNDLED_DATA.categories;
const ATTRIBUTE_AXES = BUNDLED_DATA.attributeAxes;
const {
  sizes: SIZE_OPTIONS,
  details: DETAIL_OPTIONS,
  strengths: STRENGTH_OPTIONS,
} = BUNDLED_DATA.technicalAxes;

const category = PRODUCT_CATEGORIES[0]!;

function makeMix(overrides: { filament: Filament; size?: SizeOption }): MixResult {
  return {
    category,
    product: category.products[0]!,
    attributes: {
      style: ATTRIBUTE_AXES[0]!.options[0]!,
      surface: ATTRIBUTE_AXES[1]!.options[0]!,
      color: ATTRIBUTE_AXES[2]!.options[0]!,
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
  };
}

const pla = FILAMENTS_BY_ID['pla-basic']!;
const abs = FILAMENTS_BY_ID['abs']!;
const plaCf = FILAMENTS_BY_ID['pla-cf']!;
const a1 = PRINTERS_BY_ID['a1']!;
const a1Mini = PRINTERS_BY_ID['a1-mini']!;
const x1c = PRINTERS_BY_ID['x1c']!;

/** Tìm một tham số theo đúng nhãn Bambu Studio, không quan tâm nó nằm tab nào. */
function findRow(settings: PrintSettings, label: string) {
  return settings.tabs
    .flatMap((tab) => tab.groups.flatMap((group) => group.rows))
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

describe('resolvePrintSettings — cấu trúc 5 tab Bambu Studio', () => {
  it('có đủ 5 tab đúng tên như trong Bambu Studio', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(settings.tabs.map((tab) => tab.label)).toEqual([
      'Quality',
      'Strength',
      'Speed',
      'Support',
      'Others',
    ]);
  });

  it('sinh tên preset theo quy ước Bambu', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(settings.presetName).toBe('0.20mm Standard @BBL A1');
  });

  it('thêm hậu tố nozzle khi khác 0.4mm', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), x1c, 0.6);
    expect(settings.presetName).toBe('0.20mm Standard @BBL X1C 0.6 nozzle');
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
