/**
 * Chuyển đổi giữa bộ dữ liệu ý tưởng của app (IdeaData) và 7 document lưu trên Neon.
 *
 * Tên document trùng với khoá của DATA_FILES trong data/bundledData.ts, nên một
 * document tương ứng đúng một file JSON trong src/data/json/ — kéo về hay đẩy
 * lên đều không phải ánh xạ tay.
 */

import type { IdeaData } from '../data/bundledData';
import { cloneData } from '../data/bundledData';
import type { DocumentName, StoredDocument } from './neonDataApi';
import { DOCUMENT_NAMES } from './neonDataApi';

/** Trường trong IdeaData ứng với từng document. */
const FIELD_BY_DOCUMENT: Record<DocumentName, keyof IdeaData> = {
  categories: 'categories',
  attributes: 'attributeAxes',
  technicalAxes: 'technicalAxes',
  mechanisms: 'mechanisms',
  characters: 'characters',
  personalizations: 'personalizations',
  fusionFormulas: 'fusionFormulas',
};

export type DocumentVersions = Partial<Record<DocumentName, number>>;

export type MergeResult = {
  data: IdeaData;
  versions: DocumentVersions;
  /** Document không có trên server — phần đó vẫn dùng dữ liệu đóng gói sẵn */
  missing: DocumentName[];
};

/**
 * Ghép document tải từ Neon lên trên dữ liệu đóng gói sẵn.
 *
 * Document thiếu hoặc rỗng thì giữ nguyên phần tương ứng của `fallback` thay vì
 * để trống — thiếu một axis là mọi lần Mix đều lỗi, còn dùng bản cũ thì app vẫn chạy.
 */
export function mergeDocuments(
  documents: readonly StoredDocument[],
  fallback: IdeaData,
): MergeResult {
  const data = cloneData(fallback);
  const versions: DocumentVersions = {};
  const missing: DocumentName[] = [];

  const byName = new Map(documents.map((document) => [document.name, document]));

  for (const name of DOCUMENT_NAMES) {
    const document = byName.get(name);
    if (!document || !isUsableContent(document.content)) {
      missing.push(name);
      continue;
    }
    // Ép kiểu ở đúng một chỗ: nội dung từ mạng không kiểm được ở compile time,
    // nên chỉ chấp nhận sau khi isUsableContent đã loại null/mảng rỗng.
    (data[FIELD_BY_DOCUMENT[name]] as unknown) = document.content;
    versions[name] = document.version;
  }

  return { data, versions, missing };
}

/** Tách IdeaData thành nội dung từng document để đẩy lên Neon hoặc ghi ra file. */
export function splitDocuments(data: IdeaData): Record<DocumentName, unknown> {
  const result = {} as Record<DocumentName, unknown>;
  for (const name of DOCUMENT_NAMES) {
    result[name] = data[FIELD_BY_DOCUMENT[name]];
  }
  return result;
}

/** Nội dung dùng được: object hoặc mảng có phần tử. Mảng rỗng coi như chưa có dữ liệu. */
function isUsableContent(content: unknown): boolean {
  if (content === null || typeof content !== 'object') return false;
  if (Array.isArray(content)) return content.length > 0;
  return Object.keys(content).length > 0;
}
