import { describe, expect, it } from 'vitest';
import { MACHINE_PROCESS_PRESETS } from '../data/machinePresets';
import { SETTING_MAP_BY_KEY } from '../data/settingMap';
import { PRINTERS_BY_ID } from '../data/printers';
import type { ArchiveFile } from '../types';
import {
  availableLayerHeights,
  convertToTargetMachine,
  findTargetPreset,
  readLayerHeightMm,
  readNozzleMm,
  readSourceTier,
} from './convertToTargetMachine';
import { inspectProjectFile } from './inspectProjectFile';

const encoder = new TextEncoder();

/** File 3mf giả lập preset 0.20mm Standard của máy A1, nozzle 0.4. */
function project(settings: Record<string, unknown> = {}) {
  const config = {
    printer_settings_id: 'Bambu Lab A1 0.4 nozzle',
    print_settings_id: '0.20mm Standard @BBL A1',
    nozzle_diameter: ['0.4'],
    layer_height: '0.2',
    wall_loops: '4',
    sparse_infill_density: '25%',
    travel_speed: ['700'],
    default_acceleration: ['6000'],
    nozzle_temperature: ['220'],
    ...settings,
  };
  const files: ArchiveFile[] = [
    { path: '3D/3dmodel.model', bytes: encoder.encode('<model />') },
    {
      path: 'Metadata/project_settings.config',
      bytes: encoder.encode(JSON.stringify(config)),
    },
  ];
  return inspectProjectFile('test.3mf', files);
}

