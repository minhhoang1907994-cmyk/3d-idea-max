import { CreativitySlider } from '../components/CreativitySlider';
import { IdeaBreakdown } from '../components/IdeaBreakdown';
import { PrintSettingsPanel } from '../components/PrintSettingsPanel';
import { PromptPanel } from '../components/PromptPanel';
import { SelectField } from '../components/SelectField';
import type { IdeaData } from '../data/bundledData';
import { FILAMENTS } from '../data/filaments';
import { useIdeaMixer } from '../hooks/useIdeaMixer';
import styles from './MixPage.module.css';

type Props = { data: IdeaData };

export function MixPage({ data }: Props) {
  const mixer = useIdeaMixer(data);
  const { mix } = mixer;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Trộn ý tưởng</h1>
          <p className={styles.pageSubtitle}>
            Trộn ngẫu nhiên ý tưởng sản phẩm in 3D, sinh prompt cho Gemini kèm thông số in Bambu
            Studio.
          </p>
        </div>
        <button type="button" className={styles.mixButton} onClick={mixer.remix}>
          🎲 Mix
        </button>
      </header>

      <CreativitySlider value={mixer.creativity} onChange={mixer.setCreativity} />

      <section className={styles.controls}>
        <SelectField
          label="Máy in"
          value={mixer.printer.id}
          options={mixer.printers}
          onChange={mixer.setPrinterId}
          hint="Quyết định khổ in và vật liệu hỗ trợ"
        />
        <SelectField
          label="Danh mục"
          value={mix.category.id}
          options={data.categories}
          onChange={mixer.selectCategory}
        />
        <SelectField
          label="Sản phẩm"
          value={mix.product.id}
          options={mix.category.products}
          onChange={mixer.selectProduct}
          hint="Chỉ hiện sản phẩm thuộc danh mục đã chọn"
        />
        {data.attributeAxes.map((axis) => (
          <SelectField
            key={axis.id}
            label={axis.label}
            value={mix.attributes[axis.id].id}
            options={axis.options}
            onChange={(optionId) => mixer.selectAttribute(axis.id, optionId)}
          />
        ))}
        <SelectField
          label="Kích thước"
          value={mix.size.id}
          options={data.technicalAxes.sizes}
          onChange={mixer.selectSize}
          hint="Đối chiếu với khổ in của máy"
        />
        <SelectField
          label="Độ chi tiết"
          value={mix.detail.id}
          options={data.technicalAxes.details}
          onChange={mixer.selectDetail}
          hint="Quyết định Layer Height"
        />
        <SelectField
          label="Mục đích / độ bền"
          value={mix.strength.id}
          options={data.technicalAxes.strengths}
          onChange={mixer.selectStrength}
          hint="Quyết định Infill và Wall Loops"
        />
        <SelectField
          label="Filament"
          value={mix.filament.id}
          options={FILAMENTS}
          onChange={mixer.selectFilament}
          hint="Vật liệu in thật — sinh ra thông số nhiệt"
        />
      </section>

      <div className={styles.results}>
        <IdeaBreakdown mix={mix} />
        <PromptPanel prompt={mixer.prompt} />
        <PrintSettingsPanel settings={mixer.printSettings} />
      </div>
    </div>
  );
}
