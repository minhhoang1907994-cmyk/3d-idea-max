/**
 * Đồng bộ dữ liệu ý tưởng giữa `src/data/json/` và Neon.
 *
 * Chạy:
 *   node scripts/neonSync.mjs push            — đẩy MỌI file JSON lên Neon (lần đầu để tạo dữ liệu)
 *   node scripts/neonSync.mjs push <tên...>   — chỉ đẩy đúng những document được nêu tên
 *   node scripts/neonSync.mjs pull            — kéo dữ liệu trên Neon về file JSON (sao lưu / đưa vào repo)
 *
 * Nêu tên khi chỉ muốn đẩy một phần: `push` ghi đè bản trên Neon, nên đẩy cả 12 document
 * chỉ để tạo mới 5 document của Sổ công ty là xoá mất phần người khác vừa sửa online.
 *
 * Chuỗi kết nối đọc từ biến môi trường VITE_NEON_DATABASE_URL, hoặc từ file .env ở
 * gốc repo. Script chạy bằng chính role `app_editor` như app, nên quyền của nó đúng
 * bằng quyền app có — không xoá được gì.
 *
 * `push` dùng upsert: document chưa có thì tạo mới, đã có thì GHI ĐÈ bản trên Neon.
 * Muốn giữ bản trên Neon thì `pull` trước.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_DIR = path.join(ROOT, 'src', 'data', 'json');

/**
 * Tên document trên Neon → tên file JSON.
 * Khớp DATA_FILES trong src/data/bundledData.ts và COMPANY_DATA_FILES trong
 * src/data/companyData.ts.
 */
const DOCUMENTS = {
  categories: 'categories.json',
  attributes: 'attributes.json',
  technicalAxes: 'technicalAxes.json',
  mechanisms: 'mechanisms.json',
  characters: 'characters.json',
  personalizations: 'personalizations.json',
  fusionFormulas: 'fusionFormulas.json',
  companyExpenses: 'companyExpenses.json',
  companyIncomes: 'companyIncomes.json',
  companyNotes: 'companyNotes.json',
  companyProducts: 'companyProducts.json',
  companyFinishedGoods: 'companyFinishedGoods.json',
};

function readEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};

  const result = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    // Bỏ nháy bao quanh nếu có
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

function resolveDatabaseUrl() {
  const fromEnv = process.env.VITE_NEON_DATABASE_URL ?? readEnvFile().VITE_NEON_DATABASE_URL;
  if (!fromEnv || fromEnv.trim().length === 0) {
    throw new Error(
      'Chưa có VITE_NEON_DATABASE_URL. Tạo file .env ở gốc repo theo mẫu .env.example — xem docs/neon-setup.md.',
    );
  }
  return fromEnv.trim();
}

async function push(sql, onlyNames) {
  const entries = Object.entries(DOCUMENTS).filter(
    ([name]) => onlyNames.length === 0 || onlyNames.includes(name),
  );
  if (entries.length === 0) {
    throw new Error(
      `Không có document nào khớp tên đã nêu. Tên hợp lệ: ${Object.keys(DOCUMENTS).join(', ')}`,
    );
  }

  let count = 0;
  for (const [name, fileName] of entries) {
    const filePath = path.join(JSON_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    // Kiểm tra JSON hợp lệ trước khi gửi, để lỗi cú pháp báo tên file rõ ràng
    JSON.parse(content);

    const rows = await sql.query(
      `insert into idea_documents (name, content) values ($1, $2::jsonb)
       on conflict (name) do update set content = excluded.content
       returning name, version`,
      [name, content],
    );
    const row = rows[0];
    console.log(`  ${name.padEnd(18)} version ${row.version}`);
    count += 1;
  }
  console.log(`Đã đẩy ${count} document lên Neon.`);
}

async function pull(sql) {
  const rows = await sql.query('select name, content, version from idea_documents', []);
  if (rows.length === 0) {
    throw new Error('Trên Neon chưa có document nào — chạy "npm run neon:seed" trước.');
  }

  for (const row of rows) {
    const fileName = DOCUMENTS[row.name];
    if (!fileName) {
      console.log(`  bỏ qua document lạ: ${row.name}`);
      continue;
    }
    // Giữ 2 space + newline cuối như Prettier để git diff sạch
    fs.writeFileSync(
      path.join(JSON_DIR, fileName),
      JSON.stringify(row.content, null, 2) + '\n',
      'utf8',
    );
    console.log(`  ${fileName.padEnd(24)} version ${row.version}`);
  }
  console.log(`Đã ghi ${rows.length} file vào src/data/json/. Xem "git diff" trước khi commit.`);
}

const command = process.argv[2];
const onlyNames = process.argv.slice(3);
if (command !== 'push' && command !== 'pull') {
  console.error('Dùng: node scripts/neonSync.mjs push|pull');
  process.exit(1);
}

try {
  const sql = neon(resolveDatabaseUrl());
  if (command === 'push') {
    await push(sql, onlyNames);
  } else {
    await pull(sql);
  }
} catch (error) {
  console.error(`Lỗi: ${error.message}`);
  process.exit(1);
}
