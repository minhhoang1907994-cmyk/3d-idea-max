# Session Handoff

## Session gần nhất

- Ngày: 2026-09-14
- Tóm tắt: Bổ sung chiều nhân vật (thế đứng / biểu cảm / trang phục / bộ cosplay) và mở rộng
  axis Màu sắc (nhiều màu random + màu gốc theo nguyên tác) cho trang Trộn ý tưởng.

## Đã thực hiện

- **4 axis mới trong `attributes.json`**: `pose` (Thế đứng), `expression` (Biểu cảm),
  `outfit` (Trang phục) — mỗi axis 20 option — và `costume` (Bộ cosplay) 33 option:
  cosplay chủ đề (samurai, hải tặc, phi hành gia, thợ lặn...), nhóm "ngầu" dựng lại nhân vật
  thành mecha (`mecha-armor`, `power-armor`, `cyborg`, `battle-worn`, `tactical-gear`,
  `stealth-suit`), nhóm để Gemini tự quyết (`canon-outfit`, `canon-outfit-accessories`,
  `random-accessories`), và `none` "— Không có —".
- **Cờ nhân vật 2 tầng** (`src/types/index.ts`): `ProductCategory.isCharacter` đánh dấu CẢ
  danh mục (hiện `toys-and-figures` — mọi sản phẩm trong đó đều bật 4 axis nhân vật), và
  `Product.isCharacter` cho sản phẩm lẻ ở danh mục khác (`wall-hook-animal` home-decor,
  `wedding-cake-topper` gifts-and-keepsakes). Cờ trên 6 sản phẩm trong toys-and-figures đã
  được gỡ vì cờ danh mục phủ hết.
- **`src/lib/characterTraits.ts`** (mới): `CHARACTER_TRAIT_AXIS_IDS`, `isCharacterTraitAxis`,
  `isCharacterSubject`, `characterTraitTexts`. Ba axis chỉ ghép vào prompt khi chủ thể là
  nhân vật — tránh câu vô nghĩa kiểu "a vase wearing a hoodie".
- **`buildPrompt.ts`**: chèn các chiều nhân vật vào Subject khi `isCharacterSubject(mix)`.
  `costume` GHI ĐÈ `outfit` (trừ option `NO_COSTUME_ID = 'none'`) để Gemini không nhận
  hai bộ đồ mâu thuẫn.
- **`MixPage.tsx`**: 4 selectbox nhân vật chỉ hiện khi ý tưởng có nhân vật; hint của Trang phục
  đổi thành "Đang bị Bộ cosplay ghi đè" khi đang chọn một bộ cosplay.
- **Axis `color` mở rộng 30 → 41 option**: `split-2-random` … `split-5-random`,
  `palette-3-random`, `palette-4-random`, `gradient-random`, `marbled-multi-random`,
  `accent-random`, `true-to-source` (Màu gốc theo nguyên tác), `true-to-life` (Màu thật ngoài đời).
- **`IdeaBreakdown.tsx`**: ô Nhân vật giờ hiện ở MỌI mức sáng tạo (trước chỉ từ mức 3),
  thêm option `— Không có —` để bỏ nhân vật; `useIdeaMixer.selectCharacter('')` set về null.
- **`CLAUDE.md`**: đồng bộ Data Model + 2 mục mới "Phối nhiều màu" và "Chiều nhân vật".

## Trạng thái hiện tại

- `npx tsc --noEmit` → No errors found
- `npx eslint .` → No issues found
- `npm test` → 121 passed (7 file)
- **Chưa chạy `npm run dev` kiểm tra UI thật** — thay đổi UI chưa được recheck bằng browser.
- Toàn bộ thay đổi còn ở working tree, chưa commit (branch `main`).

## Việc tiếp theo

1. Recheck UI bằng browser: 3 selectbox nhân vật ẩn/hiện đúng chưa, panel "Ý tưởng này ghép từ"
   ở mức An toàn hiển thị ổn không.
2. Quyết định có thêm danh mục "Nhân vật & figurine" (~30 sản phẩm) không — hiện chỉ 8/510
   sản phẩm là nhân vật nên Mix ngẫu nhiên ở mức An toàn ra nhân vật chỉ ~1.6%.
3. Quyết định có xóa 4 option màu cũ trùng chức năng không: `two-tone`, `marbled-mix`,
   `gradient-sunset`, `gradient-ocean`.
4. Cân nhắc tỉ lệ: axis `costume` có 33 option mà chỉ 1 là "— Không có —", nên Mix ngẫu nhiên
   ra bộ cosplay ~97% → axis `outfit` gần như chỉ dùng khi user tự chọn. Nếu vướng thì gộp
   `outfit` vào `costume` hoặc thêm vài option "đồ thường ngày" vào `costume`.
5. Cảnh báo AMS khi chọn option nhiều màu — `resolvePrintSettings` hiện chưa có.
   CẦN verify số khay AMS + máy nào hỗ trợ từ tài liệu Bambu chính thức trước khi viết.
6. Commit (đang ở branch `main` — tạo branch mới trước khi commit).

## Ghi chú quan trọng

- Quyết định đã chốt trong session: 3 chiều nhân vật **chỉ áp dụng cho sản phẩm có
  `isCharacter: true`** (hoặc mix đang bật lớp nhân vật), KHÔNG áp dụng cho mọi sản phẩm.
- Quyết định đã chốt: phối nhiều màu **nằm ngay trong axis `color`**, KHÔNG tách axis riêng
  (từng làm rồi và đã gỡ) — một mô hình chỉ có một phương án màu.
- Quyết định đã chốt: option nhiều màu **chỉ nêu SỐ màu**, để Gemini tự chọn màu cụ thể,
  không random từng màu từ danh sách.
- `true-to-source` / `true-to-life` chỉ phát huy khi chủ thể đủ cụ thể — thường phải gõ tên
  nhân vật vào ô text tự do trong panel "Ý tưởng này ghép từ".
- Vẫn giữ nguyên ràng buộc của project: KHÔNG đoán thông số in, giá trị chưa verify để `null`.
