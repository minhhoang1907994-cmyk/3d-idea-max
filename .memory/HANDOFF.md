# Session Handoff

## Session gần nhất

- Ngày: 2026-09-15
- Tóm tắt: Thêm máy Anycubic Kobra X và tách bảng thông số in theo từng phần mềm cắt lớp
  (Bambu Studio / Anycubic Slicer Next).

## Đã thực hiện

### 1. Thêm máy Anycubic Kobra X

- `src/data/printers.ts`: thêm `kobra-x` — khổ 260×260×260 mm, khung hở, nguồn
  <https://store.anycubic.com/products/kobra-x>. Thêm 2 trường cho CẢ 5 máy: `vendor`
  (tên hãng, dùng trong câu cảnh báo) và `slicerId` (slicer chính hãng của máy).
- `supportedFilamentIds`: PLA / PETG / TPU / PLA-CF / PETG-CF.
  `notRecommendedFilamentIds`: ABS / ASA / PC / ASA-CF — máy hở.
  **Ba nguồn không thống nhất** về ABS/ASA (wiki máy chỉ nêu PLA/PETG/TPU; store liệt kê ASA;
  Anycubic Slicer Next có sẵn profile ABS/ASA cho Kobra X) → chọn cảnh báo, không khẳng định
  in tốt, và ghi rõ mâu thuẫn đó trong file research.
- `resolvePrintSettings`: câu cảnh báo bỏ hardcode "Bambu", dùng `printer.vendor`.

### 2. Tab phần mềm cắt lớp trong mục Thông số in

- `types/index.ts`: thêm `SlicerId` + `SlicerSettings`. `PrintSettings.tabs` / `.presetName`
  **đã bị thay** bằng `PrintSettings.slicers[]` — mỗi slicer một bảng 5 tab riêng.
- `resolvePrintSettings`: sinh 2 bảng, slicer chính hãng của máy đang chọn **đứng đầu mảng**.
  Slicer còn lại `supportsSelectedPrinter: false` + `presetNote` nói rõ "không có profile cho
  máy này — chỉ để đối chiếu tên tham số".
- `PrintSettingsPanel`: thêm hàng nút chọn slicer phía trên hàng tab tham số; nút của slicer
  không khớp máy có nhãn phụ `≠ máy`. Tiêu đề và câu disclaimer đổi theo slicer đang mở.
- **Vì sao dùng chung một bộ tham số cho cả hai slicer**: Anycubic Slicer Next là fork của
  OrcaSlicer, mà OrcaSlicer fork từ Bambu Studio → tên tham số trùng nhau. Nguồn:
  <https://wiki.anycubic.com/en/software-and-app>. Thứ khác nhau thật sự là preset máy.

### 3. Tài liệu

- `docs/research/anycubic-print-parameters.md` (mới) — nguồn sự thật cho máy Anycubic,
  cùng quy tắc CHƯA VERIFY như file Bambu.
- `CLAUDE.md`: quyết định #4 (4 máy → 5 máy), #5 (nguồn = tài liệu chính thức của hãng máy),
  mục "Nguồn sự thật cho thông số in" + danh sách tài liệu liên quan.

## Trạng thái hiện tại

- `npx tsc --noEmit` → No errors found
- `npx vitest run` → **167 passed / 0 failed** (thêm 7 test: thứ tự slicer, slicer không khớp
  máy, không bịa tên preset Anycubic, khổ in 260mm, cảnh báo ABS ghi đúng tên hãng, không mượn
  preset tốc độ X1C cho Kobra X)
- `npx eslint src` → exit 0 · `npx prettier --check` → sạch · `npx vite build` → OK
- **CHƯA recheck UI bằng browser** — user chọn tự kiểm tra thủ công.
- Thay đổi còn ở working tree, **chưa commit** (branch `main`).

## Session trước — 2026-09-15 (printability / checklist mesh / prompt Flow)

- Ngày: 2026-09-15
- Tóm tắt: Tách ràng buộc in được thành núm điều khiển riêng, thêm checklist hậu kỳ cho khâu
  ảnh → STL, và thêm prompt ảnh nhiều góc riêng cho Google Flow (2 biến thể).

### Đã thực hiện

### 1. Tách `printability` khỏi `creativity` (2 núm độc lập)

