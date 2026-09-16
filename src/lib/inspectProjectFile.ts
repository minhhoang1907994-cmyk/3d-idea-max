import { MACHINE_ONLY_KEY_PREFIXES, SETTING_MAP } from '../data/settingMap';
import type {
  ArchiveEntrySummary,
  ArchiveFile,
  ArchiveRole,
  ExtractedSetting,
  PrintWarning,
  ProjectInspection,
} from '../types';

/**
 * Đọc một project file `.3mf` đã giải nén và mô tả lại: file nào mang hình học, file nào
 * là preset của máy cũ, thông số nào đọc được.
 *
 * Nguồn sự thật về cấu trúc file: docs/research/slicer-interop.md mục 1.
 *
 * Nguyên tắc: mọi giá trị ở đây đọc TRỰC TIẾP từ file user đưa vào. Hàm này không tính
 * toán, không quy đổi, không điền giá trị mặc định — khoá nào file không có thì không có.
 */

const PROJECT_SETTINGS_PATH = 'Metadata/project_settings.config';
const PRUSA_SETTINGS_PATH = 'Metadata/Slic3r_PE.config';

/** Đường dẫn của file cấu trúc bắt buộc theo đặc tả 3MF — phải giữ khi xuất lại. */
function isStructurePath(path: string): boolean {
  return path === '[Content_Types].xml' || path.includes('_rels/');
}

export function classifyEntry(path: string): ArchiveRole {
  const lower = path.toLowerCase();
  if (isStructurePath(path)) return 'structure';
  if (lower.startsWith('3d/') && lower.endsWith('.model')) return 'geometry';
  if (lower.endsWith('.gcode') || lower.endsWith('.gcode.md5')) return 'gcode';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'thumbnail';
  }
  if (lower.startsWith('metadata/')) return 'settings';
  return 'other';
}

/** Chỉ hai vai trò này đi theo file hình học xuất ra — phần còn lại là của máy cũ. */
export function isKeptForGeometry(role: ArchiveRole): boolean {
  return role === 'geometry' || role === 'structure';
}

/** Giá trị trong `project_settings.config` có thể là chuỗi hoặc mảng chuỗi. */
export function normalizeSettingValue(raw: unknown): string | null {
  if (typeof raw === 'string') return raw.trim() === '' ? null : raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (Array.isArray(raw)) {
    const parts = raw.map((item) => normalizeSettingValue(item)).filter((item) => item !== null);
    return parts.length === 0 ? null : parts.join(', ');
  }
  return null;
}

export function isMachineOnlyKey(key: string): boolean {
  return MACHINE_ONLY_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function readStringList(raw: unknown): string[] {
  if (typeof raw === 'string') return raw.trim() === '' ? [] : [raw];
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && item.trim() !== '') seen.add(item);
  }
  return [...seen];
}

function readOptionalString(raw: unknown): string | null {
  return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
}

/**
 * Tên ứng dụng ghi trong file model, ví dụ `BambuStudio-01.10.00.89`.
 * Đọc bằng regex thay vì DOMParser để hàm này chạy được cả trong test (môi trường node).
 */
