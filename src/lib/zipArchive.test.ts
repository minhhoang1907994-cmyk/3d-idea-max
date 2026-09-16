import { describe, expect, it } from 'vitest';
import { crc32, readZipEntries, writeStoredZip } from './zipArchive';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytes(text: string): Uint8Array {
  return encoder.encode(text);
}

describe('crc32', () => {
  it('khớp giá trị chuẩn của chuỗi "123456789"', () => {
    // Giá trị kiểm chứng quen dùng của CRC-32/ISO-HDLC
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
  });

  it('chuỗi rỗng cho 0', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('writeStoredZip + readZipEntries', () => {
  it('ghi rồi đọc lại ra đúng nội dung', async () => {
    const archive = writeStoredZip([
      { path: '[Content_Types].xml', bytes: bytes('<Types />') },
      { path: '3D/3dmodel.model', bytes: bytes('<model>xin chào</model>') },
    ]);

    const entries = await readZipEntries(archive);

    expect(entries.map((entry) => entry.path)).toEqual(['[Content_Types].xml', '3D/3dmodel.model']);
    expect(decoder.decode(entries[1]!.bytes)).toBe('<model>xin chào</model>');
  });

  it('cùng đầu vào cho ra đúng cùng byte — không nhét timestamp vào file', () => {
    const files = [{ path: 'a.txt', bytes: bytes('nội dung') }];
    expect(writeStoredZip(files)).toEqual(writeStoredZip(files));
  });

  it('đọc được entry nén deflate (file thật do slicer ghi ra đều nén)', async () => {
    const original = bytes('x'.repeat(5000));
    const deflated = new Uint8Array(
      await new Response(
        new Blob([original as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw')),
      ).arrayBuffer(),
    );

    const entries = await readZipEntries(buildDeflatedZip('big.txt', original, deflated));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.bytes).toEqual(original);
  });

  it('báo lỗi rõ ràng khi file không phải ZIP', async () => {
    await expect(readZipEntries(bytes('không phải zip'))).rejects.toThrow(/không phải archive ZIP/);
  });

  it('bỏ qua entry là thư mục', async () => {
    const archive = writeStoredZip([
      { path: 'Metadata/', bytes: new Uint8Array(0) },
      { path: 'Metadata/slice_info.config', bytes: bytes('x') },
    ]);

    const entries = await readZipEntries(archive);

    expect(entries.map((entry) => entry.path)).toEqual(['Metadata/slice_info.config']);
  });
});

/**
 * Dựng tay một ZIP có đúng một entry nén deflate — `writeStoredZip` chỉ ghi kiểu stored,
 * nên muốn test nhánh giải nén thì phải tự dựng.
 */
function buildDeflatedZip(path: string, original: Uint8Array, deflated: Uint8Array): Uint8Array {
  const name = encoder.encode(path);
  const localSize = 30 + name.length + deflated.length;
  const centralSize = 46 + name.length;
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  const checksum = crc32(original);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(8, 8, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, deflated.length, true);
  view.setUint32(22, original.length, true);
  view.setUint16(26, name.length, true);
  output.set(name, 30);
  output.set(deflated, 30 + name.length);

  let offset = localSize;
  view.setUint32(offset, 0x02014b50, true);
  view.setUint16(offset + 6, 20, true);
  view.setUint16(offset + 10, 8, true);
  view.setUint32(offset + 16, checksum, true);
  view.setUint32(offset + 20, deflated.length, true);
  view.setUint32(offset + 24, original.length, true);
  view.setUint16(offset + 28, name.length, true);
  view.setUint32(offset + 42, 0, true);
  output.set(name, offset + 46);

  offset += centralSize;
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, 1, true);
  view.setUint16(offset + 10, 1, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, localSize, true);

  return output;
}
