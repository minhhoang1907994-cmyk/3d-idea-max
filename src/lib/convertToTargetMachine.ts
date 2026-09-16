import { MACHINE_FILAMENT_PRESETS, MACHINE_PROCESS_PRESETS } from '../data/machinePresets';
import { PRINTERS_BY_ID } from '../data/printers';
import type {
  ConvertedValue,
  MachineFilamentPreset,
  MachineProcessPreset,
  ProjectInspection,
} from '../types';
import { normalizeSettingValue } from './inspectProjectFile';

/**
 * Quy đổi thông số đọc từ file sang máy đích.
 *
 * Nguyên tắc (CLAUDE.md > Quy tắc của project — không đoán thông số in):
 * - Nhóm hình học: GIỮ NGUYÊN số trong file. Đây chính là thứ cần mang sang, đổi máy
 *   không làm nó sai.
 * - Nhóm phụ thuộc máy: KHÔNG có công thức quy đổi nào. Chỉ tra số trong preset CHÍNH HÃNG
 *   của máy đích (src/data/machinePresets.ts). Không tra được thì trả 'unavailable'.
 * - Nhóm filament: phụ thuộc cuộn nhựa đang nạp, app không biết → luôn 'unavailable'.
 */

const DEFAULT_NOZZLE_MM = 0.4;
const PREFERRED_TIER = 'Standard';

/** Đường kính nozzle ghi trong file, mặc định 0.4 khi file không ghi. */
export function readNozzleMm(inspection: ProjectInspection): number {
  const raw = inspection.rawSettings?.['nozzle_diameter'];
  const value = Number.parseFloat(normalizeSettingValue(raw) ?? '');
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_NOZZLE_MM;
}

