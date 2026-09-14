import { useEffect, useRef, useState } from 'react';
import {
  analyzeImage,
  DEFAULT_VISION_MODEL,
  fileToBase64,
  STORAGE_KEY_API,
  STORAGE_KEY_MODEL,
} from '../lib/geminiVision';
import styles from './ImageAnalyzePage.module.css';

type Status =
  | { kind: 'idle' }
  | { kind: 'analyzing' }
  | { kind: 'done'; prompt: string }
  | { kind: 'error'; message: string };

/** localStorage có thể bị chặn (chế độ ẩn danh, chặn cookie) — không để vỡ trang. */
function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Không lưu được thì thôi, key vẫn dùng được trong phiên hiện tại
  }
}

export function ImageAnalyzePage() {
  const [apiKey, setApiKey] = useState(() => readStorage(STORAGE_KEY_API, ''));
  const [model, setModel] = useState(() => readStorage(STORAGE_KEY_MODEL, DEFAULT_VISION_MODEL));
  const [showKey, setShowKey] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Giải phóng object URL khi đổi ảnh hoặc rời trang, tránh rò bộ nhớ
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!picked.type.startsWith('image/')) {
      setStatus({ kind: 'error', message: 'File này không phải ảnh.' });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setStatus({ kind: 'idle' });
  }

  async function handleAnalyze() {
    if (!file) {
      setStatus({ kind: 'error', message: 'Chọn một ảnh trước đã.' });
      return;
    }
    setStatus({ kind: 'analyzing' });
    try {
      const base64Image = await fileToBase64(file);
      const result = await analyzeImage({
        base64Image,
        mimeType: file.type,
        apiKey,
        model,
      });
      setStatus({ kind: 'done', prompt: result.prompt });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Phân tích ảnh thất bại.',
      });
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus({
        kind: 'error',
        message: 'Trình duyệt chặn copy tự động — bôi đen đoạn prompt rồi copy tay.',
      });
    }
  }

  const isAnalyzing = status.kind === 'analyzing';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Phân tích ảnh</h1>
        <p className={styles.subtitle}>
          Tải lên ảnh một sản phẩm in 3D, Gemini đọc ảnh và viết prompt để bạn tạo ra sản phẩm tương
          tự — cùng tinh thần, không sao chép y hệt.
        </p>
      </header>

      <section className={styles.config}>
        <div className={styles.configRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Gemini API key</span>
            <div className={styles.keyRow}>
              <input
                className={styles.input}
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                placeholder="Dán key từ Google AI Studio"
                onChange={(event) => {
                  setApiKey(event.target.value);
                  writeStorage(STORAGE_KEY_API, event.target.value);
                }}
              />
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setShowKey((value) => !value)}
              >
                {showKey ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <label className={styles.fieldNarrow}>
            <span className={styles.fieldLabel}>Model</span>
            <input
              className={styles.input}
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                writeStorage(STORAGE_KEY_MODEL, event.target.value);
              }}
            />
          </label>
        </div>

        <p className={styles.warning}>
          Key lưu trong trình duyệt máy này, không gửi đi đâu ngoài Google và không nằm trong mã
          nguồn. Nhưng ai dùng được máy này cũng lấy được key — đừng nhập key dùng chung, và tạo key
          riêng có giới hạn quota cho việc này.
        </p>
      </section>

      <section
        className={styles.dropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          pickFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          onChange={(event) => pickFile(event.target.files?.[0])}
        />

        {previewUrl ? (
          <img className={styles.preview} src={previewUrl} alt="Ảnh đã chọn" />
        ) : (
          <p className={styles.dropHint}>Kéo ảnh vào đây, hoặc bấm nút bên dưới để chọn file</p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => inputRef.current?.click()}
          >
            {file ? 'Đổi ảnh' : 'Chọn ảnh'}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!file || isAnalyzing}
            onClick={() => void handleAnalyze()}
          >
            {isAnalyzing ? 'Đang phân tích…' : 'Phân tích ảnh'}
          </button>
        </div>
      </section>

      {status.kind === 'error' ? <p className={styles.error}>{status.message}</p> : null}

      {status.kind === 'done' ? (
        <section className={styles.result}>
          <header className={styles.resultHeader}>
            <h2 className={styles.resultTitle}>Prompt cho Gemini</h2>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleCopy(status.prompt)}
            >
              {copied ? 'Đã copy' : 'Copy'}
            </button>
          </header>
          <p className={styles.prompt}>{status.prompt}</p>
          <p className={styles.resultNote}>
            Prompt này do Gemini viết tự do từ ảnh, không lấy từ dữ liệu có sẵn của app — nên có thể
            chứa ý tưởng chưa có trong danh mục. Muốn đưa vào hệ thống mix thì thêm thủ công ở trang
            Quản lý dữ liệu.
          </p>
        </section>
      ) : null}
    </div>
  );
}
