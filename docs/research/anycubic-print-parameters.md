# Anycubic — Bảng thông số in (nguồn sự thật cho máy Anycubic)

**Ngày tra cứu**: 2026-09-15
**Mục đích**: nguồn dữ liệu cho phần "3D Printability" khi user chọn máy Anycubic —
mọi giá trị của máy Anycubic trong `src/data/printers.ts` PHẢI khớp với bảng này.
Máy Bambu Lab xem `bambu-print-parameters.md`.

## ⚠️ Quy tắc bắt buộc khi dùng file này

Giống file Bambu: ô đánh dấu `CHƯA VERIFY` phải giữ nguyên trạng thái đó trong code
(hiển thị "chưa có dữ liệu"), KHÔNG được đoán số. Thông số in sai gây hỏng bản in thật.

## 1. Máy in — khổ in và buồng in

| Máy     | Khổ in (W×D×H) | Buồng in                          | Nguồn                                                                                                                                                                              |
| ------- | -------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kobra X | 260×260×260 mm | Khung hở (open gantry), không kín | [store Kobra X](https://store.anycubic.com/products/kobra-x), [wiki — key components](https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x/introduction-to-key-components) |

## 2. Máy in — vật liệu

| Nguồn                                                                                                                                                                                       | Nội dung                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [wiki Kobra X](https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x/faq)                                                                                                            | Bảng điều khiển in nêu các vật liệu: PLA / PETG / TPU                                   |
| [store Kobra X](https://store.anycubic.com/products/kobra-x)                                                                                                                                | Liệt kê tương thích: PLA+, PLA High Speed, PLA Special, PETG, PETG-CF, PLA-CF, ASA, TPU |
| [Anycubic Slicer Next — update record](https://wiki.anycubic.com/en/software-and-app/new-page-anycubic-slicer-beta%28orca-version%29/anycubic-slicer-next-%28orca-version%29-update-record) | Đã nạp sẵn profile filament PETG / ABS / ASA / TPU cho Kobra X                          |

**Quyết định trong code**: Kobra X là máy **hở**, nên ABS / ASA / PC / ASA-CF xếp vào
`notRecommendedFilamentIds` — vẫn hiển thị kèm cảnh báo cong vênh, không âm thầm loại bỏ.
Ba nguồn trên không thống nhất về ABS/ASA (slicer có profile, tài liệu máy chỉ nêu PLA/PETG/TPU)
→ chọn phương án cảnh báo thay vì khẳng định in tốt.

## 3. Nhiệt độ tối đa của máy — THAM KHẢO, chưa dùng trong code

| Thông số      | Giá trị | Ghi chú                                                                                                                                                |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nozzle tối đa | 300 °C  | Lấy từ trích dẫn trang [wiki Kobra X FAQ](https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x/faq) — **chưa fetch trực tiếp được** (HTTP 403) |
| Hotbed tối đa | 100 °C  | cùng nguồn, cùng hạn chế                                                                                                                               |

Hai giá trị này là **giới hạn của máy**, không phải nhiệt độ in của filament — app dùng
nhiệt độ filament từ tài liệu nhà sản xuất filament, nên chưa đưa hai số này vào code.

## 4. Đầu phun

Loại thép của đầu phun mặc định Kobra X: **CHƯA VERIFY**. Do đó cảnh báo "cần hardened
steel khi in vật liệu chứa sợi carbon" vẫn hiển thị như với mọi máy khác, không giả định
máy đã có sẵn.
Tham khảo: [hướng dẫn thay nozzle Kobra X](https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x/quick-release-nozzle-replacement-guide)

## 5. Phần mềm cắt lớp — Anycubic Slicer Next

- Tên chính thức: **Anycubic Slicer Next**, tải tại [anycubic.com/slicerNextDownload](https://www.anycubic.com/slicerNextDownload)
- Là bản **fork của OrcaSlicer**, mà OrcaSlicer fork từ Bambu Studio → **tên tham số
  (Layer height, Wall loops, Sparse infill density...) trùng với Bambu Studio**.
  Nguồn: [Anycubic Wiki — Anycubic Slicer Next](https://wiki.anycubic.com/en/software-and-app/new-page-anycubic-slicer-beta%28orca-version%29)
- Đây là lý do app dùng **chung một bộ tham số** cho cả hai tab slicer, chỉ khác phần preset máy.

### Quy ước đặt tên preset — ĐÃ VERIFY (2026-09-15)

Nguồn: bộ profile chính thức đi kèm phần mềm —
[ANYCUBIC-3D/AnycubicSlicerNext](https://github.com/ANYCUBIC-3D/AnycubicSlicerNext),
thư mục `resources/profiles/Anycubic/process/` (đọc qua GitHub API, branch `main`,
`Anycubic.json` version 02.03.01.10).

Mẫu tên của **máy đời mới** (Kobra 2 series, Kobra 3, Kobra S1):

```
{layer}mm {Tier} @Anycubic {Model} {nozzle} nozzle
→ 0.20mm Standard @Anycubic Kobra 3 0.4 nozzle
→ 0.20mm Standard @Anycubic Kobra S1 0.4 nozzle
```

Khác Bambu Studio ở hai điểm: tiền tố `@Anycubic ` thay vì `@BBL `, và **hậu tố nozzle
luôn có kể cả 0.4** (Bambu bỏ hậu tố khi nozzle 0.4). Máy đời cũ (Kobra, Vyper, Chiron,
i3 Mega S) không có hậu tố nozzle — app không hỗ trợ các máy đó nên không xử lý.

Bậc chất lượng theo layer height, lấy đúng tên file preset nozzle 0.4:

| Layer height | Tier       | File nguồn                                       |
| ------------ | ---------- | ------------------------------------------------ |
| 0.08 mm      | HighDetail | `0.08mm HighDetail @Anycubic Kobra 3 0.4 nozzle` |
| 0.10 mm      | Detail     | `0.10mm Detail @Anycubic Kobra 3 0.2 nozzle`     |
| 0.12 mm      | Detail     | `0.12mm Detail @Anycubic Kobra 3 0.4 nozzle`     |
| 0.16 mm      | Optimal    | `0.16mm Optimal @Anycubic Kobra 3 0.4 nozzle`    |
| 0.20 mm      | Standard   | `0.20mm Standard @Anycubic Kobra 3 0.4 nozzle`   |
| 0.24 mm      | Draft      | `0.24mm Draft @Anycubic Kobra 3 0.4 nozzle`      |
| 0.28 mm      | SuperDraft | `0.28mm SuperDraft @Anycubic Kobra 3 0.4 nozzle` |

⚠️ **0.28 mm có hai tên tuỳ đời máy**: Kobra 3 gọi `SuperDraft`, Kobra 2 Pro gọi `Draft`.
Code lấy theo thế hệ mới (`SuperDraft`) vì Kobra X cùng thế hệ với Kobra 3 / S1.

⚠️ **Kobra X chưa có mặt trong bộ profile công bố** (kiểm cả 3 branch `main`, `develop`,
`release/v2.3.1` — `machine_model_list` dừng ở Kobra S1). Tên preset app sinh ra là **áp
quy ước đã verify cho model mới**, không phải chuỗi đọc được từ file. Vì vậy UI kèm dòng
nhắc "đối chiếu lại trong phần mềm nếu không thấy đúng tên này".
Sai tên preset chỉ làm user tìm không ra, không làm hỏng bản in — khác hẳn sai thông số,
nên ở đây chấp nhận suy luận có nguồn, còn thông số in thì vẫn tuyệt đối không đoán.

Đã kiểm và **không dùng được** cho việc này:
[trang wiki Kobra X](https://wiki.anycubic.com/en/fdm-3d-printer/anycubic-kobra-x) — chỉ có
hướng dẫn lắp đặt / thay thế / xử lý sự cố và link tải manual PDF, không nhắc tên preset.

## 6. TPU — khuyến nghị chính hãng (ĐÃ VERIFY)

Nguồn duy nhất: [Anycubic Wiki — TPU printing recommendations](https://wiki.anycubic.com/en/home/knowledge-sharing/tpu-printing-recommendations)
(fetch ngày 2026-09-15 bằng `curl` — WebFetch trả 403, curl kèm User-Agent trình duyệt trả 200).

| Hạng mục          | Giá trị hãng công bố                                                                  | Đã đưa vào code                                          |
| ----------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Nhiệt độ in       | 220 – 230 °C                                                                          | Chưa — `filaments.ts` giữ nguồn của hãng filament        |
| First layer speed | 10 – 15 mm/s                                                                          | ✅ ô "First layer" tab Speed (máy Anycubic)              |
| Outer wall speed  | 15 – 20 mm/s                                                                          | ✅ ô "Outer wall"                                        |
| Core speed (thân) | 20 – 30 mm/s                                                                          | ✅ ô "Inner wall" + "Sparse infill"                      |
| Layer height      | 0.2 hoặc 0.16 mm; **không khuyến nghị 0.1 mm**                                        | ✅ cảnh báo khi layer < 0.16 mm                          |
| Retraction        | 0.5 – 1.5 mm, tốc độ 20 – 30 mm/s                                                     | ✅ cảnh báo info (thuộc phần Filament, không phải 5 tab) |
| Quạt làm mát      | 0 – 30 % (bridge/overhang nhỏ có thể lên 50 % trong chốc lát)                         | ✅ cảnh báo info                                         |
| Flow ratio        | 95 – 105 %, hiệu chỉnh bằng cube                                                      | ✅ cảnh báo info                                         |
| Sấy filament      | 50 – 55 °C trong 4 – 6 giờ                                                            | ✅ cảnh báo info                                         |
| Độ cứng TPU       | ≥ 95A in được ở chế độ standalone; ≤ 85A dễ bị bẹt gây tắc; TPU không nạp qua ACE Pro | ✅ cảnh báo info                                         |
| Nozzle            | 0.4 mm là đủ                                                                          | Trùng `DEFAULT_NOZZLE_MM`                                |

**Phạm vi áp dụng trong code**: chỉ máy có `vendor === 'Anycubic'`. Đây là tài liệu của
Anycubic viết cho Anycubic Slicer Next — không mang sang máy Bambu.

**Mapping "core speed" → ô của slicer**: hãng chỉ nói "core speed — tốc độ phần thân mô hình",
không tách từng ô như slicer. Code điền vào "Inner wall" + "Sparse infill"; các ô còn lại
(Internal solid infill, Top surface, Gap infill, First layer infill) giữ "chưa có dữ liệu"
thay vì suy rộng ra. Xem `speedTab` trong `src/lib/resolvePrintSettings.ts` và
`FILAMENT_SPEED_ADVICE` trong `src/data/speedPresets.ts`.

## 7. Thông số Quality / Strength / Speed — TRẠNG THÁI: CHƯA VERIFY

Chưa có ảnh chụp hay tài liệu preset của Anycubic Slicer Next cho Kobra X.
`findSpeedPreset('kobra-x', ...)` trả `null` → tab Speed hiển thị "chưa có dữ liệu".
KHÔNG mượn số tốc độ của preset Bambu X1C.

## 8. Việc còn phải làm

- [ ] Fetch trực tiếp wiki Kobra X (hiện 403) để verify nhiệt độ tối đa + loại nozzle
- [ ] Lấy preset Standard của Anycubic Slicer Next cho Kobra X (layer height / speed) từ
      ảnh chụp giao diện hoặc file profile trong `%APPDATA%\AnycubicSlicerNext\`
- [ ] Khi Anycubic bổ sung Kobra X vào `resources/profiles/Anycubic/` thì đối chiếu lại
      tên preset app đang sinh (hiện là suy từ quy ước máy đời mới)
- [ ] Tra khuyến nghị tương tự cho PETG / PLA-CF trên wiki Anycubic (mục knowledge-sharing)
- [ ] Đối chiếu nhiệt độ TPU 220–230 °C của Anycubic với 220–240 °C đang lấy từ Bambu:
      nếu user dùng TPU hãng Anycubic thì nên tách thành filament riêng, không sửa đè
