import { describe, expect, it } from 'vitest';
import { SLICER_TARGETS_BY_ID } from '../data/slicerTargets';
import type { ArchiveFile } from '../types';
import {
  buildGeometryArchive,
  buildMappingText,
  buildProcessPreset,
  geometryFileName,
} from './buildSlicerHandoff';
import { convertToTargetMachine } from './convertToTargetMachine';
import { inspectProjectFile } from './inspectProjectFile';

const encoder = new TextEncoder();

function file(path: string, text: string): ArchiveFile {
  return { path, bytes: encoder.encode(text) };
}

const PROJECT_FILES: ArchiveFile[] = [
  file('[Content_Types].xml', '<Types />'),
  file('_rels/.rels', '<Relationships />'),
  file('3D/3dmodel.model', '<model />'),
  file('3D/Objects/object_1.model', '<model />'),
  file('Metadata/plate_1.gcode', '; gcode'),
  file('Metadata/plate_1.png', 'png'),
  file(
    'Metadata/project_settings.config',
    JSON.stringify({
      printer_settings_id: 'Bambu Lab A1 0.4 nozzle',
      print_settings_id: '0.20mm Standard @BBL A1',
      layer_height: '0.2',
      wall_loops: '3',
      sparse_infill_density: '15%',
      travel_speed: ['700'],
      default_acceleration: ['6000'],
      nozzle_temperature: ['220'],
      machine_start_gcode: 'G28',
    }),
  ),
];

const inspection = inspectProjectFile('lamp shade.3mf', PROJECT_FILES);
const snapmaker = SLICER_TARGETS_BY_ID['snapmaker-orca']!;
const cura = SLICER_TARGETS_BY_ID['cura']!;

describe('geometryFileName', () => {
  it('giữ tên gốc, đổi đuôi và thêm hậu tố', () => {
    expect(geometryFileName('lamp shade.3mf')).toBe('lamp shade-geometry.3mf');
    expect(geometryFileName('a/b:c.3mf')).toBe('a-b-c-geometry.3mf');
  });
});

describe('buildGeometryArchive', () => {
  it('giữ hình học + file cấu trúc, bỏ preset / gcode / thumbnail', () => {
    const kept = buildGeometryArchive(PROJECT_FILES).map((entry) => entry.path);

    expect(kept).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      '3D/3dmodel.model',
      '3D/Objects/object_1.model',
    ]);
  });

  it('báo lỗi khi không có file hình học nào', () => {
    expect(() => buildGeometryArchive([file('[Content_Types].xml', '<Types />')])).toThrow(
      /không có file hình học/,
    );
  });
});

describe('buildProcessPreset', () => {
  it('mặc định chỉ mang nhóm hình học, bỏ nhóm phụ thuộc máy', () => {
    const preset = buildProcessPreset(inspection, snapmaker);
    const parsed = JSON.parse(preset.json) as Record<string, unknown>;

    expect(parsed['type']).toBe('process');
    expect(parsed['from']).toBe('User');
    expect(parsed['layer_height']).toBe('0.2');
    expect(parsed['wall_loops']).toBe('3');
    expect(parsed['travel_speed']).toBeUndefined();
    expect(parsed['default_acceleration']).toBeUndefined();
    expect(preset.skippedMachineTierKeys).toContain('travel_speed');
  });

  it('bật mang theo nhóm máy thì giữ nguyên kiểu giá trị gốc (mảng vẫn là mảng)', () => {
    const preset = buildProcessPreset(inspection, snapmaker, true);
    const parsed = JSON.parse(preset.json) as Record<string, unknown>;

    expect(parsed['travel_speed']).toEqual(['700']);
    expect(preset.skippedMachineTierKeys).toHaveLength(0);
  });

  it('không bao giờ nhét khoá filament hay khoá máy vào preset process', () => {
    const preset = buildProcessPreset(inspection, snapmaker, true);
    const parsed = JSON.parse(preset.json) as Record<string, unknown>;

    expect(parsed['nozzle_temperature']).toBeUndefined();
    expect(parsed['machine_start_gcode']).toBeUndefined();
    expect(parsed['printer_settings_id']).toBeUndefined();
    expect(preset.skippedFilamentKeys).toContain('nozzle_temperature');
  });

  it('tên preset gắn tên slicer đích, tên file bỏ ký tự cấm', () => {
    const preset = buildProcessPreset(inspection, snapmaker);

    expect(preset.presetName).toBe('0.20mm Standard @BBL A1 @Snapmaker Orca');
    expect(preset.fileName).toBe('0.20mm Standard @BBL A1 @Snapmaker Orca.json');
  });

  it('file không có thông số thì báo lỗi rõ ràng thay vì sinh preset rỗng', () => {
    const plain = inspectProjectFile('plain.3mf', [file('3D/3dmodel.model', '<model />')]);

    expect(() => buildProcessPreset(plain, snapmaker)).toThrow(/không mang theo thông số/);
  });
});

describe('buildMappingText', () => {
  it('với slicer cùng họ thì cột đích là tên khoá', () => {
    const text = buildMappingText(inspection, snapmaker);

    expect(text).toContain('`layer_height`');
    expect(text).toContain('| Quality → Layer height | 0.2 |');
  });

  it('với Cura thì cột đích là tên ô trong Cura', () => {
    const text = buildMappingText(inspection, cura);

    expect(text).toContain('Wall Line Count');
    expect(text).toContain('Ô tương ứng trong Cura');
  });

  it('ô không có tương đương trong Cura thì nói rõ phải tự đặt, không đoán tên ô', () => {
    const withoutEquivalent = inspectProjectFile('x.3mf', [
      file('3D/3dmodel.model', '<model />'),
      file(
        'Metadata/project_settings.config',
        JSON.stringify({ filament_max_volumetric_speed: ['21'] }),
      ),
    ]);

    expect(buildMappingText(withoutEquivalent, cura)).toContain('phải tự đặt');
  });

  it('đánh dấu dòng phụ thuộc máy để user biết phải xem lại', () => {
    const text = buildMappingText(inspection, snapmaker);

    expect(text).toContain('phụ thuộc máy/filament — phải xem lại');
  });

  it('có kết quả quy đổi thì thêm cột giá trị quy đổi', () => {
    const conversion = convertToTargetMachine(inspection, 'kobra-x');
    const text = buildMappingText(inspection, snapmaker, conversion);

    expect(text).toContain('Giá trị quy đổi');
    // Nhóm hình học giữ nguyên, nhóm máy lấy số của Kobra X
    expect(text).toContain('3 (giữ nguyên)');
    expect(text).toContain('⚠️ 300 (khác file — sửa theo 0.20mm Standard @Anycubic Kobra X)');
    // Nhóm filament không bao giờ có số
    expect(text).toContain('chưa có dữ liệu — Phụ thuộc cuộn filament');
  });

  it('ô máy đích để trùng số thì nói rõ là trùng, không bắt user sửa vô ích', () => {
    const conversion = convertToTargetMachine(inspection, 'kobra-x');
    const text = buildMappingText(inspection, snapmaker, conversion);

    // default_acceleration: A1 và Kobra X cùng 6000 ở preset 0.20mm Standard
    expect(text).toContain('6000 (máy đích để cùng số)');
    expect(conversion.changedCount).toBeLessThan(inspection.settings.length);
  });
});
