import { describe, expect, it } from 'vitest';
import { FILAMENTS, FILAMENTS_BY_ID } from '../data/filaments';
import { BUNDLED_DATA } from '../data/bundledData';
import { applyFusionTemplate, buildPrompt, stripLeadingArticle } from './buildPrompt';
import { mixIdeas, type MixInput } from './mixIdeas';
import type { AttributeAxisId, AttributeOption, MixResult } from '../types';
import { NO_COSTUME_ID } from './characterTraits';

const input: MixInput = { ...BUNDLED_DATA, filaments: FILAMENTS };

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

const mix: MixResult = {
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
  secondaryOverride: null,
  characterOverride: null,
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

describe('buildPrompt — text tự do người dùng gõ', () => {
  it('dùng text tự do thay cho sản phẩm phụ đã random', () => {
    const base = mixIdeas(input, () => 0.5, 3);
    const custom = { ...base, secondaryOverride: 'a rusty steam locomotive' };
    const prompt = buildPrompt(custom);
    expect(prompt).toContain('a rusty steam locomotive');
    expect(prompt).not.toContain(base.secondaryProduct?.promptText ?? 'KHÔNG-CÓ');
  });

  it('dùng text tự do thay cho nhân vật đã random', () => {
    const base = mixIdeas(input, () => 0.5, 4);
    const custom = { ...base, characterOverride: 'a grumpy walrus' };
    const prompt = buildPrompt(custom);
    expect(prompt).toContain('styled as a grumpy walrus');
    expect(prompt).not.toContain(base.character?.promptText ?? 'KHÔNG-CÓ');
  });

  it('text toàn khoảng trắng thì quay về dùng lựa chọn từ danh sách', () => {
    const base = mixIdeas(input, () => 0.5, 3);
    const prompt = buildPrompt({ ...base, secondaryOverride: '   ' });
    expect(prompt).toContain(base.secondaryProduct?.promptText ?? 'KHÔNG-CÓ');
  });

  it('sửa được cả hai thành phần cùng lúc', () => {
    const base = mixIdeas(input, () => 0.5, 4);
    const prompt = buildPrompt({
      ...base,
      secondaryOverride: 'a vintage typewriter',
      characterOverride: 'a sleepy hedgehog',
    });
    expect(prompt).toContain('a vintage typewriter');
    expect(prompt).toContain('a sleepy hedgehog');
  });

  it('text tự do vẫn đi qua công thức lai đang chọn', () => {
    const base = mixIdeas(input, () => 0.5, 3);
    const fusion = { id: 'x', label: 'test', template: '{A} riding {B}' };
    const prompt = buildPrompt({ ...base, fusion, secondaryOverride: 'a paper plane' });
    expect(prompt).toContain('riding a paper plane');
  });

  it('mix mới xoá text tự do của lần trước', () => {
    const fresh = mixIdeas(input, () => 0.5, 4);
    expect(fresh.secondaryOverride).toBeNull();
    expect(fresh.characterOverride).toBeNull();
  });
});

/** Danh mục được đánh dấu là nhân vật — mọi sản phẩm trong đó bật các chiều nhân vật. */
const characterCategory = PRODUCT_CATEGORIES.find((item) => item.isCharacter === true);
/** Danh mục đồ vật thường — không sản phẩm nào là nhân vật. */
const plainCategory = PRODUCT_CATEGORIES.find(
  (item) => item.isCharacter !== true && item.products.every((p) => p.isCharacter !== true),
);

if (!characterCategory?.products[0] || !plainCategory?.products[0]) {
  throw new Error('fixture sai: categories.json cần cả danh mục nhân vật lẫn danh mục đồ vật');
}

const heroMix: MixResult = {
  ...mix,
  category: characterCategory,
  product: characterCategory.products[0],
};
const plainMix: MixResult = {
  ...mix,
  category: plainCategory,
  product: plainCategory.products[0],
};

describe('buildPrompt — thế đứng / biểu cảm / trang phục', () => {
  const traitTexts = [
    mix.attributes.pose.promptText,
    mix.attributes.expression.promptText,
    mix.attributes.outfit.promptText,
  ];

  it('ghép cả ba chiều khi sản phẩm là nhân vật', () => {
    const prompt = buildPrompt(heroMix);
    for (const text of traitTexts) {
      expect(prompt).toContain(text);
    }
  });

  it('bỏ cả ba chiều khi sản phẩm không phải nhân vật', () => {
    const prompt = buildPrompt(plainMix);
    for (const text of traitTexts) {
      expect(prompt).not.toContain(text);
    }
  });

  it('vẫn ghép khi mix bật lớp nhân vật dù sản phẩm chính là đồ vật thường', () => {
    const wild = mixIdeas(input, () => 0.5, 4);
    // Ép về "không mặc bộ cosplay nào" để axis Trang phục là thứ mô tả trang phục
    const attributes = { ...wild.attributes, costume: firstOption('costume') };
    // Chỉ mượn danh mục/sản phẩm đồ vật thường, giữ nguyên lớp nhân vật của `wild`
    const prompt = buildPrompt({
      ...wild,
      category: plainMix.category,
      product: plainMix.product,
      attributes,
    });
    expect(wild.character).not.toBeNull();
    for (const axisId of ['pose', 'expression', 'outfit'] as const) {
      expect(prompt).toContain(attributes[axisId].promptText);
    }
  });

  it('dùng được text tự do thay cho nhân vật trong danh sách', () => {
    const prompt = buildPrompt({ ...plainMix, characterOverride: 'a grinning garden gnome' });
    expect(prompt).toContain(mix.attributes.pose.promptText);
  });

  it('giữ thứ tự cố định: thế đứng trước biểu cảm, biểu cảm trước trang phục', () => {
    const prompt = buildPrompt(heroMix);
    const [pose, expression, outfit] = traitTexts as [string, string, string];
    expect(prompt.indexOf(pose)).toBeLessThan(prompt.indexOf(expression));
    expect(prompt.indexOf(expression)).toBeLessThan(prompt.indexOf(outfit));
  });
});

describe('buildPrompt — bộ cosplay', () => {
  const costumeAxis = ATTRIBUTE_AXES.find((axis) => axis.id === 'costume');
  const samurai = costumeAxis?.options.find((option) => option.id === 'samurai');
  const none = costumeAxis?.options.find((option) => option.id === NO_COSTUME_ID);

  if (!samurai || !none) {
    throw new Error('fixture sai: attributes.json thiếu option cosplay none / samurai');
  }

  const hero = heroMix;

  it('bộ cosplay ghi đè trang phục, không mô tả hai bộ đồ cùng lúc', () => {
    const prompt = buildPrompt({ ...hero, attributes: { ...hero.attributes, costume: samurai } });
    expect(prompt).toContain(samurai.promptText);
    expect(prompt).not.toContain(hero.attributes.outfit.promptText);
  });

  it('chọn "không có" thì trang phục quay lại có tác dụng', () => {
    const prompt = buildPrompt({ ...hero, attributes: { ...hero.attributes, costume: none } });
    expect(prompt).toContain(hero.attributes.outfit.promptText);
    expect(prompt).not.toContain(none.promptText);
  });

  it('không ghép cosplay vào sản phẩm không phải nhân vật', () => {
    const prompt = buildPrompt({
      ...plainMix,
      attributes: { ...plainMix.attributes, costume: samurai },
    });
    expect(prompt).not.toContain(samurai.promptText);
  });

  it('mọi option cosplay đều ghép được, không sinh chuỗi lỗi', () => {
    for (const option of costumeAxis?.options ?? []) {
      const prompt = buildPrompt({ ...hero, attributes: { ...hero.attributes, costume: option } });
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('  ');
      expect(prompt.toLowerCase()).not.toMatch(/\b(no|without|avoid)\b/);
    }
  });
});
