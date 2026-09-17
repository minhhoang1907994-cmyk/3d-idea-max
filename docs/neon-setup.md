# Lưu dữ liệu ý tưởng trên Neon

Dữ liệu ở trang **Quản lý dữ liệu** lưu online trên Neon thay vì chỉ nằm trong file JSON của
repo. App gọi thẳng **Neon Data API** — một cài đặt PostgREST chạy trong proxy của Neon, nói
HTTPS nên trình duyệt gọi được mà không cần backend hay driver Postgres.

Nguồn: [Neon Data API](https://neon.com/docs/data-api/overview) ·
[Manage Data API](https://neon.com/docs/data-api/manage)

## Project đang dùng

| Mục      | Giá trị                                        |
| -------- | ---------------------------------------------- |
| Project  | `long-hill-31080369`                           |
| Branch   | `br-dry-dust-b3d20pvx`                         |
| Postgres | 18                                             |
| Region   | AWS Asia Pacific 1 (Singapore, ap-southeast-1) |
| Gói      | Free — 0.5 GB storage, scale-to-zero           |

Dữ liệu hiện tại khoảng 125 KB JSON, còn rất xa mức 0.5 GB.

## ⚠️ Mô hình quyền đã chọn: ai cũng sửa được

App **không có đăng nhập**. Mọi request đi tới Neon không kèm header `Authorization`, nên
Neon chạy chúng dưới role `anonymous`
([nguồn](https://neon.com/docs/data-api/manage)). Hệ quả: bất kỳ ai mở được trang web đều
sửa được dữ liệu ý tưởng.

Đây là lựa chọn có chủ đích của chủ project. Ba lớp giảm thiệt hại đã dựng sẵn:

1. **Không cấp quyền DELETE** — xoá dòng là thao tác không có đường lùi
2. **Bảng `idea_document_history`** giữ 20 bản ghi đè gần nhất mỗi document
3. **Bản JSON gốc vẫn nằm trong repo** — `npm run neon:seed` là nút reset về bản trong git

Muốn siết lại về sau: bỏ `grant ... update, insert` cho `anonymous`, chỉ để `select`, rồi
thêm auth (Neon Auth hoặc JWKS của provider khác) cho đường ghi.

## Các bước cài đặt

### 1. Bật Data API

Neon Console → project → **Postgres database** → **Data API** → **Enable Data API**.

Data API bật ở **mức branch** cho một database. Bật trên đúng branch `br-dry-dust-b3d20pvx`.

Sau khi bật, Console hiện endpoint dạng:

```
https://ep-xxxx.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1
```

Chép lại — đây là giá trị `VITE_NEON_DATA_API_URL`.

### 2. Bật truy cập ẩn danh

Trang **Postgres database → Data API** → nút **Configure Data API** (cạnh "Open quickstart")
→ đặt **Anonymous role** = `anonymous` → Save.

Không phải mục **Settings** ở sidebar trái — trang đó là cấu hình project và Neon Auth,
không có trường này.

Đây là trường quyết định role Postgres dùng cho request **không kèm header
`Authorization`** ([nguồn](https://neon.com/docs/data-api/manage)). Chưa đặt thì proxy của
Neon trả về HTTP 400 cho mọi request, kể cả với bảng không tồn tại:

```json
{
  "message": "missing authentication credentials: required authorization bearer token in JWT format"
}
```

Lỗi này phát sinh **trước khi** chạm tới database, nên cấp quyền trong SQL bao nhiêu cũng vô
ích nếu thiếu bước này.

### 3. Tạo bảng và cấp quyền

Neon Console → **SQL Editor** → dán toàn bộ nội dung
[`db/migrations/001_idea_documents.sql`](../db/migrations/001_idea_documents.sql) → Run.

File này tự tạo role `anonymous` nếu chưa có, nên chạy trước hay sau bước 2 đều được.

Sau khi chạy xong, quay lại trang Data API bấm **Refresh schema cache** để API nhìn thấy
bảng mới.

### 4. Giới hạn CORS

Trong Data API → **Settings** → phần CORS: để trống nghĩa là **mọi domain đều gọi được**.
Điền domain thật của app (ví dụ `https://3d-idea-max.onrender.com`) và `http://localhost:5173`
cho lúc dev.

### 5. Cấu hình phía app

Tạo file `.env` ở gốc repo (file này đã nằm trong `.gitignore`):

```
VITE_NEON_DATA_API_URL=https://ep-xxxx.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1
```

Trên Render: Dashboard → service `3d-idea-max` → **Environment** → thêm biến cùng tên, rồi
deploy lại. Biến `VITE_*` được nhúng lúc build, nên đổi giá trị phải build lại mới ăn.

### 6. Đẩy dữ liệu gốc lên

```bash
npm run neon:seed
```

Lệnh này đọc 7 file trong `src/data/json/` và upsert lên Neon. Chạy lại bất cứ lúc nào để
**ghi đè** bản trên Neon bằng bản trong repo — đây cũng là cách khôi phục khi có người phá dữ liệu.

### 7. Kiểm tra

Mở app → trang Quản lý dữ liệu → dòng trạng thái dưới tiêu đề phải hiện
**"Nguồn: Neon (online)"**. Sửa một sản phẩm, bấm **Lưu lên Neon**, tải lại trang: thay đổi
phải còn.

## Dùng hằng ngày

| Việc                                | Cách làm                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Sửa dữ liệu                         | Trang Quản lý dữ liệu → **Lưu lên Neon**                                    |
| Lấy bản mới nhất người khác đã sửa  | **Tải lại từ Neon**                                                         |
| Đưa dữ liệu trên Neon về repo       | `npm run neon:pull` → `git diff` → commit                                   |
| Khôi phục sau khi ai đó phá dữ liệu | `npm run neon:seed` (về bản trong git)                                      |
| Xem bản bị ghi đè                   | SQL Editor: `select * from idea_document_history order by replaced_at desc` |

Nên `npm run neon:pull` + commit định kỳ: repo là bản gốc cuối cùng, Neon chỉ giữ 20 bản gần nhất.

## Cấu trúc dữ liệu

Bảng `idea_documents` có 7 dòng, mỗi dòng là một file JSON:

| `name`             | file trong `src/data/json/` |
| ------------------ | --------------------------- |
| `categories`       | `categories.json`           |
| `attributes`       | `attributes.json`           |
| `technicalAxes`    | `technicalAxes.json`        |
| `mechanisms`       | `mechanisms.json`           |
| `characters`       | `characters.json`           |
| `personalizations` | `personalizations.json`     |
| `fusionFormulas`   | `fusionFormulas.json`       |

Nội dung để nguyên dạng `jsonb`, không tách bảng chuẩn hoá: mọi type TypeScript hiện có
(`ProductCategory`, `AttributeAxis`, …) map thẳng 1-1 với JSON, tách bảng sẽ phải viết lại
lớp dữ liệu mà không đổi được gì về tính năng.

Cột `version` do trigger phía server tăng mỗi lần ghi. App gửi kèm version nó đang giữ; nếu
không khớp thì Neon không ghi dòng nào và app báo "đã bị người khác sửa" thay vì âm thầm đè
mất thay đổi của người kia.

## `filaments.ts` và `printers.ts` KHÔNG lên Neon

Hai file đó gắn với thông số in thật kèm `sourceUrl` tài liệu hãng. Thông số sai làm hỏng bản
in (tốn nhựa + nhiều giờ máy chạy), nên chúng vẫn nằm trong repo, sửa qua code review, không
sửa tự do qua UI. Xem `CLAUDE.md` > Nguồn sự thật cho thông số in.

## Khi Neon không gọi được

App rơi về bộ dữ liệu đóng gói trong bundle và hiện thông báo lỗi ở trang Quản lý dữ liệu.
Trang Mix vẫn chạy bình thường, chỉ là dữ liệu cũ tính tới lần build gần nhất.

Gói Free scale-to-zero, nên request đầu tiên sau một thời gian không dùng sẽ chậm hơn vì
database phải khởi động lại.

## Lỗi thường gặp

| Triệu chứng                                                                             | Nguyên nhân                                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `missing authentication credentials: required authorization bearer token in JWT format` | Chưa đặt **Anonymous role** trong Data API > Settings > Advanced settings (bước 2)    |
| `permission denied for table idea_documents`                                            | Chưa chạy migration, hoặc **Anonymous role** trong Settings đang trỏ tới role khác    |
| Trả về mảng rỗng dù bảng có dữ liệu                                                     | RLS bật nhưng thiếu policy cho `anonymous` — chạy lại phần policy cuối file migration |
| `new row violates row-level security policy`                                            | `name` không nằm trong 7 tên hợp lệ                                                   |
| Bảng mới không thấy trong API                                                           | Bấm **Refresh schema cache** trong trang Data API                                     |
| Lỗi CORS trên trình duyệt                                                               | Domain đang mở không nằm trong danh sách CORS ở Data API Settings                     |
