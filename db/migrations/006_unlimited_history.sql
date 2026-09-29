-- Bỏ giới hạn 20 bản trong idea_document_history: mọi bản bị ghi đè đều được giữ vĩnh viễn,
-- cho cả 7 document ý tưởng lẫn 5 document của Sổ công ty. Nhóm không muốn định kỳ kéo dữ liệu
-- từ Neon về git làm bản sao lưu, nên lịch sử trên Neon phải đủ để lùi về bất kỳ lần lưu nào.
--
-- Chạy file này trong Neon SQL Editor bằng role owner (neondb_owner), MỘT LẦN, bằng nút Run.
-- Chỉ thay thân hàm trigger của 001 — trigger, bảng và quyền giữ nguyên.

create or replace function idea_documents_on_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into idea_document_history (name, content, version)
  values (old.name, old.content, old.version);

  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;
