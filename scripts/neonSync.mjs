/**
 * Đồng bộ dữ liệu ý tưởng giữa `src/data/json/` và Neon qua Data API.
 *
 * Chạy:
 *   node scripts/neonSync.mjs push   — đẩy 7 file JSON lên Neon (dùng lần đầu để tạo dữ liệu)
 *   node scripts/neonSync.mjs pull   — kéo dữ liệu trên Neon về file JSON (sao lưu / đưa vào repo)
 *
 * Địa chỉ Data API đọc từ biến môi trường VITE_NEON_DATA_API_URL, hoặc từ file .env
 * ở gốc repo. Script KHÔNG cần connection string Postgres: nó đi cùng một đường
 * HTTP như app, dưới role `anonymous`, nên quyền của nó đúng bằng quyền app có.
 *
 * `push` dùng upsert: document chưa có thì tạo mới, đã có thì GHI ĐÈ bản trên Neon.
 * Muốn giữ bản trên Neon thì `pull` trước.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_DIR = path.join(ROOT, 'src', 'data', 'json');

/** Tên document trên Neon → tên file JSON. Khớp DATA_FILES trong src/data/bundledData.ts */
const DOCUMENTS = {
  categories: 'categories.json',
  attributes: 'attributes.json',
  technicalAxes: 'technicalAxes.json',
  mechanisms: 'mechanisms.json',
  characters: 'characters.json',
  personalizations: 'personalizations.json',
  fusionFormulas: 'fusionFormulas.json',
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

function resolveBaseUrl() {
  const fromEnv = process.env.VITE_NEON_DATA_API_URL ?? readEnvFile().VITE_NEON_DATA_API_URL;
  if (!fromEnv || fromEnv.trim().length === 0) {
    throw new Error(
      'Chưa có VITE_NEON_DATA_API_URL. Tạo file .env ở gốc repo theo mẫu .env.example — xem docs/neon-setup.md.',
    );
  }
  return fromEnv.trim().replace(/\/+$/, '');
}

async function readError(response) {
  try {
    const body = await response.json();
    if (body && typeof body.message === 'string') {
      return body.hint ? `${body.message} (${body.hint})` : body.message;
    }
  } catch {
    // Body không phải JSON
  }
  return `Neon trả về lỗi ${response.status}.`;
}

async function push(baseUrl) {
  const rows = [];
  for (const [name, fileName] of Object.entries(DOCUMENTS)) {
    const filePath = path.join(JSON_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy ${filePath}`);
    }
    rows.push({ name, content: JSON.parse(fs.readFileSync(filePath, 'utf8')) });
  }

  const response = await fetch(`${baseUrl}/idea_documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // merge-duplicates = upsert theo khoá chính (name)
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const saved = await response.json();
  for (const row of saved) {
    console.log(`  ${row.name.padEnd(18)} version ${row.version}`);
  }
  console.log(`Đã đẩy ${saved.length} document lên Neon.`);
}

async function pull(baseUrl) {
  const response = await fetch(`${baseUrl}/idea_documents?select=name,content,version`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const rows = await response.json();
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
if (command !== 'push' && command !== 'pull') {
  console.error('Dùng: node scripts/neonSync.mjs push|pull');
  process.exit(1);
}

try {
  const baseUrl = resolveBaseUrl();
  if (command === 'push') {
    await push(baseUrl);
  } else {
    await pull(baseUrl);
  }
} catch (error) {
  console.error(`Lỗi: ${error.message}`);
  process.exit(1);
}
