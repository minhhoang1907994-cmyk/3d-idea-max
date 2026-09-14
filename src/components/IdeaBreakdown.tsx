import type { MixResult } from '../types';
import styles from './IdeaBreakdown.module.css';

type Props = { mix: MixResult };

/**
 * Cho user thấy ý tưởng vừa sinh được ghép từ những mảnh nào — quan trọng vì ở mức
 * sáng tạo cao, prompt dài và khó nhìn ra đâu là phần lai.
 */
export function IdeaBreakdown({ mix }: Props) {
  const { product, secondaryProduct, secondaryCategory, fusion, mechanism, character } = mix;

  const hasCreativeLayers = Boolean(fusion ?? mechanism ?? character);
  if (!hasCreativeLayers) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Ý tưởng này ghép từ</h2>

      <div className={styles.chips}>
        <span className={styles.chip}>
          <span className={styles.chipRole}>{mix.category.label}</span>
          {product.label}
        </span>

        {fusion && secondaryProduct && secondaryCategory ? (
          <>
            <span className={styles.operator}>
              {fusion.label.replace('A', '').replace('B', '')}
            </span>
            <span className={`${styles.chip} ${styles.chipSecondary}`}>
              <span className={styles.chipRole}>{secondaryCategory.label}</span>
              {secondaryProduct.label}
            </span>
          </>
        ) : null}

        {character ? (
          <>
            <span className={styles.operator}>tạo hình</span>
            <span className={`${styles.chip} ${styles.chipCharacter}`}>
              <span className={styles.chipRole}>Nhân vật</span>
              {character.label}
            </span>
          </>
        ) : null}
      </div>

      {fusion ? (
        <p className={styles.formula}>
          Công thức lai: <strong>{fusion.label}</strong>
        </p>
      ) : null}

      {mechanism ? (
        <p className={styles.mechanism}>
          <strong>{mechanism.label}</strong> — {mechanism.description}
        </p>
      ) : null}

      {mix.personalization ? (
        <p className={styles.personalization}>Cá nhân hóa: {mix.personalization.label}</p>
      ) : null}
    </section>
  );
}
