import type { IdeaData } from '../data/bundledData';
import type { MixResult } from '../types';
import { EditableChip, type ChipOptionGroup } from './EditableChip';
import styles from './IdeaBreakdown.module.css';

type Props = {
  mix: MixResult;
  data: IdeaData;
  onSelectSecondaryProduct: (categoryId: string, productId: string) => void;
  onSelectCharacter: (characterId: string) => void;
  onSelectFusion: (fusionId: string) => void;
  onSecondaryOverrideChange: (text: string) => void;
  onCharacterOverrideChange: (text: string) => void;
};

/** Giá trị rỗng trong dropdown nhân vật — để bỏ nhân vật đang chọn. */
const NO_CHARACTER = '';

/**
 * Cho user thấy ý tưởng vừa sinh được ghép từ những mảnh nào, và đổi được hai mảnh
 * lai ghép (sản phẩm phụ, nhân vật) — chọn từ danh sách hoặc gõ text tự do.
 *
 * Ô nhân vật hiện ở MỌI mức sáng tạo: ngay ở mức An toàn user vẫn cần gõ tên một nhân vật
 * có thật để dùng option màu "Màu gốc theo nguyên tác" và ba chiều thế đứng / biểu cảm /
 * trang phục.
 */
export function IdeaBreakdown({
  mix,
  data,
  onSelectSecondaryProduct,
  onSelectCharacter,
  onSelectFusion,
  onSecondaryOverrideChange,
  onCharacterOverrideChange,
}: Props) {
  const { product, secondaryProduct, secondaryCategory, fusion, character } = mix;

  // Dropdown sản phẩm phụ gom theo danh mục để dễ tìm trong 510 sản phẩm
  const secondaryGroups: ChipOptionGroup[] = data.categories.map((category) => ({
    label: category.label,
    options: category.products.map((item) => ({
      value: `${category.id}/${item.id}`,
      label: item.label,
    })),
  }));

  const characterGroups: ChipOptionGroup[] = [
    {
      label: 'Nhân vật',
      options: [
        { value: NO_CHARACTER, label: '— Không có —' },
        ...data.characters.map((item) => ({ value: item.id, label: item.label })),
      ],
    },
  ];

  const showSecondary = Boolean(fusion);

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Ý tưởng này ghép từ</h2>

      <div className={styles.chips}>
        <div className={styles.chipStatic}>
          <span className={styles.chipRole}>{mix.category.label}</span>
          <span className={styles.chipValue}>{product.label}</span>
        </div>

        {showSecondary && fusion ? (
          <>
            <select
              className={styles.fusionSelect}
              value={fusion.id}
              onChange={(event) => onSelectFusion(event.target.value)}
              title="Đổi công thức lai"
            >
              {data.fusionFormulas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            <EditableChip
              role={secondaryCategory?.label ?? 'Sản phẩm phụ'}
              selectedValue={
                secondaryCategory && secondaryProduct
                  ? `${secondaryCategory.id}/${secondaryProduct.id}`
                  : ''
              }
              groups={secondaryGroups}
              onSelect={(value) => {
                const [categoryId, productId] = value.split('/');
                if (categoryId && productId) onSelectSecondaryProduct(categoryId, productId);
              }}
              overrideText={mix.secondaryOverride}
              onOverrideChange={onSecondaryOverrideChange}
              variant="secondary"
            />
          </>
        ) : null}

        <span className={styles.operator}>tạo hình</span>
        <EditableChip
          role="Nhân vật"
          selectedValue={character?.id ?? NO_CHARACTER}
          groups={characterGroups}
          onSelect={onSelectCharacter}
          overrideText={mix.characterOverride}
          onOverrideChange={onCharacterOverrideChange}
          variant="character"
        />
      </div>
    </section>
  );
}
