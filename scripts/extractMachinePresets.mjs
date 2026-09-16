/**
 * Sinh `src/data/machinePresets.ts` từ bộ profile CHÍNH HÃNG trong repo OrcaSlicer.
 *
 * Chạy:  node scripts/extractMachinePresets.mjs
 * Thêm máy mới: thêm một dòng vào TARGETS (printerId phải khớp id trong src/data/printers.ts)
 * rồi chạy lại. Xem docs/research/slicer-interop.md mục 7.
 *
 * Vì sao phải trích sẵn thay vì gọi mạng lúc chạy app: app là SPA tĩnh, không backend,
 * toàn bộ dữ liệu nằm trong repo (CLAUDE.md > Tech Stack).
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = 'https://raw.githubusercontent.com/SoftFever/OrcaSlicer/main/resources/profiles';
const BLOB = 'https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles';
const OUT_PATH = path.join(process.cwd(), 'src/data/machinePresets.ts');

/**
 * Máy cần trích preset. `match` lọc theo tên preset trong `<Hãng>.json`.
 *
 * Chỉ nhúng máy ĐÍCH — máy mà user muốn mang file sang. Máy nguồn (Bambu) không cần preset
 * vì số của nó đã nằm sẵn trong file `.3mf` user tải lên.
 *
 * Thêm máy: thêm một dòng, ví dụ
 *   { printerId: 'snapmaker-u1', vendor: 'Snapmaker', match: /@Snapmaker U1( |$)/ }
 *   { printerId: 'sparkx-i7',    vendor: 'Creality',  match: /@Creality SPARKX i7( |$)/ }
 * rồi thêm máy đó vào src/data/printers.ts với `sourceUrl` chính hãng.
 */
const TARGETS = [{ printerId: 'kobra-x', vendor: 'Anycubic', match: /@Anycubic Kobra X( |$)/ }];

/**
 * Khoá filament có trong SETTING_MAP. Lấy từ preset filament CHÍNH HÃNG của đúng máy đó —
 * cùng loại nhựa nhưng máy khác thì hãng vẫn đặt số khác (hotend, luồng gió khác nhau).
 */
const FILAMENT_KEYS = [
  'filament_type',
  'nozzle_temperature',
  'nozzle_temperature_initial_layer',
  'hot_plate_temp',
  'filament_max_volumetric_speed',
  'filament_flow_ratio',
];

/**
 * Khoá process có trong SETTING_MAP (src/data/settingMap.ts).
 * Không lấy khoá filament (phụ thuộc cuộn nhựa) và khoá máy (gcode, giới hạn firmware).
 */
const KEYS = [
  'layer_height',
  'initial_layer_print_height',
  'line_width',
  'outer_wall_line_width',
  'inner_wall_line_width',
  'sparse_infill_line_width',
  'seam_position',
  'ironing_type',
  'xy_hole_compensation',
  'xy_contour_compensation',
  'elefant_foot_compensation',
  'resolution',
  'wall_loops',
  'top_shell_layers',
  'top_shell_thickness',
  'bottom_shell_layers',
  'sparse_infill_density',
  'sparse_infill_pattern',
  'spiral_mode',
  'enable_support',
  'support_type',
  'support_threshold_angle',
  'brim_type',
  'brim_width',
  'skirt_loops',
  'raft_layers',
  'outer_wall_speed',
  'inner_wall_speed',
  'sparse_infill_speed',
  'internal_solid_infill_speed',
  'top_surface_speed',
  'initial_layer_speed',
  'travel_speed',
  'default_acceleration',
];

const encodePath = (subPath) => subPath.split('/').map(encodeURIComponent).join('/');

