# Backblaze B2 — nơi lưu ảnh của Sổ công ty

Cột "Hình ảnh" ở tab **Tổng chi** tải file thẳng từ trình duyệt lên Backblaze B2, không
qua server nào (project không có backend — xem CLAUDE.md).

Bucket đang dùng: `h2t-cobra`, **Private**, endpoint `s3.us-east-005.backblazeb2.com`.

## Vì sao làm theo cách này

| Quyết định                                            | Lý do                                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Giữ bucket **Private**                                | Backblaze bắt phải có payment method on file mới tạo được public bucket. Private thì không cần, mà giá thì không khác: B2 tính theo dung lượng (10 GB đầu free) và egress (free tới 3× dung lượng lưu/tháng), không phân biệt public/private           |
| Sổ lưu **object key**, không lưu URL                  | Bucket private nên URL xem ảnh phải ký và có hạn. Lưu URL đã ký vào Neon thì hôm sau mở ra là ảnh hỏng. Key được ký lại ngay lúc render bảng                                                                                                           |
| Đi đường **S3-Compatible API**, không dùng native API | Backblaze ghi rõ CORS không áp dụng cho phần lớn native API — trong đó có `b2_authorize_account` — và từ chối luôn preflight dùng token của hàm đó. Xem [CORS rules](https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules) |
| **Tự ký SigV4** thay vì dùng aws-sdk                  | Quy tắc project: không thêm dependency. `crypto.subtle` của trình duyệt ký được, code nằm ở `src/lib/b2Storage.ts`                                                                                                                                     |
| Key **không có quyền xoá**                            | Key nằm trong bundle nên ai cũng lấy được. Không cấp `deleteFiles` thì rủi ro lớn nhất chỉ còn là ghi thêm file, không mất dữ liệu cũ                                                                                                                  |

## Cài đặt (làm một lần)

### 1. Tạo application key

Backblaze Console → **Application Keys** → **Add a New Application Key**:

| Trường                      | Giá trị                                |
| --------------------------- | -------------------------------------- |
| Name of Key                 | `3d-idea-max-web`                      |
| Allow access to Bucket(s)   | **chỉ** `h2t-cobra` — KHÔNG chọn "All" |
| Type of Access              | **Read and Write**                     |
| Allow List All Bucket Names | để tắt                                 |

Bấm **Create New Key**. Màn hình hiện `keyID` và `applicationKey` — **applicationKey chỉ
hiện đúng một lần**, chép ngay.

> Backblaze không cho bỏ riêng quyền `deleteFiles` trong giao diện Read and Write. Nếu
> cần chặt hơn thì tạo key bằng CLI `b2 key create --bucket h2t-cobra <tên> listFiles,readFiles,writeFiles`
> rồi dùng key đó. Chưa làm bước này thì key trong bundle vẫn xoá được file trong bucket
> `h2t-cobra` — chấp nhận được vì bucket chỉ chứa ảnh minh hoạ, nhưng nên siết khi có thời gian.

### 2. Bật CORS cho bucket

Không có bước này thì trình duyệt chặn, upload báo lỗi "Failed to fetch".

**Preset trong Console KHÔNG dùng được.** Hộp thoại "CORS Rules" chỉ có các lựa chọn dạng
"Share everything in this bucket with this one origin" — đã thử và đo bằng preflight:

| Thử với preset một origin                   | Kết quả                             |
| ------------------------------------------- | ----------------------------------- |
| preflight `GET`, không xin header           | 200                                 |
| preflight `PUT`                             | 403 — preset không mở thao tác ghi  |
| preflight `GET` + xin header `content-type` | 403 — preset không cho header tuỳ ý |

Preset chỉ mở cho đọc, mà upload cần `PUT` kèm header `content-type`. Phải nạp custom
rule bằng B2 CLI — chính hộp thoại đó cũng trỏ sang cách này.

Rule để sẵn ở `docs/backblaze-cors-rules.json`:

```json
[
  {
    "corsRuleName": "web-upload",
    "allowedOrigins": ["https://threed-idea-max.onrender.com", "http://localhost:5173"],
    "allowedOperations": ["s3_put", "s3_get", "s3_head"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

Custom rule còn giải quyết luôn chuyện preset chỉ nhận **một** origin — ở đây khai cả
domain production lẫn `localhost:5173` cho lúc chạy `npm run dev`.

Tên thao tác là dạng ngắn `s3_put` / `s3_get` / `s3_head` — KHÔNG phải `s3_put_object`.
Tài liệu Backblaze chỉ nêu ví dụ với các thao tác `b2_*`, tên `s3_*` xác nhận bằng chính
API: sai tên thì B2 trả `unknown allowedOperation value: <tên> (bad_request)`.

Nạp rule ([tài liệu CLI](https://www.backblaze.com/docs/cloud-storage-enable-cors-with-the-cli)):

```bash
# Cài CLI: https://www.backblaze.com/docs/cloud-storage-command-line-tools
b2 account authorize          # dùng Master Application Key, xem ghi chú bên dưới
b2 bucket update --cors-rules "$(<./docs/backblaze-cors-rules.json)" h2t-cobra allPrivate
```

Trên **Windows PowerShell 5.1 thì cách đọc file không dùng được**: PowerShell nuốt dấu `"`
khi truyền tham số cho chương trình ngoài, JSON tới nơi mất hết ngoặc kép và B2 báo
`is not a valid JSON value`. Phải escape sẵn `\"`:

```powershell
$cors = '[{\"corsRuleName\":\"web-upload\",\"allowedOrigins\":[\"https://threed-idea-max.onrender.com\",\"http://localhost:5173\"],\"allowedOperations\":[\"s3_put\",\"s3_get\",\"s3_head\"],\"allowedHeaders\":[\"*\"],\"maxAgeSeconds\":3600}]'
b2 bucket update --cors-rules $cors h2t-cobra allPrivate
```

> Application key giới hạn bucket (key mà app đang dùng) nhiều khả năng không sửa được
> cấu hình bucket — sửa bucket cần quyền ở mức tài khoản. Nếu CLI báo thiếu quyền thì
> đăng nhập lại bằng **Master Application Key**. Chưa verify điểm này, cứ thử key thường
> trước, lỗi thì đổi.

Đổi domain hosting thì phải sửa lại `allowedOrigins` rồi nạp lại rule, nếu không upload sẽ hỏng.

**Kiểm tra rule đã ăn chưa** — chạy được từ bất kỳ máy nào, không cần key:

```bash
curl -i -X OPTIONS "https://s3.us-east-005.backblazeb2.com/h2t-cobra/test.jpg"   -H "Origin: https://threed-idea-max.onrender.com"   -H "Access-Control-Request-Method: PUT"   -H "Access-Control-Request-Headers: content-type"
```

- Chưa bật: `403` kèm `CORSResponse: CORS is not enabled for this bucket.`
- Bật rồi nhưng rule không phủ request này: `403` kèm `This CORS request is not allowed.`
- Đúng: `200` kèm header `Access-Control-Allow-Origin` khớp origin vừa gửi

### 3. Điền `.env`

```
VITE_B2_KEY_ID=<keyID vừa tạo>
VITE_B2_APPLICATION_KEY=<applicationKey vừa tạo>
VITE_B2_BUCKET=h2t-cobra
VITE_B2_ENDPOINT=s3.us-east-005.backblazeb2.com
```

Trên Render: khai cùng bốn biến đó trong Environment của service rồi build lại — biến
`VITE_*` được nhúng lúc build, đổi biến mà không build lại thì không có tác dụng.

### 4. Thử

`npm run dev` → trang **Sổ công ty** → tab **Tổng chi** → cột Hình ảnh → **Tải ảnh lên**.
Ảnh hiện thumbnail là xong. Nhớ bấm **Lưu** để đẩy object key lên Neon.

## Những chỗ dễ vấp

| Triệu chứng                               | Nguyên nhân thường gặp                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| "Không gọi được Backblaze… kiểm tra CORS" | Chưa thêm CORS rule, hoặc origin trong rule khác origin đang mở (nhớ `http://localhost:5173` cho lúc dev) |
| HTTP 403 `SignatureDoesNotMatch`          | `VITE_B2_APPLICATION_KEY` chép thiếu ký tự, hoặc endpoint khai sai region                                 |
| HTTP 403 `Access Denied`                  | Key không được cấp bucket `h2t-cobra`, hoặc chỉ có quyền Read                                             |
| Ảnh cũ mất, ảnh mới vẫn lên được          | Object key trong sổ trỏ tới file đã bị xoá khỏi bucket                                                    |
| Ô hình ảnh hiện ô dán link                | Build thiếu biến `VITE_B2_*`                                                                              |

## Giới hạn hiện tại

- **"Bỏ ảnh" chỉ xoá tham chiếu trong sổ, file vẫn nằm trên B2.** Cùng lý do với Neon:
  app không được cấp quyền xoá. Dọn file thừa phải làm tay trên Backblaze Console
- Ảnh trên 10 MB bị chặn ngay ở trình duyệt (`MAX_IMAGE_BYTES` trong `src/lib/b2Storage.ts`);
  app **không** nén ảnh trước khi tải lên
- URL xem ảnh có hạn 1 giờ và được ký lại mỗi lần tải trang. Copy URL đó gửi cho người
  khác thì hết giờ là hỏng

## Liên quan

- `src/lib/b2Storage.ts` — ký SigV4, tải lên, sinh object key
- `src/components/ImageCell.tsx` — ô "Hình ảnh" trong bảng
- `docs/neon-setup.md` — nơi lưu chính dữ liệu sổ (object key nằm trong đó)
