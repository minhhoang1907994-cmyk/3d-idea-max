import { useMemo, useState } from 'react';
import { EditableTable, type EditableColumn } from '../components/EditableTable';
import type { useCompanyLedger } from '../hooks/useCompanyLedger';
import {
  ALL_MONTHS,
  createCompanyNote,
  createCompanyProduct,
  createEntryId,
  createExpenseEntry,
  createRevenueEntry,
  createIncomeEntry,
  currentMonth,
  filterByMonth,
  formatMonthLabel,
  formatVnd,
  listMonths,
  monthOfDate,
  sumRevenuePrices,
  summarizeLedger,
} from '../lib/companyLedger';
import type {
  CompanyNote,
  CompanyProduct,
  ExpenseEntry,
  RevenueEntry,
  IncomeEntry,
} from '../types';
import styles from './CompanyLedgerPage.module.css';

type Props = { ledger: ReturnType<typeof useCompanyLedger> };

/** Bốn tab đầu tương ứng 4 sheet của file Excel gốc; "Doanh thu" là tab thêm sau. */
type TabId = 'expenses' | 'incomes' | 'notes' | 'products' | 'revenues';

/**
 * Che tổng tiền khi chưa bấm con mắt. Độ dài cố định, không theo số chữ số thật —
 * nếu không, nhìn chuỗi sao cũng đoán được khoản đó cỡ triệu hay cỡ chục triệu.
 */
const MASKED_AMOUNT = '*******';

const TABS: { id: TabId; label: string }[] = [
  { id: 'expenses', label: 'Tổng chi' },
  { id: 'incomes', label: 'Tổng thu' },
  { id: 'notes', label: 'Note' },
  { id: 'products', label: 'Sản phẩm' },
  { id: 'revenues', label: 'Doanh thu' },
];

const EXPENSE_COLUMNS: EditableColumn<ExpenseEntry>[] = [
  { key: 'name', label: 'Tên', width: 'minmax(0, 2fr)', placeholder: 'Cuộn PLA' },
  {
    key: 'link',
    label: 'Link mua',
    kind: 'link',
    width: 'minmax(0, 2fr)',
    placeholder: 'https://',
  },
  { key: 'quantity', label: 'Số lượng', width: '4.5rem', placeholder: '1' },
  { key: 'amount', label: 'Giá', kind: 'amount', width: '7.5rem' },
  { key: 'date', label: 'Ngày', kind: 'date', width: '8.5rem' },
  { key: 'imageUrl', label: 'Hình ảnh', kind: 'image', width: '12.5rem' },
];

const INCOME_COLUMNS: EditableColumn<IncomeEntry>[] = [
  { key: 'source', label: 'Nguồn', width: 'minmax(0, 2fr)', placeholder: 'Hoàng - vốn ban đầu' },
  { key: 'note', label: 'Ghi chú', width: 'minmax(0, 2fr)' },
  { key: 'amount', label: 'Số tiền', kind: 'amount', width: '7.5rem' },
  { key: 'month', label: 'Tháng', kind: 'month', width: '7.5rem' },
];

const PRODUCT_COLUMNS: EditableColumn<CompanyProduct>[] = [
  { key: 'name', label: 'Tên', width: 'minmax(0, 2fr)' },
  { key: 'quantity', label: 'Số lượng', width: '4.5rem', placeholder: '1' },
  {
    key: 'description',
    label: 'Link / mô tả',
    kind: 'link',
    width: 'minmax(0, 3fr)',
    placeholder: 'https://makerworld.com/...',
  },
];

