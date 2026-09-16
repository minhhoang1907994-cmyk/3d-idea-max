import { describe, expect, it } from 'vitest';
import type { ArchiveFile } from '../types';
import {
  classifyEntry,
  inspectProjectFile,
  isMachineOnlyKey,
  normalizeSettingValue,
  readProducerFromModel,
} from './inspectProjectFile';

const encoder = new TextEncoder();

function file(path: string, text: string): ArchiveFile {
  return { path, bytes: encoder.encode(text) };
}

/** Dựng lại đúng bộ file mà một project 3mf của Bambu Studio mang theo. */
function bambuProject(settings: Record<string, unknown> = {}): ArchiveFile[] {
  return [
    file('[Content_Types].xml', '<Types />'),
    file('_rels/.rels', '<Relationships />'),
    file(
      '3D/3dmodel.model',
      '<model><metadata name="Application">BambuStudio-01.10.00.89</metadata></model>',
    ),
    file('Metadata/plate_1.gcode', '; gcode'),
    file('Metadata/plate_1.png', 'png'),
    file('Metadata/model_settings.config', '<config />'),
    file(
      'Metadata/project_settings.config',
      JSON.stringify({
        printer_settings_id: 'Bambu Lab A1 0.4 nozzle',
        print_settings_id: '0.20mm Standard @BBL A1',
        filament_settings_id: ['Bambu PLA Basic @BBL A1'],
        layer_height: '0.2',
        wall_loops: '2',
        sparse_infill_density: '15%',
        travel_speed: ['700'],
        nozzle_temperature: ['220'],
        machine_start_gcode: 'G28',
        printer_model: 'Bambu Lab A1',
        some_future_key: 'x',
        ...settings,
      }),
    ),
  ];
}

describe('classifyEntry', () => {
  it('phân loại đúng từng vai trò trong archive', () => {
    expect(classifyEntry('3D/3dmodel.model')).toBe('geometry');
    expect(classifyEntry('3D/Objects/object_1.model')).toBe('geometry');
    expect(classifyEntry('[Content_Types].xml')).toBe('structure');
    expect(classifyEntry('3D/_rels/3dmodel.model.rels')).toBe('structure');
    expect(classifyEntry('Metadata/project_settings.config')).toBe('settings');
    expect(classifyEntry('Metadata/plate_1.gcode')).toBe('gcode');
    expect(classifyEntry('Metadata/plate_1.png')).toBe('thumbnail');
    expect(classifyEntry('Auxiliaries/note.txt')).toBe('other');
  });
});

describe('normalizeSettingValue', () => {
  it('mảng chuỗi được nối lại, giá trị rỗng trả null', () => {
    expect(normalizeSettingValue(['220', '230'])).toBe('220, 230');
    expect(normalizeSettingValue('0.2')).toBe('0.2');
    expect(normalizeSettingValue('')).toBeNull();
    expect(normalizeSettingValue([])).toBeNull();
    expect(normalizeSettingValue(undefined)).toBeNull();
  });
});

describe('isMachineOnlyKey', () => {
  it('nhận diện khoá thuộc đặc tính máy', () => {
    expect(isMachineOnlyKey('machine_start_gcode')).toBe(true);
    expect(isMachineOnlyKey('printer_model')).toBe(true);
    expect(isMachineOnlyKey('nozzle_diameter')).toBe(true);
    expect(isMachineOnlyKey('layer_height')).toBe(false);
  });
});

describe('readProducerFromModel', () => {
  it('đọc tên phần mềm đã tạo file', () => {
    expect(
      readProducerFromModel(
        '<model><metadata name="Application">BambuStudio-01.10</metadata></model>',
      ),
    ).toBe('BambuStudio-01.10');
    expect(readProducerFromModel('<model />')).toBeNull();
  });
});

