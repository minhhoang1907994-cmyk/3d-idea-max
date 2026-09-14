import { describe, expect, it } from 'vitest';
import { FILAMENTS, FILAMENTS_BY_ID } from '../data/filaments';
import { BUNDLED_DATA } from '../data/bundledData';
import { applyFusionTemplate, buildPrompt, stripLeadingArticle } from './buildPrompt';
import { mixIdeas, type MixInput } from './mixIdeas';
import type { MixResult } from '../types';

const input: MixInput = { ...BUNDLED_DATA, filaments: FILAMENTS };

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
  creativity: 1,
  mechanism: null,
  secondaryCategory: null,
  secondaryProduct: null,
  fusion: null,
  character: null,
  personalization: null,
};

describe('buildPrompt', () => {
  it('ghép thành câu văn, không phải danh sách keyword', () => {
    const prompt = buildPrompt(mix);
    expect(prompt.startsWith('A single ')).toBe(true);
    expect(prompt.endsWith('.')).toBe(true);
  });

  it('chứa promptText của mọi lựa chọn đã random', () => {
    const prompt = buildPrompt(mix);
    // Subject bị bỏ mạo từ đầu khi ghép sau 'A single'
    expect(prompt).toContain(stripLeadingArticle(mix.product.promptText));
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
    for (let step = 0; step < 50; step += 1) {
      const prompt = buildPrompt(mixIdeas(input, () => step / 50));
      expect(prompt.length).toBeGreaterThan(80);
      expect(prompt).not.toContain('undefined');
    }
  });
});

describe('buildPrompt — lai ghép', () => {
  it('áp dụng công thức lai vào subject', () => {
    const fused = mixIdeas(input, () => 0.5, 3);
    const prompt = buildPrompt(fused);
    expect(fused.fusion).not.toBeNull();
    expect(fused.secondaryProduct).not.toBeNull();
    // cả hai thực thể đều phải xuất hiện trong prompt
    expect(prompt).toContain(stripLeadingArticle(fused.product.promptText));
    expect(prompt).toContain(fused.secondaryProduct?.promptText ?? 'KHÔNG-CÓ');
  });

  it('chèn cơ chế in 3D vào prompt từ mức 2', () => {
    const withMechanism = mixIdeas(input, () => 0.5, 2);
    const prompt = buildPrompt(withMechanism);
    expect(prompt).toContain(withMechanism.mechanism?.promptText ?? 'KHÔNG-CÓ');
  });

  it('chèn nhân vật và cá nhân hóa ở mức 4', () => {
    const wild = mixIdeas(input, () => 0.5, 4);
    const prompt = buildPrompt(wild);
    expect(prompt).toContain(wild.character?.promptText ?? 'KHÔNG-CÓ');
    expect(prompt).toContain(wild.personalization?.promptText ?? 'KHÔNG-CÓ');
  });

  it('mức thấp giữ ràng buộc in được, mức cao nới ra cho ý tưởng táo bạo', () => {
    expect(buildPrompt(mixIdeas(input, () => 0.5, 1))).toContain('flat stable base');
    expect(buildPrompt(mixIdeas(input, () => 0.5, 4))).toContain('bold and unexpected');
  });

  it('prompt mức 4 dài hơn mức 1 vì nhiều lớp ý tưởng hơn', () => {
    const simple = buildPrompt(mixIdeas(input, () => 0.5, 1));
    const wild = buildPrompt(mixIdeas(input, () => 0.5, 4));
    expect(wild.length).toBeGreaterThan(simple.length);
  });

  it('không sinh chuỗi rỗng hay undefined ở mọi mức sáng tạo', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (let step = 0; step < 30; step += 1) {
        const prompt = buildPrompt(mixIdeas(input, () => step / 30, level));
        expect(prompt).not.toContain('undefined');
        expect(prompt).not.toContain('{A}');
        expect(prompt).not.toContain('{B}');
      }
    }
  });
});

describe('applyFusionTemplate', () => {
  it('thay cả hai chỗ trống', () => {
    expect(applyFusionTemplate('{A} shaped like {B}', 'a vase', 'a whale')).toBe(
      'a vase shaped like a whale',
    );
  });

  it('thay mọi lần xuất hiện, không chỉ lần đầu', () => {
    expect(applyFusionTemplate('{A} and {A} meet {B}', 'x', 'y')).toBe('x and x meet y');
  });
});

describe('stripLeadingArticle', () => {
  it('bỏ mạo từ a/an/the ở đầu', () => {
    expect(stripLeadingArticle('a vase')).toBe('vase');
    expect(stripLeadingArticle('an owl')).toBe('owl');
    expect(stripLeadingArticle('The box')).toBe('box');
  });

  it('giữ nguyên khi không có mạo từ', () => {
    expect(stripLeadingArticle('vase shaped like a whale')).toBe('vase shaped like a whale');
  });

  it('chỉ bỏ mạo từ đầu, không đụng mạo từ giữa câu', () => {
    expect(stripLeadingArticle('a vase shaped like an owl')).toBe('vase shaped like an owl');
  });

  it('không cắt nhầm từ bắt đầu bằng chữ a', () => {
    expect(stripLeadingArticle('angular bracket')).toBe('angular bracket');
  });
});

describe('buildPrompt — ngữ pháp', () => {
  it('không sinh "A single a ..." ở mọi mức sáng tạo', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (let step = 0; step < 30; step += 1) {
        const prompt = buildPrompt(mixIdeas(input, () => step / 30, level));
        expect(prompt).not.toMatch(/A single (a|an|the) /i);
      }
    }
  });

  it('không lặp "made of ..., made as ..."', () => {
    for (let step = 0; step < 30; step += 1) {
      const prompt = buildPrompt(mixIdeas(input, () => step / 30, 2));
      expect(prompt).not.toMatch(/made of [^.]*, made /);
    }
  });
});
