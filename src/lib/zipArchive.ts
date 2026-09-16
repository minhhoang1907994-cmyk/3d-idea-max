import type { ArchiveFile } from '../types';

/**
 * Đọc / ghi archive ZIP bằng API sẵn có của trình duyệt (`DecompressionStream`), không
 * thêm dependency — file `.3mf` chỉ là một ZIP chứa XML + JSON.
 *
 * Phạm vi có chủ đích:
 * - Đọc: hỗ trợ entry `stored` (method 0) và `deflate` (method 8) — hai method mà mọi
 *   slicer họ Orca dùng khi ghi 3mf.
 * - Ghi: chỉ `stored`. File 3mf hình học nặng hơn bản nén, nhưng bù lại không cần
 *   `CompressionStream` (Safari cũ thiếu) và mọi slicer đều đọc được ZIP không nén.
 * - KHÔNG hỗ trợ ZIP64 và entry có mật khẩu → throw Error rõ ràng thay vì đọc sai.
 */

const SIGNATURE_LOCAL_FILE = 0x04034b50;
const SIGNATURE_CENTRAL_FILE = 0x02014b50;
const SIGNATURE_END_OF_CENTRAL_DIR = 0x06054b50;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** Kích thước cố định của các record trong đặc tả ZIP. */
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_OF_CENTRAL_DIR_SIZE = 22;

/** 1980-01-01 00:00 — giờ cố định để cùng đầu vào luôn cho ra cùng byte (test được). */
const FIXED_DOS_TIME = 0;
const FIXED_DOS_DATE = 0x0021;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Tìm record End Of Central Directory — nằm ở cuối file, có thể bị comment đẩy lên. */
function findEndOfCentralDir(bytes: Uint8Array): number {
  const view = viewOf(bytes);
  const earliest = Math.max(0, bytes.length - END_OF_CENTRAL_DIR_SIZE - 0xffff);
  for (let offset = bytes.length - END_OF_CENTRAL_DIR_SIZE; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === SIGNATURE_END_OF_CENTRAL_DIR) return offset;
  }
  throw new Error('File này không phải archive ZIP hợp lệ (không tìm thấy bảng mục lục).');
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt này không hỗ trợ giải nén file (DecompressionStream).');
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Đọc toàn bộ entry của một archive ZIP.
 * Bỏ qua entry là thư mục (tên kết thúc bằng `/`) vì 3mf không cần chúng.
 */
export async function readZipEntries(bytes: Uint8Array): Promise<ArchiveFile[]> {
  const view = viewOf(bytes);
  const endOffset = findEndOfCentralDir(bytes);

  const entryCount = view.getUint16(endOffset + 10, true);
  const centralDirOffset = view.getUint32(endOffset + 16, true);

  if (entryCount === 0xffff || centralDirOffset === 0xffffffff) {
    throw new Error('File dùng định dạng ZIP64 — app chưa đọc được loại này.');
  }

  const files: ArchiveFile[] = [];
  let cursor = centralDirOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + CENTRAL_HEADER_SIZE > bytes.length) {
      throw new Error('Bảng mục lục của file ZIP bị cắt giữa — file có thể tải lỗi.');
    }
    if (view.getUint32(cursor, true) !== SIGNATURE_CENTRAL_FILE) {
      throw new Error('Bảng mục lục của file ZIP bị hỏng.');
    }

    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const path = textDecoder.decode(
      bytes.subarray(cursor + CENTRAL_HEADER_SIZE, cursor + CENTRAL_HEADER_SIZE + nameLength),
    );

    cursor += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;

    if (path.endsWith('/')) continue;

    // Bit 0 = entry được mã hoá bằng mật khẩu
    if (flags & 0x0001) {
      throw new Error(`File "${path}" trong archive có mật khẩu — app không mở được.`);
    }
    if (view.getUint32(localOffset, true) !== SIGNATURE_LOCAL_FILE) {
      throw new Error(`Không đọc được vị trí của "${path}" trong archive.`);
    }

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + LOCAL_HEADER_SIZE + localNameLength + localExtraLength;
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);

    if (method === METHOD_STORED) {
      files.push({ path, bytes: raw.slice() });
    } else if (method === METHOD_DEFLATE) {
      files.push({ path, bytes: await inflateRaw(raw) });
    } else {
      throw new Error(`File "${path}" dùng kiểu nén ${method} mà app chưa đọc được.`);
    }
  }

  return files;
}

