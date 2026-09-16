import { SETTING_MAP } from '../data/settingMap';
import type { ArchiveFile, ConvertedValue, ProjectInspection, SlicerTarget } from '../types';
import type { ConversionResult } from './convertToTargetMachine';
import { classifyEntry, isKeptForGeometry } from './inspectProjectFile';

/**
 * Sinh ra những thứ user mang sang slicer khác:
 * 1. File `.3mf` chỉ còn hình học — mọi slicer đọc được, không mang preset máy cũ
 * 2. Preset process JSON cho slicer cùng họ Orca
 * 3. Bảng ánh xạ dạng text để nhập tay (Cura, PrusaSlicer)
 *
 * Nguồn sự thật: docs/research/slicer-interop.md mục 3-5.
 *
 * Giới hạn có chủ đích (CLAUDE.md > Quy tắc của project — không đoán thông số in):
 * - KHÔNG quy đổi giá trị bằng công thức. Số đưa ra hoặc là số gốc trong file, hoặc là số
 *   lấy nguyên từ preset chính hãng của máy đích (xem lib/convertToTargetMachine.ts).
 * - KHÔNG sinh preset filament: nhiệt độ trong file là của đúng cuộn filament Bambu đó,
 *   không phải của cuộn user đang nạp.
 * - KHÔNG sinh preset máy: bê gcode khởi động / giới hạn tốc độ sang máy khác là hỏng máy.
 */

/** Đuôi thêm vào tên file hình học xuất ra. */
const GEOMETRY_SUFFIX = '-geometry';

export type ProcessPresetResult = {
  /** Tên file để tải về */
  fileName: string;
  /** Tên preset hiện trong slicer */
  presetName: string;
  /** Nội dung JSON đã format */
  json: string;
  /** Khoá đã đưa vào preset */
  includedKeys: string[];
  /** Khoá tầng máy bị bỏ vì user không bật mang theo */
  skippedMachineTierKeys: string[];
  /** Khoá thuộc preset filament nên không đưa vào preset process */
  skippedFilamentKeys: string[];
};

