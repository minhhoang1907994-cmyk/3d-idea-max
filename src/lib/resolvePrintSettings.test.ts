import { describe, expect, it } from 'vitest';
import { FILAMENTS_BY_ID } from '../data/filaments';
import { PRINTERS_BY_ID } from '../data/printers';
import { BUNDLED_DATA } from '../data/bundledData';
import { resolvePrintSettings } from './resolvePrintSettings';
import type { Filament, MixResult, SizeOption } from '../types';

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
  };
}

const pla = FILAMENTS_BY_ID['pla-basic']!;
const abs = FILAMENTS_BY_ID['abs']!;
const plaCf = FILAMENTS_BY_ID['pla-cf']!;
const a1 = PRINTERS_BY_ID['a1']!;
const a1Mini = PRINTERS_BY_ID['a1-mini']!;
const x1c = PRINTERS_BY_ID['x1c']!;

describe('resolvePrintSettings — tổ hợp hợp lệ', () => {
  it('PLA trên A1 không sinh cảnh báo mức warning', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(settings.warnings.filter((w) => w.level === 'warning')).toHaveLength(0);
  });

  it('lấy layer height từ detail và wall loops từ strength', () => {
    const settings = resolvePrintSettings(makeMix({ filament: pla }), a1);
    expect(settings.quality.layerHeightMm).toBe(DETAIL_OPTIONS[1]!.layerHeightMm);
    expect(settings.quality.wallLoops).toBe(STRENGTH_OPTIONS[1]!.wallLoops);
    expect(settings.strength.sparseInfillDensityPercent).toBe(
      STRENGTH_OPTIONS[1]!.sparseInfillDensityPercent,
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
