import { Fragment, useState, type ReactNode } from 'react';
import { formatAmountForEdit, formatVnd, isHttpLink, parseAmountInput } from '../lib/companyLedger';
import { ImageCell } from './ImageCell';
import { TagSelect } from './TagSelect';
import styles from './EditableTable.module.css';

/**
 * Kiểu dữ liệu của một cột — quyết định cách hiển thị và cách đọc giá trị người dùng gõ.
 *
 * `amount` là số tiền (number | null), các kiểu còn lại đều là chuỗi. `image` không
 * render <input> ở đây mà giao cho <ImageCell> — xem file đó, `tag` giao cho <TagSelect>.
 */
export type ColumnKind = 'text' | 'amount' | 'date' | 'month' | 'link' | 'image' | 'tag';

/** Bề rộng cột "Thao tác" — cột duy nhất không do trang gọi khai báo */
const ACTION_COLUMN_WIDTH = '4.25rem';
/*
 * Hai kiểu ô này có phần phụ đi kèm ô nhập: nút mở link, và số tiền đã định dạng lại.
 * Xếp chúng thành cột grid riêng ngay sau cột chính thay vì nhét xuống dưới ô nhập —
 * nằm dưới thì mỗi dòng cao gấp đôi và phần phụ giữa các dòng không thẳng hàng nhau.
 * Header cột phụ để trống vì cột chính đã nói rõ, aria-label lo phần đọc màn hình.
 */
const SIDE_COLUMNS: Partial<Record<ColumnKind, { width: string; label: string }>> = {
  link: { width: '3.25rem', label: 'Mở link' },
  amount: { width: '6.5rem', label: 'Số tiền đã định dạng' },
};
/*
 * Sàn cho cột co giãn. Mọi trang đều bó trong khung 1100px (lề 1.25rem mỗi bên) nên vùng
 * nội dung còn ~66rem — bảng rộng nhất hiện có (Chi: 6 cột + 2 cột phụ + Thao tác) phải
 * nằm gọn trong đó thì mới khỏi cuộn ngang. Với 5.5rem, sàn của bảng đó ra ~63rem: vừa
 * khít, mà ô nhập vẫn đọc được. Hạ thêm nữa thì ô chữ bị nén quá hẹp.
 */
const FLEX_COLUMN_MIN_REM = 5.5;
/** Khớp với `gap` của .headRow/.row và `padding` hai bên trong EditableTable.module.css */
const COLUMN_GAP_REM = 0.4;
const ROW_PADDING_REM = 1.5;

export type EditableColumn<T> = {
  key: Extract<keyof T, string>;
  label: string;
  /** Mặc định 'text' */
  kind?: ColumnKind;
  /** Chiều rộng cột, ví dụ '12rem' hoặc 'minmax(0, 2fr)' — bỏ trống thì tự co giãn */
  width?: string;
  placeholder?: string;
  /** Gợi ý gõ nhanh: ô `text` dùng <datalist>, ô `tag` dựng danh sách riêng */
  suggestions?: readonly string[];
  /** Chỉ dùng cho ô `image`: thư mục gốc trên B2 — xem <ImageCell> */
  imagePrefix?: string;
};