- **Vấn đề gốc**: `buildPrompt` cũ bỏ hẳn ràng buộc in được từ mức Lai ghép trở lên
  (`creativity >= 3` → thay `GROUNDED_CLAUSE` bằng `CREATIVE_CLAUSE`). Tức đúng lúc ý tưởng
  phức tạp nhất, dễ sinh cấu trúc bất khả thi nhất, thì guardrail biến mất.
- **`src/lib/buildPrompt.ts`**: `buildPrompt(mix, { printability })`, mặc định bật.
  `GROUNDED_CLAUSE` (1 câu) thay bằng `printabilityClauses()` — 5 câu, áp dụng ở MỌI mức
  sáng tạo. `CREATIVE_CLAUSE` giờ chỉ _thêm vào_ ở mức >= 3 chứ không _thay thế_ nữa.
- **`minFeatureMm()`** = 2 × `DEFAULT_NOZZLE_MM` = 0.8mm — tính từ nozzle, KHÔNG phải số đoán.
  **`minFeaturePercent()`** quy đổi theo `size.longestEdgeMm` (ảnh không mang đơn vị mm).
  Dùng % chứ không dùng phân số vì "one 188th" vừa khó đọc vừa khó cho model bám vào.
- **Refactor giữ nguyên output**: tách `buildSubjectPhrase()` / `buildStyleClause()` và export
  `STUDIO_BACKDROP` để prompt Gemini và prompt Flow dùng chung chủ thể + phông.
- **`src/components/PrintabilityToggle.tsx`** (mới): núm bật/tắt, đặt cạnh Mức sáng tạo.

### 2. Checklist hậu kỳ cho khâu ảnh → STL

- **`src/lib/buildMeshChecklist.ts`** + **`src/components/MeshChecklistPanel.tsx`** (mới).
  5 mục bắt buộc: repair non-manifold, **đặt lại tỉ lệ** (mesh dựng từ ảnh không mang đơn vị
  thật — lỗi hay gặp nhất), đo bề dày, xoay đế, preview overhang. 2 mục có điều kiện: giảm
  tam giác (khi layer <= 0.12mm), khoét lỗ thoát (nếu rỗng kín).
- Chỉ nêu dấu hiệu QUAN SÁT ĐƯỢC, không đưa ngưỡng số không có nguồn.

### 3. Prompt ẢNH NHIỀU GÓC cho Google Flow

- **Quyết định của user**: cần prompt ẢNH cho Flow, KHÔNG phải prompt video — dùng video ở
  Flow tốn credit. Bản prompt video (công thức Veo) đã viết rồi và **đã gỡ bỏ hoàn toàn**.
- **Đã verify từ tài liệu chính thức**: Flow sinh ảnh mặc định bằng **Nano Banana Pro** —
  <https://support.google.com/flow/answer/16729550>. Cùng họ model với prompt Gemini, nên
  theo đúng một bộ quy tắc: câu văn tự nhiên, mô tả khẳng định, không cú pháp tham số.
- **Vì sao vẫn cần prompt riêng thay vì copy nguyên prompt Gemini**: tool image→3D dựng mesh
  sát hơn hẳn khi có NHIỀU GÓC NHÌN của cùng vật thể, và nhiều góc là cách duy nhất thấy mặt
  sau. Prompt này yêu cầu 4 góc nằm trong MỘT ảnh → được lợi ích đó mà trả giá ảnh, không
  phải giá video.
- **`src/lib/buildFlowPrompt.ts`**, 2 biến thể qua `source`:
  - `'text'` — gõ thẳng vào Flow, model tự dựng cả vật thể lẫn 4 góc
  - `'image'` — sinh ảnh ở Gemini trước, đưa ảnh đó vào Flow rồi yêu cầu trải ra thành 4 góc
    (~60 từ, không phụ thuộc mix — mọi tổ hợp ra cùng một chuỗi)
- Bố cục nêu ĐÍCH DANH từng góc (front / left side / three-quarter / back) trong lưới 2×2 —
  để mặc model tự quyết thì nó hay trả về 3 góc gần giống nhau, không phủ được mặt sau.
- Ràng buộc in được dùng **chung nguyên bộ** `printabilityClauses` với prompt Gemini (không
  rút gọn như bản video cũ) — đây cũng là ảnh, không bị bó thời lượng, và hai prompt ảnh lệch
  ràng buộc nhau thì không còn đối chiếu được kết quả. Có test canh ngưỡng bề dày khớp nhau.
