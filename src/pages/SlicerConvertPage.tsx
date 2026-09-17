import { useMemo, useRef, useState } from 'react';
import { MACHINE_IDS_WITH_PRESETS } from '../data/machinePresets';
import { PRINTERS_BY_ID } from '../data/printers';
import { DEFAULT_SLICER_TARGET_ID, SLICER_TARGETS } from '../data/slicerTargets';
import {
  buildGeometryArchive,
  buildMappingText,
  buildProcessPreset,
  geometryFileName,
} from '../lib/buildSlicerHandoff';
import { convertToTargetMachine, filamentPresetsForPrinter } from '../lib/convertToTargetMachine';
import { inspectProjectFile } from '../lib/inspectProjectFile';
import { readZipEntries, writeStoredZip } from '../lib/zipArchive';
import type { ArchiveFile, ConvertedValue, ProjectInspection, SlicerTarget } from '../types';
import styles from './SlicerConvertPage.module.css';

type Status =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'ready'; files: ArchiveFile[]; inspection: ProjectInspection }
  | { kind: 'error'; message: string };

const ROLE_LABELS: Record<string, string> = {
  geometry: 'Hình học',
  structure: 'Cấu trúc 3MF',
  settings: 'Thông số của máy cũ',
  gcode: 'Gcode đã cắt lớp',
  thumbnail: 'Ảnh xem trước',
  other: 'Khác',
};

/** Máy có preset chính hãng trong app — dropdown "máy đích" chỉ liệt kê các máy này. */
const TARGET_PRINTERS = MACHINE_IDS_WITH_PRESETS.map((id) => PRINTERS_BY_ID[id]).filter(
  (printer) => printer !== undefined,
);

const DEFAULT_TARGET_PRINTER_ID = TARGET_PRINTERS.at(-1)?.id ?? '';