export function readProducerFromModel(modelXml: string): string | null {
  const match = /<metadata[^>]*name="Application"[^>]*>([^<]*)<\/metadata>/i.exec(modelXml);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function buildWarnings(args: {
  hasGeometry: boolean;
  hasProjectSettings: boolean;
  hasPrusaSettings: boolean;
  printerPreset: string | null;
  gcodeCount: number;
  machineKeyCount: number;
  unmappedKeyCount: number;
}): PrintWarning[] {
  const warnings: PrintWarning[] = [];

  if (!args.hasGeometry) {
    warnings.push({
      level: 'warning',
      message:
        'Không tìm thấy file hình học nào trong archive (3D/*.model) — file này có thể không phải 3mf, hoặc chỉ chứa cấu hình.',
    });
  }

  if (!args.hasProjectSettings) {
    warnings.push({
      level: args.hasPrusaSettings ? 'warning' : 'info',
      message: args.hasPrusaSettings
        ? 'File dùng cấu hình kiểu PrusaSlicer (Metadata/Slic3r_PE.config) — app chưa đọc được định dạng này, nên chỉ xuất được file hình học.'
        : 'File không mang theo thông số cắt lớp — chỉ có hình học. Mở trực tiếp ở slicer nào cũng được, không cần chuyển đổi gì.',
    });
  }

  if (args.printerPreset) {
    warnings.push({
      level: 'warning',
      message: `Preset trong file trỏ vào máy "${args.printerPreset}". Sang slicer khác bạn phải tự chọn máy của mình — app không ánh xạ máy sang máy vì không có bảng tương đương chính hãng.`,
      sourceUrl: 'https://simplyprint.io/articles/orcaslicer-forks-compared',
    });
  }

  if (args.gcodeCount > 0) {
    warnings.push({
      level: 'warning',
      message: `File chứa ${args.gcodeCount} file gcode đã cắt lớp cho đúng máy cũ. Bản hình học xuất ra đã bỏ chúng — bạn phải cắt lớp lại trên máy của mình.`,
    });
  }

  if (args.machineKeyCount > 0) {
    warnings.push({
      level: 'info',
      message: `${args.machineKeyCount} khoá thuộc đặc tính máy (gcode khởi động, giới hạn tốc độ/gia tốc, khổ in...) bị loại khỏi preset xuất ra — bê sang máy khác là hỏng bản in.`,
    });
  }

  if (args.unmappedKeyCount > 0) {
    warnings.push({
      level: 'info',
      message: `${args.unmappedKeyCount} khoá khác trong file chưa có trong bảng ánh xạ đã verify của app, nên không đưa vào preset. Muốn dùng thì mở file gốc trên slicer cùng họ và copy tay.`,
    });
  }

  return warnings;
}

/**
 * @param fileName Tên file user đưa vào — chỉ để hiển thị lại
 * @param files Danh sách entry đã giải nén từ archive
 */
export function inspectProjectFile(fileName: string, files: ArchiveFile[]): ProjectInspection {
  const entries: ArchiveEntrySummary[] = files.map((file) => {
    const role = classifyEntry(file.path);
    return { path: file.path, role, sizeBytes: file.bytes.length, kept: isKeptForGeometry(role) };
  });

  const settingsFile = files.find((file) => file.path === PROJECT_SETTINGS_PATH);
  const modelFile = files.find((file) => file.path.toLowerCase() === '3d/3dmodel.model');

  let rawSettings: Record<string, unknown> | null = null;
  if (settingsFile) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decodeText(settingsFile.bytes));
    } catch {
      throw new Error(`Không đọc được ${PROJECT_SETTINGS_PATH} — file JSON bên trong bị lỗi.`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${PROJECT_SETTINGS_PATH} không đúng dạng đối tượng JSON.`);
    }
    rawSettings = parsed as Record<string, unknown>;
  }

  const settings: ExtractedSetting[] = [];
  if (rawSettings) {
    for (const mapping of SETTING_MAP) {
      const value = normalizeSettingValue(rawSettings[mapping.orcaKey]);
      if (value !== null) settings.push({ mapping, value });
    }
  }

  const mappedKeys = new Set(SETTING_MAP.map((mapping) => mapping.orcaKey));
  const allKeys = rawSettings ? Object.keys(rawSettings) : [];
  const machineKeyCount = allKeys.filter((key) => isMachineOnlyKey(key)).length;
  const unmappedKeyCount = allKeys.filter(
    (key) => !mappedKeys.has(key) && !isMachineOnlyKey(key),
  ).length;

  const printerPreset = rawSettings ? readOptionalString(rawSettings['printer_settings_id']) : null;

  return {
    fileName,
    producedBy: modelFile ? readProducerFromModel(decodeText(modelFile.bytes)) : null,
    printerPreset,
    processPreset: rawSettings ? readOptionalString(rawSettings['print_settings_id']) : null,
    filamentPresets: rawSettings ? readStringList(rawSettings['filament_settings_id']) : [],
    entries,
    rawSettings,
    settings,
    unmappedKeyCount,
    warnings: buildWarnings({
      hasGeometry: entries.some((entry) => entry.role === 'geometry'),
      hasProjectSettings: rawSettings !== null,
      hasPrusaSettings: files.some((file) => file.path === PRUSA_SETTINGS_PATH),
      printerPreset,
      gcodeCount: entries.filter((entry) => entry.role === 'gcode').length,
      machineKeyCount,
      unmappedKeyCount,
    }),
  };
}
