# 3d-idea-max

Web app sinh ý tưởng sản phẩm in 3D ngẫu nhiên. User nhấn **Mix** → random toàn bộ
selectbox → sinh ra 2 thứ:

1. **Prompt tiếng Anh** mô tả sản phẩm, để copy sang tool tạo ảnh
2. **Bộ thông số in Bambu Studio** (Quality / Strength / Speed / Filament) phù hợp
   với sản phẩm và máy in đã chọn

Ngoài luồng Mix còn bốn trang phụ: Phân tích ảnh (Gemini đọc ảnh → prompt), Quản lý dữ liệu,
**Đổi slicer** — tách file `.3mf` tải từ MakerWorld thành phần hình học dùng chung + bảng
thông số ánh xạ sang slicer khác (xem `docs/research/slicer-interop.md`) — và **Sổ công ty**:
thu, chi theo tháng, link tư liệu, sản phẩm đã in (thay file Excel 4 sheet của nhóm).

## Tech Stack

- Language: TypeScript 5.x
- Framework: React 18 + Vite 5
- Database: Neon Postgres (Singapore) — dữ liệu ý tưởng lưu online, chạy SQL qua HTTP bằng
  `@neondatabase/serverless`; bản JSON trong repo là fallback. Xem `docs/neon-setup.md`
- Backend: không có server riêng — app nối thẳng Neon qua HTTPS, logic chạy client-side
- Styling: CSS Modules (built-in Vite, không thêm dependency)
- Infrastructure: static hosting (build ra `dist/`)
- Architecture: SPA client-side, component-based

## Quyết định đã chốt (không đổi nếu không có lý do rõ ràng)

| #   | Quyết định                                                 | Ghi chú                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Mix random TOÀN BỘ selectbox**, ghi đè lựa chọn hiện tại | Không có cơ chế lock/giữ field                                                                                                                                                                                                                                                                                                                        |
| 2   | Danh mục → sản phẩm là **cascading**                       | Random danh mục trước, rồi random sản phẩm thuộc danh mục đó → luôn ra đúng 1 sản phẩm                                                                                                                                                                                                                                                                |
| 3   | **Tách 2 selectbox vật liệu**                              | `filament` (in được, sinh thông số) và `surface` (thẩm mỹ, chỉ vào prompt ảnh)                                                                                                                                                                                                                                                                        |
| 4   | Hỗ trợ 5 máy: **A1, A1 mini, P1S, X1C, Anycubic Kobra X**  | Thông số + giới hạn khổ in đổi theo máy                                                                                                                                                                                                                                                                                                               |
| 5   | Thông số in lấy từ **tài liệu chính thức của hãng máy**    | Nguồn sự thật: `docs/research/bambu-print-parameters.md`, `docs/research/anycubic-print-parameters.md`                                                                                                                                                                                                                                                |
| 6   | Quy mô dữ liệu: **15 danh mục × 30 sản phẩm**              | Dễ nâng lên sau, không phải sửa cấu trúc                                                                                                                                                                                                                                                                                                              |
| 7   | Tool tạo ảnh đích: **Gemini**                              | Prompt dạng câu văn tự nhiên, không keyword list, không cú pháp tham số                                                                                                                                                                                                                                                                               |
| 8   | Dữ liệu ý tưởng lưu trên **Neon**, ai cũng sửa được        | Không đăng nhập — app nối bằng role `app_editor` (chỉ select/insert/update trên `idea_documents`), chuỗi kết nối nằm trong bundle. Bù lại: không cấp DELETE, RLS khoá `name`, có bảng lịch sử, JSON trong repo là bản gốc. Neon Data API KHÔNG dùng được — xem `docs/neon-setup.md`                                                                   |
| 9   | **Sổ công ty** dùng chung bảng `idea_documents`            | 4 document `companyExpenses` / `companyIncomes` / `companyNotes` / `companyProducts` — cùng mô hình một-document-một-file-JSON, cùng trigger version + lịch sử. Thêm tên document mới PHẢI kèm migration nới `name` trong policy RLS (`db/migrations/003_company_documents.sql`). Xoá dòng = ghi đè cả document, vì role `app_editor` không có DELETE |

## Project Conventions

### Naming

