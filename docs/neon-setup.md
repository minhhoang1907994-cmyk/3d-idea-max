# Lưu dữ liệu ý tưởng trên Neon

Dữ liệu ở trang **Quản lý dữ liệu** lưu online trên Neon thay vì chỉ nằm trong file JSON của
repo. App chạy SQL qua HTTP bằng [`@neondatabase/serverless`](https://neon.com/docs/serverless/serverless-driver)
— driver chính thức của Neon, gửi câu lệnh qua HTTPS thay vì mở kết nối TCP, nên trình duyệt
dùng được mà không cần backend.

## Project đang dùng

| Mục      | Giá trị                                        |
| -------- | ---------------------------------------------- |
| Project  | `long-hill-31080369`                           |
| Branch   | `br-dry-dust-b3d20pvx` (production)            |
| Postgres | 18                                             |
| Region   | AWS Asia Pacific 1 (Singapore, ap-southeast-1) |
| Gói      | Free — 0.5 GB storage, scale-to-zero           |

Dữ liệu hiện tại khoảng 125 KB JSON, còn rất xa mức 0.5 GB.

## ⚠️ Mô hình quyền: ai cũng sửa được

App **không có đăng nhập**, và chuỗi kết nối nằm trong bundle nên ai xem source trang web
cũng lấy được. Đây là lựa chọn có chủ đích của chủ project, đánh đổi lấy việc không phải
dựng backend.

Bốn lớp giảm thiệt hại:

1. **Role `app_editor` bị giới hạn quyền** — chỉ `select/insert/update` trên `idea_documents`.
   Không xoá được dòng, không đụng được bảng khác, không đọc được schema `auth`/`neon_auth`,
   không tạo được bảng mới
2. **RLS policy khoá `name`** trong đúng 7 giá trị hợp lệ — không đổ dòng rác vào bảng được
3. **Bảng `idea_document_history`** giữ 20 bản ghi đè gần nhất mỗi document; `app_editor`
   không có quyền gì trên bảng này, chỉ trigger (chạy bằng quyền owner) ghi vào được
4. **Bản JSON gốc vẫn nằm trong repo** — `npm run neon:seed` là nút reset về bản trong git

**TUYỆT ĐỐI KHÔNG** đặt chuỗi kết nối của `neondb_owner` vào `.env` — role đó xoá được cả
database.

Rủi ro còn lại, chấp nhận có ý thức: kết nối trực tiếp không bị lọc bởi CORS, nên ai lấy được
chuỗi có thể gọi từ script bất kỳ và làm tốn compute. Muốn siết thì phải dựng backend proxy
giữ credential phía server.

## Vì sao không dùng Neon Data API

Thiết kế ban đầu là gọi [Neon Data API](https://neon.com/docs/data-api/overview) (REST, có
lọc CORS, không lộ credential). Nó **không dùng được** trên project này: mọi request không
kèm JWT đều bị từ chối, kể cả sau khi cấu hình đúng.

```
GET /idea_documents?select=name,version
→ HTTP 400 {"message":"missing authentication credentials:
             required authorization bearer token in JWT format"}
```

Đã kiểm chứng (2026-09-17):

| Đã thử                                      | Kết quả                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| Đặt `db_anon_role = anonymous` qua Console  | Lưu thành công, API xác nhận giá trị đã vào settings |
| Đặt qua `PATCH /api/v2/.../data-api/neondb` | HTTP 201, giá trị đúng                               |
| Refresh schema cache                        | Không đổi                                            |
| Tìm JWKS provider để gỡ                     | `GET /api/v2/projects/{id}/jwks` → `{"jwks":[]}`     |
| Disable rồi Enable lại Data API             | Không đổi (URL endpoint giữ nguyên)                  |
| Gửi JWT đúng cú pháp nhưng không ký         | Lỗi đổi thành `"missing key id"`                     |

Dòng cuối là điểm mấu chốt: proxy vẫn validate token theo một JWKS ngầm dù không provider
nào được đăng ký, và không dùng tới `db_anon_role`. Đây là hành vi phía Neon, không phải
lỗi cấu hình.

Nếu sau này Neon xử lý được, quay về Data API rất gọn: chỉ cần viết lại `src/lib/neonStore.ts`
theo giao thức PostgREST, phần còn lại của app không phụ thuộc vào cách kết nối.

## Các bước cài đặt

### 1. Tạo bảng

Neon Console → **SQL Editor** → dán toàn bộ
[`db/migrations/001_idea_documents.sql`](../db/migrations/001_idea_documents.sql) → Run.

### 2. Tạo role app_editor

Mở [`db/migrations/002_app_editor_role.sql`](../db/migrations/002_app_editor_role.sql), thay
`<MẬT-KHẨU-CỦA-BẠN>` bằng mật khẩu tự sinh, dán vào SQL Editor → Run.

**Phải tạo bằng SQL, không tạo qua Console.** Role tạo bằng Console / CLI / API được Neon cấp
luôn `neon_superuser` — quyền admin, đúng thứ cần tránh ở đây.
Nguồn: [Manage roles](https://neon.com/docs/manage/roles)

**Mật khẩu phải đủ mạnh.** Neon kiểm tra ở tầng control plane và từ chối mật khẩu yếu:

```
ERROR: insecure password, try including more special characters, using lowercase
letters, using uppercase letters or using a longer password (SQLSTATE XX000)
```

Dùng 32+ ký tự đủ chữ hoa, chữ thường, số và ký tự đặc biệt. Tránh `@ : / ? # & %` vì phải
URL-encode khi ghép vào connection string. Sinh nhanh bằng PowerShell:

```powershell
-join ((65..90) + (97..122) + (48..57) + (33, 42, 45, 46, 95, 126) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
```

Đừng commit file đã điền mật khẩu.

### 3. Lấy chuỗi kết nối

Neon Console → nút **Connect** → dialog "Connect to your branch" → dropdown **Role** chọn
`app_editor` → **Copy snippet**.

Kiểm tra lại: chuỗi phải bắt đầu bằng `postgresql://app_editor:` — nếu là `neondb_owner` thì
chọn sai role.

### 4. Cấu hình phía app

Tạo file `.env` ở gốc repo (đã nằm trong `.gitignore`):

```
VITE_NEON_DATABASE_URL=postgresql://app_editor:<mật khẩu>@ep-xxxx-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Trên Render: Dashboard → service `3d-idea-max` → **Environment** → thêm biến cùng tên, rồi
deploy lại. Biến `VITE_*` được nhúng lúc build, nên đổi giá trị phải build lại mới ăn.

### 5. Đẩy dữ liệu gốc lên

```bash
npm run neon:seed
```

Đọc 7 file trong `src/data/json/` và upsert lên Neon. Chạy lại bất cứ lúc nào để **ghi đè**
bản trên Neon bằng bản trong repo — đây cũng là cách khôi phục khi có người phá dữ liệu.

### 6. Kiểm tra

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

Cột `version` do trigger phía server tăng mỗi lần ghi. App gửi kèm version nó đang giữ
(`where name = $2 and version = $3`); nếu không khớp thì không dòng nào được cập nhật và app
báo "đã bị người khác sửa" thay vì âm thầm đè mất thay đổi của người kia.

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

| Triệu chứng                                  | Nguyên nhân                                                           |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `permission denied for table idea_documents` | Chưa chạy migration 002, hoặc `.env` đang dùng role khác `app_editor` |
| `password authentication failed`             | Mật khẩu trong chuỗi kết nối không khớp mật khẩu đặt ở migration 002  |
| Trả về 0 dòng dù bảng có dữ liệu             | RLS bật nhưng thiếu policy cho `app_editor` — chạy lại migration 002  |
| `new row violates row-level security policy` | `name` không nằm trong 7 tên hợp lệ                                   |
| `relation "idea_documents" does not exist`   | Chưa chạy migration 001                                               |