/** Layer height ghi trong file — `null` khi file không có thông số. */
export function readLayerHeightMm(inspection: ProjectInspection): number | null {
  const value = Number.parseFloat(
    normalizeSettingValue(inspection.rawSettings?.['layer_height']) ?? '',
  );
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function presetsForPrinter(printerId: string): MachineProcessPreset[] {
  return MACHINE_PROCESS_PRESETS.filter((preset) => preset.printerId === printerId);
}

/**
 * Chọn preset của máy đích khớp layer height + nozzle của file.
 * Cùng layer height mà máy có nhiều bậc chất lượng thì ưu tiên bậc trùng tên với preset
 * trong file, sau đó tới "Standard" — không tự chế bậc mới.
 */
export function findTargetPreset(
  printerId: string,
  layerHeightMm: number,
  nozzleMm: number,
  sourceTier?: string,
): MachineProcessPreset | null {
  const candidates = presetsForPrinter(printerId).filter(
    (preset) => preset.layerHeightMm === layerHeightMm && preset.nozzleMm === nozzleMm,
  );
  if (candidates.length === 0) return null;

  return (
    (sourceTier ? candidates.find((preset) => preset.qualityTier === sourceTier) : undefined) ??
    candidates.find((preset) => preset.qualityTier === PREFERRED_TIER) ??
    candidates[0]!
  );
}

/** Bậc chất lượng của preset ghi trong file, ví dụ "0.20mm Standard @BBL A1" → "Standard". */
export function readSourceTier(inspection: ProjectInspection): string | undefined {
  const match = /^\d+\.\d+mm (.+?) @/.exec(inspection.processPreset ?? '');
  return match?.[1];
}

export function filamentPresetsForPrinter(printerId: string): MachineFilamentPreset[] {
  return MACHINE_FILAMENT_PRESETS.filter((preset) => preset.printerId === printerId);
}

/** Loại nhựa ghi trong file, ví dụ "PLA". `null` khi file không ghi. */
export function readFilamentType(inspection: ProjectInspection): string | null {
  const value = normalizeSettingValue(inspection.rawSettings?.['filament_type']);
  // File nhiều màu liệt kê nhiều loại — chỉ lấy loại đầu, và chỉ khi cả bộ cùng một loại
  const types = value ? [...new Set(value.split(', ').map((item) => item.trim()))] : [];
  return types.length === 1 ? (types[0] ?? null) : null;
}

/**
 * Chọn preset filament của máy đích theo loại nhựa trong file.
 * Cùng loại nhựa mà hãng có nhiều biến thể (PLA, PLA Matte, PLA Silk...) thì lấy cái tên
 * ngắn nhất — đó là bản cơ bản, không phải biến thể đặc biệt.
 */
export function findFilamentPreset(
  printerId: string,
  filamentType: string | null,
  nozzleMm: number,
): MachineFilamentPreset | null {
  if (!filamentType) return null;
  const candidates = filamentPresetsForPrinter(printerId)
    .filter(
      (preset) =>
        preset.nozzleMm === nozzleMm &&
        preset.filamentType.toUpperCase() === filamentType.toUpperCase(),
    )
    .sort((left, right) => left.name.length - right.name.length);
  return candidates[0] ?? null;
}

/** Các layer height mà máy đích có preset ở đúng nozzle đó — để nói rõ khi không khớp. */
export function availableLayerHeights(printerId: string, nozzleMm: number): number[] {
  return [
    ...new Set(
      presetsForPrinter(printerId)
        .filter((preset) => preset.nozzleMm === nozzleMm)
        .map((preset) => preset.layerHeightMm),
    ),
  ].sort((left, right) => left - right);
}

export type ConversionResult = {
  /** Preset của máy đích đang dùng để đối chiếu — `null` khi không tìm được preset khớp */
  preset: MachineProcessPreset | null;
  /** Lý do không có preset, chỉ có khi `preset === null` */
  presetNote: string | null;
  /** Preset filament của máy đích đang dùng cho nhóm nhiệt độ / lưu lượng */
  filamentPreset: MachineFilamentPreset | null;
  /** Lý do không có preset filament, chỉ có khi `filamentPreset === null` */
  filamentNote: string | null;
  nozzleMm: number;
  /** Quy đổi theo từng khoá của họ Orca */
  byKey: Record<string, ConvertedValue>;
  /** Số ô máy đích ghi khác file — đây mới là việc user phải làm tay */
  changedCount: number;
  /** Số ô không có cơ sở để đưa số */
  unavailableCount: number;
};

/**
 * @param printerId Máy đích, phải là id có trong src/data/printers.ts
 * @param filamentPresetName Preset filament user tự chọn. Bỏ trống thì tự dò theo
 *   `filament_type` trong file.
 */
export function convertToTargetMachine(
  inspection: ProjectInspection,
  printerId: string,
  filamentPresetName?: string,
): ConversionResult {
  const nozzleMm = readNozzleMm(inspection);
  const layerHeightMm = readLayerHeightMm(inspection);
  const printer = PRINTERS_BY_ID[printerId];
  const printerLabel = printer?.label ?? printerId;

  const preset =
    layerHeightMm === null
      ? null
      : findTargetPreset(printerId, layerHeightMm, nozzleMm, readSourceTier(inspection));

  let presetNote: string | null = null;
  if (!preset) {
    const heights = availableLayerHeights(printerId, nozzleMm);
    presetNote =
      layerHeightMm === null
        ? 'File không ghi layer height nên không dò được preset tương ứng của máy đích.'
        : heights.length === 0
          ? `App chưa có preset chính hãng của ${printerLabel} cho nozzle ${nozzleMm} mm.`
          : `${printerLabel} không có preset ở layer height ${layerHeightMm} mm (nozzle ${nozzleMm} mm). Máy này có: ${heights.map((height) => `${height} mm`).join(', ')}.`;
  }

  const filamentType = readFilamentType(inspection);
  const filamentPreset =
    (filamentPresetName
      ? filamentPresetsForPrinter(printerId).find((item) => item.name === filamentPresetName)
      : undefined) ?? findFilamentPreset(printerId, filamentType, nozzleMm);

  let filamentNote: string | null = null;
  if (!filamentPreset) {
    const available = filamentPresetsForPrinter(printerId);
    filamentNote =
      available.length === 0
        ? `App chưa có preset filament chính hãng của ${printerLabel}.`
        : filamentType
          ? `${printerLabel} không có preset chính hãng cho nhựa ${filamentType} (nozzle ${nozzleMm} mm). Chọn tay một loại nhựa khác, hoặc lấy số theo nhãn cuộn.`
          : 'File không ghi rõ một loại nhựa duy nhất — chọn tay loại nhựa bạn sẽ dùng.';
  }

  const byKey: Record<string, ConvertedValue> = {};
  for (const { mapping, value } of inspection.settings) {
    if (mapping.profile === 'filament') {
      const filamentValue = filamentPreset?.values[mapping.orcaKey];
      byKey[mapping.orcaKey] =
        filamentPreset && filamentValue
          ? {
              kind: 'target',
              value: filamentValue,
              preset: filamentPreset,
              changed: filamentValue !== value,
            }
          : {
              kind: 'unavailable',
              reason:
                filamentNote ??
                `Preset "${filamentPreset?.name ?? ''}" không ghi ô này — lấy theo nhãn cuộn nhựa.`,
            };
      continue;
    }

    if (mapping.tier === 'geometry') {
      byKey[mapping.orcaKey] = { kind: 'keep', value };
      continue;
    }

    const targetValue = preset ? preset.values[mapping.orcaKey] : undefined;
    byKey[mapping.orcaKey] =
      preset && targetValue
        ? { kind: 'target', value: targetValue, preset, changed: targetValue !== value }
        : {
            kind: 'unavailable',
            reason: presetNote ?? `Preset "${preset?.name ?? ''}" không ghi ô này.`,
          };
  }

  const values = Object.values(byKey);
  return {
    preset,
    presetNote,
    filamentPreset,
    filamentNote,
    nozzleMm,
    byKey,
    changedCount: values.filter((item) => item.kind === 'target' && item.changed).length,
    unavailableCount: values.filter((item) => item.kind === 'unavailable').length,
  };
}