describe('inspectProjectFile', () => {
  it('đọc đúng preset máy / process / filament ghi trong file', () => {
    const inspection = inspectProjectFile('chair.3mf', bambuProject());

    expect(inspection.printerPreset).toBe('Bambu Lab A1 0.4 nozzle');
    expect(inspection.processPreset).toBe('0.20mm Standard @BBL A1');
    expect(inspection.filamentPresets).toEqual(['Bambu PLA Basic @BBL A1']);
    expect(inspection.producedBy).toBe('BambuStudio-01.10.00.89');
  });

  it('chỉ giữ file hình học và file cấu trúc khi xuất lại', () => {
    const inspection = inspectProjectFile('chair.3mf', bambuProject());
    const kept = inspection.entries.filter((entry) => entry.kept).map((entry) => entry.path);

    expect(kept).toEqual(['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model']);
  });

  it('lấy ra thông số đã ánh xạ, giữ nguyên giá trị trong file', () => {
    const inspection = inspectProjectFile('chair.3mf', bambuProject());
    const byKey = new Map(inspection.settings.map((item) => [item.mapping.orcaKey, item.value]));

    expect(byKey.get('layer_height')).toBe('0.2');
    expect(byKey.get('sparse_infill_density')).toBe('15%');
    expect(byKey.get('travel_speed')).toBe('700');
    // Khoá thuộc máy không bao giờ nằm trong bảng thông số
    expect(byKey.has('machine_start_gcode')).toBe(false);
  });

  it('đếm khoá chưa có trong bảng ánh xạ, không tính khoá thuộc máy', () => {
    const inspection = inspectProjectFile('chair.3mf', bambuProject());

    // printer_settings_id / printer_model / machine_start_gcode là khoá máy;
    // còn lại chưa ánh xạ: print_settings_id, filament_settings_id, some_future_key
    expect(inspection.unmappedKeyCount).toBe(3);
  });

  it('cảnh báo preset trỏ vào máy cũ và gcode cắt sẵn', () => {
    const messages = inspectProjectFile('chair.3mf', bambuProject()).warnings.map(
      (warning) => warning.message,
    );

    expect(messages.some((message) => message.includes('Bambu Lab A1 0.4 nozzle'))).toBe(true);
    expect(messages.some((message) => message.includes('gcode'))).toBe(true);
  });

  it('file chỉ có hình học thì báo là không cần chuyển đổi gì', () => {
    const inspection = inspectProjectFile('plain.3mf', [
      file('[Content_Types].xml', '<Types />'),
      file('3D/3dmodel.model', '<model />'),
    ]);

    expect(inspection.rawSettings).toBeNull();
    expect(inspection.settings).toHaveLength(0);
    expect(
      inspection.warnings.some((warning) => warning.message.includes('không cần chuyển đổi')),
    ).toBe(true);
  });

  it('nhận ra cấu hình kiểu PrusaSlicer và nói rõ chưa đọc được', () => {
    const inspection = inspectProjectFile('prusa.3mf', [
      file('[Content_Types].xml', '<Types />'),
      file('3D/3dmodel.model', '<model />'),
      file('Metadata/Slic3r_PE.config', '; layer_height = 0.2'),
    ]);

    expect(
      inspection.warnings.some(
        (warning) => warning.level === 'warning' && warning.message.includes('PrusaSlicer'),
      ),
    ).toBe(true);
  });

  it('cảnh báo khi archive không có hình học', () => {
    const inspection = inspectProjectFile('empty.3mf', [file('[Content_Types].xml', '<Types />')]);

    expect(
      inspection.warnings.some((warning) =>
        warning.message.includes('Không tìm thấy file hình học'),
      ),
    ).toBe(true);
  });

  it('báo lỗi rõ ràng khi project_settings.config hỏng', () => {
    expect(() =>
      inspectProjectFile('broken.3mf', [file('Metadata/project_settings.config', '{ hỏng')]),
    ).toThrow(/project_settings.config/);
  });
});
