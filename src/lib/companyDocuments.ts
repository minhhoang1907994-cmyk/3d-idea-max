/**
 * Chuyển đổi giữa Sổ công ty của app (CompanyData) và 5 document lưu trên Neon.
 *
 * Cùng cách làm với lib/ideaDocuments.ts: tên document trùng khoá của
 * COMPANY_DATA_FILES nên một document tương ứng đúng một file JSON trong
 * src/data/json/, kéo về hay đẩy lên đều không phải ánh xạ tay.
 */

import type { CompanyData } from '../data/companyData';
import { cloneCompanyData } from '../data/companyData';
import type { CompanyDocumentName, StoredDocument } from './neonStore';
import { COMPANY_DOCUMENT_NAMES } from './neonStore';

/** Trường trong CompanyData ứng với từng document. */
const FIELD_BY_DOCUMENT: Record<CompanyDocumentName, keyof CompanyData> = {
  companyExpenses: 'expenses',
  companyIncomes: 'incomes',
  companyNotes: 'notes',
  companyProducts: 'products',
  companyFinishedGoods: 'finishedGoods',
};

export type CompanyDocumentVersions = Partial<Record<CompanyDocumentName, number>>;

export type CompanyMergeResult = {
  data: CompanyData;
  versions: CompanyDocumentVersions;
  /** Document chưa có trên Neon — phần đó đang dùng bản đóng gói sẵn, chưa ghi lên được */
  missing: CompanyDocumentName[];
};

/**
 * Ghép document tải từ Neon lên trên bản đóng gói sẵn.
 *
 * Khác ideaDocuments.mergeDocuments ở một chỗ: mảng RỖNG ở đây là dữ liệu hợp lệ
 * ("tháng này chưa chi đồng nào"), không phải "chưa có dữ liệu" — nếu coi rỗng là
 * thiếu rồi rơi về bundle thì dòng người dùng vừa xoá sẽ sống lại sau khi tải lại trang.
 */
export function mergeCompanyDocuments(
  documents: readonly StoredDocument[],
  fallback: CompanyData,
): CompanyMergeResult {
  const data = cloneCompanyData(fallback);
  const versions: CompanyDocumentVersions = {};
  const missing: CompanyDocumentName[] = [];

  const byName = new Map(documents.map((document) => [document.name, document]));

  for (const name of COMPANY_DOCUMENT_NAMES) {
    const document = byName.get(name);
    if (!document || !Array.isArray(document.content)) {
      missing.push(name);
      continue;
    }
    // Ép kiểu ở đúng một chỗ: nội dung từ mạng không kiểm được ở compile time
    (data[FIELD_BY_DOCUMENT[name]] as unknown) = document.content;
    versions[name] = document.version;
  }

  return { data, versions, missing };
}

/** Tách CompanyData thành nội dung từng document để đẩy lên Neon hoặc ghi ra file. */
export function splitCompanyDocuments(data: CompanyData): Record<CompanyDocumentName, unknown> {
  const result = {} as Record<CompanyDocumentName, unknown>;
  for (const name of COMPANY_DOCUMENT_NAMES) {
    result[name] = data[FIELD_BY_DOCUMENT[name]];
  }
  return result;
}
