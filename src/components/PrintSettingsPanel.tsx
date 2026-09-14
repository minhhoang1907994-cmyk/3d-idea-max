import type { PrintSettings, Range } from '../types';
import styles from './PrintSettingsPanel.module.css';

type Props = { settings: PrintSettings };

/** `null` = chưa verify được từ tài liệu Bambu — hiển thị rõ, không đoán số. */
function formatRange(range: Range | null, unit: string): string {
  if (range === null) return 'chưa có dữ liệu';
  return `${range.min} – ${range.max} ${unit}`;
}

export function PrintSettingsPanel({ settings }: Props) {
  const { printer, filament, quality, strength, temperature, warnings } = settings;

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Thông số in — Bambu Studio</h2>
        <span className={styles.printer}>
          {printer.label} · {printer.buildVolumeMm.x}×{printer.buildVolumeMm.y}×
          {printer.buildVolumeMm.z} mm
        </span>
      </header>

      <div className={styles.groups}>
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Quality</h3>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt>Layer Height</dt>
              <dd>{quality.layerHeightMm} mm</dd>
            </div>
            <div className={styles.row}>
              <dt>Wall Loops</dt>
              <dd>{quality.wallLoops}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Strength</h3>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt>Sparse Infill Density</dt>
              <dd>{strength.sparseInfillDensityPercent}%</dd>
            </div>
            <div className={styles.row}>
              <dt>Infill Pattern</dt>
              <dd>{strength.sparseInfillPattern}</dd>
            </div>
          </dl>
        </div>

        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Filament — {filament.label}</h3>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt>Nozzle Temperature</dt>
              <dd className={temperature.nozzleC === null ? styles.missing : undefined}>
                {formatRange(temperature.nozzleC, '°C')}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>Bed Temperature</dt>
              <dd className={temperature.bedC === null ? styles.missing : undefined}>
                {formatRange(temperature.bedC, '°C')}
              </dd>
            </div>
          </dl>
          <a
            className={styles.source}
            href={filament.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Nguồn thông số ↗
          </a>
        </div>
      </div>

      {warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {warnings.map((warning) => (
            <li
              key={warning.message}
              className={warning.level === 'warning' ? styles.warning : styles.info}
            >
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.disclaimer}>
        Nhóm Quality / Strength lấy từ hướng dẫn bên thứ ba, chưa đối chiếu với preset chính thức
        của Bambu. Kiểm tra lại trong Bambu Studio trước khi in thật.
      </p>
    </section>
  );
}
