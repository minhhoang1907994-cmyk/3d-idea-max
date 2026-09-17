import { describe, expect, it } from 'vitest';
import type { CompanyData } from '../data/companyData';
import { mergeCompanyDocuments, splitCompanyDocuments } from './companyDocuments';

const FALLBACK: CompanyData = {
  expenses: [
    {
      id: 'exp-1',
      month: '2026-09',
      name: 'PLA',
      link: '',
      quantity: '6',
      amount: null,
      date: '',
      imageUrl: '',
    },
  ],
  incomes: [{ id: 'inc-1', month: '2026-09', source: 'vốn', note: '', amount: 3000000 }],
  notes: [{ id: 'note-1', type: 'Trick', link: 'https://a.b', description: 'x' }],
  products: [{ id: 'prod-1', name: 'Benchy', quantity: '1', description: '' }],
};

describe('mergeCompanyDocuments', () => {
  it('lấy nội dung trên Neon đè lên bản đóng gói sẵn', () => {
    const result = mergeCompanyDocuments(
      [{ name: 'companyNotes', content: [{ id: 'note-9' }], version: 4 }],
      FALLBACK,
    );

    expect(result.data.notes).toEqual([{ id: 'note-9' }]);
    expect(result.versions.companyNotes).toBe(4);
    // Phần không có trên Neon giữ nguyên bản đóng gói sẵn
    expect(result.data.products).toEqual(FALLBACK.products);
  });

  it('mảng rỗng là dữ liệu hợp lệ — người dùng vừa xoá hết dòng, không được hồi sinh bản cũ', () => {
    const result = mergeCompanyDocuments(
      [{ name: 'companyExpenses', content: [], version: 2 }],
      FALLBACK,
    );

    expect(result.data.expenses).toEqual([]);
    expect(result.versions.companyExpenses).toBe(2);
    expect(result.missing).not.toContain('companyExpenses');
  });

  it('liệt kê document chưa có trên Neon', () => {
    const result = mergeCompanyDocuments([], FALLBACK);

    expect(result.missing).toEqual([
      'companyExpenses',
      'companyIncomes',
      'companyNotes',
      'companyProducts',
    ]);
    expect(result.versions).toEqual({});
  });

  it('coi nội dung không phải mảng là thiếu thay vì nhét vào state', () => {
    const result = mergeCompanyDocuments(
      [{ name: 'companyIncomes', content: { hỏng: true }, version: 1 }],
      FALLBACK,
    );

    expect(result.missing).toContain('companyIncomes');
    expect(result.data.incomes).toEqual(FALLBACK.incomes);
  });

  it('không sửa vào đối tượng fallback', () => {
    const result = mergeCompanyDocuments([], FALLBACK);
    result.data.expenses.push({
      id: 'exp-2',
      month: '2026-10',
      name: '',
      link: '',
      quantity: '',
      amount: null,
      date: '',
      imageUrl: '',
    });

    expect(FALLBACK.expenses).toHaveLength(1);
  });
});

describe('splitCompanyDocuments', () => {
  it('tách đúng 4 document theo tên dùng trên Neon', () => {
    expect(splitCompanyDocuments(FALLBACK)).toEqual({
      companyExpenses: FALLBACK.expenses,
      companyIncomes: FALLBACK.incomes,
      companyNotes: FALLBACK.notes,
      companyProducts: FALLBACK.products,
    });
  });
});