- Components, types, interfaces: PascalCase (`IdeaMixer`, `PrintSettings`, `ProductCategory`)
- Functions, variables: camelCase (`buildPrompt`, `resolvePrintSettings`, `mixResult`)
- Constants: SCREAMING_SNAKE_CASE (`DEFAULT_PRINTER_ID`, `PRODUCTS_PER_CATEGORY`)
- Custom hooks: prefix `use` (`useIdeaMixer`)
- File component: PascalCase khớp tên component (`IdeaMixer.tsx`)
- File non-component: camelCase (`buildPrompt.ts`, `resolvePrintSettings.ts`)
- CSS Modules: `{Component}.module.css`
- Tên file/thư mục/định danh: LUÔN tiếng Anh, kể cả data file

### Architecture

```
src/
  components/       — UI, không chứa business logic
  hooks/            — state của mixer, clipboard
  lib/              — Pure functions: random, prompt builder, print settings resolver
  data/             — Dữ liệu tĩnh (ideas, filaments, printers)
  types/            — Type definitions dùng chung
  App.tsx
  main.tsx
```

Trách nhiệm:

- `data/` — nguồn sự thật duy nhất. Thêm ý tưởng/filament/máy in = sửa ở đây,
  KHÔNG hardcode trong component
- `lib/` — pure function, không import React, không gọi `Math.random()` trực tiếp
- `hooks/` — cầu nối `lib/` ↔ component, giữ state
- `components/` — render + bắt event, không tự ghép prompt, không tự tính thông số in

### Data Model

```typescript
// ---- Ý tưởng sản phẩm (cascading) ----
export type ProductCategory = {
  id: string; // kebab-case, BẤT BIẾN
  label: string; // nhãn UI (tiếng Việt được)
  promptText: string; // tiếng Anh — dùng khi ghép prompt
  isCharacter?: boolean; // CẢ danh mục là nhân vật — mọi sản phẩm trong đó mở khoá 4 axis trên
  products: Product[]; // ~30 sản phẩm thuộc danh mục này
};

export type Product = {
  id: string; // kebab-case, duy nhất trong phạm vi category
  label: string;
  promptText: string; // tiếng Anh, BẮT BUỘC
  isCharacter?: boolean; // sản phẩm lẻ là nhân vật — mở khoá pose/expression/outfit/costume/base
};

// ---- Các chiều thuộc tính (mỗi chiều 1 selectbox) ----
export type AttributeAxis = {
  id: string; // 'style' | 'surface' | 'color' | 'pose' | 'expression' | 'outfit' | 'costume'
  //          |  + 'base' (đế trưng bày), cùng nhóm nhân vật
  //          |  + các axis kỹ thuật: 'size' | 'detail' | 'strength'
  label: string;
  options: AttributeOption[]; // ~20-30 option
};

export type AttributeOption = {
  id: string;
  label: string;
  promptText: string; // tiếng Anh
};

// ---- Filament: khác AttributeOption vì có ràng buộc in thật ----
export type Filament = {
  id: string; // 'pla-basic' | 'petg-hf' | 'tpu'
  label: string;
  promptText: string; // mô tả tiếng Anh cho prompt ảnh
  nozzleTempC: Range | null; // null = CHƯA VERIFY, hiển thị "chưa có dữ liệu"
  bedTempC: Range | null;
  requiresEnclosure: boolean;
  requiresHardenedNozzle: boolean;
  sourceUrl: string; // BẮT BUỘC — link tài liệu Bambu
};

export type Range = { min: number; max: number };

// ---- Máy in ----
export type Printer = {
  id: string; // 'a1' | 'a1-mini' | 'p1s' | 'x1c'
  label: string;
  buildVolumeMm: { x: number; y: number; z: number };
  isEnclosed: boolean;
  supportedFilamentIds: string[]; // in tốt
  notRecommendedFilamentIds: string[]; // in được nhưng Bambu không khuyến nghị
  sourceUrl: string; // BẮT BUỘC
};
```

Quy ước:

- `id` **bất biến** — đổi `id` sẽ phá state/URL đã share và dữ liệu cũ
- `label` cho người đọc, `promptText` cho tool tạo ảnh — không dùng lẫn
- Mỗi axis tối thiểu 2 option (dưới 2 thì random vô nghĩa)