/** Một ô "Giá trị quy đổi" — ba trạng thái, không có trạng thái "đoán". */
function renderConverted(converted: ConvertedValue | undefined) {
  if (!converted) return null;
  if (converted.kind === 'keep') {
    return (
      <>
        <span className={styles.mono}>{converted.value}</span>
        <span className={styles.note}>giữ nguyên số trong file</span>
      </>
    );
  }
  if (converted.kind === 'target') {
    return (
      <>
        <span className={converted.changed ? styles.changedValue : styles.mono}>
          {converted.value}
        </span>
        <span className={styles.note}>
          {converted.changed ? 'khác file — phải sửa ô này' : 'máy đích để cùng số'}
        </span>
      </>
    );
  }
  return (
    <>
      <span className={styles.missing}>chưa có dữ liệu</span>
      <span className={styles.note}>{converted.reason}</span>
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Tải file về máy. Object URL được thu hồi ngay sau khi trình duyệt nhận lệnh tải. */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function SlicerConvertPage() {
  const [targetId, setTargetId] = useState(DEFAULT_SLICER_TARGET_ID);
  const [targetPrinterId, setTargetPrinterId] = useState(DEFAULT_TARGET_PRINTER_ID);
  /** Rỗng = để app tự dò theo loại nhựa ghi trong file */
  const [filamentPresetName, setFilamentPresetName] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [includeMachineTier, setIncludeMachineTier] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const target: SlicerTarget =
    SLICER_TARGETS.find((item) => item.id === targetId) ?? SLICER_TARGETS[0]!;
  const sameFamily = target.presetTransfer === 'direct';

  const inspection = status.kind === 'ready' ? status.inspection : null;
  const targetPrinterLabel = PRINTERS_BY_ID[targetPrinterId]?.label ?? 'máy đích';

  // Quy đổi lại mỗi khi đổi file hoặc đổi máy đích — không phụ thuộc slicer, vì thông số
  // là của máy, còn slicer chỉ quyết định cách nạp preset vào
  const conversion = useMemo(
    () =>
      inspection
        ? convertToTargetMachine(inspection, targetPrinterId, filamentPresetName || undefined)
        : null,
    [inspection, targetPrinterId, filamentPresetName],
  );

  const filamentOptions = useMemo(
    () => filamentPresetsForPrinter(targetPrinterId),
    [targetPrinterId],
  );

  /** Ô mà máy đích ghi số khác file, hoặc không có cơ sở để đưa số — đều cần người quyết. */
  function isChanged(orcaKey: string): boolean {
    const converted = conversion?.byKey[orcaKey];
    if (!converted) return false;
    return converted.kind === 'unavailable' || (converted.kind === 'target' && converted.changed);
  }

  const visibleSettings =
    onlyChanged && inspection
      ? inspection.settings.filter((setting) => isChanged(setting.mapping.orcaKey))
      : (inspection?.settings ?? []);

  async function pickFile(picked: File | undefined) {
    if (!picked) return;
    if (!/\.(3mf|zip)$/i.test(picked.name)) {
      setStatus({
        kind: 'error',
        message: 'Chỉ đọc được file .3mf (project của Bambu Studio / OrcaSlicer và các fork).',
      });
      return;
    }

    setStatus({ kind: 'reading' });
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      const files = await readZipEntries(bytes);
      setStatus({ kind: 'ready', files, inspection: inspectProjectFile(picked.name, files) });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không đọc được file này.',
      });
    }
  }

  function handleDownloadGeometry(files: ArchiveFile[], inspection: ProjectInspection) {
    try {
      const archive = writeStoredZip(buildGeometryArchive(files));
      downloadBlob(
        new Blob([archive as BlobPart], { type: 'model/3mf' }),
        geometryFileName(inspection.fileName),
      );
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không xuất được file hình học.',
      });
    }
  }

  function handleDownloadPreset(inspection: ProjectInspection) {
    try {
      const preset = buildProcessPreset(inspection, target, includeMachineTier);
      downloadBlob(new Blob([preset.json], { type: 'application/json' }), preset.fileName);
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không sinh được preset.',
      });
    }
  }

  async function handleCopyMapping(inspection: ProjectInspection) {
    const text = buildMappingText(inspection, target, conversion ?? undefined);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus({
        kind: 'error',
        message: 'Trình duyệt chặn copy tự động — bôi đen bảng bên dưới rồi copy tay.',
      });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Đổi slicer</h1>
        <p className={styles.subtitle}>
          File .3mf tải từ MakerWorld là project của Bambu Studio: nó mang sẵn preset của máy Bambu
          và gcode đã cắt lớp cho đúng máy đó. Trang này tách file thành hai phần — hình học để mở ở
          slicer nào cũng được, và thông số cắt lớp để mang sang máy của bạn.
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Bạn dùng slicer nào?</span>
            <select
              className={styles.select}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {SLICER_TARGETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} — {item.vendor}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Máy in đích</span>
            <select
              className={styles.select}
              value={targetPrinterId}
              onChange={(event) => setTargetPrinterId(event.target.value)}
            >
              {TARGET_PRINTERS.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.label}
                </option>
              ))}
            </select>
            <span className={styles.fieldHint}>
              Chỉ liệt kê máy app đã có preset chính hãng để đối chiếu. Thêm máy khác: xem
              docs/research/slicer-interop.md mục 7.
            </span>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Filament sẽ nạp trên máy đích</span>
          <select
            className={styles.select}
            value={filamentPresetName}
            onChange={(event) => setFilamentPresetName(event.target.value)}
          >
            <option value="">— Tự dò theo loại nhựa ghi trong file —</option>
            {filamentOptions.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
          <span className={styles.fieldHint}>
            Nhiệt độ và lưu lượng lấy từ preset filament chính hãng của máy đích. Đây là số cho cuộn
            nhựa hãng bán kèm — dùng cuộn hãng khác thì phải theo nhãn trên cuộn đó.
          </span>
        </label>

        <p className={styles.targetNote}>
          {target.forkedFrom ? `Fork từ ${target.forkedFrom}. ` : ''}
          {target.transferNote}{' '}
          <a className={styles.link} href={target.sourceUrl} target="_blank" rel="noreferrer">
            Nguồn ↗
          </a>
        </p>
      </section>

      <section
        className={styles.dropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void pickFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          className={styles.fileInput}
          type="file"
          accept=".3mf,.zip"
          onChange={(event) => void pickFile(event.target.files?.[0])}
        />
        <p className={styles.dropHint}>
          {status.kind === 'reading'
            ? 'Đang đọc file…'
            : (inspection?.fileName ?? 'Kéo file .3mf vào đây, hoặc bấm nút bên dưới')}
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => inputRef.current?.click()}
        >
          {inspection ? 'Đổi file' : 'Chọn file .3mf'}
        </button>
        <p className={styles.privacyNote}>
          File được đọc ngay trong trình duyệt, không gửi lên máy chủ nào.
        </p>
      </section>

      {status.kind === 'error' ? <p className={styles.error}>{status.message}</p> : null}

      {status.kind === 'ready' && inspection ? (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>File này đang mang theo gì</h2>
            <dl className={styles.summary}>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryKey}>Phần mềm đã tạo</dt>
                <dd className={styles.summaryValue}>{inspection.producedBy ?? 'không ghi'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryKey}>Preset máy</dt>
                <dd className={styles.summaryValue}>{inspection.printerPreset ?? 'không ghi'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryKey}>Preset cắt lớp</dt>
                <dd className={styles.summaryValue}>{inspection.processPreset ?? 'không ghi'}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt className={styles.summaryKey}>Filament</dt>
                <dd className={styles.summaryValue}>
                  {inspection.filamentPresets.length > 0
                    ? inspection.filamentPresets.join(', ')
                    : 'không ghi'}
                </dd>
              </div>
            </dl>

            {inspection.warnings.length > 0 ? (
              <ul className={styles.warningList}>
                {inspection.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className={warning.level === 'warning' ? styles.warning : styles.info}
                  >
                    {warning.message}
                    {warning.sourceUrl ? (
                      <>
                        {' '}
                        <a
                          className={styles.link}
                          href={warning.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Nguồn ↗
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <details className={styles.details}>
              <summary className={styles.detailsSummary}>
                Chi tiết {inspection.entries.length} file bên trong
              </summary>
              <div className={styles.tableScroller}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Đường dẫn</th>
                      <th>Vai trò</th>
                      <th>Kích thước</th>
                      <th>Xuất ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.entries.map((entry) => (
                      <tr key={entry.path}>
                        <td className={styles.mono}>{entry.path}</td>
                        <td>{ROLE_LABELS[entry.role] ?? entry.role}</td>
                        <td>{formatSize(entry.sizeBytes)}</td>
                        <td>{entry.kept ? 'giữ' : 'bỏ'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Mang sang {target.label}</h2>

            <ol className={styles.steps}>
              <li>
                Tải <strong>file hình học</strong> rồi mở nó trong {target.label}. File này đã bỏ
                preset máy Bambu, gcode cắt sẵn và ảnh xem trước — chỉ còn mô hình.
              </li>
              <li>
                Chọn <strong>máy in của bạn</strong> trong {target.label}. App không ánh xạ máy sang
                máy: không tồn tại bảng tương đương chính hãng giữa máy Bambu và máy hãng khác.
              </li>
              <li>
                {sameFamily ? (
                  <>
                    Tải <strong>preset cắt lớp</strong>, rồi vào{' '}
                    <code className={styles.code}>File → Import → Import Configs…</code> để nạp.
                  </>
                ) : (
                  <>
                    {target.label} không đọc được preset họ Orca, nên nhập tay theo bảng ánh xạ bên
                    dưới.
                  </>
                )}
              </li>
              <li>
                Đối chiếu lại nhóm <strong>phụ thuộc máy</strong> (nhiệt độ, tốc độ, gia tốc) theo
                preset sẵn có của máy bạn — đừng bê thẳng số của máy Bambu.
              </li>
            </ol>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleDownloadGeometry(status.files, inspection)}
              >
                Tải file hình học (.3mf)
              </button>

              {sameFamily && inspection.rawSettings ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleDownloadPreset(inspection)}
                >
                  Tải preset cắt lớp (.json)
                </button>
              ) : null}

              {inspection.settings.length > 0 ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleCopyMapping(inspection)}
                >
                  {copied ? 'Đã copy' : 'Copy bảng ánh xạ'}
                </button>
              ) : null}
            </div>

            {sameFamily && inspection.rawSettings ? (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={includeMachineTier}
                  onChange={(event) => setIncludeMachineTier(event.target.checked)}
                />
                <span>
                  Mang theo cả tốc độ và gia tốc của máy cũ. Mặc định tắt: tốc độ của máy nguồn
                  thường vượt khả năng máy đích, bật lên thì phải tự kiểm tra từng ô.
                </span>
              </label>
            ) : null}
          </section>

          {inspection.settings.length > 0 ? (
            <section className={styles.card}>
              <div className={styles.tableHeader}>
                <h2 className={styles.cardTitle}>Bảng ánh xạ thông số</h2>
                {conversion ? (
                  <span className={styles.changeSummary}>
                    <strong className={styles.changeCount}>{conversion.changedCount}</strong> ô phải
                    sửa khi sang {targetPrinterLabel}
                    {conversion.unavailableCount > 0
                      ? ` · ${conversion.unavailableCount} ô phải tự quyết`
                      : ''}
                  </span>
                ) : null}
              </div>

              <p className={styles.cardNote}>
                Cột <strong>Giá trị quy đổi</strong> cho biết sang {targetPrinterLabel} thì điền số
                nào: nhóm hình học giữ nguyên số trong file, nhóm phụ thuộc máy lấy từ preset chính
                hãng của máy đó. Hai hãng hay để trùng số, nên chỉ dòng <strong>nền vàng</strong> là
                thật sự khác — đó là việc bạn phải làm tay.
              </p>

              {conversion && conversion.changedCount > 0 ? (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={onlyChanged}
                    onChange={(event) => setOnlyChanged(event.target.checked)}
                  />
                  <span>Chỉ hiện những ô cần đổi</span>
                </label>
              ) : null}

              {conversion?.preset ? (
                <p className={styles.cardNote}>
                  Đang đối chiếu với preset <strong>{conversion.preset.name}</strong>{' '}
                  <a
                    className={styles.link}
                    href={conversion.preset.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Nguồn ↗
                  </a>
                </p>
              ) : null}
              {conversion?.filamentPreset ? (
                <p className={styles.cardNote}>
                  Nhiệt độ / lưu lượng theo preset filament{' '}
                  <strong>{conversion.filamentPreset.name}</strong>{' '}
                  <a
                    className={styles.link}
                    href={conversion.filamentPreset.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Nguồn ↗
                  </a>
                </p>
              ) : null}
              {conversion?.presetNote ? (
                <p className={styles.warning}>{conversion.presetNote}</p>
              ) : null}
              {conversion?.filamentNote ? (
                <p className={styles.warning}>{conversion.filamentNote}</p>
              ) : null}

              <div className={styles.tableScroller}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ô trong Bambu Studio / Orca</th>
                      <th>Giá trị trong file</th>
                      <th>Giá trị quy đổi → {targetPrinterLabel}</th>
                      <th>{target.family === 'cura' ? 'Ô trong Cura' : 'Tên khoá'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSettings.map(({ mapping, value }) => (
                      <tr
                        key={mapping.orcaKey}
                        className={isChanged(mapping.orcaKey) ? styles.rowChanged : undefined}
                      >
                        <td>
                          <span className={styles.settingLabel}>{mapping.label}</span>
                          <span className={styles.settingGroup}>{mapping.group}</span>
                        </td>
                        <td className={styles.mono}>{value}</td>
                        <td>{renderConverted(conversion?.byKey[mapping.orcaKey])}</td>
                        <td>
                          {target.family === 'cura' ? (
                            (mapping.curaLabel ?? (
                              <span className={styles.missing}>
                                không có ô tương đương — phải tự đặt
                              </span>
                            ))
                          ) : (
                            <span className={styles.mono}>{mapping.orcaKey}</span>
                          )}
                          {mapping.note ? (
                            <span className={styles.note}>{mapping.note}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
