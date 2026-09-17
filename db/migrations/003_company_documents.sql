-- Nới danh sách `name` được phép ghi vào idea_documents cho 4 document của Sổ công ty:
-- companyExpenses, companyIncomes, companyNotes, companyProducts.
--
-- Chạy file này trong Neon SQL Editor bằng role owner (neondb_owner), MỘT LẦN, TRƯỚC KHI
-- chạy `npm run neon:seed:company`. Chưa chạy thì Neon từ chối ghi 4 document mới với lỗi
-- "new row violates row-level security policy for table idea_documents".
--
-- Vì sao nằm chung bảng idea_documents: cùng mô hình lưu trữ (một document = một file
-- JSON), cùng trigger tăng version + lưu lịch sử ở migration 001. Tách bảng riêng sẽ phải
-- nhân đôi trigger và policy mà không đổi được gì về tính năng.
--
-- Vẫn KHÔNG cấp DELETE: trang Sổ công ty "xoá dòng" bằng cách ghi đè cả document (mảng
-- thiếu phần tử đó), nên trigger ở migration 001 vẫn giữ lại bản trước khi xoá.

-- Policy cho role `anonymous` (đường Data API, hiện không dùng được — giữ cho khớp 001)
drop policy if exists idea_documents_insert on idea_documents;
create policy idea_documents_insert on idea_documents
  for insert to anonymous
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts'
    )
  );

drop policy if exists idea_documents_update on idea_documents;
create policy idea_documents_update on idea_documents
  for update to anonymous
  using (true)
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts'
    )
  );

-- Policy cho role `app_editor` — đây mới là role app thật sự dùng (xem 002)
drop policy if exists idea_documents_app_insert on idea_documents;
create policy idea_documents_app_insert on idea_documents
  for insert to app_editor
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts'
    )
  );

drop policy if exists idea_documents_app_update on idea_documents;
create policy idea_documents_app_update on idea_documents
  for update to app_editor
  using (true)
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts'
    )
  );

-- Kiểm tra sau khi chạy (chạy bằng role owner):
-- select policyname, cmd, with_check from pg_policies where tablename = 'idea_documents';