### Phối nhiều màu — nằm ngay trong axis Màu sắc

Axis `color` chứa cả màu đơn lẫn phương án nhiều màu (`split-2-random` … `split-5-random`,
`palette-3-random`, `palette-4-random`, `gradient-random`, `marbled-multi-random`,
`accent-random`). KHÔNG tách thành axis riêng: một mô hình chỉ có một phương án màu, tách
ra hai selectbox sẽ sinh tổ hợp mâu thuẫn (vừa "1 màu" vừa "gradient").

Các option nhiều màu chỉ nêu SỐ màu, để Gemini tự chọn màu cụ thể — bảng màu Gemini phối
thường hài hoà hơn là ghép vài màu rời từ danh sách.

Hai option `true-to-source` (màu gốc theo nguyên tác) và `true-to-life` (màu thật ngoài đời)
KHÔNG chỉ định màu nào cả, mà bảo Gemini dùng màu vốn có của chủ thể. Chúng chỉ phát huy khi
chủ thể đủ cụ thể để Gemini nhận ra — rõ nhất là khi gõ tên nhân vật vào ô text tự do ở phần
"Ý tưởng này ghép từ".

### Chiều nhân vật — chỉ áp dụng cho sản phẩm có mặt/tay chân

Năm axis `pose` (Thế đứng), `expression` (Biểu cảm), `outfit` (Trang phục), `costume`
(Bộ cosplay), `base` (Đế trưng bày) làm biến thể
nhẹ cho mức sáng tạo An toàn: cùng một tượng thú, đổi thế đứng / biểu cảm / áo quần là
ra ý tưởng mới, không cần lai ghép gì.

Axis `costume` (Bộ cosplay) là TRỌN BỘ trang phục theo chủ đề (samurai, phi hành gia, hải
tặc...). Chọn bộ nào là **ghi đè** axis `outfit` — mô tả cùng lúc "mặc áo giáp samurai" và
"mặc áo hoodie" cho Gemini hai bộ đồ mâu thuẫn. Option `none` ("— Không có —") là lối thoát
duy nhất: promptText của nó KHÔNG bao giờ vào prompt, xem `NO_COSTUME_ID`.

Chúng chỉ có nghĩa khi chủ thể là nhân vật, nên `buildPrompt` và UI chỉ dùng chúng khi
`isCharacterSubject(mix)` đúng — tức **danh mục** có `isCharacter: true` (hiện là
`toys-and-figures`, mọi sản phẩm trong đó đều bật), hoặc **sản phẩm lẻ** ở danh mục khác có
`isCharacter: true` (`wall-hook-animal`, `wedding-cake-topper`), hoặc mix đang bật lớp nhân
vật (`character` / text tự do). Với bình hoa hay hộp bút
thì bỏ hẳn, tránh sinh câu vô nghĩa kiểu "a vase wearing a hoodie with a grumpy expression".

Ba axis `pose`, `expression` và `base` có thêm option **`default`** ("— Mặc định —"): cùng cơ chế
với `NO_COSTUME_ID` — là option thật để Mix random chọn được, nhưng promptText KHÔNG bao giờ
vào prompt, nghĩa là không mô tả gì cả và để Gemini tự chọn thứ hợp với chủ thể.
Xem `DEFAULT_TRAIT_OPTION_ID`.

Riêng `pose` và `expression` còn cho **gõ text tự do** thay cho lựa chọn trong danh sách
(`MixResult.attributeOverrides`, xem `FREE_TEXT_TRAIT_AXIS_IDS`). Text tự do thắng mọi option
kể cả `default`, chỉ sống trong phiên, KHÔNG ghi vào file dữ liệu — giống
`secondaryOverride` / `characterOverride`.

Axis `base` (Đế trưng bày) mô tả bệ mà tượng đứng lên. Nó KHÔNG phải một chi tiết rời:
câu ràng buộc "one connected mass" trong `printabilityClauses` đã bắt đế liền khối với mô
hình, nên promptText của các option chỉ tả hình dạng đế, không lặp lại chuyện liền khối.
Đế chỉ mở khoá cùng nhóm nhân vật vì đáy hộp bút hay khay đựng vốn đã là mặt tiếp bàn.

