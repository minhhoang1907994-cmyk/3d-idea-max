import { describe, expect, it } from 'vitest';
import { BUNDLED_DATA } from '../data/bundledData';
import { FILAMENTS } from '../data/filaments';
import { buildFlowPrompt } from './buildFlowPrompt';
import { buildPrompt, buildStyleClause, buildSubjectPhrase, minFeatureMm } from './buildPrompt';
import { mixIdeas, type MixInput } from './mixIdeas';

const input: MixInput = { ...BUNDLED_DATA, filaments: FILAMENTS };
const { sizes: SIZE_OPTIONS } = BUNDLED_DATA.technicalAxes;
const baseMix = mixIdeas(input, () => 0.5, 1);

describe('buildFlowPrompt', () => {
  it('yêu cầu BỐN góc nhìn nằm trong một ảnh — lý do duy nhất để tách khỏi prompt Gemini', () => {
    const prompt = buildFlowPrompt(baseMix);
    expect(prompt).toContain('four-view turntable sheet');
    expect(prompt).toContain('two-by-two grid');
  });

  it('nêu đích danh từng góc, không để model tự quyết', () => {
    const prompt = buildFlowPrompt(baseMix);
    for (const view of ['front view', 'left side view', 'three-quarter view', 'back view']) {
      expect(prompt).toContain(view);
    }
  });

  it('bắt bốn ô phải là cùng một vật thể', () => {
    expect(buildFlowPrompt(baseMix)).toContain('the same object with identical shape');
  });

  it('không còn chữ nào của prompt video — Flow dùng để sinh ảnh, không sinh clip', () => {
    const prompt = buildFlowPrompt(baseMix).toLowerCase();
    for (const videoWord of ['orbit', 'camera', 'ambient noise', 'shot', 'frame at a fixed']) {
      expect(prompt).not.toContain(videoWord);
    }
  });

  it('dùng chung chủ thể, phong cách và phông với prompt Gemini', () => {
    for (const level of [1, 2, 3, 4] as const) {
      const mix = mixIdeas(input, () => 0.5, level);
      const prompt = buildFlowPrompt(mix);
      expect(prompt).toContain(buildSubjectPhrase(mix));
      expect(prompt).toContain(buildStyleClause(mix));
      expect(prompt).toContain('a seamless light grey studio backdrop');
    }
  });

  it('viết khẳng định như prompt Gemini — cùng họ model Nano Banana', () => {
    // Chỉ xét phần khung do buildFlowPrompt tự thêm; vài promptText trong mechanisms.json
    // đang dùng "without", đó là dữ liệu, thuộc phạm vi khác.
    const scaffold = buildFlowPrompt(baseMix)
      .replace(buildSubjectPhrase(baseMix), '')
      .replace(buildStyleClause(baseMix), '');
    expect(scaffold.toLowerCase()).not.toMatch(/\b(no|without|avoid)\b/);
  });

  it('không dùng cú pháp tham số của Midjourney', () => {
    expect(buildFlowPrompt(baseMix)).not.toContain('--');
  });
});

describe('buildFlowPrompt — ràng buộc in được', () => {
  it('dùng CHUNG nguyên bộ ràng buộc với prompt Gemini, không rút gọn', () => {
    const prompt = buildFlowPrompt(baseMix);
    for (const clause of [
      'one connected mass resting on a flat stable base',
      'rests on something beneath it',
      '45 degrees',
      `${minFeatureMm()} mm thick`,
    ]) {
      expect(prompt).toContain(clause);
      expect(buildPrompt(baseMix)).toContain(clause);
    }
  });

  it('ngưỡng bề dày khớp prompt Gemini ở mọi kích thước', () => {
    for (const size of SIZE_OPTIONS) {
      const mix = { ...baseMix, size };
      const threshold = /roughly ([\d.]+)% of the object's width/;
      expect(buildFlowPrompt(mix).match(threshold)?.[1]).toBe(
        buildPrompt(mix).match(threshold)?.[1],
      );
    }
  });

  it('tắt thì bỏ ràng buộc hình học, giữ nguyên phần bố cục bốn góc', () => {
    const prompt = buildFlowPrompt(baseMix, { printability: false });
    expect(prompt).not.toContain('flat stable base');
    expect(prompt).not.toContain('45 degrees');
    expect(prompt).toContain('four-view turntable sheet');
  });
});

describe("buildFlowPrompt — luồng 'từ ảnh Gemini'", () => {
  const fromImage = (mix = baseMix) => buildFlowPrompt(mix, { source: 'image' });

  it('trỏ vào ảnh đính kèm thay vì tả lại chủ thể', () => {
    const prompt = fromImage();
    expect(prompt).toContain('Keep the object in the attached image exactly as it is');
    expect(prompt).not.toContain(baseMix.product.promptText);
  });

  it('bỏ phong cách và ràng buộc hình học — ảnh đã khoá rồi', () => {
    const prompt = fromImage();
    expect(prompt).not.toContain(baseMix.attributes.style.promptText);
    expect(prompt).not.toContain('flat stable base');
  });

  it('vẫn giữ bố cục bốn góc và ràng buộc cùng một vật thể', () => {
    const prompt = fromImage();
    expect(prompt).toContain('four-view turntable sheet');
    expect(prompt).toContain('the same object with identical shape');
  });

  it('ngắn hơn hẳn luồng từ text ở mọi mức sáng tạo', () => {
    for (const level of [1, 2, 3, 4] as const) {
      const mix = mixIdeas(input, () => 0.9, level);
      expect(fromImage(mix).length).toBeLessThan(buildFlowPrompt(mix).length);
    }
  });

  it('không phụ thuộc mix — mọi tổ hợp cho ra cùng một prompt', () => {
    const first = fromImage(mixIdeas(input, () => 0.1, 1));
    for (const level of [1, 2, 3, 4] as const) {
      expect(fromImage(mixIdeas(input, () => 0.7, level))).toBe(first);
    }
  });

  it("'text' là mặc định, khác với 'image'", () => {
    expect(buildFlowPrompt(baseMix)).toBe(buildFlowPrompt(baseMix, { source: 'text' }));
    expect(buildFlowPrompt(baseMix)).not.toBe(fromImage());
  });
});

describe('buildFlowPrompt — tính bền', () => {
  it('không sinh undefined hay placeholder sót ở mọi mức sáng tạo', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (let step = 0; step < 30; step += 1) {
        const prompt = buildFlowPrompt(mixIdeas(input, () => step / 30, level));
        expect(prompt).not.toContain('undefined');
        expect(prompt).not.toContain('{A}');
        expect(prompt).not.toContain('{B}');
        expect(prompt).not.toContain('  ');
      }
    }
  });

  it('cùng input cho ra cùng chuỗi', () => {
    expect(buildFlowPrompt(baseMix)).toBe(buildFlowPrompt(baseMix));
  });
});
