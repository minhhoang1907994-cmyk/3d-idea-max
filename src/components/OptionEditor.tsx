import { useState } from 'react';
import { translateLabelToPrompt } from '../lib/translateLabel';
import { suggestId, validateOptionDraft } from '../lib/validateOption';
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

type AddState =
  | { kind: 'idle' }
  | { kind: 'translating'; progress: number | null }
  | { kind: 'error'; errors: string[] };

export function OptionEditor({ title, options, onAdd, onUpdate, onDelete }: Props) {
  const [label, setLabel] = useState('');
  const [manualPrompt, setManualPrompt] = useState('');
  /** Bật khi dịch tự động hỏng — cho user gõ tay thay vì bị chặn hẳn */
  const [manualMode, setManualMode] = useState(false);
  const [addState, setAddState] = useState<AddState>({ kind: 'idle' });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function commit(trimmedLabel: string, promptText: string) {
    const candidate = { id: suggestId(trimmedLabel), label: trimmedLabel, promptText };
    const result = validateOptionDraft(
      candidate,
      options.map((option) => option.id),
    );
    if (!result.ok) {
      setAddState({ kind: 'error', errors: result.errors });
      return;
    }

    onAdd(candidate);
    setLabel('');
    setManualPrompt('');
    setAddState({ kind: 'idle' });
  }

  async function handleAdd() {
    const trimmedLabel = label.trim();
    if (trimmedLabel === '') {
      setAddState({ kind: 'error', errors: ['Nhãn hiển thị không được để trống.'] });
      return;
    }

    if (manualMode) {
      commit(trimmedLabel, manualPrompt.trim());
      return;
    }

    setAddState({ kind: 'translating', progress: null });

    let promptText: string;
    try {
      promptText = await translateLabelToPrompt(trimmedLabel, (percent) => {
        setAddState({ kind: 'translating', progress: percent });
      });
    } catch (error) {
      setAddState({
        kind: 'error',
        errors: [error instanceof Error ? error.message : 'Không dịch được nhãn sang tiếng Anh.'],
      });
      // Dịch hỏng thì mở ô nhập tay để user vẫn thêm được
      setManualMode(true);
      return;
    }

    commit(trimmedLabel, promptText);
  }

  const isTranslating = addState.kind === 'translating';

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{options.length} option</span>
      </header>

      <div className={styles.addRow}>
        <input
          className={styles.input}
          placeholder="Nhãn hiển thị, ví dụ: Đèn bàn gấp gọn"
          value={label}
          disabled={isTranslating}
          onChange={(event) => {
            setLabel(event.target.value);
            if (addState.kind === 'error') setAddState({ kind: 'idle' });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isTranslating) void handleAdd();
          }}
        />
        {manualMode ? (
          <input
            className={styles.input}
            placeholder="Prompt tiếng Anh, ví dụ: a foldable desk lamp"
            value={manualPrompt}
            onChange={(event) => setManualPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleAdd();
            }}
          />
        ) : null}
        <button
          type="button"
          className={styles.addButton}
          disabled={isTranslating}
          onClick={() => void handleAdd()}
        >
          {isTranslating ? 'Đang dịch…' : 'Thêm'}
        </button>
      </div>

      <p className={styles.addHint}>
        {manualMode ? (
          <>
            Đang ở chế độ nhập tay: gõ cả nhãn tiếng Việt và prompt tiếng Anh.{' '}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setManualMode(false);
                setAddState({ kind: 'idle' });
              }}
            >
              Thử lại dịch tự động
            </button>
          </>
        ) : (
          <>
            Chỉ cần nhập nhãn tiếng Việt — ID và prompt tiếng Anh tự sinh khi bấm Thêm. Dịch chạy
            ngay trong trình duyệt, lần đầu Chrome tải gói ngôn ngữ nên hơi lâu.
            {addState.kind === 'translating' && addState.progress !== null
              ? ` Đang tải gói ngôn ngữ: ${addState.progress}%`
              : ''}{' '}
            <button type="button" className={styles.linkButton} onClick={() => setManualMode(true)}>
              Nhập prompt tay
            </button>
          </>
        )}
      </p>

      {addState.kind === 'error' ? (
        <ul className={styles.errors}>
          {addState.errors.map((error) => (
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
        Prompt tự sinh là bản dịch máy — sửa lại trực tiếp trong bảng nếu chưa sát ý. ID không sửa
        được sau khi tạo; cần đổi thì xóa rồi thêm lại.
      </p>
    </div>
  );
}
