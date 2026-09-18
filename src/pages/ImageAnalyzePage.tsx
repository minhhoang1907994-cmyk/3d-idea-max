import { useEffect, useMemo, useRef, useState } from 'react';
import { SelectField } from '../components/SelectField';
import type { IdeaData } from '../data/bundledData';
import type { CharacterTraitAxisId } from '../lib/characterTraits';
import { NO_COSTUME_ID } from '../lib/characterTraits';
import {
  analyzeImage,
  DEFAULT_VISION_MODEL,
  fileToBase64,
  STORAGE_KEY_API,
  STORAGE_KEY_MODEL,
} from '../lib/geminiVision';
import {
  buildVariantInstruction,
  characterTraitAxes,
  pickVariantTraits,
  variantChanges,
  type VariantSource,
  type VariantTraits,
} from '../lib/imageVariant';
import styles from './ImageAnalyzePage.module.css';

type Props = { data: IdeaData };

const SOURCE_OPTIONS: { id: VariantSource; label: string; description: string }[] = [
  {
    id: 'data',
    label: 'Từ dữ liệu app',
    description:
      'Bốc ngẫu nhiên từ chính danh sách của app. Bạn thấy trước sẽ đổi gì, sửa lại từng chiều được, và lần sau bốc lại vẫn nằm trong bộ dữ liệu đó.',
  },
  {
    id: 'model',
    label: 'Để Gemini tự chọn',
    description:
      'Chỉ dặn Gemini đổi thế đứng, biểu cảm, trang phục và phụ kiện, còn đổi thành gì thì nó tự quyết. Bất ngờ hơn nhưng không biết trước và không lặp lại được.',
  },
];

/** Ghi chú dưới selectbox — giống trang Mix, giữ cách diễn đạt cho quen mắt. */
const AXIS_HINTS: Partial<Record<CharacterTraitAxisId, string>> = {
  pose: 'Chọn "Mặc định" để giữ nguyên thế đứng trong ảnh',
  expression: 'Chọn "Mặc định" để giữ nguyên biểu cảm trong ảnh',
  outfit: 'Trang phục đời thường',
  costume: 'Trọn bộ theo chủ đề — chọn bộ nào là ghi đè Trang phục',
  base: 'Chọn "Mặc định" để giữ nguyên đế trong ảnh',
};

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

export function ImageAnalyzePage({ data }: Props) {
  const [apiKey, setApiKey] = useState(() => readStorage(STORAGE_KEY_API, ''));
  const [model, setModel] = useState(() => readStorage(STORAGE_KEY_MODEL, DEFAULT_VISION_MODEL));
  const [showKey, setShowKey] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const traitAxes = useMemo(() => characterTraitAxes(data.attributeAxes), [data.attributeAxes]);
  const [source, setSource] = useState<VariantSource>('data');
  const [traits, setTraits] = useState<VariantTraits>(() =>
    pickVariantTraits(data.attributeAxes, Math.random),
  );
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
        instruction: buildVariantInstruction({ source, traits }),
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
  const currentSource = SOURCE_OPTIONS.find((option) => option.id === source);
  // Nói thẳng cho user biết Trang phục đang không có tác dụng, giống trang Mix
  const costumeActive = Boolean(traits.costume && traits.costume.id !== NO_COSTUME_ID);
  const changes = variantChanges(traits);

  function selectTrait(axisId: CharacterTraitAxisId, optionId: string) {
    const axis = traitAxes.find((item) => item.id === axisId);
    const option = axis?.options.find((item) => item.id === optionId);
    if (!option) return;
    setTraits((current) => ({ ...current, [axisId]: option }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Phân tích ảnh</h1>
        <p className={styles.subtitle}>
          Tải lên ảnh một sản phẩm in 3D, Gemini đọc ảnh và viết prompt tả lại đúng vật đó — chỉ đổi
          thế đứng, biểu cảm, trang phục và đế trưng bày.
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

      <section className={styles.variant}>
        <header className={styles.variantHeader}>
          <h2 className={styles.variantTitle}>Đổi gì so với ảnh</h2>
          {source === 'data' && traitAxes.length > 0 ? (
            <button
              type="button"
              className={styles.ghostButton}
              onClick={() => setTraits(pickVariantTraits(data.attributeAxes, Math.random))}
            >
              🎲 Bốc lại
            </button>
          ) : null}
        </header>

        <div className={styles.sourceRow} role="group" aria-label="Nguồn của biến thể">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={
                option.id === source
                  ? `${styles.sourceButton} ${styles.sourceActive}`
                  : styles.sourceButton
              }
              onClick={() => setSource(option.id)}
              aria-pressed={option.id === source}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={styles.variantNote}>{currentSource?.description}</p>

        {source === 'data' ? (
          traitAxes.length > 0 ? (
            <>
              <div className={styles.traitGrid}>
                {traitAxes.map((axis) => {
                  const axisId = axis.id as CharacterTraitAxisId;
                  return (
                    <SelectField
                      key={axis.id}
                      label={axis.label}
                      value={traits[axisId]?.id ?? axis.options[0]?.id ?? ''}
                      options={axis.options}
                      onChange={(optionId) => selectTrait(axisId, optionId)}
                      hint={
                        axisId === 'outfit' && costumeActive
                          ? 'Đang bị Bộ cosplay ghi đè'
                          : AXIS_HINTS[axisId]
                      }
                    />
                  );
                })}
              </div>
              {changes.length === 0 ? (
                <p className={styles.variantNote}>
                  Tất cả đang để mặc định — prompt sẽ tả lại ảnh y như cũ, không đổi gì.
                </p>
              ) : null}
            </>
          ) : (
            <p className={styles.variantNote}>
              Dữ liệu hiện tại không còn chiều nhân vật nào (Thế đứng, Biểu cảm, Trang phục, Bộ
              cosplay, Đế trưng bày) — thêm lại ở trang Quản lý dữ liệu, hoặc để Gemini tự chọn.
            </p>
          )
        ) : null}
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
            Phần mô tả vật thể do Gemini viết từ ảnh nên có thể lệch vài chi tiết so với ảnh gốc —
            đọc lại trước khi dùng. Muốn đưa ý tưởng này vào hệ thống mix thì thêm thủ công ở trang
            Quản lý dữ liệu.
          </p>
        </section>
      ) : null}
    </div>
  );
}
