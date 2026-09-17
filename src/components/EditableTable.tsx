import { useState, type ReactNode } from 'react';
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

  function renderCell(row: T, column: EditableColumn<T>): ReactNode {
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

      return (
        <div className={styles.amountCell}>
          <input
            className={invalid ? `${styles.input} ${styles.inputInvalid}` : styles.input}
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
          <span className={invalid ? styles.amountWarning : styles.amountHint}>
            {invalid ? 'không đọc được số' : formatVnd(amount)}
          </span>
        </div>
      );
    }

    const value = (rawValue ?? '') as string;

    // Ô ảnh tự lo phần tải file lên Backblaze nên không dùng chung <input> bên dưới
    if (kind === 'image') {
      return (
        <ImageCell
          value={value}
          month={((row as { month?: string }).month ?? '').trim()}
          label={column.label}
          onChange={(next) => onChange(row.id, { [column.key]: next } as Partial<T>)}
        />
      );
    }

    // Ô phân loại có menu riêng: <datalist> lọc theo chữ sẵn có nên dòng đã điền
    // không đổi loại được — xem <TagSelect>
    if (kind === 'tag') {
      return (
        <TagSelect
          value={value}
          options={column.suggestions ?? []}
          label={column.label}
          placeholder={column.placeholder}
          onChange={(next) => onChange(row.id, { [column.key]: next } as Partial<T>)}
        />
      );
    }

    const listId = kind === 'text' && column.suggestions ? `${column.key}-suggestions` : undefined;

    return (
      <div className={styles.cell}>
        <input
          className={styles.input}
          type={kind === 'date' || kind === 'month' ? kind : 'text'}
          value={value}
          list={listId}
          placeholder={column.placeholder}
          aria-label={column.label}
          onChange={(event) => onChange(row.id, { [column.key]: event.target.value } as Partial<T>)}
        />
        {listId ? (
          <datalist id={listId}>
            {column.suggestions?.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
        {kind === 'link' && isHttpLink(value) ? (
          <a className={styles.openLink} href={value} target="_blank" rel="noreferrer noopener">
            Mở ↗
          </a>
        ) : null}
      </div>
    );
  }

  const gridTemplate = `${columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ')} 5.5rem`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <div className={styles.table} role="table">
          <div className={styles.headRow} role="row" style={{ gridTemplateColumns: gridTemplate }}>
            {columns.map((column) => (
              <span key={column.key} className={styles.headCell} role="columnheader">
                {column.label}
              </span>
            ))}
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
                {columns.map((column) => (
                  <div key={column.key} className={styles.bodyCell} role="cell">
                    {renderCell(row, column)}
                  </div>
                ))}
                <div className={styles.bodyCell} role="cell">
                  {confirmingId === row.id ? (
                    <div className={styles.confirm}>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => {
                          onDelete(row.id);
                          setConfirmingId(null);
                        }}
                      >
                        Xoá
                      </button>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => setConfirmingId(null)}
                      >
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => setConfirmingId(row.id)}
                    >
                      Xoá dòng
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
