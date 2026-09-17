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

Không có bước này thì trình duyệt chặn, upload báo lỗi mạng.

Backblaze Console → bucket `h2t-cobra` → **CORS Rules** → chuyển sang chế độ nhập rule
thủ công và thêm:

| Trường            | Giá trị                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| corsRuleName      | `web-upload`                                                                                                                                                                                                           |
| allowedOrigins    | domain thật của trang web (ví dụ `https://3d-idea-max.onrender.com`) và `http://localhost:5173` để chạy `npm run dev`                                                                                                  |
| allowedOperations | `S3 Put Object`, `S3 Get Object`, `S3 Head Object` — đúng tên như [tài liệu CORS](https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules) liệt kê; giao diện Console hiển thị thành checkbox |
| allowedHeaders    | `*`                                                                                                                                                                                                                    |
| maxAgeSeconds     | `3600`                                                                                                                                                                                                                 |

Đổi domain hosting thì phải sửa lại rule này, nếu không upload sẽ hỏng.

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