/** Ghi archive ZIP không nén (method `stored`). */
export function writeStoredZip(files: ArchiveFile[]): Uint8Array {
  const encodedNames = files.map((file) => textEncoder.encode(file.path));

  const localSize = files.reduce(
    (total, file, index) =>
      total + LOCAL_HEADER_SIZE + encodedNames[index]!.length + file.bytes.length,
    0,
  );
  const centralSize = encodedNames.reduce(
    (total, name) => total + CENTRAL_HEADER_SIZE + name.length,
    0,
  );

  const output = new Uint8Array(localSize + centralSize + END_OF_CENTRAL_DIR_SIZE);
  const view = viewOf(output);

  const localOffsets: number[] = [];
  const checksums: number[] = [];
  let offset = 0;

  files.forEach((file, index) => {
    const name = encodedNames[index]!;
    const checksum = crc32(file.bytes);
    localOffsets.push(offset);
    checksums.push(checksum);

    view.setUint32(offset, SIGNATURE_LOCAL_FILE, true);
    view.setUint16(offset + 4, 20, true); // version cần để giải nén
    view.setUint16(offset + 6, 0x0800, true); // bit 11: tên file là UTF-8
    view.setUint16(offset + 8, METHOD_STORED, true);
    view.setUint16(offset + 10, FIXED_DOS_TIME, true);
    view.setUint16(offset + 12, FIXED_DOS_DATE, true);
    view.setUint32(offset + 14, checksum, true);
    view.setUint32(offset + 18, file.bytes.length, true);
    view.setUint32(offset + 22, file.bytes.length, true);
    view.setUint16(offset + 26, name.length, true);
    view.setUint16(offset + 28, 0, true); // không dùng extra field

    output.set(name, offset + LOCAL_HEADER_SIZE);
    output.set(file.bytes, offset + LOCAL_HEADER_SIZE + name.length);
    offset += LOCAL_HEADER_SIZE + name.length + file.bytes.length;
  });

  const centralDirOffset = offset;

  files.forEach((file, index) => {
    const name = encodedNames[index]!;

    view.setUint32(offset, SIGNATURE_CENTRAL_FILE, true);
    view.setUint16(offset + 4, 20, true); // version đã dùng để ghi
    view.setUint16(offset + 6, 20, true); // version cần để giải nén
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, METHOD_STORED, true);
    view.setUint16(offset + 12, FIXED_DOS_TIME, true);
    view.setUint16(offset + 14, FIXED_DOS_DATE, true);
    view.setUint32(offset + 16, checksums[index]!, true);
    view.setUint32(offset + 20, file.bytes.length, true);
    view.setUint32(offset + 24, file.bytes.length, true);
    view.setUint16(offset + 28, name.length, true);
    view.setUint16(offset + 30, 0, true); // extra
    view.setUint16(offset + 32, 0, true); // comment
    view.setUint16(offset + 34, 0, true); // số đĩa
    view.setUint16(offset + 36, 0, true); // thuộc tính nội bộ
    view.setUint32(offset + 38, 0, true); // thuộc tính ngoài
    view.setUint32(offset + 42, localOffsets[index]!, true);

    output.set(name, offset + CENTRAL_HEADER_SIZE);
    offset += CENTRAL_HEADER_SIZE + name.length;
  });

  view.setUint32(offset, SIGNATURE_END_OF_CENTRAL_DIR, true);
  view.setUint16(offset + 4, 0, true); // số đĩa hiện tại
  view.setUint16(offset + 6, 0, true); // đĩa chứa bảng mục lục
  view.setUint16(offset + 8, files.length, true);
  view.setUint16(offset + 10, files.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, centralDirOffset, true);
  view.setUint16(offset + 20, 0, true); // độ dài comment

  return output;
}