- **`src/components/FlowSourceToggle.tsx`** (mới), **`PromptPanel`** nhận thêm
  `title` / `hint` / `controls` để render được nhiều panel prompt.

### Trạng thái khi kết thúc session đó

- `npx tsc --noEmit` → No errors found
- `npx eslint src` → exit 0
- `npm test` → **160 passed** (10 file), thêm 31 test mới
- `npx prettier --check src` → All matched files use Prettier code style
- `npm run build` → OK
- **Đã recheck UI bằng browser** (`npm run dev` + Chrome), 2 lượt: 2 panel prompt render đúng,
  toggle Ràng buộc in được đổi cả 2 prompt, toggle Từ text / Từ ảnh Gemini đổi đúng, checklist
  hậu kỳ render đúng, nút Mix không lỗi, console sạch (0 error/warning). Lượt 2 xem ở cửa sổ
  hẹp ~500px, layout stack đúng, không tràn ngang.
- Toàn bộ thay đổi còn ở working tree, **chưa commit** (branch `main`).

## Việc tiếp theo

0. **Recheck UI hàng tab slicer** (user tự làm): `npm run dev` → chọn máy "Anycubic Kobra X",
   bấm qua lại 2 tab Bambu Studio / Anycubic Slicer Next, xác nhận tiêu đề + dòng preset đổi đúng.
1. **Test prompt thực tế** — chưa verify được trong session này:
   - Prompt ảnh trên Gemini (key do user nhập trong UI, lưu localStorage)
   - Prompt ảnh nhiều góc trên flow.google (cần tài khoản Flow)
   - So sánh 2 biến thể Flow (`text` vs `image`) rồi bỏ cái cho kết quả kém hơn
   - Kiểm xem Nano Banana Pro có thực sự giữ được 4 góc nhất quán trong 1 ảnh không — nếu
     không thì cân nhắc tách thành 2 ảnh 2 góc, hoặc quay lại dùng ảnh đơn
2. **Cập nhật CLAUDE.md** — đang lệch với code:
   - Quyết định #7 ghi "Tool tạo ảnh đích: Gemini" nhưng app đã xuất thêm prompt ảnh nhiều góc
     cho Flow (Nano Banana Pro)
   - Bảng "Quyết định đã chốt" chưa có dòng nào về núm `printability` và về 2 luồng Flow
   - Mục "Ghi chú — còn phải làm" vẫn ghi "Chốt tool tạo ảnh đích" (đã chốt rồi)
3. **`mechanisms.json` dòng 18 và 24 dùng `without`** — vi phạm quy tắc "mô tả khẳng định",
   áp dụng cho CẢ hai prompt vì đều là họ Nano Banana. Test cũ không bắt được vì fixture ở mức 1
   không có mechanism; test mới đã thu hẹp để chỉ kiểm phần khung do app sinh, thay vì tự sửa data.
4. **Mục 3 của kế hoạch chống lỗi in — chưa làm**: thêm `printRisk` + `printableAlternative`
   cho option trong `attributes.json`. Các option chống lại chính mục tiêu in:
   - Kết cấu vi mô dưới ngưỡng nozzle: `fur-like`, `woven`, `crackle`, `glitter-fleck`, `knurled`
   - Bề mặt bóng/trong (nghi làm tool image→3D đọc sai hình khối — CHƯA VERIFY, cần test thật):
     `glossy`, `iridescent`, `frosted`, `brushed-metal`, color `translucent-amber`
   - Cấu trúc mảnh: style `wireframe`, `skeletal`, `crystalline`
     Hướng đã bàn: KHÔNG xóa option, mà thay bằng biến thể in được khi bật chế độ in được
     (`fur-like` → "fur suggested by deep carved grooves").
5. Các việc tồn từ session trước: thêm danh mục "Nhân vật & figurine"; xóa 4 option màu trùng
   chức năng (`two-tone`, `marbled-mix`, `gradient-sunset`, `gradient-ocean`); tỉ lệ axis
   `costume` (33 option mà chỉ 1 là "Không có" → Mix ra cosplay ~97%); cảnh báo AMS
   (CẦN verify số khay AMS từ tài liệu Bambu trước khi viết).
