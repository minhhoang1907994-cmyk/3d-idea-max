import { useState } from 'react';
import { OptionEditor } from '../components/OptionEditor';
import type { useIdeaData } from '../hooks/useIdeaData';
import styles from './DataManagerPage.module.css';

type Props = { dataStore: ReturnType<typeof useIdeaData> };

/** Khoá nhóm đang chọn: `category:<id>` hoặc `axis:<id>` */
type GroupKey = string;

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
            Sửa trực tiếp các file JSON trong <code>src/data/json/</code>. Thay đổi chỉ ghi xuống
            đĩa khi bấm Lưu.
          </p>
        </div>

        <div className={styles.actions}>
          {supportsFileSystem ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void dataStore.connect()}
            >
              {status.connected ? `Thư mục: ${status.directoryName ?? ''}` : 'Kết nối thư mục data'}
            </button>
          ) : null}
          <button type="button" className={styles.secondaryButton} onClick={dataStore.downloadAll}>
            Tải JSON về
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!status.dirty || !status.connected}
            onClick={() => void dataStore.save()}
          >
            {status.dirty ? 'Lưu xuống file' : 'Đã lưu'}
          </button>
        </div>
      </header>

      {!supportsFileSystem ? (
        <p className={styles.banner}>
          Trình duyệt này không ghi được file trực tiếp (chỉ Chrome và Edge hỗ trợ). Bạn vẫn sửa
          được, rồi bấm <strong>Tải JSON về</strong> và chép đè vào <code>src/data/json/</code>.
        </p>
      ) : !status.connected ? (
        <p className={styles.banner}>
          Chưa kết nối thư mục. Bấm <strong>Kết nối thư mục data</strong> rồi chọn
          <code> src/data/json/ </code> để đọc và ghi thẳng vào file thật.
          <strong> Nên commit git trước</strong> để còn khôi phục nếu xóa nhầm.
        </p>
      ) : null}

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
