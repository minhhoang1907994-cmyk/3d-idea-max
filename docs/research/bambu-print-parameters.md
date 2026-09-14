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
