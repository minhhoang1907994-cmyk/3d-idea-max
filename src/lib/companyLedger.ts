/**
 * Pure function cho Sổ công ty: gom tháng, cộng tiền, định dạng số, sinh id.
 *
 * Không import React, không gọi `Math.random()` trực tiếp (nhận `random` làm tham số)
 * để test được — xem CLAUDE.md > Quy tắc của project.
 */

import type {
  CompanyNote,
  CompanyProduct,
  ExpenseEntry,
  RevenueEntry,
  IncomeEntry,
} from '../types';

/** Đủ để gom danh sách tháng — không cần biết dòng đó là thu, chi hay doanh thu. */
type MonthRow = { month: string };

/** Tổng hợp một tháng (hoặc toàn bộ khi `month` là ALL_MONTHS). */
export type LedgerSummary = {
  expenseTotal: number;
  incomeTotal: number;
  /** Thu trừ chi — âm nghĩa là đang lỗ */
  balance: number;
  expenseCount: number;
  incomeCount: number;
  /** Số dòng chưa điền tiền — chúng KHÔNG được cộng vào tổng, nên phải nói rõ */
  missingAmountCount: number;
};

/** Giá trị đặc biệt của bộ lọc tháng: xem tất cả các tháng. */
export const ALL_MONTHS = 'all';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 'YYYY-MM' của thời điểm truyền vào (mặc định: bây giờ). */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' → 'YYYY-MM'. Chuỗi không đúng dạng ngày trả về rỗng. */
export function monthOfDate(date: string): string {
  const month = date.slice(0, 7);
  return MONTH_PATTERN.test(month) ? month : '';
}

/** '2026-09' → 'Tháng 9/2026'. Chuỗi lạ giữ nguyên để không giấu dữ liệu hỏng. */
export function formatMonthLabel(month: string): string {
  if (!MONTH_PATTERN.test(month)) return month;
  const [year, monthPart] = month.split('-');
  return `Tháng ${Number(monthPart)}/${year}`;
}

/**
 * Danh sách tháng có trong sổ, mới nhất trước. Luôn kèm `extraMonth` (tháng đang
 * chọn / tháng hiện tại) để tháng vừa tạo chưa có dòng nào vẫn chọn được.
 */
export function listMonths(rows: readonly MonthRow[], extraMonth?: string): string[] {
  const months = new Set<string>();
  for (const row of rows) {
    if (MONTH_PATTERN.test(row.month)) months.add(row.month);
  }
  if (extraMonth && MONTH_PATTERN.test(extraMonth)) months.add(extraMonth);
  return [...months].sort().reverse();
}

/** Lọc theo tháng. `ALL_MONTHS` trả về nguyên danh sách. */
export function filterByMonth<T extends { month: string }>(rows: readonly T[], month: string): T[] {
  if (month === ALL_MONTHS) return [...rows];
  return rows.filter((row) => row.month === month);
}

/** Cộng tiền, bỏ qua dòng chưa điền giá (`null`). */
export function sumAmounts(rows: readonly { amount: number | null }[]): number {
  return rows.reduce((total, row) => total + (row.amount ?? 0), 0);
}

/** Tổng hợp thu/chi của một tháng. */
export function summarizeLedger(
  expenses: readonly ExpenseEntry[],
  incomes: readonly IncomeEntry[],
  month: string,
): LedgerSummary {
  const monthExpenses = filterByMonth(expenses, month);
  const monthIncomes = filterByMonth(incomes, month);
  const expenseTotal = sumAmounts(monthExpenses);
  const incomeTotal = sumAmounts(monthIncomes);

  return {
    expenseTotal,
    incomeTotal,
    balance: incomeTotal - expenseTotal,
    expenseCount: monthExpenses.length,
    incomeCount: monthIncomes.length,
    missingAmountCount: [...monthExpenses, ...monthIncomes].filter((row) => row.amount === null)
      .length,
  };
}

/** Định dạng tiền Việt: 6425000 → "6.425.000 ₫". `null` → "chưa có". */
export function formatVnd(amount: number | null): string {
  if (amount === null) return 'chưa có';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
}

/** Số dạng thô cho ô đang sửa: 6425000 → "6425000", null → "". */
export function formatAmountForEdit(amount: number | null): string {
  return amount === null ? '' : String(amount);
}

/**
 * Đọc số tiền người dùng gõ. Chấp nhận dấu phân cách quen tay ("6.425.000",
 * "6,425,000", "6 425 000 đ").
 *
 * Rỗng → `null` (chưa biết giá). Không đọc được → ném Error để UI báo ngay,
 * KHÔNG âm thầm coi như 0 — số 0 trong sổ tiền là một khẳng định sai.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[.,\s₫]|đ$/gi, '').trim();
  if (cleaned.length === 0) return null;
  if (!/^-?\d+$/.test(cleaned)) {
    throw new Error(`"${raw}" không phải số tiền đọc được.`);
  }
  return Number(cleaned);
}

/** Text có phải link mở được không — quyết định hiển thị thành <a> hay chữ thường. */
export function isHttpLink(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/**
 * Sinh id cho dòng mới. Ghép thời gian và phần ngẫu nhiên nên hai người thêm dòng
 * cùng lúc trên hai máy vẫn không trùng id.
 */
export function createEntryId(
  prefix: string,
  random: () => number = Math.random,
  now: () => number = Date.now,
): string {
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  return `${prefix}-${now().toString(36)}-${suffix}`;
}

/** Dòng chi trống cho tháng đang chọn. */
export function createExpenseEntry(month: string, id: string): ExpenseEntry {
  return { id, month, name: '', link: '', quantity: '', amount: null, date: '', imageUrl: '' };
}

/** Dòng thu trống cho tháng đang chọn. */
export function createIncomeEntry(month: string, id: string): IncomeEntry {
  return { id, month, source: '', note: '', amount: null };
}

export function createCompanyNote(id: string): CompanyNote {
  return { id, type: '', link: '', description: '' };
}

export function createCompanyProduct(id: string): CompanyProduct {
  return { id, name: '', quantity: '', description: '' };
}

/** Dòng doanh thu trống cho tháng đang chọn. */
export function createRevenueEntry(month: string, id: string): RevenueEntry {
  return {
    id,
    month,
    name: '',
    quantity: '',
    description: '',
    price: null,
    date: '',
    imageUrl: '',
  };
}

/**
 * Tổng giá bán của danh sách doanh thu. Dòng chưa điền giá (`null`) bị bỏ qua,
 * giống `sumAmounts` — số 0 ở đây là khẳng định "bán không đồng nào", không phải "chưa biết".
 */
export function sumRevenuePrices(rows: readonly RevenueEntry[]): number {
  return rows.reduce((total, row) => total + (row.price ?? 0), 0);
}