describe('dữ liệu preset chính hãng', () => {
  it('mọi preset đều trỏ tới máy có thật trong printers.ts và có sourceUrl', () => {
    for (const preset of MACHINE_PROCESS_PRESETS) {
      expect(PRINTERS_BY_ID[preset.printerId]).toBeDefined();
      expect(preset.sourceUrl).toMatch(/^https:\/\/github\.com\/SoftFever\/OrcaSlicer\//);
    }
  });

  it('chỉ chứa khoá có trong bảng ánh xạ đã verify', () => {
    for (const preset of MACHINE_PROCESS_PRESETS) {
      for (const key of Object.keys(preset.values)) {
        expect(SETTING_MAP_BY_KEY[key], `khoá lạ: ${key}`).toBeDefined();
      }
    }
  });
});

describe('đọc thông tin nguồn từ file', () => {
  it('lấy đúng nozzle, layer height, bậc chất lượng', () => {
    const inspection = project();

    expect(readNozzleMm(inspection)).toBe(0.4);
    expect(readLayerHeightMm(inspection)).toBe(0.2);
    expect(readSourceTier(inspection)).toBe('Standard');
  });

  it('file không ghi nozzle thì dùng 0.4, không ghi layer height thì trả null', () => {
    const inspection = inspectProjectFile('x.3mf', [
      { path: 'Metadata/project_settings.config', bytes: encoder.encode('{}') },
    ]);

    expect(readNozzleMm(inspection)).toBe(0.4);
    expect(readLayerHeightMm(inspection)).toBeNull();
  });
});

describe('findTargetPreset', () => {
  it('khớp đúng layer height + nozzle của máy đích', () => {
    expect(findTargetPreset('kobra-x', 0.2, 0.4)?.name).toBe('0.20mm Standard @Anycubic Kobra X');
  });

  it('máy chưa nhúng preset thì trả null, không mượn preset của máy khác', () => {
    expect(findTargetPreset('a1', 0.2, 0.4)).toBeNull();
    expect(findTargetPreset('p1s', 0.2, 0.4)).toBeNull();
  });

  it('ưu tiên bậc chất lượng trùng với file, không có thì lấy Standard', () => {
    expect(findTargetPreset('kobra-x', 0.2, 0.4, 'High Quality')?.name).toBe(
      '0.20mm High Quality @Anycubic Kobra X',
    );
    expect(findTargetPreset('kobra-x', 0.2, 0.4, 'Bậc không tồn tại')?.qualityTier).toBe(
      'Standard',
    );
  });

  it('không có preset khớp thì trả null, không lấy đại preset gần đúng', () => {
    expect(findTargetPreset('kobra-x', 0.06, 0.4)).toBeNull();
    expect(findTargetPreset('kobra-x', 0.2, 0.8)).toBeNull();
  });
});

describe('convertToTargetMachine', () => {
  it('nhóm hình học giữ nguyên số trong file', () => {
    const result = convertToTargetMachine(project(), 'kobra-x');

    expect(result.byKey['wall_loops']).toEqual({ kind: 'keep', value: '4' });
    expect(result.byKey['sparse_infill_density']).toEqual({ kind: 'keep', value: '25%' });
  });

  it('nhóm phụ thuộc máy lấy số từ preset chính hãng của máy đích', () => {
    const result = convertToTargetMachine(project(), 'kobra-x');
    const travel = result.byKey['travel_speed'];

    expect(travel?.kind).toBe('target');
    // A1 chạy 700 mm/s, Kobra X là máy bedslinger nên preset hãng để 300 mm/s
    expect(travel).toMatchObject({ kind: 'target', value: '300' });
    expect(result.preset?.name).toBe('0.20mm Standard @Anycubic Kobra X');
  });

  it('nhóm filament luôn là chưa có dữ liệu — không đoán theo máy', () => {
    const result = convertToTargetMachine(project(), 'kobra-x');

    expect(result.byKey['nozzle_temperature']).toMatchObject({ kind: 'unavailable' });
    expect(result.byKey['nozzle_temperature']?.kind === 'unavailable').toBe(true);
  });

  it('máy đích không có preset ở layer height đó thì nêu rõ các mức nó có', () => {
    const result = convertToTargetMachine(project({ layer_height: '0.06' }), 'kobra-x');

    expect(result.preset).toBeNull();
    expect(result.presetNote).toContain('0.08 mm');
    expect(result.byKey['travel_speed']).toMatchObject({ kind: 'unavailable' });
    // Nhóm hình học vẫn quy đổi được vì không phụ thuộc preset máy
    expect(result.byKey['wall_loops']).toEqual({ kind: 'keep', value: '4' });
  });

  it('máy chưa nhúng preset thì nói rõ lý do, không im lặng đưa số sai', () => {
    const result = convertToTargetMachine(project(), 'a1');

    expect(result.preset).toBeNull();
    expect(result.presetNote).toContain('chưa có preset chính hãng');
    expect(result.byKey['travel_speed']).toMatchObject({ kind: 'unavailable' });
  });

  it('đánh dấu changed đúng cho ô khác file, và không đánh dấu ô trùng số', () => {
    const result = convertToTargetMachine(project(), 'kobra-x');

    // A1 700 → Kobra X 300
    expect(result.byKey['travel_speed']).toMatchObject({ kind: 'target', changed: true });
    // Cùng 6000 ở cả hai máy
    expect(result.byKey['default_acceleration']).toMatchObject({
      kind: 'target',
      value: '6000',
      changed: false,
    });
    expect(result.changedCount).toBeGreaterThan(0);
  });

  it('ô bù sai số của máy (elephant foot) lấy theo máy đích, không giữ nguyên', () => {
    const result = convertToTargetMachine(
      project({ elefant_foot_compensation: '0.075' }),
      'kobra-x',
    );

    expect(result.byKey['elefant_foot_compensation']).toMatchObject({
      kind: 'target',
      value: '0.1',
      changed: true,
    });
  });
});

describe('availableLayerHeights', () => {
  it('liệt kê tăng dần, không trùng lặp', () => {
    const heights = availableLayerHeights('kobra-x', 0.4);

    expect(heights).toEqual([...new Set(heights)].sort((left, right) => left - right));
    expect(heights).toContain(0.2);
  });
});
