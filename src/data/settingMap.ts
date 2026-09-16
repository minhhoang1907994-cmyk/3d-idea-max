import type { SettingMapping } from '../types';

/**
 * Bảng ánh xạ thông số giữa họ Orca (Bambu Studio / OrcaSlicer và mọi fork của hãng máy)
 * và Cura.
 *
 * Nguồn sự thật: docs/research/slicer-interop.md mục 3-4.
 * - `orcaKey` verify từ bộ profile hệ thống của OrcaSlicer
 *   (`resources/profiles/BBL/process|filament/*.json`)
 * - `label` verify từ `src/libslic3r/PrintConfig.cpp` (`def->label = L("…")`)
 * - `curaKey` / `curaLabel` verify từ `resources/definitions/fdmprinter.def.json` của Cura
 *
 * QUY TẮC BẮT BUỘC: `curaKey === null` nghĩa là CHƯA VERIFY được tương đương 1-1 —
 * UI hiển thị "phải tự đặt", TUYỆT ĐỐI không đoán tên ô. Gán sai một ô thông số làm
 * hỏng bản in thật, ngang với đoán nhiệt độ.
 *
 * `tier`:
 * - 'geometry' — do hình học mô hình quyết định, đổi máy vẫn giữ nguyên ý nghĩa
 * - 'machine'  — phụ thuộc máy + filament, PHẢI xem lại tay khi đổi máy
 *
 * Ba ô bù sai số (`xy_hole_compensation`, `xy_contour_compensation`,
 * `elefant_foot_compensation`) xếp tier 'machine' dù nghe như hình học: chúng bù cho sai số
 * cơ khí và độ bè lớp đầu của CHÍNH máy đó, không phải đặc tính của mô hình. Ví dụ cùng
 * preset 0.20mm Standard: A1 để elephant foot 0.075, Kobra X để 0.1.
 *
 * Thứ tự trong mảng này là thứ tự hiển thị trong bảng ánh xạ.
 */

