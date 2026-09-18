import { describe, expect, it } from 'vitest';
import type { AttributeAxis, AttributeOption } from '../types';
import {
  buildVariantInstruction,
  characterTraitAxes,
  pickVariantTraits,
  variantChanges,
} from './imageVariant';

function option(id: string, promptText: string): AttributeOption {
  return { id, label: id, promptText };
}

const AXES: AttributeAxis[] = [
  { id: 'style', label: 'Phong cách', options: [option('low-poly', 'a low-poly figure')] },
  {
    id: 'pose',
    label: 'Thế đứng',
    options: [option('default', 'standing naturally'), option('waving', 'waving one hand')],
  },
  {
    id: 'expression',
    label: 'Biểu cảm',
    options: [option('default', 'a neutral face'), option('grin', 'a wide grin')],
  },
  { id: 'outfit', label: 'Trang phục', options: [option('hoodie', 'wearing a hoodie')] },
  {
    id: 'costume',
    label: 'Bộ cosplay',
    options: [option('none', 'no costume'), option('samurai', 'in samurai armour')],
  },
  { id: 'base', label: 'Đế trưng bày', options: [option('default', 'a plain base')] },
];

describe('characterTraitAxes', () => {
  it('chỉ lấy axis nhân vật, đúng thứ tự ghép câu', () => {
    expect(characterTraitAxes(AXES).map((axis) => axis.id)).toEqual([
      'pose',
      'expression',
      'outfit',
      'costume',
      'base',
    ]);
  });

  it('bỏ qua axis đã bị xóa hoặc không còn option nào', () => {
    const axes = AXES.filter((axis) => axis.id !== 'costume').concat({
      id: 'base',
      label: 'Đế trưng bày',
      options: [],
    });
    const ids = characterTraitAxes(axes).map((axis) => axis.id);
    expect(ids).not.toContain('costume');
    expect(ids.filter((id) => id === 'base')).toHaveLength(1);
  });
});

describe('pickVariantTraits', () => {
  it('random được inject — không gọi Math.random', () => {
    const traits = pickVariantTraits(AXES, () => 0.99);
    expect(traits.pose?.id).toBe('waving');
    expect(traits.expression?.id).toBe('grin');
    expect(traits.costume?.id).toBe('samurai');
  });

  it('không đụng tới axis thẩm mỹ như phong cách — ảnh gốc quyết định phong cách', () => {
    const traits = pickVariantTraits(AXES, () => 0);
    expect(Object.keys(traits)).not.toContain('style');
  });
});

describe('variantChanges', () => {
  it('bộ cosplay ghi đè trang phục', () => {
    const changes = variantChanges({
      outfit: option('hoodie', 'wearing a hoodie'),
      costume: option('samurai', 'in samurai armour'),
    });
    expect(changes).toEqual([{ label: 'Clothing', text: 'in samurai armour' }]);
  });

  it('bộ cosplay "none" trả quyền mô tả lại cho trang phục', () => {
    const changes = variantChanges({
      outfit: option('hoodie', 'wearing a hoodie'),
      costume: option('none', 'no costume'),
    });
    expect(changes).toEqual([{ label: 'Clothing', text: 'wearing a hoodie' }]);
  });

  it('option "mặc định" không sinh dòng thay đổi nào', () => {
    expect(
      variantChanges({
        pose: option('default', 'standing naturally'),
        expression: option('default', 'a neutral face'),
        base: option('default', 'a plain base'),
      }),
    ).toEqual([]);
  });

  it('giữ đúng thứ tự pose → biểu cảm → trang phục → đế', () => {
    const changes = variantChanges({
      pose: option('waving', 'waving one hand'),
      expression: option('grin', 'a wide grin'),
      outfit: option('hoodie', 'wearing a hoodie'),
      base: option('plinth', 'a round plinth'),
    });
    expect(changes.map((change) => change.label)).toEqual([
      'Pose',
      'Facial expression',
      'Clothing',
      'Display base',
    ]);
  });
});

describe('buildVariantInstruction', () => {
  it('bắt Gemini tả lại đúng vật trong ảnh, không sinh sản phẩm mới', () => {
    const text = buildVariantInstruction({ source: 'data', traits: {} });
    expect(text).toContain('recreates THAT SAME object');
    expect(text).toContain('same colour scheme');
  });

  it('liệt kê đúng các thay đổi đã chọn và cấm đổi thứ khác', () => {
    const text = buildVariantInstruction({
      source: 'data',
      traits: {
        pose: option('waving', 'waving one hand'),
        costume: option('samurai', 'in samurai armour'),
      },
    });
    expect(text).toContain('Apply exactly these changes and change nothing else:');
    expect(text).toContain('- Pose: waving one hand');
    expect(text).toContain('- Clothing: in samurai armour');
    expect(text).not.toContain('Facial expression:');
  });

  it('không có thay đổi nào thì nói rõ là tả y nguyên ảnh', () => {
    const text = buildVariantInstruction({
      source: 'data',
      traits: { pose: option('default', 'standing naturally') },
    });
    expect(text).toContain('no changes requested');
    expect(text).not.toContain('Apply exactly these changes');
  });

  it('chế độ để model tự chọn thì không gửi kèm option nào', () => {
    const text = buildVariantInstruction({
      source: 'model',
      traits: { pose: option('waving', 'waving one hand') },
    });
    expect(text).not.toContain('waving one hand');
    expect(text).toContain('choosing each one yourself at random');
  });

  it('luôn khoá nền trắng phẳng, đủ khung, không đổ bóng — để đưa thẳng vào tool ảnh → 3D', () => {
    for (const source of ['data', 'model'] as const) {
      const text = buildVariantInstruction({ source, traits: {} });
      expect(text).toContain('image-to-3D tool');
      expect(text).toContain('plain pure white background');
      expect(text).toContain('Soft shadowless light');
      expect(text).toContain('fits inside the frame with clear empty margin');
      expect(text).toContain('the only thing in the frame');
    }
  });

  it('luôn dặn bỏ qua trait với vật không có mặt tay chân', () => {
    for (const source of ['data', 'model'] as const) {
      expect(buildVariantInstruction({ source, traits: {} })).toContain('no face, arms or legs');
    }
  });
});