Nguồn sự thật: `src/lib/characterTraits.ts`.

### Chiều dữ liệu ảnh hưởng thông số in

Hai axis `detail` và `strength` **không chỉ để trang trí prompt** — chúng là input để
tính thông số in. Không được bỏ; nếu bỏ thì mọi sản phẩm cùng filament sẽ ra cùng một
bộ thông số và phần Printability mất ý nghĩa.

| Axis                                | Ảnh hưởng tới                                              |
| ----------------------------------- | ---------------------------------------------------------- |
| `detail` (độ chi tiết)              | Layer Height                                               |
| `strength` (mục đích / độ chịu lực) | Sparse Infill Density, Infill Pattern, Wall Loops          |
| `filament`                          | Nozzle Temp, Bed Temp, yêu cầu buồng kín / hardened nozzle |
| `size`                              | Kiểm tra có vượt khổ in của máy đã chọn không              |

### Nguồn sự thật cho thông số in

`docs/research/bambu-print-parameters.md` (máy Bambu Lab + filament) và
`docs/research/anycubic-print-parameters.md` (máy Anycubic + Anycubic Slicer Next) —
**mọi giá trị trong `src/data/filaments.ts` và `src/data/printers.ts` phải khớp hai file
đó**, kèm `sourceUrl`.

Bảng thông số hiển thị theo từng **slicer** (`SlicerSettings`): Bambu Studio và Anycubic
Slicer Next. Tên tham số dùng chung được vì Anycubic Slicer Next fork từ OrcaSlicer, mà
OrcaSlicer fork từ Bambu Studio. Khác nhau là phần preset máy — chỉ slicer chính hãng của
máy đang chọn mới có profile, slicer còn lại đánh dấu `supportsSelectedPrinter: false`.

Giá trị chưa verify được ghi `null` và UI hiển thị "chưa có dữ liệu" —
**TUYỆT ĐỐI KHÔNG đoán số**. Thông số in sai làm hỏng bản in thật (tốn nhựa + nhiều
giờ máy chạy), đây là ràng buộc nghiêm ngặt hơn mọi phần khác của project.

### Xử lý tổ hợp không hợp lệ

Mix random tự do nên sẽ sinh ra tổ hợp máy × filament không hợp lệ. Quy tắc:

- Filament nằm trong `notRecommendedFilamentIds` của máy đã chọn → **vẫn hiển thị**,
  kèm cảnh báo rõ lý do (ví dụ: máy open-frame, dễ cong vênh)
- Kích thước vượt `buildVolumeMm` → cảnh báo "cần chia nhỏ mô hình"
- Filament CF/GF trên máy chưa có hardened nozzle → cảnh báo yêu cầu đổi nozzle
- **Không âm thầm bỏ qua** — user cần biết vì sao tổ hợp đó có vấn đề

### Prompt Output Format — nhắm tới Gemini (Nano Banana / Imagen)

**Tool đích đã chốt: Gemini.** Google khuyến nghị prompt dạng **câu văn tự nhiên mô tả
cảnh**, KHÔNG phải danh sách keyword nối bằng dấu phẩy kiểu Midjourney, và KHÔNG có
cú pháp tham số (`--ar`, `--v`) hay negative prompt kiểu Stable Diffusion.
Nguồn: [Nano Banana prompting guide](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana),
[Gemini image generation best practices](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/gemini-image-generation-best-practices)

Công thức Google đưa ra: `[Subject] + [Action] + [Location/context] + [Composition] + [Style]`

Ánh xạ axis → slot trong công thức:

| Slot             | Nguồn dữ liệu                                                        |
| ---------------- | -------------------------------------------------------------------- |
| Subject          | `product` + `size` + `filament`/`surface` (vật liệu nhìn thấy)       |
| Action           | cố định — vật thể tĩnh, ví dụ "resting on" / "displayed on"          |
| Location/context | cố định — phông studio trung tính cho ảnh sản phẩm                   |
| Composition      | cố định — góc máy, ví dụ "three-quarter view, centered, medium shot" |
| Style            | `style` + `color` + `detail`                                         |

Hệ quả bắt buộc với dữ liệu:

- `promptText` phải là **mảnh câu ghép được vào câu tự nhiên** (ví dụ: `"a low-poly
geometric desk organizer"`), KHÔNG phải keyword rời (`"low-poly, geometric"`)
- `buildPrompt` ghép thành **câu hoàn chỉnh**, không nối bằng dấu phẩy
- **Mô tả khẳng định, không phủ định** — Google nêu rõ: viết "an empty, deserted street"
  thay vì "no cars"
- Prompt phải nói rõ đây là **một vật thể liền khối in 3D được**, tránh Gemini vẽ ra
  cảnh nhiều vật thể hoặc vật thể không in được

Quy tắc chung:

- Luôn **tiếng Anh**
- Thứ tự slot **cố định**, chỉ random _lựa chọn_ — prompt đọc được và tái lập được

### Error Handling

- Không có network call → không cần error boundary phức tạp
- Pure function trong `lib/` throw `Error` với message rõ khi input không hợp lệ
- Lỗi copy clipboard phải có fallback: hiện prompt trong textarea để copy tay,
  KHÔNG im lặng nuốt lỗi

### Test Conventions

- Framework: Vitest + React Testing Library
- Location: đặt cạnh file được test (`buildPrompt.ts` → `buildPrompt.test.ts`)
- Ưu tiên test `lib/` — toàn bộ logic đáng test nằm ở đó
- Test random: inject hàm random giả trả giá trị cố định, KHÔNG test `Math.random` thật
- **Bắt buộc test**: `resolvePrintSettings` phải có test cho tổ hợp không hợp lệ
  (filament không khuyến nghị, vượt khổ in, thiếu hardened nozzle)

## Lệnh thường dùng

```bash
npm install
npm run dev          # dev server (Vite)
npm run build        # build production ra dist/
npm run preview      # preview bản build
npm run test         # chạy Vitest
npx tsc --noEmit     # type check
```

## Quy tắc của project

- **Không đoán thông số in.** Chưa verify thì để `null` + hiển thị "chưa có dữ liệu"
- **Mọi filament/printer phải có `sourceUrl`** trỏ tới tài liệu Bambu chính thức
- **Logic random phải test được**: hàm trong `lib/` nhận `random: () => number` làm
  tham số thay vì gọi thẳng `Math.random()`
- **Dữ liệu chỉ ở `src/data/`** — không hardcode `<option>` trong JSX
- **`promptText` bắt buộc tiếng Anh**; `label` có thể tiếng Việt
- **`id` bất biến** — không đổi sau khi đã phát hành
- **Không thêm dependency** mà không hỏi trước
- **Không hardcode API key vào source.** Trang Phân tích ảnh có gọi Gemini API, nhưng key
  do user tự nhập trong UI và lưu ở `localStorage` máy họ — không nằm trong repo, không
  commit, không có trong bundle. Đây là ngoại lệ có chủ đích của quyết định "không backend":
  đánh đổi là ai dùng được máy đó cũng lấy được key, nên UI phải cảnh báo rõ điều này.
  Muốn giấu key thật sự thì bắt buộc phải có backend proxy.

## Tài liệu liên quan

- `docs/research/bambu-print-parameters.md` — bảng thông số Bambu + trạng thái verify
- `docs/research/anycubic-print-parameters.md` — bảng thông số Anycubic + Anycubic Slicer Next
- `docs/research/slicer-interop.md` — cấu trúc file 3mf, phả hệ slicer, bảng ánh xạ thông số
  Orca ↔ Cura (nguồn sự thật cho trang "Đổi slicer")
- `docs/neon-setup.md` — cài đặt Neon, mô hình quyền, cách sao lưu/khôi phục dữ liệu

## Ghi chú — còn phải làm

- Sinh bộ dữ liệu ý tưởng: 15 danh mục × 30 sản phẩm + các axis thuộc tính
- Bổ sung nhiệt độ ABS / ASA / PC / PA (hiện CHƯA VERIFY — xem file research)
- Chốt tool tạo ảnh đích (Midjourney / Stable Diffusion / DALL-E) → ảnh hưởng đuôi prompt
- Chốt static host (Vercel / Netlify / GitHub Pages / S3)