export const SETTING_MAP: SettingMapping[] = [
  // ---- Quality: chiều cao lớp & bề dày ----
  {
    orcaKey: 'layer_height',
    profile: 'process',
    group: 'Quality',
    label: 'Layer height',
    tier: 'geometry',
    curaKey: 'layer_height',
    curaLabel: 'Layer Height',
  },
  {
    orcaKey: 'initial_layer_print_height',
    profile: 'process',
    group: 'Quality',
    label: 'First layer height',
    tier: 'geometry',
    curaKey: 'layer_height_0',
    curaLabel: 'Initial Layer Height',
  },
  {
    orcaKey: 'line_width',
    profile: 'process',
    group: 'Quality — Line width',
    label: 'Default',
    tier: 'geometry',
    curaKey: 'line_width',
    curaLabel: 'Line Width',
    note: 'Bề rộng đường mặc định tính theo đường kính nozzle — đổi nozzle thì phải đổi theo.',
  },
  {
    orcaKey: 'outer_wall_line_width',
    profile: 'process',
    group: 'Quality — Line width',
    label: 'Outer wall',
    tier: 'geometry',
    curaKey: 'wall_line_width_0',
    curaLabel: 'Outer Wall Line Width',
  },
  {
    orcaKey: 'inner_wall_line_width',
    profile: 'process',
    group: 'Quality — Line width',
    label: 'Inner wall',
    tier: 'geometry',
    curaKey: 'wall_line_width_x',
    curaLabel: 'Inner Wall(s) Line Width',
  },
  {
    orcaKey: 'sparse_infill_line_width',
    profile: 'process',
    group: 'Quality — Line width',
    label: 'Sparse infill',
    tier: 'geometry',
    curaKey: 'infill_line_width',
    curaLabel: 'Infill Line Width',
  },
  {
    orcaKey: 'seam_position',
    profile: 'process',
    group: 'Quality',
    label: 'Seam position',
    tier: 'geometry',
    curaKey: 'z_seam_type',
    curaLabel: 'Z Seam Alignment',
    note: 'Tên lựa chọn hai bên khác nhau (Aligned / Nearest / Random) — đối chiếu bằng mắt.',
  },
  {
    orcaKey: 'ironing_type',
    profile: 'process',
    group: 'Quality',
    label: 'Ironing type',
    tier: 'geometry',
    curaKey: 'ironing_enabled',
    curaLabel: 'Enable Ironing',
    note: 'Orca chọn kiểu ủi (mặt trên / mọi mặt phẳng), Cura chỉ có bật/tắt.',
  },
  {
    orcaKey: 'xy_hole_compensation',
    profile: 'process',
    group: 'Quality — Precision',
    label: 'X-Y hole compensation',
    tier: 'machine',
    curaKey: 'xy_offset',
    curaLabel: 'Horizontal Expansion',
    note: 'Cura chỉ có một ô Horizontal Expansion cho cả lỗ và biên ngoài — nhiều-về-một.',
  },
  {
    orcaKey: 'xy_contour_compensation',
    profile: 'process',
    group: 'Quality — Precision',
    label: 'X-Y contour compensation',
    tier: 'machine',
    curaKey: 'xy_offset',
    curaLabel: 'Horizontal Expansion',
    note: 'Cùng ô Cura với X-Y hole compensation — chọn một giá trị đại diện.',
  },
  {
    orcaKey: 'elefant_foot_compensation',
    profile: 'process',
    group: 'Quality — Precision',
    label: 'Elephant foot compensation',
    tier: 'machine',
    curaKey: 'xy_offset_layer_0',
    curaLabel: 'Initial Layer Horizontal Expansion',
    note: 'Orca nhập số dương để thu nhỏ lớp đầu, Cura nhập số âm — nhớ đảo dấu.',
  },
  {
    orcaKey: 'resolution',
    profile: 'process',
    group: 'Quality',
    label: 'Resolution',
    tier: 'geometry',
    curaKey: 'meshfix_maximum_resolution',
    curaLabel: 'Maximum Resolution',
  },

  // ---- Strength: vỏ & điền ----
  {
    orcaKey: 'wall_loops',
    profile: 'process',
    group: 'Strength',
    label: 'Wall loops',
    tier: 'geometry',
    curaKey: 'wall_line_count',
    curaLabel: 'Wall Line Count',
  },
  {
    orcaKey: 'top_shell_layers',
    profile: 'process',
    group: 'Strength',
    label: 'Top shell layers',
    tier: 'geometry',
    curaKey: 'top_layers',
    curaLabel: 'Top Layers',
  },
  {
    orcaKey: 'top_shell_thickness',
    profile: 'process',
    group: 'Strength',
    label: 'Top shell thickness',
    tier: 'geometry',
    curaKey: 'top_bottom_thickness',
    curaLabel: 'Top/Bottom Thickness',
  },
  {
    orcaKey: 'bottom_shell_layers',
    profile: 'process',
    group: 'Strength',
    label: 'Bottom shell layers',
    tier: 'geometry',
    curaKey: 'bottom_layers',
    curaLabel: 'Bottom Layers',
  },
  {
    orcaKey: 'sparse_infill_density',
    profile: 'process',
    group: 'Strength',
    label: 'Sparse infill density',
    tier: 'geometry',
    curaKey: 'infill_sparse_density',
    curaLabel: 'Infill Density',
  },
  {
    orcaKey: 'sparse_infill_pattern',
    profile: 'process',
    group: 'Strength',
    label: 'Sparse infill pattern',
    tier: 'geometry',
    curaKey: 'infill_pattern',
    curaLabel: 'Infill Pattern',
    note: 'Cura không có đủ mọi kiểu của Orca (ví dụ Adaptive Cubic) — chọn kiểu gần nhất.',
  },
  {
    orcaKey: 'spiral_mode',
    profile: 'process',
    group: 'Others',
    label: 'Spiral vase',
    tier: 'geometry',
    curaKey: 'magic_spiralize',
    curaLabel: 'Spiralize Outer Contour',
  },

  // ---- Support & bám bàn ----
  {
    orcaKey: 'enable_support',
    profile: 'process',
    group: 'Support',
    label: 'Enable support',
    tier: 'geometry',
    curaKey: 'support_enable',
    curaLabel: 'Generate Support',
  },
  {
    orcaKey: 'support_type',
    profile: 'process',
    group: 'Support',
    label: 'Type',
    tier: 'geometry',
    curaKey: 'support_structure',
    curaLabel: 'Support Structure',
    note: 'Cẩn thận trùng tên: Cura CŨNG có khoá support_type nhưng đó là "Support Placement" (buildplate/everywhere), không phải normal/tree.',
  },
  {
    orcaKey: 'support_threshold_angle',
    profile: 'process',
    group: 'Support',
    label: 'Threshold angle',
    tier: 'geometry',
    curaKey: 'support_angle',
    curaLabel: 'Support Overhang Angle',
  },
  {
    orcaKey: 'brim_type',
    profile: 'process',
    group: 'Others',
    label: 'Brim type',
    tier: 'geometry',
    curaKey: 'adhesion_type',
    curaLabel: 'Build Plate Adhesion Type',
  },
  {
    orcaKey: 'brim_width',
    profile: 'process',
    group: 'Others',
    label: 'Brim width',
    tier: 'geometry',
    curaKey: 'brim_width',
    curaLabel: 'Brim Width',
  },
  {
    orcaKey: 'skirt_loops',
    profile: 'process',
    group: 'Others',
    label: 'Skirt loops',
    tier: 'geometry',
    curaKey: 'skirt_line_count',
    curaLabel: 'Skirt Line Count',
  },
  {
    orcaKey: 'raft_layers',
    profile: 'process',
    group: 'Others',
    label: 'Raft layers',
    tier: 'geometry',
    curaKey: null,
    curaLabel: null,
    note: 'Cura bật raft ở Build Plate Adhesion Type rồi cấu hình bằng cả nhóm ô Raft riêng — không có ô đếm số lớp tương đương 1-1.',
  },

  // ---- Tầng phụ thuộc máy + filament ----
  {
    orcaKey: 'nozzle_temperature',
    profile: 'filament',
    group: 'Filament — Nozzle temperature',
    label: 'Other layers',
    tier: 'machine',
    curaKey: 'material_print_temperature',
    curaLabel: 'Printing Temperature',
    note: 'Theo filament thật đang nạp, không theo file — máy khác hotend khác.',
  },
  {
    orcaKey: 'nozzle_temperature_initial_layer',
    profile: 'filament',
    group: 'Filament — Nozzle temperature',
    label: 'First layer',
    tier: 'machine',
    curaKey: 'material_print_temperature_layer_0',
    curaLabel: 'Printing Temperature Initial Layer',
  },
  {
    orcaKey: 'hot_plate_temp',
    profile: 'filament',
    group: 'Filament — Bed temperature',
    label: 'Other layers',
    tier: 'machine',
    curaKey: 'material_bed_temperature',
    curaLabel: 'Build Plate Temperature',
    note: 'Bambu tách nhiệt bàn theo loại mặt bàn (hot / cool / textured / engineering).',
  },
  {
    orcaKey: 'filament_max_volumetric_speed',
    profile: 'filament',
    group: 'Filament',
    label: 'Max volumetric speed',
    tier: 'machine',
    curaKey: null,
    curaLabel: null,
    note: 'Cura không có ô giới hạn lưu lượng theo mm³/s tương đương — CHƯA VERIFY, phải tự đặt.',
  },
  {
    orcaKey: 'filament_flow_ratio',
    profile: 'filament',
    group: 'Filament',
    label: 'Flow ratio',
    tier: 'machine',
    curaKey: null,
    curaLabel: null,
    note: 'Cura chỉnh lưu lượng bằng Flow (%) theo từng nhóm đường — CHƯA VERIFY ánh xạ 1-1.',
  },
  {
    orcaKey: 'outer_wall_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Outer wall',
    tier: 'machine',
    curaKey: 'speed_wall_0',
    curaLabel: 'Outer Wall Speed',
  },
  {
    orcaKey: 'inner_wall_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Inner wall',
    tier: 'machine',
    curaKey: 'speed_wall_x',
    curaLabel: 'Inner Wall Speed',
  },
  {
    orcaKey: 'sparse_infill_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Sparse infill',
    tier: 'machine',
    curaKey: 'speed_infill',
    curaLabel: 'Infill Speed',
  },
  {
    orcaKey: 'internal_solid_infill_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Internal solid infill',
    tier: 'machine',
    curaKey: 'speed_topbottom',
    curaLabel: 'Top/Bottom Speed',
    note: 'Cura dùng chung một ô cho mặt trên/dưới và solid infill.',
  },
  {
    orcaKey: 'top_surface_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Top surface',
    tier: 'machine',
    curaKey: 'speed_topbottom',
    curaLabel: 'Top/Bottom Speed',
    note: 'Cùng ô Cura với Internal solid infill — chọn một giá trị đại diện.',
  },
  {
    orcaKey: 'initial_layer_speed',
    profile: 'process',
    group: 'Speed',
    label: 'First layer',
    tier: 'machine',
    curaKey: 'speed_print_layer_0',
    curaLabel: 'Initial Layer Print Speed',
  },
  {
    orcaKey: 'travel_speed',
    profile: 'process',
    group: 'Speed',
    label: 'Travel',
    tier: 'machine',
    curaKey: 'speed_travel',
    curaLabel: 'Travel Speed',
    note: 'Phụ thuộc trực tiếp vào cơ cấu máy — máy bedslinger không chạy nổi tốc độ của máy CoreXY.',
  },
  {
    orcaKey: 'default_acceleration',
    profile: 'process',
    group: 'Speed — Acceleration',
    label: 'Normal printing',
    tier: 'machine',
    curaKey: 'acceleration_print',
    curaLabel: 'Print Acceleration',
    note: 'Gia tốc bị giới hạn bởi firmware máy — giữ theo preset máy đích, không bê từ file.',
  },
];

/** Tra nhanh theo khoá của họ Orca. */
export const SETTING_MAP_BY_KEY: Record<string, SettingMapping> = Object.fromEntries(
  SETTING_MAP.map((mapping) => [mapping.orcaKey, mapping]),
);

/**
 * Khoá thuộc MÁY — cố tình không đưa vào preset sinh ra.
 * Nguồn: docs/research/slicer-interop.md mục 5. Bê gcode khởi động hay giới hạn tốc độ
 * của máy Bambu sang máy khác thì hỏng bản in, nặng hơn là hỏng máy.
 */
export const MACHINE_ONLY_KEY_PREFIXES = [
  'printer_',
  'machine_',
  'printable_',
  'nozzle_diameter',
  'nozzle_type',
  'nozzle_volume',
  'nozzle_height',
  'extruder_',
  'change_filament_gcode',
  'time_lapse_gcode',
  'bed_exclude_area',
  'bed_custom_',
  'host_type',
  'print_host',
  'printhost_',
  'auxiliary_fan',
  'gcode_flavor',
];
