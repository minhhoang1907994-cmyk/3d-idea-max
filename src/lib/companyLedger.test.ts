import { describe, expect, it } from 'vitest';
import type { ExpenseEntry, IncomeEntry } from '../types';
import {
  ALL_MONTHS,
  createEntryId,
  createExpenseEntry,
  createRevenueEntry,
  currentMonth,
  filterByMonth,
  formatAmountForEdit,
  formatMonthLabel,
  formatVnd,
  isHttpLink,
  listMonths,
  monthOfDate,
  parseAmountInput,
  sumAmounts,
  sumRevenuePrices,
  summarizeLedger,
} from './companyLedger';

function expense(id: string, month: string, amount: number | null): ExpenseEntry {
  return { id, month, name: id, link: '', quantity: '1', amount, date: '', imageUrl: '' };
}

function income(id: string, month: string, amount: number | null): IncomeEntry {
  return { id, month, source: id, note: '', amount };
}

describe('currentMonth', () => {
  it('trả về YYYY-MM có đệm số 0', () => {
    expect(currentMonth(new Date(2026, 0, 5))).toBe('2026-01');
    expect(currentMonth(new Date(2026, 8, 17))).toBe('2026-09');
  });
});

describe('monthOfDate', () => {
  it('cắt YYYY-MM từ ngày', () => {
    expect(monthOfDate('2026-09-17')).toBe('2026-09');
  });

  it('trả rỗng khi không phải ngày hợp lệ', () => {
    expect(monthOfDate('')).toBe('');
    expect(monthOfDate('17/09/2026')).toBe('');
    expect(monthOfDate('2026-13-01')).toBe('');
  });
});

describe('formatMonthLabel', () => {
  it('đọc thành tiếng Việt', () => {
    expect(formatMonthLabel('2026-09')).toBe('Tháng 9/2026');
  });

  it('giữ nguyên chuỗi lạ thay vì giấu dữ liệu hỏng', () => {
    expect(formatMonthLabel('linh tinh')).toBe('linh tinh');
  });
});

describe('listMonths', () => {
  it('gom tháng không trùng, mới nhất trước', () => {
    const rows = [
      expense('a', '2026-09', 1),
      expense('b', '2026-10', 1),
      expense('c', '2026-09', 1),
    ];
    expect(listMonths(rows)).toEqual(['2026-10', '2026-09']);
  });

  it('thêm tháng đang chọn dù chưa có dòng nào', () => {
    expect(listMonths([expense('a', '2026-09', 1)], '2026-11')).toEqual(['2026-11', '2026-09']);
  });

  it('bỏ qua tháng không đúng định dạng', () => {
    expect(listMonths([expense('a', '', 1), expense('b', '2026-09', 1)])).toEqual(['2026-09']);
  });
});

describe('filterByMonth', () => {
  const rows = [expense('a', '2026-09', 1), expense('b', '2026-10', 1)];

  it('lọc đúng tháng', () => {
    expect(filterByMonth(rows, '2026-10').map((row) => row.id)).toEqual(['b']);
  });

  it('ALL_MONTHS trả về hết', () => {
    expect(filterByMonth(rows, ALL_MONTHS)).toHaveLength(2);
  });
});