type Props<T extends { id: string }> = {
  columns: readonly EditableColumn<T>[];
  rows: readonly T[];
  onChange: (id: string, patch: Partial<T>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  /** Nhãn nút thêm dòng, ví dụ "Thêm khoản chi" */
  addLabel: string;
  /** Câu hiển thị khi bảng rỗng */
  emptyText: string;
  /** Dòng tổng / ghi chú đặt ngay dưới bảng */
  footer?: ReactNode;
};

/**
 * Bảng sửa tại chỗ dùng chung cho cả 4 sheet của Sổ công ty.
 *
 * Gõ tới đâu ghi vào state tới đó (chưa đẩy lên Neon — phải bấm Lưu), nên không có
 * nút "Sửa"/"Xong" từng dòng: đúng cảm giác đang gõ trên Excel.
 *
 * Ô tiền giữ bản nháp riêng (`drafts`) trong lúc gõ: "6.425." là trạng thái hợp lệ
 * khi đang gõ dở nhưng KHÔNG đọc ra số được. Nháp nào không đọc được thì giữ nguyên
 * trên màn hình kèm cảnh báo và không ghi đè giá trị cũ — thà để người gõ sửa lại
 * còn hơn âm thầm biến nó thành 0.
 */
export function EditableTable<T extends { id: string }>({
  columns,
  rows,
  onChange,
  onDelete,
  onAdd,
  addLabel,
  emptyText,
  footer,
}: Props<T>) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function draftKey(rowId: string, columnKey: string): string {
    return `${rowId}:${columnKey}`;
  }

  function handleAmountInput(row: T, column: EditableColumn<T>, raw: string) {
    const key = draftKey(row.id, column.key);
    setDrafts((current) => ({ ...current, [key]: raw }));
    try {
      const amount = parseAmountInput(raw);
      onChange(row.id, { [column.key]: amount } as Partial<T>);
    } catch {
      // Gõ dở hoặc gõ nhầm — giữ nguyên số cũ, ô sẽ hiện cảnh báo cho tới khi sửa lại
    }
  }

  function clearDraft(rowId: string, columnKey: string) {
    const key = draftKey(rowId, columnKey);
    setDrafts((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  /** `side` là nội dung cột phụ — chỉ dùng với các kiểu có mặt trong SIDE_COLUMNS */
  function renderCell(row: T, column: EditableColumn<T>): { main: ReactNode; side: ReactNode } {
    const kind = column.kind ?? 'text';
    const rawValue = row[column.key];

    if (kind === 'amount') {
      const amount = (rawValue ?? null) as number | null;
      const key = draftKey(row.id, column.key);
      const draft = drafts[key];
      const text = draft ?? formatAmountForEdit(amount);
      let invalid = false;
      if (draft !== undefined) {
        try {
          parseAmountInput(draft);
        } catch {
          invalid = true;
        }
      }

      return {
        main: (
          <input
            className={
              invalid
                ? `${styles.input} ${styles.amountInput} ${styles.inputInvalid}`
                : `${styles.input} ${styles.amountInput}`
            }
            value={text}
            inputMode="numeric"
            placeholder={column.placeholder ?? '0'}
            aria-label={column.label}
            aria-invalid={invalid || undefined}
            onChange={(event) => handleAmountInput(row, column, event.target.value)}
            onBlur={() => {
              if (!invalid) clearDraft(row.id, column.key);
            }}
          />
        ),
        side: (
          <span className={invalid ? styles.amountWarning : styles.amountHint}>
            {invalid ? 'không đọc được số' : formatVnd(amount)}
          </span>
        ),
      };
    }

    const value = (rawValue ?? '') as string;

    // Ô ảnh tự lo phần tải file lên Backblaze nên không dùng chung <input> bên dưới
    if (kind === 'image') {
      return {
        main: (
          <ImageCell
            value={value}
            month={((row as { month?: string }).month ?? '').trim()}
            prefix={column.imagePrefix}
            label={column.label}
            onChange={(next) => onChange(row.id, { [column.key]: next } as Partial<T>)}
          />
        ),
        side: null,
      };
    }

    // Ô phân loại có menu riêng: <datalist> lọc theo chữ sẵn có nên dòng đã điền
    // không đổi loại được — xem <TagSelect>
    if (kind === 'tag') {
      return {
        main: (
          <TagSelect
            value={value}
            options={column.suggestions ?? []}
            label={column.label}
            placeholder={column.placeholder}
            onChange={(next) => onChange(row.id, { [column.key]: next } as Partial<T>)}
          />
        ),
        side: null,
      };
    }

    const listId = kind === 'text' && column.suggestions ? `${column.key}-suggestions` : undefined;

    return {
      main: (
        <>
          <input
            className={styles.input}
            type={kind === 'date' || kind === 'month' ? kind : 'text'}
            value={value}
            list={listId}
            placeholder={column.placeholder}
            aria-label={column.label}
            onChange={(event) =>
              onChange(row.id, { [column.key]: event.target.value } as Partial<T>)
            }
          />
          {listId ? (
            <datalist id={listId}>
              {column.suggestions?.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          ) : null}
        </>
      ),
      side:
        kind === 'link' && isHttpLink(value) ? (
          <a className={styles.openLink} href={value} target="_blank" rel="noreferrer noopener">
            Mở ↗
          </a>
        ) : null,
    };
  }

  const sideColumnOf = (column: EditableColumn<T>) => SIDE_COLUMNS[column.kind ?? 'text'];

  const widths = [
    ...columns.flatMap((column) => {
      const main = column.width ?? 'minmax(0, 1fr)';
      const side = sideColumnOf(column);
      return side ? [main, side.width] : [main];
    }),
    ACTION_COLUMN_WIDTH,
  ];
  const gridTemplate = widths.join(' ');
  // Track kiểu minmax(0, Nfr) co được về 0, nên trên màn hẹp các cột chữ bị nén còn vài
  // pixel thay vì đẩy .scroller cuộn ngang. Sàn dưới đây tính từ chính các cột đang có —
  // một con số cố định thì hoặc thừa với bảng 3 cột, hoặc thiếu với bảng 7 cột.
  const tableMinWidthRem =
    widths.reduce((sum, width) => {
      const fixed = /^([\d.]+)rem$/.exec(width.trim());
      return sum + (fixed ? Number(fixed[1]) : FLEX_COLUMN_MIN_REM);
    }, 0) +
    widths.length * COLUMN_GAP_REM +
    ROW_PADDING_REM;

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <div className={styles.table} role="table" style={{ minWidth: `${tableMinWidthRem}rem` }}>
          <div className={styles.headRow} role="row" style={{ gridTemplateColumns: gridTemplate }}>
            {columns.map((column) => {
              const side = sideColumnOf(column);
              return (
                <Fragment key={column.key}>
                  <span className={styles.headCell} role="columnheader">
                    {column.label}
                  </span>
                  {side ? (
                    <span className={styles.headCell} role="columnheader" aria-label={side.label} />
                  ) : null}
                </Fragment>
              );
            })}
            <span className={styles.headCell} role="columnheader">
              Thao tác
            </span>
          </div>

          {rows.length === 0 ? (
            <p className={styles.empty}>{emptyText}</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={styles.row}
                role="row"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {columns.map((column) => {
                  const side = sideColumnOf(column);
                  const cell = renderCell(row, column);
                  return (
                    <Fragment key={column.key}>
                      <div className={styles.bodyCell} role="cell">
                        {cell.main}
                      </div>
                      {side ? (
                        <div className={styles.bodyCell} role="cell">
                          {cell.side}
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
                <div className={styles.bodyCell} role="cell">
                  {confirmingId === row.id ? (
                    <div className={styles.confirm}>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.dangerButton}`}
                        title="Xoá thật dòng này"
                        aria-label="Xoá thật dòng này"
                        onClick={() => {
                          onDelete(row.id);
                          setConfirmingId(null);
                        }}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.ghostButton}`}
                        title="Huỷ xoá"
                        aria-label="Huỷ xoá"
                        onClick={() => setConfirmingId(null)}
                      >
                        <span aria-hidden="true">✕</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.ghostButton}`}
                      title="Xoá dòng"
                      aria-label="Xoá dòng"
                      onClick={() => setConfirmingId(row.id)}
                    >
                      <span aria-hidden="true">🗑</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.addButton} onClick={onAdd}>
          + {addLabel}
        </button>
        {footer}
      </div>
    </div>
  );
}