/** Bỏ ký tự không dùng được trong tên file / tên preset. */
function sanitizeName(raw: string): string {
  return raw
    .replace(/\.[0-9a-z]+$/i, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function geometryFileName(originalFileName: string): string {
  const base = sanitizeName(originalFileName) || 'model';
  return `${base}${GEOMETRY_SUFFIX}.3mf`;
}

/**
 * Giữ lại hình học + file cấu trúc bắt buộc của đặc tả 3MF, bỏ toàn bộ metadata của
 * slicer cũ (preset, gcode đã cắt, thumbnail).
 */
export function buildGeometryArchive(files: ArchiveFile[]): ArchiveFile[] {
  const kept = files.filter((file) => isKeptForGeometry(classifyEntry(file.path)));
  if (!kept.some((file) => classifyEntry(file.path) === 'geometry')) {
    throw new Error('Archive không có file hình học nào để xuất ra.');
  }
  return kept;
}

export function buildPresetName(inspection: ProjectInspection, target: SlicerTarget): string {
  const base = sanitizeName(inspection.processPreset ?? inspection.fileName) || 'Imported process';
  return `${base} @${target.label}`;
}

/**
 * Sinh preset process JSON cho slicer cùng họ (Orca / Bambu Studio).
 *
 * @param includeMachineTier Mang theo cả nhóm phụ thuộc máy (tốc độ, gia tốc). Mặc định
 *   tắt: tốc độ của máy nguồn thường vượt khả năng máy đích.
 */
export function buildProcessPreset(
  inspection: ProjectInspection,
  target: SlicerTarget,
  includeMachineTier = false,
): ProcessPresetResult {
  if (!inspection.rawSettings) {
    throw new Error('File không mang theo thông số cắt lớp nên không sinh được preset.');
  }

  const presetName = buildPresetName(inspection, target);
  const preset: Record<string, unknown> = {
    type: 'process',
    name: presetName,
    from: 'User',
    inherits: '',
  };

  const includedKeys: string[] = [];
  const skippedMachineTierKeys: string[] = [];
  const skippedFilamentKeys: string[] = [];

  for (const mapping of SETTING_MAP) {
    const raw = inspection.rawSettings[mapping.orcaKey];
    if (raw === undefined) continue;

    if (mapping.profile === 'filament') {
      skippedFilamentKeys.push(mapping.orcaKey);
      continue;
    }
    if (mapping.tier === 'machine' && !includeMachineTier) {
      skippedMachineTierKeys.push(mapping.orcaKey);
      continue;
    }

    preset[mapping.orcaKey] = raw;
    includedKeys.push(mapping.orcaKey);
  }

  return {
    fileName: `${sanitizeName(presetName)}.json`,
    presetName,
    json: `${JSON.stringify(preset, null, 2)}\n`,
    includedKeys,
    skippedMachineTierKeys,
    skippedFilamentKeys,
  };
}

/** Một ô "giá trị quy đổi" dưới dạng text — dùng chung cho bảng copy và UI. */
export function describeConvertedValue(converted: ConvertedValue | undefined): string {
  if (!converted) return '';
  if (converted.kind === 'keep') return `${converted.value} (giữ nguyên)`;
  if (converted.kind === 'target') {
    return converted.changed
      ? `⚠️ ${converted.value} (khác file — sửa theo ${converted.preset.name})`
      : `${converted.value} (máy đích để cùng số)`;
  }
  return `chưa có dữ liệu — ${converted.reason}`;
}

/**
 * Bảng ánh xạ dạng text (Markdown) để user dán ra ngoài hoặc dò tay từng ô —
 * đường duy nhất khi slicer đích khác engine (Cura).
 *
 * @param conversion Kết quả quy đổi sang máy đích. Bỏ trống thì bảng chỉ có giá trị gốc.
 */
export function buildMappingText(
  inspection: ProjectInspection,
  target: SlicerTarget,
  conversion?: ConversionResult,
): string {
  const toCura = target.family === 'cura';
  const targetHeader = toCura ? 'Ô tương ứng trong Cura' : 'Khoá';
  const header = conversion
    ? `| Ô trong Bambu Studio / Orca | Giá trị trong file | Giá trị quy đổi | ${targetHeader} | Ghi chú |`
    : `| Ô trong Bambu Studio / Orca | Giá trị trong file | ${targetHeader} | Ghi chú |`;
  const divider = conversion ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |';

  const lines = inspection.settings.map((setting) => {
    const { mapping, value } = setting;
    const label = `${mapping.group} → ${mapping.label}`;
    const targetColumn = toCura
      ? (mapping.curaLabel ?? '⚠️ không có ô tương đương — phải tự đặt')
      : `\`${mapping.orcaKey}\``;
    const notes: string[] = [];
    if (mapping.tier === 'machine') notes.push('phụ thuộc máy/filament — phải xem lại');
    if (mapping.note) notes.push(mapping.note);

    const cells = conversion
      ? [label, value, describeConvertedValue(conversion.byKey[mapping.orcaKey]), targetColumn]
      : [label, value, targetColumn];
    return `| ${cells.join(' | ')} | ${notes.join(' — ')} |`;
  });

  const intro = conversion
    ? `Cột "Giá trị quy đổi": nhóm hình học giữ nguyên số trong file, nhóm phụ thuộc máy lấy từ preset chính hãng${conversion.preset ? ` "${conversion.preset.name}"` : ''}. App không quy đổi bằng công thức. Có ${conversion.changedCount} ô máy đích ghi khác file (đánh dấu ⚠️) — đó là phần phải sửa tay.`
    : 'Giá trị dưới đây đọc nguyên trạng từ file, app không quy đổi gì.';

  return [
    `# Thông số từ ${inspection.fileName} → ${target.label}`,
    '',
    `Nguồn: preset "${inspection.processPreset ?? 'không ghi tên'}" của máy "${inspection.printerPreset ?? 'không ghi tên'}".`,
    intro,
    ...(conversion?.presetNote ? ['', `⚠️ ${conversion.presetNote}`] : []),
    '',
    header,
    divider,
    ...lines,
  ].join('\n');
}
