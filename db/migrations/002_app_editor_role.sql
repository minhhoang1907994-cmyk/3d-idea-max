-- Role mà app dùng để đọc/ghi dữ liệu ý tưởng từ trình duyệt.
--
-- ⚠️ TRƯỚC KHI CHẠY: thay <MẬT-KHẨU-CỦA-BẠN> bằng mật khẩu tự sinh. KHÔNG commit
-- file đã điền mật khẩu vào git.
--
-- Neon kiểm tra độ mạnh ở tầng control plane và từ chối mật khẩu yếu với lỗi
-- "insecure password, try including more special characters, using lowercase
-- letters, using uppercase letters or using a longer password".
-- Dùng 32+ ký tự có đủ chữ hoa, chữ thường, số và ký tự đặc biệt. Tránh @ : / ? # & %
-- vì chúng phải URL-encode khi ghép vào connection string.
--
-- ⚠️ PHẢI tạo role bằng SQL như file này, KHÔNG tạo qua Neon Console / CLI / API:
-- role tạo bằng những đường đó được cấp luôn `neon_superuser`, tức quyền admin —
-- đúng thứ cần tránh. Nguồn: https://neon.com/docs/manage/roles
--
-- Vì sao cần role riêng thay vì dùng `neondb_owner`: connection string của role này
-- nằm trong bundle của trang web, ai xem source cũng lấy được. `neondb_owner` xoá
-- được bảng và cả database; `app_editor` chỉ đọc/ghi được 7 document, đúng bằng mức
-- rủi ro đã chấp nhận khi chọn "ai mở web cũng sửa được".
--
-- Cố ý KHÔNG cấp:
--   DELETE            — xoá dòng không có đường lùi
--   quyền trên idea_document_history — đó là bản sao lưu, app không cần đụng tới
--   CREATE trên schema — không tạo được bảng mới
--   quyền trên schema auth / neon_auth — dữ liệu Neon Auth nằm ngoài tầm với

create role app_editor login password '<MẬT-KHẨU-CỦA-BẠN>';

grant connect on database neondb to app_editor;
grant usage on schema public to app_editor;
grant select, insert, update on idea_documents to app_editor;

-- RLS đã bật ở migration 001. Policy ở đó viết cho role `anonymous` (đường Data API,
-- hiện không dùng được), nên thêm policy tương đương cho app_editor.
drop policy if exists idea_documents_app_read on idea_documents;
create policy idea_documents_app_read on idea_documents
  for select to app_editor
  using (true);

-- Giới hạn `name` trong đúng 7 file dữ liệu của app: không đổ thêm dòng rác vào bảng được
drop policy if exists idea_documents_app_insert on idea_documents;
create policy idea_documents_app_insert on idea_documents
  for insert to app_editor
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas'
    )
  );

drop policy if exists idea_documents_app_update on idea_documents;
create policy idea_documents_app_update on idea_documents
  for update to app_editor
  using (true)
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas'
    )
  );

-- Kiểm tra sau khi chạy: phải ra đúng 3 quyền select/insert/update
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_name = 'idea_documents' and grantee = 'app_editor';
