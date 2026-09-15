import { describe, expect, it } from 'vitest';
import { BUNDLED_DATA } from '../data/bundledData';
import { FILAMENTS } from '../data/filaments';
import { PRINTERS_BY_ID } from '../data/printers';
import { buildMeshChecklist } from './buildMeshChecklist';
import { minFeatureMm } from './buildPrompt';
import { mixIdeas, type MixInput } from './mixIdeas';

const input: MixInput = { ...BUNDLED_DATA, filaments: FILAMENTS };
const printer = PRINTERS_BY_ID['a1']!;
const { sizes: SIZE_OPTIONS, details: DETAIL_OPTIONS } = BUNDLED_DATA.technicalAxes;

const baseMix = mixIdeas(input, () => 0.5, 1);

describe('buildMeshChecklist', () => {
  it('luôn có các bước bắt buộc của khâu ảnh → STL', () => {
    const ids = buildMeshChecklist(baseMix, printer).map((item) => item.id);
    expect(ids).toContain('repair-manifold');
    expect(ids).toContain('set-scale');
    expect(ids).toContain('check-thickness');
    expect(ids).toContain('orient-base');
    expect(ids).toContain('preview-overhang');
  });

  it('nhắc đúng kích thước đã chọn để user đặt lại tỉ lệ', () => {
    const size = SIZE_OPTIONS[0]!;
    const item = buildMeshChecklist({ ...baseMix, size }, printer).find(
      (entry) => entry.id === 'set-scale',
    );
    expect(item?.label).toContain(String(size.longestEdgeMm));
  });

  it('ngưỡng bề dày khớp với ngưỡng đã đưa vào prompt', () => {
    const item = buildMeshChecklist(baseMix, printer).find(
      (entry) => entry.id === 'check-thickness',
    );
    expect(item?.label).toContain(`${minFeatureMm()} mm`);
  });

  it('chỉ nhắc giảm tam giác khi mức chi tiết đủ mịn', () => {
    const fine = DETAIL_OPTIONS.find((item) => item.layerHeightMm <= 0.12)!;
    const draft = DETAIL_OPTIONS.find((item) => item.layerHeightMm > 0.12)!;
    const has = (detail: typeof fine) =>
      buildMeshChecklist({ ...baseMix, detail }, printer).some((item) => item.id === 'decimate');
    expect(has(fine)).toBe(true);
    expect(has(draft)).toBe(false);
  });

  it('mọi mục đều có việc cần làm, rủi ro và công cụ — không để trống', () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (const item of buildMeshChecklist(
        mixIdeas(input, () => 0.5, level),
        printer,
      )) {
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.risk.length).toBeGreaterThan(0);
        expect(item.tool.length).toBeGreaterThan(0);
        expect(item.label).not.toContain('undefined');
        expect(item.risk).not.toContain('undefined');
      }
    }
  });

  it('id duy nhất — dùng làm key khi render', () => {
    const ids = buildMeshChecklist(baseMix, printer).map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
