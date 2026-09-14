import { describe, expect, it } from 'vitest';
import { FILAMENTS_BY_ID } from '../data/filaments';
import { BUNDLED_DATA } from '../data/bundledData';
import { buildPrompt } from './buildPrompt';
import { mixIdeas, type MixInput } from './mixIdeas';
import type { MixResult } from '../types';

// Dữ liệu giờ nằm trong JSON — lấy qua BUNDLED_DATA, giữ nguyên tên cũ cho phần test bên dưới
const PRODUCT_CATEGORIES = BUNDLED_DATA.categories;
const ATTRIBUTE_AXES = BUNDLED_DATA.attributeAxes;
const {
  sizes: SIZE_OPTIONS,
  details: DETAIL_OPTIONS,
  strengths: STRENGTH_OPTIONS,
} = BUNDLED_DATA.technicalAxes;

const category = PRODUCT_CATEGORIES[0]!;

const mix: MixResult = {
  category,
  product: category.products[0]!,
  attributes: {
    style: ATTRIBUTE_AXES[0]!.options[0]!,
    surface: ATTRIBUTE_AXES[1]!.options[0]!,
    color: ATTRIBUTE_AXES[2]!.options[0]!,
  },
  size: SIZE_OPTIONS[1]!,
  detail: DETAIL_OPTIONS[1]!,
  strength: STRENGTH_OPTIONS[1]!,
  filament: FILAMENTS_BY_ID['pla-basic']!,
};

describe('buildPrompt', () => {
  it('ghép thành câu văn, không phải danh sách keyword', () => {
    const prompt = buildPrompt(mix);
    expect(prompt.startsWith('A single ')).toBe(true);
    expect(prompt.endsWith('.')).toBe(true);
  });

  it('chứa promptText của mọi lựa chọn đã random', () => {
    const prompt = buildPrompt(mix);
    expect(prompt).toContain(mix.product.promptText);
    expect(prompt).toContain(mix.size.promptText);
    expect(prompt).toContain(mix.filament.promptText);
    expect(prompt).toContain(mix.attributes.style.promptText);
    expect(prompt).toContain(mix.attributes.surface.promptText);
    expect(prompt).toContain(mix.attributes.color.promptText);
    expect(prompt).toContain(mix.detail.promptText);
    expect(prompt).toContain(mix.strength.promptText);
  });

  it('nêu rõ đây là vật thể liền khối in 3D được', () => {
    expect(buildPrompt(mix)).toContain('3D printed');
  });

  it('không dùng cú pháp tham số của Midjourney hay negative prompt', () => {
    const prompt = buildPrompt(mix);
    expect(prompt).not.toContain('--');
    expect(prompt.toLowerCase()).not.toContain('negative prompt');
  });

  it('không chứa mô tả phủ định — Google khuyến nghị mô tả khẳng định', () => {
    const prompt = buildPrompt(mix);
    expect(prompt.toLowerCase()).not.toMatch(/\b(no|without|avoid)\b/);
  });

  it('thứ tự slot cố định: cùng input cho ra cùng chuỗi', () => {
    expect(buildPrompt(mix)).toBe(buildPrompt(mix));
  });

  it('sinh được prompt hợp lệ cho mọi tổ hợp random quét qua', () => {
    const input: MixInput = {
      categories: PRODUCT_CATEGORIES,
      attributeAxes: ATTRIBUTE_AXES,
      sizes: SIZE_OPTIONS,
      details: DETAIL_OPTIONS,
      strengths: STRENGTH_OPTIONS,
      filaments: Object.values(FILAMENTS_BY_ID),
    };
    for (let step = 0; step < 50; step += 1) {
      const prompt = buildPrompt(mixIdeas(input, () => step / 50));
      expect(prompt.length).toBeGreaterThan(80);
      expect(prompt).not.toContain('undefined');
    }
  });
});
