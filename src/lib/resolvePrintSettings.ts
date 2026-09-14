import type { MixResult, PrintSettings, PrintWarning, Printer } from '../types';

/**
 * Suy ra thông số in từ kết quả Mix + máy in user đã chọn.
 *
 * Nguyên tắc (CLAUDE.md > Xử lý tổ hợp không hợp lệ):
 * tổ hợp có vấn đề vẫn được HIỂN THỊ kèm cảnh báo nêu rõ lý do — không âm thầm loại bỏ,
 * vì user cần biết vì sao tổ hợp đó không nên in.
 *
 * Nhiệt độ `null` nghĩa là chưa verify được từ tài liệu Bambu chính thức.
 * KHÔNG thay bằng số đoán.
 */
export function resolvePrintSettings(mix: MixResult, printer: Printer): PrintSettings {
  const { filament, detail, strength, size } = mix;
  const warnings: PrintWarning[] = [];

  if (printer.notRecommendedFilamentIds.includes(filament.id)) {
    warnings.push({
      level: 'warning',
      message: filament.requiresEnclosure
        ? `${printer.label} không có buồng in kín phù hợp cho ${filament.label} — Bambu không khuyến nghị tổ hợp này (dễ cong vênh, giảm độ bền liên lớp).`
        : `Bambu không khuyến nghị in ${filament.label} trên ${printer.label} — xem tài liệu máy trước khi in.`,
    });
  }

  if (filament.requiresEnclosure && !printer.isEnclosed) {
    warnings.push({
      level: 'warning',
      message: `${filament.label} cần buồng in kín, nhưng ${printer.label} là máy hở.`,
    });
  }

  if (filament.requiresHardenedNozzle) {
    warnings.push({
      level: 'info',
      message: `${filament.label} chứa hạt cứng — cần đầu phun hardened steel, đầu stainless sẽ mòn nhanh.`,
    });
  }

  const longestBuildEdgeMm = Math.max(
    printer.buildVolumeMm.x,
    printer.buildVolumeMm.y,
    printer.buildVolumeMm.z,
  );
  if (size.longestEdgeMm > longestBuildEdgeMm) {
    warnings.push({
      level: 'warning',
      message: `Kích thước ~${size.longestEdgeMm}mm vượt khổ in ${longestBuildEdgeMm}mm của ${printer.label} — cần chia nhỏ mô hình rồi ghép lại.`,
    });
  }

  if (filament.nozzleTempC === null || filament.bedTempC === null) {
    warnings.push({
      level: 'info',
      message: `Chưa có dữ liệu nhiệt độ đầy đủ cho ${filament.label} từ tài liệu Bambu chính thức — tra cứu trước khi in, không tự đoán.`,
    });
  }

  return {
    printer,
    filament,
    quality: {
      layerHeightMm: detail.layerHeightMm,
      wallLoops: strength.wallLoops,
    },
    strength: {
      sparseInfillDensityPercent: strength.sparseInfillDensityPercent,
      sparseInfillPattern: strength.sparseInfillPattern,
    },
    temperature: {
      nozzleC: filament.nozzleTempC,
      bedC: filament.bedTempC,
    },
    warnings,
  };
}
