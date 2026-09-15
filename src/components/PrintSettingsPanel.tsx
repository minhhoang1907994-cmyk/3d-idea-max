import { useMemo, useState } from 'react';
import type { PrintSettings, Range, SettingsTabId, SlicerId } from '../types';
import styles from './PrintSettingsPanel.module.css';

type Props = { settings: PrintSettings };

/** `null` = chưa verify được từ tài liệu Bambu — hiển thị rõ, không đoán số. */
function formatRange(range: Range | null, unit: string): string {
  if (range === null) return 'chưa có dữ liệu';
  return `${range.min} – ${range.max} ${unit}`;
}

export function PrintSettingsPanel({ settings }: Props) {
  const { printer, filament, slicers, temperature, warnings } = settings;
  const [activeTab, setActiveTab] = useState<SettingsTabId>('quality');
  // Slicer chính hãng của máy luôn đứng đầu — mặc định mở đúng phần mềm user đang dùng.
  const [activeSlicerId, setActiveSlicerId] = useState<SlicerId | null>(null);

  const slicer = useMemo(
    () => slicers.find((item) => item.id === activeSlicerId) ?? slicers[0]!,
    [slicers, activeSlicerId],
  );
  const { tabs } = slicer;

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const missingCount = tabs
    .flatMap((tab) => tab.groups.flatMap((group) => group.rows))
    .filter((row) => row.value === null).length;

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Thông số in — {slicer.label}</h2>
          {slicer.presetName ? (
            <>
              <p className={styles.preset}>{slicer.presetName}</p>
              {slicer.presetNote ? <p className={styles.presetNote}>{slicer.presetNote}</p> : null}
            </>
          ) : (
            <p className={styles.presetMissing}>{slicer.presetNote}</p>
          )}
        </div>
        <span className={styles.printer}>
          {printer.buildVolumeMm.x}×{printer.buildVolumeMm.y}×{printer.buildVolumeMm.z} mm
        </span>
      </header>

      <nav className={styles.slicers} aria-label="Phần mềm cắt lớp">
        {slicers.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === slicer.id ? `${styles.slicer} ${styles.slicerActive}` : styles.slicer
            }
            onClick={() => setActiveSlicerId(item.id)}
            aria-current={item.id === slicer.id ? 'true' : undefined}
          >
            {item.label}
            {item.supportsSelectedPrinter ? null : <span className={styles.slicerTag}>≠ máy</span>}
          </button>
        ))}
      </nav>

      <div className={styles.filamentBar}>
        <div className={styles.filamentInfo}>
          <span className={styles.filamentLabel}>{filament.label}</span>
          <span className={styles.temps}>
            Nozzle{' '}
            <strong className={temperature.nozzleC === null ? styles.missing : undefined}>
              {formatRange(temperature.nozzleC, '°C')}
            </strong>
            {' · '}Bed{' '}
            <strong className={temperature.bedC === null ? styles.missing : undefined}>
              {formatRange(temperature.bedC, '°C')}
            </strong>
          </span>
        </div>
        <a
          className={styles.source}
          href={filament.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Nguồn ↗
        </a>
      </div>

      <nav className={styles.tabs} aria-label="Nhóm thông số">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActiveTab(tab.id)}
            aria-current={tab.id === activeTab ? 'true' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {currentTab ? (
        <div className={styles.groups}>
          {currentTab.groups.map((group) => (
            <div key={group.title} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <dl className={styles.rows}>
                {group.rows.map((row) => (
                  <div key={row.label} className={styles.row}>
                    <dt className={styles.rowLabel}>
                      {row.label}
                      {row.note ? <span className={styles.note}>{row.note}</span> : null}
                    </dt>
                    <dd className={row.value === null ? styles.missingValue : styles.value}>
                      {row.value ?? 'chưa có dữ liệu'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {warnings.map((warning) => (
            <li
              key={warning.message}
              className={warning.level === 'warning' ? styles.warning : styles.info}
            >
              {warning.message}
              {warning.sourceUrl ? (
                <>
                  {' '}
                  <a
                    className={styles.source}
                    href={warning.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Nguồn ↗
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.disclaimer}>
        Giá trị Quality/Strength suy từ lựa chọn độ chi tiết và mục đích sử dụng, chưa đối chiếu với
        preset chính thức của Bambu.
        {missingCount > 0
          ? ` Còn ${missingCount} tham số chưa có dữ liệu — mở preset tương ứng trong ${slicer.label} để lấy.`
          : ''}{' '}
        Luôn kiểm tra lại trong {slicer.label} trước khi in thật.{' '}
        <a
          className={styles.source}
          href={slicer.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          Trang {slicer.label} ↗
        </a>
      </p>
    </section>
  );
}
