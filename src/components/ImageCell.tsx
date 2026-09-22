import { useEffect, useId, useRef, useState } from 'react';
import { isHttpLink } from '../lib/companyLedger';
import { B2UploadError, getB2Config, getImageUrl, uploadImage } from '../lib/b2Storage';
import styles from './ImageCell.module.css';

type Props = {
  /** Object key trên Backblaze, hoặc URL http của dữ liệu cũ, hoặc rỗng */
  value: string;
  /** Tháng của dòng — chỉ dùng để xếp ảnh vào thư mục cho dễ tìm sau này */
  month: string;
  /** Thư mục gốc trên B2, tách ảnh theo tab; bỏ trống thì dùng mặc định của b2Storage */
  prefix?: string;
  label: string;
  onChange: (value: string) => void;
};

/**
 * Ô "Hình ảnh": chọn file từ máy, tải thẳng lên Backblaze B2, ghi lại object key.
 *
 * Bucket để Private nên không có URL cố định — URL đọc được ký lại ở đây mỗi lần
 * hiển thị (xem src/lib/b2Storage.ts). Vì vậy sổ chỉ lưu object key, không lưu URL:
 * URL đã ký có hạn, lưu vào Neon thì hôm sau mở ra là ảnh hỏng.
 *
 * Giá trị bắt đầu bằng http(s) vẫn hiển thị nguyên như trước — dòng cũ dán link ngoài
 * không bị mất ảnh.
 *
 * Chưa cấu hình B2 (thiếu biến VITE_B2_*): quay về ô dán link như bản trước, không
 * chặn người dùng.
 */
export function ImageCell({ value, month, prefix, label, onChange }: Props) {
  const config = getB2Config();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * URL đã ký, kèm object key đã ký ra nó. Giữ cả key để lúc đổi ảnh không hiện nhầm
   * ảnh cũ trong lúc chờ ký ảnh mới — so key rẻ hơn là xoá state rồi set lại.
   */
  const [signed, setSigned] = useState<{ objectKey: string; url: string } | null>(null);

  // Link http dán tay từ trước: xem thẳng, không cần ký
  const needsSigning = value.length > 0 && !isHttpLink(value) && config !== null;
  const src = isHttpLink(value)
    ? value
    : needsSigning && signed?.objectKey === value
      ? signed.url
      : null;

  useEffect(() => {
    if (!needsSigning || !config) return;

    let cancelled = false;
    getImageUrl(value, config)
      .then((url) => {
        if (!cancelled) setSigned({ objectKey: value, url });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Không tạo được link xem ảnh.');
      });

    return () => {
      cancelled = true;
    };
    // config đọc từ biến môi trường lúc build nên không đổi giữa các lần render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, needsSigning]);

  async function handleFile(file: File | undefined) {
    if (!file || !config) return;

    setUploading(true);
    setError(null);
    try {
      const objectKey = await uploadImage(file, config, { month, prefix });
      onChange(objectKey);
    } catch (cause) {
      setError(
        cause instanceof B2UploadError || cause instanceof Error
          ? cause.message
          : 'Tải ảnh lên thất bại.',
      );
    } finally {
      setUploading(false);
      // Cho phép chọn lại đúng file vừa lỗi mà vẫn kích hoạt onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!config) {
    return (
      <div className={styles.cell}>
        <input
          className={styles.input}
          type="text"
          value={value}
          placeholder="https://"
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        {isHttpLink(value) ? (
          <img className={styles.thumbnail} src={value} alt="" loading="lazy" />
        ) : null}
        <span className={styles.hint}>
          Chưa cấu hình Backblaze (VITE_B2_*) — dán link ảnh vào đây.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.cell}>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer noopener" className={styles.preview}>
          <img className={styles.thumbnail} src={src} alt={label} loading="lazy" />
        </a>
      ) : null}

      <div className={styles.actions}>
        <input
          ref={fileInputRef}
          id={inputId}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          disabled={uploading}
          aria-label={label}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <label className={styles.uploadButton} htmlFor={inputId}>
          {uploading ? 'Đang tải…' : value.length > 0 ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </label>
        {value.length > 0 && !uploading ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setError(null);
              onChange('');
            }}
          >
            Bỏ ảnh
          </button>
        ) : null}
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