const cache = new Map();
async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} khi tải ${url}`);
  const json = await response.json();
  cache.set(url, json);
  return json;
}

/** Tải preset và toàn bộ tổ tiên theo chuỗi `inherits`. */
async function loadChain(vendor, name, byName, loaded) {
  if (loaded.has(name)) return;
  const subPath = byName.get(name);
  if (!subPath) throw new Error(`${vendor}.json không có preset "${name}"`);
  const json = await fetchJson(`${RAW}/${vendor}/${encodePath(subPath)}`);
  loaded.set(name, json);
  if (json.inherits) await loadChain(vendor, json.inherits, byName, loaded);
}

/** Làm phẳng: giá trị của con ghi đè giá trị của cha. */
function flatten(name, loaded) {
  const node = loaded.get(name);
  const parent = node.inherits ? flatten(node.inherits, loaded) : {};
  return { ...parent, ...node };
}

const normalize = (value) => (Array.isArray(value) ? value.map(String).join(', ') : String(value));

/** "0.20mm Standard @BBL A1 0.6 nozzle" → 0.6; không ghi thì mặc định 0.4. */
const nozzleFromName = (name) => {
  const match = /(\d+(?:\.\d+)?) nozzle/.exec(name);
  return match ? Number(match[1]) : 0.4;
};

/** "0.20mm Standard @BBL A1" → "Standard" */
const tierFromName = (name) => /^\d+\.\d+mm (.+?) @/.exec(name)?.[1] ?? '';

const rows = [];
const filamentRows = [];
for (const target of TARGETS) {
  const vendorJson = await fetchJson(`${RAW}/../profiles/${target.vendor}.json`);
  const byName = new Map(vendorJson.process_list.map((item) => [item.name, item.sub_path]));
  const names = vendorJson.process_list
    .map((item) => item.name)
    .filter((name) => target.match.test(name))
    .sort();

  const loaded = new Map();
  for (const name of names) await loadChain(target.vendor, name, byName, loaded);

  for (const name of names) {
    const flat = flatten(name, loaded);
    const values = {};
    for (const key of KEYS) if (flat[key] !== undefined) values[key] = normalize(flat[key]);
    if (!values.layer_height) {
      console.warn(`bỏ qua "${name}": không suy ra được layer height`);
      continue;
    }
    rows.push({
      printerId: target.printerId,
      name,
      qualityTier: tierFromName(name),
      nozzleMm: nozzleFromName(name),
      layerHeightMm: Number(values.layer_height),
      values,
      sourceUrl: `${BLOB}/${target.vendor}/${encodePath(byName.get(name))}`,
    });
  }

  // ---- Preset filament của đúng máy đó ----
  const filamentByName = new Map(
    vendorJson.filament_list.map((item) => [item.name, item.sub_path]),
  );
  const filamentNames = vendorJson.filament_list
    .map((item) => item.name)
    .filter((name) => target.match.test(name))
    .sort();

  const filamentLoaded = new Map();
  for (const name of filamentNames) {
    await loadChain(target.vendor, name, filamentByName, filamentLoaded);
  }

  for (const name of filamentNames) {
    const flat = flatten(name, filamentLoaded);
    const values = {};
    for (const key of FILAMENT_KEYS) {
      if (flat[key] !== undefined) values[key] = normalize(flat[key]);
    }
    if (!values.filament_type) {
      console.warn(`bỏ qua filament "${name}": không suy ra được loại nhựa`);
      continue;
    }
    const filamentType = values.filament_type;
    delete values.filament_type;
    filamentRows.push({
      printerId: target.printerId,
      name,
      filamentType,
      nozzleMm: nozzleFromName(name),
      values,
      sourceUrl: `${BLOB}/${target.vendor}/${encodePath(filamentByName.get(name))}`,
    });
  }

  console.log(`${target.printerId}: ${names.length} process + ${filamentNames.length} filament`);
}

const body = rows
  .map(
    (row) => `  {
    printerId: '${row.printerId}',
    name: ${JSON.stringify(row.name)},
    qualityTier: ${JSON.stringify(row.qualityTier)},
    nozzleMm: ${row.nozzleMm},
    layerHeightMm: ${row.layerHeightMm},
    sourceUrl: ${JSON.stringify(row.sourceUrl)},
    values: ${JSON.stringify(row.values)},
  },`,
  )
  .join('\n');

const filamentBody = filamentRows
  .map(
    (row) => `  {
    printerId: '${row.printerId}',
    name: ${JSON.stringify(row.name)},
    filamentType: ${JSON.stringify(row.filamentType)},
    nozzleMm: ${row.nozzleMm},
    sourceUrl: ${JSON.stringify(row.sourceUrl)},
    values: ${JSON.stringify(row.values)},
  },`,
  )
  .join('\n');

fs.writeFileSync(
  OUT_PATH,
  `import type { MachineFilamentPreset, MachineProcessPreset } from '../types';

/**
 * Preset process CHÍNH HÃNG của từng máy, trích từ bộ profile hệ thống của OrcaSlicer
 * (repo SoftFever/OrcaSlicer, thư mục \`resources/profiles/<Hãng>/process/\`). Mỗi preset đã
 * được làm phẳng theo chuỗi \`inherits\`, và chỉ giữ những khoá có trong \`SETTING_MAP\`.
 *
 * Dùng cho cột "Giá trị quy đổi" ở trang Đổi slicer: khoá phụ thuộc máy (tốc độ, gia tốc)
 * KHÔNG được quy đổi bằng công thức — lấy thẳng số mà hãng máy công bố cho máy đó.
 *
 * ⚠️ FILE SINH TỰ ĐỘNG, KHÔNG SỬA TAY.
 * Thêm máy mới: sửa \`TARGETS\` trong scripts/extractMachinePresets.mjs rồi chạy
 * \`node scripts/extractMachinePresets.mjs\` (xem docs/research/slicer-interop.md mục 7).
 *
 * \`printerId\` khớp \`id\` trong src/data/printers.ts.
 */

export const MACHINE_PROCESS_PRESETS: MachineProcessPreset[] = [
${body}
];

/**
 * Preset FILAMENT chính hãng của từng máy — nguồn duy nhất cho nhiệt độ, flow ratio và
 * giới hạn lưu lượng ở cột "Giá trị quy đổi".
 *
 * Cùng loại nhựa nhưng máy khác nhau thì hãng vẫn đặt số khác (hotend và luồng gió khác),
 * nên KHÔNG dùng preset của máy này cho máy kia. Đây là số của cuộn nhựa HÃNG bán kèm —
 * cuộn của hãng khác phải theo nhãn trên cuộn đó.
 */
export const MACHINE_FILAMENT_PRESETS: MachineFilamentPreset[] = [
${filamentBody}
];

/** Máy đang có preset chính hãng trong app — dropdown "máy đích" lấy từ đây. */
export const MACHINE_IDS_WITH_PRESETS: string[] = [
  ...new Set(MACHINE_PROCESS_PRESETS.map((preset) => preset.printerId)),
];
`,
);

console.log(`đã ghi ${rows.length} process + ${filamentRows.length} filament → ${OUT_PATH}`);
