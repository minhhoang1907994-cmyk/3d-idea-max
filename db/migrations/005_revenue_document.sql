-- Đổi tên document thứ 5 của Sổ công ty: companyFinishedGoods → companyRevenues
-- (tab "Thành phẩm" đổi tên thành "Doanh thu").
--
-- Chạy file này trong Neon SQL Editor bằng role owner (neondb_owner), MỘT LẦN, bằng nút
-- Run (KHÔNG phải Explain — EXPLAIN không nhận DDL và sẽ báo syntax error tại `drop`).
-- Thay thế hoàn toàn 004_finished_goods_document.sql: policy RLS không cộng dồn được,
-- mỗi lần drop/create là ghi đè toàn bộ điều kiện cũ. Cài mới thì chạy 003 rồi 005,
-- không cần chạy 004.

-- Policy cho role `anonymous` (đường Data API, hiện không dùng được — giữ cho khớp 001)
drop policy if exists idea_documents_insert on idea_documents;
create policy idea_documents_insert on idea_documents
  for insert to anonymous
  with check (
    name in (
      'categories', 'attributes', 'technicalAxes',
      'mechanisms', 'characters', 'personalizations', 'fusionFormulas',
      'companyExpenses', 'companyIncomes', 'companyNotes', 'companyProducts',
      'companyRevenues'
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
      'companyRevenues'
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
      'companyRevenues'
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
      'companyRevenues'
    )
  );

-- Chuyển document cũ sang tên mới, giữ nguyên nội dung nếu đã có ai nhập dòng nào.
-- `where not exists` để chạy lại lần hai không đè mất bản mới.
update idea_documents
set name = 'companyRevenues'
where name = 'companyFinishedGoods'
  and not exists (select 1 from idea_documents where name = 'companyRevenues');

-- Trường hợp cả hai cùng tồn tại (đã lỡ tạo companyRevenues trước khi chạy file này):
-- bản cũ không còn ai đọc, xoá cho sạch. App KHÔNG xoá được dòng nào (role app_editor
-- không có DELETE) nên chỉ owner chạy được câu này.
delete from idea_documents where name = 'companyFinishedGoods';
delete from idea_document_history where name = 'companyFinishedGoods';

-- Kiểm tra sau khi chạy (chạy bằng role owner):
-- select name, version, jsonb_array_length(content) as rows from idea_documents
--   where name like 'company%' order by name;
