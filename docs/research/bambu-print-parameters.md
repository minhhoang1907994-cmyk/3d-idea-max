# Bambu Lab — Bảng thông số in (nguồn sự thật cho tính năng Printability)

**Ngày tra cứu**: 2026-09-14
**Mục đích**: nguồn dữ liệu cho phần "3D Printability" của app — mọi giá trị trong
`src/data/printers.ts` và `src/data/filaments.ts` PHẢI khớp với bảng này.

## ⚠️ Quy tắc bắt buộc khi dùng file này

- **Không điền giá trị chưa có trong bảng.** Ô đánh dấu `CHƯA VERIFY` phải giữ nguyên
  trạng thái đó trong code (hiển thị "chưa có dữ liệu"), KHÔNG được đoán số.
- Thông số in sai gây hỏng bản in thật (tốn nhựa + nhiều giờ máy) — đây là lý do
  quy tắc trên nghiêm ngặt hơn các phần khác của project.
- Mọi giá trị thêm mới phải kèm URL nguồn chính thức Bambu Lab.

## 1. Máy in — khổ in và buồng in

| Máy     | Khổ in (W×D×H) | Buồng in                               | Nguồn                                                                                                                                             |
| ------- | -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1      | 256×256×256 mm | Open-frame (không kín)                 | [tech-specs](https://bambulab.com/en/a1/tech-specs), [print volume wiki](https://wiki.bambulab.com/en/knowledge-sharing/print-volume-limitations) |
| A1 mini | 180×180×180 mm | Không kín, không kiểm soát nhiệt buồng | [tech-specs](https://bambulab.com/en/a1-mini/tech-specs)                                                                                          |
| P1S     | 256×256×256 mm | Kín hoàn toàn + lọc than hoạt tính     | [P1S store](https://us.store.bambulab.com/products/p1s)                                                                                           |
| X1C     | 256×256×256 mm | Kín                                    | [X1 series](https://bambulab.com/en-us/x1)                                                                                                        |

## 2. Máy in — vật liệu hỗ trợ

| Máy     | In tốt                                                                           | KHÔNG khuyến nghị                                                                                                                         | Nguồn                                                          |
| ------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A1      | PLA, PETG, TPU + support material (PVA, HIPS...)                                 | ABS, ASA, PC, PA, PA-CF/GF, PET-CF/GF, PPA-CF/GF — do open-frame, nhiệt buồng thấp → giảm độ bền liên lớp, cong vênh (càng lớn càng nặng) | [A1 FAQ](https://wiki.bambulab.com/en/a1/manual/faq)           |
| A1 mini | PLA, PETG, TPU + support material                                                | ABS, ASA, PC, PA, PET — cần nhiệt bàn/buồng cao hơn                                                                                       | [A1 mini FAQ](https://wiki.bambulab.com/en/a1-mini/manual/faq) |
| P1S     | PLA, PETG, TPU, ABS, ASA (buồng kín + lọc mùi)                                   | Fiber-reinforced (CF/GF) nếu chưa nâng cấp extruder + hotend                                                                              | [P1 FAQ](https://wiki.bambulab.com/en/p1/manual/faq)           |
| X1C     | Rộng nhất: PA, PC, PET, TPU + chuyên CF/GF (có sẵn hardened nozzle + drive gear) | —                                                                                                                                         | [X1 series](https://bambulab.com/en-us/x1)                     |

## 3. Yêu cầu đầu phun (nozzle)

| Điều kiện                                                               | Yêu cầu                                                   | Nguồn                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A1 mặc định                                                             | Stainless steel 0.4 mm                                    | [A1 FAQ](https://wiki.bambulab.com/en/a1/manual/faq)                                 |
| In vật liệu chứa hạt cứng (PLA-CF/GF, PLA Glow, PETG-CF/GF, PAHT-CF/GF) | Phải đổi sang **hardened steel** — stainless sẽ mòn nhanh | [A1 FAQ](https://wiki.bambulab.com/en/a1/manual/faq)                                 |
| In CF/GF                                                                | **Không dùng nozzle 0.2 mm** — nguy cơ tắc rất cao        | [filament guide](https://wiki.bambulab.com/en/general/filament-guide-material-table) |

## 4. Filament — nhiệt độ

| Filament    | Nozzle (°C)     | Bed (°C)                                      | Nguồn                                                                                                                     |
| ----------- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| PLA (Basic) | 190 – 230       | CHƯA VERIFY                                   | [PLA Basic TDS](https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_pla_basic_technical_data_sheet.pdf)               |
| PETG HF     | 230 – 260       | 60 – 80 (Smooth / Textured PEI)               | [PETG HF](https://bambulab.com/en-ca/filament/petg-hf)                                                                    |
| TPU         | 220 – 240       | 30 – 35 (Smooth / Textured PEI)               | [filament guide](https://wiki.bambulab.com/en/general/filament-guide-material-table)                                      |
| PLA-CF      | 210 – 240       | 45 – 65 (Smooth PEI) / 55 – 65 (Textured PEI) | [filament guide](https://wiki.bambulab.com/en/general/filament-guide-material-table)                                      |
| PETG-CF     | 220 – 240       | CHƯA VERIFY                                   | [filament guide](https://wiki.bambulab.com/en/general/filament-guide-material-table)                                      |
| ASA-CF      | 250 – 280       | CHƯA VERIFY                                   | [ASA-CF TDS](https://wiki.bambulab.com/filament-acc/asacf-pahtcf/bambus_asa-cf_technical_data_sheet.pdf)                  |
| ABS (Basic) | **CHƯA VERIFY** | **CHƯA VERIFY**                               | [ABS TDS](https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_abs_technical_data_sheet_v3.pdf) — WebFetch bị chặn 402 |
| ASA (Basic) | **CHƯA VERIFY** | **CHƯA VERIFY**                               | [ASA TDS](https://wiki.bambulab.com/filament-acc/abs-asa-pc/6eaf4c432d1d4014a1975e55a55ed00b.pdf) — WebFetch bị chặn 402  |
| PC          | **CHƯA VERIFY** | **CHƯA VERIFY**                               | [PC TDS](https://wiki.bambulab.com/filament-acc/abs-asa-pc/a52afdccddfd448583d119587122c8c5.pdf)                          |

### Ghi chú vận hành

- **PLA**: điểm mềm thấp — khi bàn in đặt trên 45 °C, nên mở cửa trước và/hoặc tháo nắp kính trên.
  Nguồn: [ABS/ASA/PC usage guide](https://wiki.bambulab.com/en/filament/abs_asa_pc)
- **ABS / ASA / PC**: tăng nhiệt buồng giúp giảm ứng suất nội do co ngót → tăng tỉ lệ in thành công.
  Nguồn: [ABS/ASA/PC usage guide](https://wiki.bambulab.com/en/filament/abs_asa_pc)

## 5. Thông số Quality / Strength / Speed — TRẠNG THÁI: CHƯA VERIFY

Các giá trị dưới đây do **user cung cấp**, nguồn là bài hướng dẫn bên thứ ba
([meme3d](https://www.meme3d.com/khoahoc/bambu-studio/baihoc/cai-dat-thong-so-cat-lop-co-ban-phan-i/)),
**chưa đối chiếu được với tài liệu Bambu Lab chính thức**:

| Nhóm     | Thông số              | Giá trị user đưa                                              | Trạng thái                 |
| -------- | --------------------- | ------------------------------------------------------------- | -------------------------- |
| Quality  | Layer Height          | 0.2 (tiêu chuẩn) / 0.12 / 0.08 (chi tiết tinh xảo)            | Chưa verify từ nguồn Bambu |
| Quality  | Wall Loops            | ≥ 3                                                           | Chưa verify                |
| Strength | Sparse Infill Density | 15 – 25 % (vật dụng thông thường)                             | Chưa verify                |
| Strength | Sparse Infill Pattern | Grid / Gyroid / Rectilinear (Gyroid tối ưu chịu lực đa hướng) | Chưa verify                |
| Speed    | Outer Wall            | 60 – 100 mm/s                                                 | Chưa verify                |
| Speed    | First Layer           | 30 – 50 mm/s                                                  | Chưa verify                |

## 6. Chênh lệch giữa số user cung cấp và tài liệu Bambu chính thức

| Mục         | User cung cấp | Bambu chính thức           | Xử lý           |
| ----------- | ------------- | -------------------------- | --------------- |
| PLA nozzle  | 200 – 220 °C  | **190 – 230 °C**           | Dùng số Bambu   |
| PLA bed     | 55 – 65 °C    | Chưa verify                | Giữ CHƯA VERIFY |
| PETG nozzle | 230 – 250 °C  | **230 – 260 °C** (PETG HF) | Dùng số Bambu   |
| PETG bed    | (không nêu)   | **60 – 80 °C**             | Dùng số Bambu   |

## 7. Việc còn phải làm

- [ ] Lấy nhiệt độ ABS / ASA / PC / PA từ TDS chính thức (WebFetch đang bị chặn — cần tải PDF thủ công hoặc thử lại sau)
- [ ] Lấy bed temperature của PLA Basic và PETG-CF
- [ ] Đối chiếu nhóm Quality / Strength / Speed với preset mặc định trong Bambu Studio
- [ ] Xác nhận danh sách build plate (Smooth PEI / Textured PEI / Engineering / High Temp) nếu muốn thông số chính xác theo mặt bàn

---

## 8. Cấu trúc tham số Bambu Studio (từ ảnh chụp user cung cấp, 2026-09-14)

Bambu Studio chia tham số thành **5 tab**. Đây là cấu trúc để app hiển thị theo, lấy từ
ảnh chụp giao diện thật:

| Tab          | Nhóm               | Tham số chính                                                                                                                                                                                                                       |
| ------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quality**  | Wall generator     | Wall generator (Classic/Arachne)                                                                                                                                                                                                    |
|              | Advanced           | Order of walls, Print infill first, Bridge flow, Thick bridges, Top surface flow ratio, Initial layer flow ratio, Only one wall on top surfaces, Top area threshold, Detect overhang walls, Smooth coefficient, Avoid crossing wall |
| **Strength** | Walls              | Wall loops, Detect thin wall                                                                                                                                                                                                        |
|              | Top/bottom shells  | Top surface pattern, Top shell layers, Bottom surface pattern, Bottom shell layers, Internal solid infill pattern                                                                                                                   |
|              | Sparse infill      | Sparse infill density (%), Sparse infill pattern, Length of sparse infill anchor                                                                                                                                                    |
|              | Advanced           | Infill/Wall overlap, Infill direction, Minimum sparse infill threshold, Ensure vertical shell thickness                                                                                                                             |
| **Speed**    | First layer speed  | First layer, First layer infill, Initial layer travel speed, Number of slow layers                                                                                                                                                  |
|              | Other layers speed | Outer wall, Inner wall, Small perimeters, Sparse infill, Internal solid infill, Top surface, Gap infill                                                                                                                             |
|              | Overhang speed     | Slow down for overhangs, Classic mode                                                                                                                                                                                               |
| **Support**  | Support            | Enable support, Type, Style, Threshold angle, On build plate only, Remove small overhangs                                                                                                                                           |
|              | Raft               | Raft layers                                                                                                                                                                                                                         |
|              | Advanced           | Tree support branch distance/diameter/angle, Top Z distance, Bottom Z distance, Top/Bottom interface layers, Support/object xy distance                                                                                             |
| **Others**   | Special mode       | Slicing Mode, Print sequence, Spiral vase, Smooth Spiral, Timelapse, Fuzzy Skin                                                                                                                                                     |

### Quy ước đặt tên preset

`{layer height}mm {profile} @BBL {máy}[ {nozzle} nozzle]`
Ví dụ thấy trong ảnh: `0.20mm Standard @BBL A1`, `0.20mm Standard @BBL X1C`,
`0.30mm Standard @BBL X1C 0.6 nozzle`. Hậu tố nozzle chỉ xuất hiện khi khác 0.4mm.

### ⚠️ Cảnh báo về số liệu trong ảnh — ĐỌC TRƯỚC KHI DÙNG

| Ảnh                              | Preset                                | Dùng được số không?                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `质量—高级设置en1.png` (Quality) | `0.20mm Standard @BBL A1`             | Chỉ các giá trị Advanced: Bridge flow 1, Top surface flow ratio 1, Initial layer flow ratio 1, Top area threshold 100%, Smooth coefficient 80, Order of walls = inner/outer                                                                                                     |
| `petg-推荐强度en.png` (Strength) | `* 0.20mm Standard @BBL X1C`          | **KHÔNG** — dấu `*` = preset đã sửa. Wall loops 1 / Top+Bottom shell 0 / infill 100% Concentric là cấu hình **spiral vase**, không phải mặc định                                                                                                                                |
| `e39ef81c...png` (Speed)         | `0.30mm Standard @BBL X1C 0.6 nozzle` | Chỉ cho **X1C + nozzle 0.6mm**. First layer 35, First layer infill 55, Outer wall 120, Inner wall 150, Small perimeters 50%, Sparse infill 100, Internal solid infill 150, Top surface 150, Gap infill 50 (mm/s)                                                                |
| `is-it-normal...png` (Support)   | không rõ preset                       | Giá trị cấu trúc dùng được: Threshold angle 30°, Tree branch distance 5mm / diameter 2mm / angle 45°, Top Z distance 0.15mm, Bottom Z distance 0.2mm, Base pattern spacing 2.5mm, Top/Bottom interface layers 2, Top interface spacing 0.3mm, Support/object xy distance 0.15mm |
| `Thu-tu-in.webp` (Others)        | `* 0.20mm Standard @BBL A1`           | Chỉ là minh hoạ vị trí tham số Special mode, các giá trị đang ở chế độ spiral vase                                                                                                                                                                                              |

**Kết luận cho code**: app sinh được Quality/Strength từ axis `detail` + `strength`;
Speed chỉ có dữ liệu cho X1C 0.6 nozzle, các máy khác để `null`; Support và Others phụ
thuộc hình dạng mô hình nên app chỉ đưa gợi ý cần kiểm tra, không chốt giá trị.