describe('sumAmounts', () => {
  it('bỏ qua dòng chưa điền tiền thay vì coi là 0 tuyệt đối', () => {
    expect(sumAmounts([{ amount: 100 }, { amount: null }, { amount: 50 }])).toBe(150);
  });

  it('mảng rỗng ra 0', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('summarizeLedger', () => {
  const expenses = [
    expense('e1', '2026-09', 6425000),
    expense('e2', '2026-09', null),
    expense('e3', '2026-10', 100000),
  ];
  const incomes = [income('i1', '2026-09', 9000000), income('i2', '2026-10', 500000)];

  it('cộng đúng tổng của tháng đang xem', () => {
    const summary = summarizeLedger(expenses, incomes, '2026-09');

    expect(summary.expenseTotal).toBe(6425000);
    expect(summary.incomeTotal).toBe(9000000);
    expect(summary.balance).toBe(2575000);
    expect(summary.expenseCount).toBe(2);
    expect(summary.incomeCount).toBe(1);
  });

  it('đếm số dòng chưa điền tiền để UI nói rõ tổng còn thiếu', () => {
    expect(summarizeLedger(expenses, incomes, '2026-09').missingAmountCount).toBe(1);
  });

  it('balance âm khi chi nhiều hơn thu', () => {
    expect(summarizeLedger(expenses, incomes, '2026-10').balance).toBe(400000);
    expect(summarizeLedger([expense('e', '2026-11', 300)], [], '2026-11').balance).toBe(-300);
  });

  it('ALL_MONTHS cộng toàn bộ sổ', () => {
    const summary = summarizeLedger(expenses, incomes, ALL_MONTHS);
    expect(summary.expenseTotal).toBe(6525000);
    expect(summary.incomeTotal).toBe(9500000);
  });
});

describe('formatVnd', () => {
  it('ngăn cách nghìn theo kiểu Việt', () => {
    expect(formatVnd(6425000)).toBe('6.425.000 ₫');
  });

  it('null là "chưa có", không phải 0', () => {
    expect(formatVnd(null)).toBe('chưa có');
  });
});

describe('formatAmountForEdit', () => {
  it('cho ra số thô để gõ tiếp', () => {
    expect(formatAmountForEdit(6425000)).toBe('6425000');
    expect(formatAmountForEdit(null)).toBe('');
  });
});

describe('parseAmountInput', () => {
  it('đọc được số gõ kèm dấu phân cách quen tay', () => {
    expect(parseAmountInput('6425000')).toBe(6425000);
    expect(parseAmountInput('6.425.000')).toBe(6425000);
    expect(parseAmountInput('6,425,000')).toBe(6425000);
    expect(parseAmountInput('6 425 000 ₫')).toBe(6425000);
  });

  it('rỗng nghĩa là chưa biết giá', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('   ')).toBeNull();
  });

  it('ném lỗi khi không đọc được, KHÔNG âm thầm trả 0', () => {
    expect(() => parseAmountInput('abc')).toThrow('không phải số tiền');
    expect(() => parseAmountInput('12k')).toThrow();
  });
});

describe('isHttpLink', () => {
  it('nhận link http/https', () => {
    expect(isHttpLink('https://shopee.vn/abc')).toBe(true);
    expect(isHttpLink('  http://a.b/c  ')).toBe(true);
  });

  it('chữ thường không phải link', () => {
    expect(isHttpLink('Cute Ghost in Pumpkin - MakerWorld')).toBe(false);
    expect(isHttpLink('')).toBe(false);
  });
});

describe('createEntryId', () => {
  it('ghép prefix, thời gian và phần ngẫu nhiên', () => {
    const id = createEntryId(
      'exp',
      () => 0.5,
      () => 1_700_000_000_000,
    );
    expect(id.startsWith('exp-')).toBe(true);
    expect(id.split('-')).toHaveLength(3);
  });

  it('hai lần gọi cùng thời điểm vẫn khác nhau khi random khác nhau', () => {
    const now = () => 1_700_000_000_000;
    expect(createEntryId('exp', () => 0.1, now)).not.toBe(createEntryId('exp', () => 0.9, now));
  });
});

describe('createExpenseEntry', () => {
  it('dòng mới nhận tháng đang xem và chưa có giá', () => {
    const row = createExpenseEntry('2026-10', 'exp-1');
    expect(row).toEqual({
      id: 'exp-1',
      month: '2026-10',
      name: '',
      link: '',
      quantity: '',
      amount: null,
      date: '',
      imageUrl: '',
    });
  });
});

describe('sumRevenuePrices', () => {
  const good = (id: string, price: number | null) => ({
    id,
    month: '2026-09',
    name: '',
    quantity: '',
    description: '',
    price,
    date: '',
    imageUrl: '',
  });

  it('cộng giá bán của mọi dòng', () => {
    expect(sumRevenuePrices([good('fg-1', 40000), good('fg-2', 15000)])).toBe(55000);
  });

  it('bỏ qua dòng chưa điền giá thay vì coi là 0', () => {
    expect(sumRevenuePrices([good('fg-1', 40000), good('fg-2', null)])).toBe(40000);
  });

  it('danh sách rỗng ra 0', () => {
    expect(sumRevenuePrices([])).toBe(0);
  });

  it('lọc tháng trước rồi mới cộng — tổng phải theo tháng đang xem', () => {
    const goods = [
      { ...good('fg-1', 40000), month: '2026-09' },
      { ...good('fg-2', 15000), month: '2026-10' },
    ];
    expect(sumRevenuePrices(filterByMonth(goods, '2026-09'))).toBe(40000);
    expect(sumRevenuePrices(filterByMonth(goods, ALL_MONTHS))).toBe(55000);
  });
});

describe('createRevenueEntry', () => {
  it('dòng mới nhận tháng đang xem và chưa có giá bán', () => {
    expect(createRevenueEntry('2026-10', 'fg-1')).toEqual({
      id: 'fg-1',
      month: '2026-10',
      name: '',
      quantity: '',
      description: '',
      price: null,
      date: '',
      imageUrl: '',
    });
  });
});
