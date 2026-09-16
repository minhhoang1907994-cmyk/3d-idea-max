import type { SlicerTarget } from '../types';

/**
 * Nguồn sự thật: docs/research/slicer-interop.md mục 2.
 *
 * `presetTransfer` KHÔNG phải phỏng đoán — nó dựa trên phả hệ codebase: các fork của
 * OrcaSlicer dùng cùng engine và cùng cấu trúc JSON profile nên preset chuyển thẳng được;
 * Cura dùng CuraEngine riêng nên preset không import được, buộc nhập tay.
 *
 * Danh sách này chỉ để CHỌN ĐÍCH. App không có ánh xạ "máy Bambu → máy hãng khác" vì
 * không tồn tại ánh xạ chính hãng nào như vậy — user phải tự chọn máy của mình trong
 * slicer đích, app chỉ lo phần thông số cắt lớp.
 */

export const SLICER_TARGETS: SlicerTarget[] = [
  {
    id: 'orcaslicer',
    label: 'OrcaSlicer',
    vendor: 'Cộng đồng (SoftFever)',
    family: 'orca',
    forkedFrom: 'Bambu Studio',
    presetTransfer: 'direct',
    transferNote:
      'Cùng engine và cùng cấu trúc JSON profile với Bambu Studio — preset import thẳng, chỉ cần xem lại nhóm phụ thuộc máy.',
    sourceUrl: 'https://github.com/SoftFever/OrcaSlicer',
  },
  {
    id: 'snapmaker-orca',
    label: 'Snapmaker Orca',
    vendor: 'Snapmaker',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote:
      'Fork của OrcaSlicer, giữ nguyên engine và tên tham số — nhớ chọn máy Snapmaker trước khi import preset.',
    sourceUrl: 'https://www.snapmaker.com/snapmaker-orca',
  },
  {
    id: 'creality-print',
    label: 'Creality Print (5.0 trở lên)',
    vendor: 'Creality',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote:
      'Từ bản 5.0 Creality Print được dựng lại trên OrcaSlicer — cũng là slicer chính hãng của dòng SPARKX.',
    sourceUrl: 'https://github.com/CrealityOfficial/CrealityPrint',
  },
  {
    id: 'anycubic-slicer-next',
    label: 'Anycubic Slicer Next',
    vendor: 'Anycubic',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote: 'Fork của OrcaSlicer, tên tham số trùng hoàn toàn.',
    sourceUrl: 'https://wiki.anycubic.com/en/software-and-app',
  },
  {
    id: 'elegoo-slicer',
    label: 'ElegooSlicer',
    vendor: 'Elegoo',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote: 'Fork của OrcaSlicer, tên tham số trùng hoàn toàn.',
    sourceUrl: 'https://github.com/ELEGOO-3D/ElegooSlicer',
  },
  {
    id: 'orca-flashforge',
    label: 'Orca-FlashForge',
    vendor: 'FlashForge',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote: 'Fork của OrcaSlicer, tên tham số trùng hoàn toàn.',
    sourceUrl: 'https://github.com/FlashForge/Orca-Flashforge',
  },
  {
    id: 'sovol-orcaslicer',
    label: 'Sovol OrcaSlicer',
    vendor: 'Sovol',
    family: 'orca',
    forkedFrom: 'OrcaSlicer',
    presetTransfer: 'direct',
    transferNote: 'Fork của OrcaSlicer, tên tham số trùng hoàn toàn.',
    sourceUrl: 'https://github.com/Sovol3d/Sovol-OrcaSlicer',
  },
  {
    id: 'qidi-studio',
    label: 'QIDI Studio',
    vendor: 'QIDI Tech',
    family: 'bambu',
    forkedFrom: 'Bambu Studio',
    presetTransfer: 'direct',
    transferNote:
      'Fork trực tiếp của Bambu Studio (không qua Orca) — tên tham số vẫn trùng, nhưng phiên bản engine có thể lệch nên vài ô mới sẽ thiếu.',
    sourceUrl: 'https://github.com/QIDITECH/QIDIStudio',
  },
  {
    id: 'prusaslicer',
    label: 'PrusaSlicer',
    vendor: 'Prusa Research',
    family: 'prusa',
    forkedFrom: 'Slic3r',
    presetTransfer: 'review',
    transferNote:
      'Là ông nội của Bambu Studio nhưng đã rẽ nhánh lâu: nhiều tham số đổi tên hoặc không còn tương đương — import được một phần, phải đối chiếu tay.',
    sourceUrl: 'https://www.prusa3d.com/page/prusaslicer_424/',
  },
  {
    id: 'cura',
    label: 'UltiMaker Cura',
    vendor: 'UltiMaker',
    family: 'cura',
    forkedFrom: null,
    presetTransfer: 'manual',
    transferNote:
      'Dùng CuraEngine riêng, không đọc được profile họ Orca — phải nhập tay từng ô theo bảng ánh xạ bên dưới.',
    sourceUrl: 'https://ultimaker.com/software/ultimaker-cura/',
  },
];

export const SLICER_TARGETS_BY_ID: Record<string, SlicerTarget> = Object.fromEntries(
  SLICER_TARGETS.map((target) => [target.id, target]),
);

export const DEFAULT_SLICER_TARGET_ID = 'snapmaker-orca';