const REVENUE_COLUMNS: EditableColumn<RevenueEntry>[] = [
  { key: 'name', label: 'Tên', width: 'minmax(0, 2fr)' },
  { key: 'quantity', label: 'Số lượng', width: '4.5rem', placeholder: '1' },
  {
    key: 'description',
    label: 'Link / mô tả',
    kind: 'link',
    width: 'minmax(0, 3fr)',
    placeholder: 'https://makerworld.com/...',
  },
  { key: 'price', label: 'Giá bán', kind: 'amount', width: '7.5rem' },
  { key: 'date', label: 'Ngày', kind: 'date', width: '8.5rem' },
  { key: 'month', label: 'Tháng', kind: 'month', width: '7.5rem' },
  {
    key: 'imageUrl',
    label: 'Hình ảnh',
    kind: 'image',
    width: '12.5rem',
    // Dòng doanh thu có cột Tháng nên ảnh xếp vào revenues/<tháng bán>/
    imagePrefix: 'revenues',
  },
];

/** Gõ chữ nào trong ô tìm kiếm cũng so với toàn bộ nội dung dòng, không phân biệt hoa thường. */
function matchesQuery(values: readonly string[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}

export function CompanyLedgerPage({ ledger }: Props) {
  const { data, status } = ledger;
  const [tab, setTab] = useState<TabId>('expenses');
  const [month, setMonth] = useState<string>(() => currentMonth());
  /** Tổng tiền mặc định ẩn — mở web ở quán cà phê thì người bên cạnh không đọc được */
  const [amountsVisible, setAmountsVisible] = useState(false);
  const [noteQuery, setNoteQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [revenueQuery, setRevenueQuery] = useState('');

  const months = useMemo(
    () =>
      listMonths(
        [...data.expenses, ...data.incomes, ...data.revenues],
        month === ALL_MONTHS ? undefined : month,
      ),
    [data.expenses, data.incomes, data.revenues, month],
  );
  const summary = useMemo(
    () => summarizeLedger(data.expenses, data.incomes, month),
    [data.expenses, data.incomes, month],
  );

  const visibleExpenses = useMemo(
    () => filterByMonth(data.expenses, month),
    [data.expenses, month],
  );
  const visibleIncomes = useMemo(() => filterByMonth(data.incomes, month), [data.incomes, month]);
  const visibleNotes = useMemo(
    () =>
      data.notes.filter((note) =>
        matchesQuery([note.type, note.link, note.description], noteQuery),
      ),
    [data.notes, noteQuery],
  );
  const visibleProducts = useMemo(
    () =>
      data.products.filter((product) =>
        matchesQuery([product.name, product.quantity, product.description], productQuery),
      ),
    [data.products, productQuery],
  );

  const visibleRevenues = useMemo(
    () =>
      filterByMonth(data.revenues, month).filter((row) =>
        matchesQuery([row.name, row.quantity, row.description], revenueQuery),
      ),
    [data.revenues, month, revenueQuery],
  );
  /** Tổng theo danh sách đang hiển thị — lọc tháng hay lọc từ khoá thì tổng phải đi theo,
   * nếu không người dùng lọc ra 3 dòng mà vẫn thấy tổng của cả bảng sẽ đọc nhầm. */
  const revenueTotal = useMemo(() => sumRevenuePrices(visibleRevenues), [visibleRevenues]);
  const revenueMissingPriceCount = useMemo(
    () => visibleRevenues.filter((row) => row.price === null).length,
    [visibleRevenues],
  );

  /** Loại note đã có trong sổ — gợi ý để không đẻ thêm biến thể "trick" / "Trick". */
  const noteTypes = useMemo(() => {
    const types = new Set<string>();
    for (const note of data.notes) {
      if (note.type.trim().length > 0) types.add(note.type.trim());
    }
    return [...types].sort();
  }, [data.notes]);

  const noteColumns: EditableColumn<CompanyNote>[] = useMemo(
    () => [
      {
        key: 'type',
        label: 'Loại',
        kind: 'tag',
        width: '8.5rem',
        placeholder: 'Trick',
        suggestions: noteTypes,
      },
      {
        key: 'link',
        label: 'Link',
        kind: 'link',
        width: 'minmax(0, 3fr)',
        placeholder: 'https://',
      },
      { key: 'description', label: 'Mô tả', width: 'minmax(0, 2fr)' },
    ],
    [noteTypes],
  );

  /** Tháng gán cho dòng mới: đang xem "tất cả" thì lấy tháng hiện tại. */
  const monthForNewRow = month === ALL_MONTHS ? currentMonth() : month;

  /**
   * Sửa ngày thì kéo luôn tháng theo — nếu không, dòng chi ngày 01/10 vẫn nằm ở
   * tháng 9 và tổng của cả hai tháng đều sai.
   */
  function changeExpense(id: string, patch: Partial<ExpenseEntry>) {
    const derivedMonth = typeof patch.date === 'string' ? monthOfDate(patch.date) : '';
    ledger.updateRow('expenses', id, derivedMonth ? { ...patch, month: derivedMonth } : patch);
  }

  /** Cùng lý do với changeExpense: sửa ngày bán thì tháng phải đi theo, nếu không dòng
   * đó biến mất khỏi bộ lọc tháng và tổng giá bán của cả hai tháng đều sai. */
  function changeRevenue(id: string, patch: Partial<RevenueEntry>) {
    const derivedMonth = typeof patch.date === 'string' ? monthOfDate(patch.date) : '';
    ledger.updateRow('revenues', id, derivedMonth ? { ...patch, month: derivedMonth } : patch);
  }

  const monthLabel = month === ALL_MONTHS ? 'tất cả các tháng' : formatMonthLabel(month);

  const showAmount = (value: number) => (amountsVisible ? formatVnd(value) : MASKED_AMOUNT);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Sổ công ty</h1>
          <p className={styles.subtitle}>
            Thu, chi, link tư liệu, sản phẩm đã in và doanh thu — thay cho file Excel 4 sheet. Dữ
            liệu lưu trên Neon, bấm <strong>Lưu lên Neon</strong> là cả nhóm mở web đều thấy bản
            mới.
          </p>
          <p className={styles.sourceBadge}>
            {status.loading
              ? 'Đang tải từ Neon…'
              : status.source === 'neon'
                ? 'Nguồn: Neon (online)'
                : 'Nguồn: bản đóng gói trong app'}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!status.online || status.loading}
            onClick={() => void ledger.reload()}
          >
            Tải lại từ Neon
          </button>
          <button type="button" className={styles.secondaryButton} onClick={ledger.downloadAll}>
            Tải JSON về
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!status.dirty || status.saving || !status.online}
            onClick={() => void ledger.save()}
          >
            {status.saving ? 'Đang lưu…' : status.dirty ? 'Lưu lên Neon' : 'Đã lưu'}
          </button>
        </div>
      </header>

      {!status.online ? (
        <p className={styles.banner}>
          Bản build này chưa có chuỗi kết nối Neon (<code>VITE_NEON_DATABASE_URL</code>), nên đang
          chạy bằng dữ liệu đóng gói sẵn — <strong>sửa gì cũng mất khi tải lại trang</strong>. Cách
          cấu hình xem <code>docs/neon-setup.md</code>.
        </p>
      ) : status.missing.length > 0 ? (
        <p className={styles.banner}>
          {status.missing.length} phần của sổ chưa có trên Neon ({status.missing.join(', ')}) nên
          đang hiển thị bản đóng gói sẵn và <strong>chưa lưu lên được</strong>. Chạy file migration
          mới nhất trong <code>db/migrations/</code> trên Neon SQL Editor, rồi đẩy đúng phần còn
          thiếu: <code>node scripts/neonSync.mjs push {status.missing.join(' ')}</code>. Xem{' '}
          <code>docs/neon-setup.md</code>.
        </p>
      ) : (
        <p className={styles.banner}>
          Sổ này <strong>ai mở được web cũng sửa được</strong> (không có đăng nhập). Neon giữ 20 bản
          ghi đè gần nhất để lùi lại, nhưng nên thỉnh thoảng bấm <strong>Tải JSON về</strong> rồi
          commit vào repo làm bản gốc.
        </p>
      )}

      {status.error ? <p className={styles.error}>{status.error}</p> : null}
      {status.message ? <p className={styles.success}>{status.message}</p> : null}

      <div className={styles.tabs} role="tablist" aria-label="Các phần của sổ">
        {TABS.map((item) => {
          const count = data[item.id].length;
          const isActive = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              <span className={styles.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {tab === 'expenses' || tab === 'incomes' || tab === 'revenues' ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tháng</span>
              <select
                className={styles.select}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              >
                <option value={ALL_MONTHS}>Tất cả các tháng</option>
                {months.map((item) => (
                  <option key={item} value={item}>
                    {formatMonthLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Chuyển sang tháng khác</span>
              <input
                className={styles.select}
                type="month"
                value={month === ALL_MONTHS ? '' : month}
                onChange={(event) => {
                  if (event.target.value) setMonth(event.target.value);
                }}
              />
            </label>

            {tab === 'revenues' ? (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tìm trong doanh thu</span>
                <input
                  className={styles.select}
                  type="search"
                  value={revenueQuery}
                  placeholder="móc khoá, kệ điện thoại…"
                  onChange={(event) => setRevenueQuery(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <div className={styles.summaryHead}>
            <button
              type="button"
              className={styles.eyeButton}
              aria-pressed={amountsVisible}
              onClick={() => setAmountsVisible((visible) => !visible)}
            >
              <span aria-hidden="true">{amountsVisible ? '🙈' : '👁️'}</span>
              {amountsVisible ? 'Ẩn số tiền' : 'Hiện số tiền'}
            </button>
          </div>
        </>
      ) : null}

      {tab === 'expenses' || tab === 'incomes' ? (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Tổng thu — {monthLabel}</span>
              <strong className={styles.summaryValue}>{showAmount(summary.incomeTotal)}</strong>
              <span className={styles.summaryHint}>{summary.incomeCount} khoản</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Tổng chi — {monthLabel}</span>
              <strong className={styles.summaryValue}>{showAmount(summary.expenseTotal)}</strong>
              <span className={styles.summaryHint}>{summary.expenseCount} khoản</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Còn lại (thu − chi)</span>
              {/* Đang ẩn thì bỏ luôn màu cảnh báo — màu đỏ tự nó đã nói số này âm */}
              <strong
                className={
                  amountsVisible && summary.balance < 0
                    ? `${styles.summaryValue} ${styles.summaryNegative}`
                    : styles.summaryValue
                }
              >
                {showAmount(summary.balance)}
              </strong>
              <span className={styles.summaryHint}>
                {summary.missingAmountCount > 0
                  ? `${summary.missingAmountCount} dòng chưa điền tiền, chưa tính vào tổng`
                  : 'đã tính đủ mọi dòng'}
              </span>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'expenses' ? (
        <EditableTable
          columns={EXPENSE_COLUMNS}
          rows={visibleExpenses}
          onChange={changeExpense}
          onDelete={(id) => ledger.deleteRow('expenses', id)}
          onAdd={() =>
            ledger.addRow('expenses', createExpenseEntry(monthForNewRow, createEntryId('exp')))
          }
          addLabel="Thêm khoản chi"
          emptyText={`Chưa có khoản chi nào trong ${monthLabel}.`}
          footer={
            <span className={styles.tableTotal}>
              Tổng chi {monthLabel}: <strong>{showAmount(summary.expenseTotal)}</strong>
            </span>
          }
        />
      ) : null}

      {tab === 'incomes' ? (
        <EditableTable
          columns={INCOME_COLUMNS}
          rows={visibleIncomes}
          onChange={(id, patch) => ledger.updateRow('incomes', id, patch)}
          onDelete={(id) => ledger.deleteRow('incomes', id)}
          onAdd={() =>
            ledger.addRow('incomes', createIncomeEntry(monthForNewRow, createEntryId('inc')))
          }
          addLabel="Thêm khoản thu"
          emptyText={`Chưa có khoản thu nào trong ${monthLabel}.`}
          footer={
            <span className={styles.tableTotal}>
              Tổng thu {monthLabel}: <strong>{showAmount(summary.incomeTotal)}</strong>
            </span>
          }
        />
      ) : null}

      {tab === 'notes' ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tìm trong note</span>
              <input
                className={styles.select}
                type="search"
                value={noteQuery}
                placeholder="kẹt nhựa, halloween, support…"
                onChange={(event) => setNoteQuery(event.target.value)}
              />
            </label>
          </div>
          <EditableTable
            columns={noteColumns}
            rows={visibleNotes}
            onChange={(id, patch) => ledger.updateRow('notes', id, patch)}
            onDelete={(id) => ledger.deleteRow('notes', id)}
            onAdd={() => ledger.addRow('notes', createCompanyNote(createEntryId('note')))}
            addLabel="Thêm note"
            emptyText={
              noteQuery.trim().length > 0 ? 'Không có note nào khớp từ khoá.' : 'Chưa có note nào.'
            }
            footer={
              <span className={styles.tableTotal}>
                Hiện {visibleNotes.length}/{data.notes.length} note
              </span>
            }
          />
        </>
      ) : null}

      {tab === 'products' ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tìm sản phẩm</span>
              <input
                className={styles.select}
                type="search"
                value={productQuery}
                placeholder="benchy, fox, ghost…"
                onChange={(event) => setProductQuery(event.target.value)}
              />
            </label>
          </div>
          <EditableTable
            columns={PRODUCT_COLUMNS}
            rows={visibleProducts}
            onChange={(id, patch) => ledger.updateRow('products', id, patch)}
            onDelete={(id) => ledger.deleteRow('products', id)}
            onAdd={() => ledger.addRow('products', createCompanyProduct(createEntryId('prod')))}
            addLabel="Thêm sản phẩm"
            emptyText={
              productQuery.trim().length > 0
                ? 'Không có sản phẩm nào khớp từ khoá.'
                : 'Chưa có sản phẩm nào.'
            }
            footer={
              <span className={styles.tableTotal}>
                Hiện {visibleProducts.length}/{data.products.length} sản phẩm
              </span>
            }
          />
        </>
      ) : null}

      {tab === 'revenues' ? (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Tổng giá bán — {monthLabel}</span>
              <strong className={styles.summaryValue}>{showAmount(revenueTotal)}</strong>
              <span className={styles.summaryHint}>
                {revenueMissingPriceCount > 0
                  ? `${revenueMissingPriceCount} dòng chưa điền giá, chưa tính vào tổng`
                  : `${visibleRevenues.length} dòng`}
              </span>
            </div>
          </div>

          <EditableTable
            columns={REVENUE_COLUMNS}
            rows={visibleRevenues}
            onChange={changeRevenue}
            onDelete={(id) => ledger.deleteRow('revenues', id)}
            onAdd={() =>
              ledger.addRow('revenues', createRevenueEntry(monthForNewRow, createEntryId('rev')))
            }
            addLabel="Thêm dòng doanh thu"
            emptyText={
              revenueQuery.trim().length > 0
                ? 'Không có dòng doanh thu nào khớp từ khoá.'
                : `Chưa có doanh thu nào trong ${monthLabel}.`
            }
            footer={
              <span className={styles.tableTotal}>
                Hiện {visibleRevenues.length}/{data.revenues.length} dòng — tổng giá bán{' '}
                {monthLabel}: <strong>{showAmount(revenueTotal)}</strong>
              </span>
            }
          />
        </>
      ) : null}
    </div>
  );
}
