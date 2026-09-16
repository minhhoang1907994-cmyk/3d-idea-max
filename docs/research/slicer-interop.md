# Chuyển file & thông số giữa các slicer (nguồn sự thật cho trang "Đổi slicer")

**Ngày tra cứu**: 2026-09-16
**Mục đích**: nguồn dữ liệu cho `src/data/slicerTargets.ts` và `src/data/settingMap.ts`.
Mọi tên khoá (key) và nhãn UI trong hai file đó PHẢI khớp bảng dưới đây, kèm nguồn.

## ⚠️ Quy tắc bắt buộc khi dùng file này

Giống hai file research còn lại: ô `CHƯA VERIFY` phải giữ nguyên trạng thái đó trong code
(hiển thị "chưa có dữ liệu" / "phải tự kiểm"), KHÔNG được đoán. Ở đây rủi ro nằm ở chỗ
**gán sai một khoá thông số = bản in thật bị sai**, không chỉ là UI lệch.

## 1. Vấn đề gốc: file MakerWorld chỉ "đúng sẵn" trên máy Bambu

File `.3mf` tải từ MakerWorld là **project file của Bambu Studio**, không phải file hình
học trung tính. Bên trong nó mang theo preset của máy Bambu (và thường cả gcode đã cắt lớp
cho đúng máy đó). Mở trên slicer của hãng khác thì phần hình học đọc được, còn phần preset
trỏ vào máy Bambu nên không dùng lại được.

| Đường dẫn trong file `.3mf`                       | Nội dung                                              | Chuyển sang slicer khác |
| ------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| `3D/3dmodel.model`                                | Hình học (XML: vertices + triangles), transform build | ✅ dùng được            |
| `3D/Objects/*.model`                              | Hình học tách file (bản Bambu/Orca mới)               | ✅ dùng được            |
| `[Content_Types].xml`, `_rels/`                   | Cấu trúc chuẩn 3MF                                    | ✅ cần giữ              |
| `Metadata/project_settings.config`                | JSON — toàn bộ preset process + filament + máy        | ⚠️ phải mapping         |
| `Metadata/model_settings.config`                  | Cấu hình từng object theo quy ước Bambu               | ❌ bỏ                   |
| `Metadata/slice_info.config`                      | Metadata lần cắt lớp                                  | ❌ bỏ                   |
| `Metadata/plate_*.gcode`                          | Gcode đã cắt cho đúng máy Bambu                       | ❌ bỏ (sai máy)         |
| `Metadata/plate_*.png`, `top_*.png`, `pick_*.png` | Ảnh thumbnail                                         | ❌ bỏ                   |

