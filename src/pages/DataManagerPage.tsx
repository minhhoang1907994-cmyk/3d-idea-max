import { useState } from 'react';
import { OptionEditor } from '../components/OptionEditor';
import type { DataSource, useIdeaData } from '../hooks/useIdeaData';
import styles from './DataManagerPage.module.css';

type Props = { dataStore: ReturnType<typeof useIdeaData> };

/** Khoá nhóm đang chọn: `category:<id>` hoặc `axis:<id>` */
type GroupKey = string;

const SOURCE_LABEL: Record<DataSource, string> = {
  neon: 'Nguồn: Neon (online)',
  bundle: 'Nguồn: bản đóng gói trong app',
  disk: 'Nguồn: thư mục trên máy',
};

export function DataManagerPage({ dataStore }: Props) {
  const { data, status, supportsFileSystem } = dataStore;
  const firstCategory = data.categories[0];
  const [selected, setSelected] = useState<GroupKey>(
    firstCategory ? `category:${firstCategory.id}` : '',
  );

  const [kind, id] = selected.split(':');
  const category = kind === 'category' ? data.categories.find((item) => item.id === id) : undefined;
  const axis = kind === 'axis' ? data.attributeAxes.find((item) => item.id === id) : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý dữ liệu</h1>
          <p className={styles.subtitle}>
            Dữ liệu ý tưởng lưu online trên Neon. Bấm <strong>Lưu lên Neon</strong> là mọi người mở
            web đều thấy bản mới — không cần deploy lại.
          </p>
          <p className={styles.sourceBadge}>
            {status.loading ? 'Đang tải từ Neon…' : SOURCE_LABEL[status.source]}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!status.online || status.loading}
            onClick={() => void dataStore.reload()}
          >
            Tải lại từ Neon
          </button>
          {supportsFileSystem ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void dataStore.connect()}
            >
              {status.connected ? `Thư mục: ${status.directoryName ?? ''}` : 'Kết nối thư mục data'}
            </button>
          ) : null}
          {status.connected ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void dataStore.saveToDisk()}
            >
              Ghi xuống file JSON
            </button>
          ) : null}
          <button type="button" className={styles.secondaryButton} onClick={dataStore.downloadAll}>
            Tải JSON về
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!status.dirty || status.saving || !status.online}
            onClick={() => void dataStore.saveToNeon()}
          >
            {status.saving ? 'Đang lưu…' : status.dirty ? 'Lưu lên Neon' : 'Đã lưu'}
          </button>
        </div>
      </header>

      {!status.online ? (
        <p className={styles.banner}>
          Bản build này chưa có chuỗi kết nối Neon (<code>VITE_NEON_DATABASE_URL</code>), nên đang
          chạy bằng dữ liệu đóng gói sẵn — <strong>sửa gì cũng mất khi tải lại trang</strong>. Cách
          cấu hình xem <code>docs/neon-setup.md</code>.
        </p>
      ) : (
        <p className={styles.banner}>
          Dữ liệu trên Neon <strong>ai mở được web cũng sửa được</strong> (không có đăng nhập). Neon
          giữ 20 bản ghi đè gần nhất để lùi lại, nhưng nên thỉnh thoảng bấm{' '}
          <strong>Tải JSON về</strong> rồi commit vào repo làm bản gốc.
        </p>
      )}

      {status.error ? <p className={styles.error}>{status.error}</p> : null}
      {status.message ? <p className={styles.success}>{status.message}</p> : null}

      <div className={styles.body}>
        <aside className={styles.groupList}>
          <p className={styles.groupHeading}>Danh mục sản phẩm</p>
          <ul className={styles.groups}>
            {data.categories.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    selected === `category:${item.id}`
                      ? `${styles.groupItem} ${styles.groupItemActive}`
                      : styles.groupItem
                  }
                  onClick={() => setSelected(`category:${item.id}`)}
                >
                  <span>{item.label}</span>
                  <span className={styles.groupCount}>{item.products.length}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className={styles.groupHeading}>Thuộc tính thẩm mỹ</p>
          <ul className={styles.groups}>
            {data.attributeAxes.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    selected === `axis:${item.id}`
                      ? `${styles.groupItem} ${styles.groupItemActive}`
                      : styles.groupItem
                  }
                  onClick={() => setSelected(`axis:${item.id}`)}
                >
                  <span>{item.label}</span>
                  <span className={styles.groupCount}>{item.options.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.content}>
          {category ? (
            <OptionEditor
              title={`Sản phẩm — ${category.label}`}
              options={category.products}
              onAdd={(product) => dataStore.addProduct(category.id, product)}
              onUpdate={(productId, patch) =>
                dataStore.updateProduct(category.id, productId, patch)
              }
              onDelete={(productId) => dataStore.deleteProduct(category.id, productId)}
            />
          ) : null}

          {axis ? (
            <OptionEditor
              title={`Thuộc tính — ${axis.label}`}
              options={axis.options}
              onAdd={(option) => dataStore.addAxisOption(axis.id, option)}
              onUpdate={(optionId, patch) => dataStore.updateAxisOption(axis.id, optionId, patch)}
              onDelete={(optionId) => dataStore.deleteAxisOption(axis.id, optionId)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
