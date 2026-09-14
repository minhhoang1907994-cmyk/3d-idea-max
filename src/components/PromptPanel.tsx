import { useState } from 'react';
import styles from './PromptPanel.module.css';

type Props = { prompt: string };

type CopyState = 'idle' | 'copied' | 'failed';

export function PromptPanel({ prompt }: Props) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      // Trình duyệt chặn quyền clipboard — hiện textarea để user copy tay,
      // không im lặng nuốt lỗi (CLAUDE.md > Error Handling)
      setCopyState('failed');
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Prompt cho Gemini</h2>
        <button
          type="button"
          className={styles.copyButton}
          onClick={() => {
            void handleCopy();
          }}
        >
          {copyState === 'copied' ? 'Đã copy' : 'Copy'}
        </button>
      </header>

      <p className={styles.prompt}>{prompt}</p>

      {copyState === 'failed' ? (
        <div className={styles.fallback}>
          <p className={styles.fallbackNote}>
            Trình duyệt không cho copy tự động. Bạn bôi đen đoạn dưới rồi copy tay:
          </p>
          <textarea className={styles.textarea} readOnly value={prompt} rows={5} />
        </div>
      ) : null}
    </section>
  );
}