Nguồn cấu trúc file: [OrcaSlicer — 3MF Project Format](https://deepwiki.com/SoftFever/OrcaSlicer/7.1-3mf-project-format),
[Printago — 3MF file format: how Bambu Studio and Orca Slicer structure your prints](https://printago.io/blog/3mf-file-format)

## 2. Phả hệ slicer — quyết định preset có chuyển được không

| Slicer               | Hãng       | Fork từ        | Nguồn                                                                                                            |
| -------------------- | ---------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Bambu Studio         | Bambu Lab  | PrusaSlicer    | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| OrcaSlicer           | cộng đồng  | Bambu Studio   | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| Snapmaker Orca       | Snapmaker  | OrcaSlicer     | [snapmaker.com](https://www.snapmaker.com/snapmaker-orca), [GitHub](https://github.com/Snapmaker/OrcaSlicer)     |
| Creality Print (≥5)  | Creality   | OrcaSlicer     | [GitHub](https://github.com/CrealityOfficial/CrealityPrint), [printago](https://printago.io/blog/creality-print) |
| Anycubic Slicer Next | Anycubic   | OrcaSlicer     | [wiki Anycubic](https://wiki.anycubic.com/en/software-and-app)                                                   |
| ElegooSlicer         | Elegoo     | OrcaSlicer     | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| Orca-FlashForge      | FlashForge | OrcaSlicer     | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| Sovol-OrcaSlicer     | Sovol      | OrcaSlicer     | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| QIDI Studio          | QIDI       | Bambu Studio   | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| PrusaSlicer          | Prusa      | Slic3r         | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |
| UltiMaker Cura       | UltiMaker  | — (CuraEngine) | [simplyprint](https://simplyprint.io/articles/orcaslicer-forks-compared)                                         |

Kết luận có nguồn (cùng bài simplyprint):

- **Trong họ Orca** (kể cả Bambu Studio là cha của Orca): preset xuất từ fork này import
  sang fork kia "usually imports into vanilla OrcaSlicer cleanly, or with only a few
  settings to confirm" vì dùng **cùng engine và cùng cấu trúc JSON profile** → tên khoá
  trùng nhau, khỏi mapping.
- **PrusaSlicer → Orca**: chuyển được một phần, không phải drop-in.
- **Cura**: "Cura profiles do not import into any Orca-family slicer" vì khác engine
  (CuraEngine) → buộc phải nhập tay theo bảng ánh xạ ở mục 4.

**Máy Snapmaker / Creality / Creality SPARKX** (câu hỏi ban đầu) đều nằm trong họ Orca:
Snapmaker Orca và Creality Print đều fork từ OrcaSlicer, còn SPARKX i7 dùng Creality Print
([creality.com — SPARKX i7 downloads](https://www.creality.com/download/sparkx-i7)).
Nghĩa là **tên thông số không phải vấn đề** — vấn đề là preset trong file trỏ vào máy Bambu.

## 3. Tên khoá trong `project_settings.config` — verify từ profile chính thức

Tên khoá của họ Orca lấy trực tiếp từ bộ profile hệ thống trong repo OrcaSlicer:

| Nhóm khoá                  | File nguồn                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| process (thông số cắt lớp) | [`resources/profiles/BBL/process/fdm_process_common.json`](https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles/BBL/process/fdm_process_common.json)                   |
| filament                   | [`resources/profiles/BBL/filament/fdm_filament_pla.json`](https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles/BBL/filament/fdm_filament_pla.json)                     |
| machine (máy)              | [`resources/profiles/BBL/machine/Bambu Lab A1 0.4 nozzle.json`](https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles/BBL/machine/Bambu%20Lab%20A1%200.4%20nozzle.json) |
| nhãn UI của từng khoá      | [`src/libslic3r/PrintConfig.cpp`](https://github.com/SoftFever/OrcaSlicer/blob/main/src/libslic3r/PrintConfig.cpp) — `def->label = L("…")`                                             |

Preset process của họ Orca là JSON có `type: "process"`, `name`, `inherits`, `from`
(ví dụ [`0.20mm Standard @BBL A1.json`](https://github.com/SoftFever/OrcaSlicer/blob/main/resources/profiles/BBL/process/0.20mm%20Standard%20%40BBL%20A1.json)).
Preset do app sinh ra đặt `from: "User"` và `inherits: ""`.

## 4. Bảng ánh xạ Orca family ↔ Cura

Tên khoá Cura + nhãn UI verify từ [`resources/definitions/fdmprinter.def.json`](https://github.com/Ultimaker/Cura/blob/main/resources/definitions/fdmprinter.def.json)
(mỗi setting có `label` + `unit`).

| Khoá Orca                          | Nhãn Orca (nhóm — nhãn)           | Khoá Cura                            | Nhãn Cura                          | Tầng |
| ---------------------------------- | --------------------------------- | ------------------------------------ | ---------------------------------- | ---- |
| `layer_height`                     | Layer height                      | `layer_height`                       | Layer Height                       | A    |
| `initial_layer_print_height`       | First layer height                | `layer_height_0`                     | Initial Layer Height               | A    |
| `wall_loops`                       | Wall loops                        | `wall_line_count`                    | Wall Line Count                    | A    |
| `top_shell_layers`                 | Top shell layers                  | `top_layers`                         | Top Layers                         | A    |
| `bottom_shell_layers`              | Bottom shell layers               | `bottom_layers`                      | Bottom Layers                      | A    |
| `top_shell_thickness`              | Top shell thickness               | `top_bottom_thickness`               | Top/Bottom Thickness               | A    |
| `sparse_infill_density`            | Sparse infill density             | `infill_sparse_density`              | Infill Density                     | A    |
| `sparse_infill_pattern`            | Sparse infill pattern             | `infill_pattern`                     | Infill Pattern                     | A    |
| `line_width`                       | Line width — Default              | `line_width`                         | Line Width                         | A    |
| `outer_wall_line_width`            | Line width — Outer wall           | `wall_line_width_0`                  | Outer Wall Line Width              | A    |
| `inner_wall_line_width`            | Line width — Inner wall           | `wall_line_width_x`                  | Inner Wall(s) Line Width           | A    |
| `sparse_infill_line_width`         | Line width — Sparse infill        | `infill_line_width`                  | Infill Line Width                  | A    |
| `enable_support`                   | Enable support                    | `support_enable`                     | Generate Support                   | A    |
| `support_threshold_angle`          | Support — Threshold angle         | `support_angle`                      | Support Overhang Angle             | A    |
| `support_type`                     | Support — Type                    | `support_structure`                  | Support Structure                  | A    |
| `brim_type`                        | Brim type                         | `adhesion_type`                      | Build Plate Adhesion Type          | A    |
| `brim_width`                       | Brim width                        | `brim_width`                         | Brim Width                         | A    |
| `skirt_loops`                      | Skirt loops                       | `skirt_line_count`                   | Skirt Line Count                   | A    |
| `seam_position`                    | Seam position                     | `z_seam_type`                        | Z Seam Alignment                   | A    |
| `ironing_type`                     | Ironing type                      | `ironing_enabled`                    | Enable Ironing                     | A    |
| `spiral_mode`                      | Spiral vase                       | `magic_spiralize`                    | Spiralize Outer Contour            | A    |
| `xy_hole_compensation`             | X-Y hole compensation             | `xy_offset`                          | Horizontal Expansion               | B    |
| `xy_contour_compensation`          | X-Y contour compensation          | `xy_offset`                          | Horizontal Expansion               | B    |
| `elefant_foot_compensation`        | Elephant foot compensation        | `xy_offset_layer_0`                  | Initial Layer Horizontal Expansion | B    |
| `resolution`                       | Resolution                        | `meshfix_maximum_resolution`         | Maximum Resolution                 | A    |
| `raft_layers`                      | Raft layers                       | (không có tương đương 1-1)           | CHƯA VERIFY                        | A    |
| `nozzle_temperature`               | Nozzle temperature — Other layers | `material_print_temperature`         | Printing Temperature               | B    |
| `nozzle_temperature_initial_layer` | Nozzle temperature — First layer  | `material_print_temperature_layer_0` | Printing Temperature Initial Layer | B    |
| `hot_plate_temp`                   | Bed temperature — Other layers    | `material_bed_temperature`           | Build Plate Temperature            | B    |
| `outer_wall_speed`                 | Speed — Outer wall                | `speed_wall_0`                       | Outer Wall Speed                   | B    |
| `inner_wall_speed`                 | Speed — Inner wall                | `speed_wall_x`                       | Inner Wall Speed                   | B    |
| `sparse_infill_speed`              | Speed — Sparse infill             | `speed_infill`                       | Infill Speed                       | B    |
| `internal_solid_infill_speed`      | Speed — Internal solid infill     | `speed_topbottom`                    | Top/Bottom Speed                   | B    |
| `top_surface_speed`                | Speed — Top surface               | `speed_topbottom`                    | Top/Bottom Speed                   | B    |
| `initial_layer_speed`              | Speed — First layer               | `speed_print_layer_0`                | Initial Layer Print Speed          | B    |
| `travel_speed`                     | Speed — Travel                    | `speed_travel`                       | Travel Speed                       | B    |
| `default_acceleration`             | Acceleration — Normal printing    | `acceleration_print`                 | Print Acceleration                 | B    |
| `filament_max_volumetric_speed`    | Max volumetric speed              | (không có tương đương 1-1)           | CHƯA VERIFY                        | B    |
| `filament_flow_ratio`              | Flow ratio                        | (không có tương đương 1-1)           | CHƯA VERIFY                        | B    |

Ý nghĩa **Tầng**:

- **A — chuyển thẳng được**: giá trị do hình học mô hình quyết định (bề dày, số lớp, mật độ
  điền, support...). Đổi máy vẫn giữ nguyên ý nghĩa.
- **B — phải xem lại tay**: giá trị phụ thuộc máy + filament cụ thể (nhiệt độ, tốc độ, gia
  tốc, lưu lượng, bù sai số). Tốc độ của A1 (ví dụ travel 700 mm/s) không áp được sang máy
  bedslinger khung hở. App **không** quy đổi tầng B bằng công thức — chỉ tra số trong preset
  chính hãng của máy đích (mục 6-7).

Ba khoá bù sai số `xy_hole_compensation` / `xy_contour_compensation` /
`elefant_foot_compensation` xếp tầng **B** dù nghe như hình học: chúng bù cho sai số cơ khí
và độ bè lớp đầu của CHÍNH máy đó. Bằng chứng: cùng preset 0.20mm Standard, A1 để elephant
foot `0.075` còn Kobra X để `0.1`.

Hai khoá `xy_hole_compensation` / `xy_contour_compensation` cùng trỏ về `xy_offset` của Cura
vì Cura chỉ có một ô Horizontal Expansion — trường hợp nhiều-về-một, app nêu rõ trong UI.

## 5. Khoá thuộc máy — app cố tình KHÔNG đưa vào preset sinh ra

`printer_settings_id`, `printer_model`, `printer_variant`, `nozzle_diameter`,
`printable_area`, `printable_height`, `machine_max_*`, `machine_start_gcode`,
`machine_end_gcode`, `change_filament_gcode`, `nozzle_type`, `printer_structure`
(nguồn: file machine profile ở mục 3).

Lý do: đây là đặc tính máy Bambu. Bê sang máy khác thì gcode khởi động sai, giới hạn tốc
độ/gia tốc sai — hỏng bản in hoặc hỏng máy. Preset do app sinh ra chỉ mang khoá process.

## 6. Cột "Giá trị quy đổi" — lấy số ở đâu

Trang Đổi slicer có cột **Giá trị quy đổi** trả lời câu "sang máy X thì điền số nào".
Không có công thức quy đổi nào ở đây — chỉ ba trạng thái:

| Trạng thái      | Áp dụng cho                       | Số lấy từ đâu                                            |
| --------------- | --------------------------------- | -------------------------------------------------------- |
| Giữ nguyên      | Tầng A (hình học)                 | Chính số trong file — đổi máy không làm nó sai           |
| Theo preset     | Tầng B, khoá thuộc preset process | Preset CHÍNH HÃNG của máy đích (mục 7)                   |
| Chưa có dữ liệu | Không dò được preset khớp         | Không có nguồn → hiển thị lý do, TUYỆT ĐỐI không đoán số |

Khoá filament (nhiệt độ nozzle/bed, flow ratio, max volumetric speed) lấy từ **preset
filament chính hãng của đúng máy đích**, không phải từ preset process. Máy đích chọn theo
`filament_type` ghi trong file, user đổi tay được. Ví dụ: file ghi PLA 220 °C (nhựa Bambu),
`Anycubic PLA @Anycubic Kobra X 0.4 nozzle` để 205 °C / lớp đầu 215 °C / bàn 60 °C /
flow ratio 0.96 / max volumetric 13 mm³/s.

⚠️ Đây là số của **cuộn nhựa hãng máy bán kèm**. Dùng cuộn hãng khác thì phải theo nhãn trên
cuộn đó — UI ghi rõ câu này ngay dưới ô chọn filament. App vẫn để "chưa có dữ liệu" khi:
loại nhựa đó máy đích không có preset (ví dụ PC trên Kobra X), hoặc file liệt kê nhiều loại
nhựa cùng lúc (in nhiều màu) nên không suy ra được một loại duy nhất.

Ví dụ thật, preset 0.20mm Standard, nozzle 0.4:

| Khoá                        | Bambu Lab A1 | Anycubic Kobra X |
| --------------------------- | ------------ | ---------------- |
| `travel_speed`              | 700          | 300              |
| `sparse_infill_speed`       | 270          | 300              |
| `elefant_foot_compensation` | 0.075        | 0.1              |
| `default_acceleration`      | 6000         | 6000 (trùng)     |

**Quan trọng — số trùng nhau là chuyện thường**: hai hãng đều fork profile từ cùng gốc nên
phần lớn ô trùng số. Đếm thực tế giữa A1 và Kobra X cùng layer height, trên 8 ô tốc độ/gia tốc:

| Preset Kobra X         | Số ô khác A1 |
| ---------------------- | ------------ |
| 0.08mm Standard        | 7/8          |
| 0.12 / 0.16mm Standard | 7/8          |
| 0.20mm Standard        | 2/8          |
| 0.24 / 0.28mm Standard | 1/8          |

Vì thế UI phải **đánh dấu riêng ô thật sự khác** (`ConvertedValue.changed`) và đếm chúng
(`ConversionResult.changedCount`). Nếu chỉ tô cả nhóm phụ thuộc máy thì 2 ô cần sửa chìm
giữa hàng chục ô trùng, người dùng tưởng cột quy đổi vô dụng — đúng phản hồi đã nhận.

## 7. Bộ preset máy đi kèm app

`src/data/machinePresets.ts` **sinh tự động**, không sửa tay. Nguồn: bộ profile hệ thống
của OrcaSlicer, `resources/profiles/<Hãng>/process/*.json`, đã làm phẳng theo chuỗi
`inherits` và chỉ giữ khoá có trong `SETTING_MAP`.

Máy đang có: **Anycubic Kobra X** — 9 preset process + 13 preset filament
(`resources/profiles/Anycubic/filament/*.json`: PLA, PLA+, PLA Matte, PLA Silk, PLA Glow,
PLA High Speed, PETG, Generic PETG, ABS, ASA, TPU 95A, TPU for ACE, PVA).

Chỉ nhúng preset của máy **đích**. Máy nguồn (Bambu) không cần: số của nó đã nằm sẵn trong
file `.3mf` user tải lên, nhúng thêm chỉ làm nặng bundle. Bộ preset A1 từng được nhúng trong
lúc dựng tính năng và đã gỡ theo quyết định của user (2026-09-16) — bảng so sánh A1 ↔ Kobra X
ở mục 6 giữ lại làm căn cứ cho cách đánh dấu ô thay đổi, dữ liệu gốc vẫn tra được ở repo
OrcaSlicer.

Thêm máy mới:

```bash
# 1. thêm một dòng vào TARGETS trong scripts/extractMachinePresets.mjs
#    { printerId: '<id trong src/data/printers.ts>', vendor: '<thư mục hãng>', match: /@.../ }
# 2. chạy lại
node scripts/extractMachinePresets.mjs
```

`printerId` phải khớp `id` trong `src/data/printers.ts` — máy chưa có ở đó thì thêm vào
trước, kèm `sourceUrl` như mọi máy khác. OrcaSlicer có sẵn profile của Snapmaker (gồm U1),
Creality (gồm SPARKX i7), Elegoo, Flashforge, Sovol, QIDI, Prusa.

**Lưu ý về quy ước đặt tên preset Anycubic**: mục 5 của
`anycubic-print-parameters.md` ghi máy Anycubic đời mới LUÔN có hậu tố nozzle
(`0.20mm Standard @Anycubic Kobra 3 0.4 nozzle`). Điều đó đúng với Kobra 3 / S1, nhưng
preset Kobra X trong OrcaSlicer **không có hậu tố**: `0.20mm Standard @Anycubic Kobra X`.
Repo Anycubic Slicer Next (nhánh `main`) hiện chưa có profile Kobra X nào nên **CHƯA VERIFY**
được tên preset mà chính phần mềm Anycubic hiển thị cho máy này.

## 8. Điểm CHƯA VERIFY

| Nội dung                                                                                                    | Trạng thái                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tương đương Cura của `filament_max_volumetric_speed`, `filament_flow_ratio`                                 | CHƯA VERIFY — UI ghi "phải tự đặt", không đoán                                                                                                                                           |
| Tương đương Cura của `raft_layers`                                                                          | KHÔNG CÓ 1-1 — Cura cấu hình raft bằng cả nhóm ô `raft_*`                                                                                                                                |
| Trùng tên khoá `support_type`: Orca = normal/tree, Cura = buildplate/everywhere (label "Support Placement") | Đã verify từ `fdmprinter.def.json`, app ánh xạ Orca `support_type` → Cura `support_structure`                                                                                            |
| Tên preset Kobra X trong chính Anycubic Slicer Next                                                         | CHƯA VERIFY — repo Anycubic chưa có profile Kobra X, xem mục 7                                                                                                                           |
| Hành vi chính xác của từng fork khi mở 3mf có preset máy không tồn tại                                      | CHƯA VERIFY — tài liệu OrcaSlicer chỉ nêu "use defaults with warning"                                                                                                                    |
| Preset máy của Snapmaker/Creality có ánh xạ 1-1 sang máy Bambu nào không                                    | KHÔNG CÓ — không tồn tại ánh xạ chính hãng, nên app không gợi ý                                                                                                                          |
| Thông số in trên wiki Anycubic Kobra X                                                                      | KHÔNG ĐỌC ĐƯỢC — trang render bằng JS (fetch chỉ ra tiêu đề); nội dung là hướng dẫn lắp đặt / xử lý sự cố, không phải bảng thông số. Dùng preset filament chính hãng thay thế, xem mục 6 |