6. Commit (đang ở branch `main` — tạo branch mới trước khi commit).
7. **Verify nốt phần Anycubic còn thiếu** (xem `docs/research/anycubic-print-parameters.md` mục 7):
   - wiki Kobra X trả HTTP 403 khi fetch → nhiệt độ tối đa (300/100 °C) mới lấy từ trích dẫn
     kết quả tìm kiếm, CHƯA fetch trực tiếp; loại thép nozzle mặc định vẫn CHƯA VERIFY
   - quy ước đặt tên preset của Anycubic Slicer Next → hiện để `presetName: null`
   - preset Standard (layer height / speed) cho Kobra X → tab Speed đang "chưa có dữ liệu"

## Ghi chú quan trọng

- **Bài học 2**: sau khi ghi đè NGUYÊN một file lib, Vite dev server giữ transform cũ và trả
  200 kèm 0 byte cho module đó → trang trắng, console báo `does not provide an export named ...`.
  `npm run build` và `tsc` vẫn sạch. Cách xử lý: restart dev server, reload thường không đủ.
- **Bài học 1**: `npx prettier --write` chạy giữa chừng đã gộp một `useMemo`
  nhiều dòng thành một dòng, khiến phép thay thế chuỗi sau đó trượt im lặng —
  `buildFlowPrompt` không bao giờ nhận `source: flowSource`. **tsc và 163 test đều PASS**
  vì `source` là optional và test gọi thẳng hàm chứ không qua hook. Chỉ recheck bằng browser
  mới lộ ra (toggle đổi trạng thái nhưng prompt không đổi). → Với thay đổi UI, đừng coi
  test + tsc xanh là đủ.
- Quyết định đã chốt trong session: **`creativity` và `printability` là hai núm độc lập**.
  Ý tưởng táo bạo tới đâu là một chuyện, mô hình có in được hay không là chuyện khác.
  KHÔNG gộp lại như trước.
- Quyết định đã chốt: **Flow dùng để sinh ẢNH, không sinh video** — video ở Flow tốn credit.
  Bản prompt video theo công thức Veo đã viết và đã gỡ bỏ hoàn toàn; đừng dựng lại.
  (Tài liệu Veo vẫn hữu ích nếu sau này cần: công thức
  `[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]`, Cinematography
  đứng ĐẦU và 4 slot đầu nằm CHUNG một câu, và Veo — khác Imagen — KHUYẾN NGHỊ nêu thẳng thứ
  muốn loại bỏ.)
- Quyết định đã chốt: biến thể Flow `'image'` **bỏ hẳn** chủ thể, phong cách và ràng buộc
  hình học — ảnh đính kèm đã khoá cả ba, nhắc lại chỉ tốn chỗ và mở đường cho model vẽ chệch đi.
- Quyết định đã chốt (session trước, vẫn giữ): 4 chiều nhân vật chỉ áp dụng cho sản phẩm
  `isCharacter: true`; phối nhiều màu nằm trong axis `color` KHÔNG tách axis riêng; option
  nhiều màu chỉ nêu SỐ màu để Gemini tự chọn.
- Vẫn giữ nguyên ràng buộc gốc của project: **KHÔNG đoán thông số in**, giá trị chưa verify
  để `null` + hiển thị "chưa có dữ liệu".
- Quyết định trong session này: **KHÔNG bịa chuỗi tên preset của Anycubic Slicer Next** và
  KHÔNG mượn số tốc độ preset Bambu X1C cho Kobra X. Cả hai để `null` + hướng dẫn user tự mở
  preset trong phần mềm — đúng ràng buộc gốc "không đoán thông số in".
- Quyết định trong session này: **hai slicer dùng CHUNG một bộ tham số**, chỉ khác phần preset
  máy. Lý do có nguồn (Anycubic Slicer Next fork OrcaSlicer, OrcaSlicer fork Bambu Studio), nên
  nếu sau này thấy tên tham số lệch nhau thì sửa ở `buildSlicerSettings`, đừng nhân đôi data.
- Breaking change nội bộ: code nào còn đọc `PrintSettings.tabs` / `PrintSettings.presetName`
  sẽ hỏng — giờ phải đi qua `PrintSettings.slicers[i].tabs` / `.presetName`.
