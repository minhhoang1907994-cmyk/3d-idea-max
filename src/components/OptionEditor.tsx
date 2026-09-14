import { useState } from 'react';
import { suggestId, validateOptionDraft, type OptionDraft } from '../lib/validateOption';
import styles from './OptionEditor.module.css';

export type EditableOption = { id: string; label: string; promptText: string };

type Props = {
  /** Tiêu đề nhóm đang sửa, ví dụ tên danh mục hoặc tên axis */
  title: string;
  options: readonly EditableOption[];
  onAdd: (option: EditableOption) => void;
  onUpdate: (optionId: string, patch: Partial<{ label: string; promptText: string }>) => void;
  onDelete: (optionId: string) => void;
};

const EMPTY_DRAFT: OptionDraft = { id: '', label: '', promptText: '' };

export function OptionEditor({ title, options, onAdd, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState<OptionDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleAdd() {
    const candidate: OptionDraft = {
      // Chưa gõ ID thì tự suy từ nhãn để đỡ thao tác
      id: draft.id.trim() || suggestId(draft.label),
      label: draft.label.trim(),
      promptText: draft.promptText.trim(),
    };
    const result = validateOptionDraft(
      candidate,
      options.map((option) => option.id),
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onAdd(candidate);
    setDraft(EMPTY_DRAFT);
    setErrors([]);
  }

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{options.length} option</span>
      </header>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          placeholder="ID (bỏ trống để tự sinh)"
          value={draft.id}
          onChange={(event) => setDraft({ ...draft, id: event.target.value })}
        />
        <input
          className={styles.input}
          placeholder="Nhãn hiển thị (tiếng Việt được)"
          value={draft.label}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        />
        <input
          className={styles.input}
          placeholder="Prompt text (tiếng Anh)"
          value={draft.promptText}
          onChange={(event) => setDraft({ ...draft, promptText: event.target.value })}
        />
        <button type="button" className={styles.addButton} onClick={handleAdd}>
          Thêm
        </button>
      </div>

      {errors.length > 0 ? (
        <ul className={styles.errors}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colId}>ID</th>
              <th>Nhãn</th>
              <th>Prompt text (tiếng Anh)</th>
              <th className={styles.colAction}></th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => (
              <tr key={option.id}>
                <td className={styles.idCell}>{option.id}</td>
                <td>
                  <input
                    className={styles.cellInput}
                    value={option.label}
                    onChange={(event) => onUpdate(option.id, { label: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className={styles.cellInput}
                    value={option.promptText}
                    onChange={(event) => onUpdate(option.id, { promptText: event.target.value })}
                  />
                </td>
                <td className={styles.colAction}>
                  {confirmingId === option.id ? (
                    <span className={styles.confirmGroup}>
                      <button
                        type="button"
                        className={styles.confirmDelete}
                        onClick={() => {
                          onDelete(option.id);
                          setConfirmingId(null);
                        }}
                      >
                        Xóa thật
                      </button>
                      <button
                        type="button"
                        className={styles.cancelDelete}
                        onClick={() => setConfirmingId(null)}
                      >
                        Hủy
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => setConfirmingId(option.id)}
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.note}>
        ID không sửa được sau khi tạo — đổi ID sẽ phá dữ liệu đã lưu. Cần đổi thì xóa rồi thêm lại.
      </p>
    </div>
  );
}
