-- Nới danh sách `name` được phép ghi vào idea_documents cho document thứ 5 của Sổ công ty:
-- companyFinishedGoods (tab "Thành phẩm" — hàng đã in xong và đem bán, có giá bán).
--
-- Chạy file này trong Neon SQL Editor bằng role owner (neondb_owner), MỘT LẦN, TRƯỚC KHI
-- chạy `npm run neon:seed:company`. Chưa chạy thì Neon từ chối ghi document mới với lỗi
-- "new row violates row-level security policy for table idea_documents".
--
-- Chỉ chép lại nguyên danh sách của 003 và thêm một tên: policy RLS không cộng dồn được,
-- mỗi lần drop/create là ghi đè toàn bộ điều kiện cũ.

-- Policy cho role `anonymous` (đường Data API, hiện không dùng được — giữ cho khớp 001)
drop policy if exists idea_documents_insert on idea_documents;
create policy idea_documents_insert on idea_documents
  for insert to anonymous
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts',
      'companyFinishedGoods'
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
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts',
      'companyFinishedGoods'
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
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts',
      'companyFinishedGoods'
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
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts',
      'companyFinishedGoods'
    )
  );

-- Kiểm tra sau khi chạy (chạy bằng role owner):
-- select policyname, cmd, with_check from pg_policies where tablename = 'idea_documents';
