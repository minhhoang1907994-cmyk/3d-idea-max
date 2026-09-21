import type {
  CompanyNote,
  CompanyProduct,
  ExpenseEntry,
  FinishedGood,
  IncomeEntry,
} from '../types';
import companyExpensesJson from './json/companyExpenses.json';
import companyFinishedGoodsJson from './json/companyFinishedGoods.json';
import companyIncomesJson from './json/companyIncomes.json';
import companyNotesJson from './json/companyNotes.json';
import companyProductsJson from './json/companyProducts.json';

/**
 * Sổ công ty đóng gói sẵn trong bundle — giá trị mặc định khi Neon chưa trả lời.
 *
 * Nội dung gốc lấy từ file Excel "H2T-Cobra Company.xlsx" (4 sheet: Tổng Chi,
 * Tổng Thu, Note, Sản Phẩm); "Thành phẩm" là tab thêm sau, không có trong Excel nên
 * file JSON của nó khởi đầu rỗng. Nguồn sự thật sau khi chạy là Neon; các file JSON
 * ở đây là bản gốc để khôi phục khi có người ghi đè bừa — xem docs/neon-setup.md.
 */
export type CompanyData = {
  expenses: ExpenseEntry[];
  incomes: IncomeEntry[];
  notes: CompanyNote[];
  products: CompanyProduct[];
  finishedGoods: FinishedGood[];
};

export const BUNDLED_COMPANY_DATA: CompanyData = {
  expenses: companyExpensesJson,
  incomes: companyIncomesJson,
  notes: companyNotesJson,
  products: companyProductsJson,
  finishedGoods: companyFinishedGoodsJson,
};

/** Tên file JSON trong `src/data/json/` — khớp tên document trên Neon. */
export const COMPANY_DATA_FILES = {
  companyExpenses: 'companyExpenses.json',
  companyIncomes: 'companyIncomes.json',
  companyNotes: 'companyNotes.json',
  companyProducts: 'companyProducts.json',
  companyFinishedGoods: 'companyFinishedGoods.json',
} as const;

export function cloneCompanyData(data: CompanyData): CompanyData {
  return structuredClone(data);
}
