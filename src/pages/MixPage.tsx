import { CreativitySlider } from '../components/CreativitySlider';
import { FlowSourceToggle } from '../components/FlowSourceToggle';
import { IdeaBreakdown } from '../components/IdeaBreakdown';
import { MeshChecklistPanel } from '../components/MeshChecklistPanel';
import { PrintSettingsPanel } from '../components/PrintSettingsPanel';
import { PrintabilityToggle } from '../components/PrintabilityToggle';
import { PromptPanel } from '../components/PromptPanel';
import { SelectField } from '../components/SelectField';
import type { IdeaData } from '../data/bundledData';
import { FILAMENTS } from '../data/filaments';
import { useIdeaMixer } from '../hooks/useIdeaMixer';
import {
  allowsFreeText,
  isCharacterSubject,
  isCharacterTraitAxis,
  NO_COSTUME_ID,
} from '../lib/characterTraits';
import type { AttributeAxisId } from '../types';
import styles from './MixPage.module.css';

type Props = { data: IdeaData };

/** Ghi chú dưới selectbox của một vài axis cần giải thích thêm. */
const AXIS_HINTS: Partial<Record<AttributeAxisId, string>> = {
  pose: 'Chỉ áp dụng cho sản phẩm nhân vật — chọn "Mặc định" để Gemini tự quyết',
  expression: 'Chỉ áp dụng cho sản phẩm nhân vật — chọn "Mặc định" để Gemini tự quyết',
  outfit: 'Chỉ áp dụng cho sản phẩm nhân vật',
  costume: 'Trọn bộ theo chủ đề — chọn bộ nào là ghi đè Trang phục',
};

export function MixPage({ data }: Props) {
  const mixer = useIdeaMixer(data);
  const { mix } = mixer;

  // Các chiều nhân vật hiện khi danh mục là danh mục nhân vật (Đồ chơi & mô hình),
  // hoặc sản phẩm lẻ được đánh dấu, hoặc mix đang bật lớp nhân vật
  const showCharacterTraits = isCharacterSubject(mix);
  const visibleAxes = data.attributeAxes.filter(
    (axis) => showCharacterTraits || !isCharacterTraitAxis(axis.id),
  );

  // Nói thẳng cho user biết Trang phục đang không có tác dụng, thay vì để họ đổi mà không thấy gì
  const costumeActive = Boolean(
    mix.attributes.costume && mix.attributes.costume.id !== NO_COSTUME_ID,
  );
  const axisHint = (axisId: AttributeAxisId) =>
    axisId === 'outfit' && costumeActive ? 'Đang bị Bộ cosplay ghi đè' : AXIS_HINTS[axisId];

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

      <div className={styles.knobs}>
        <CreativitySlider value={mixer.creativity} onChange={mixer.setCreativity} />
        <PrintabilityToggle value={mixer.printability} onChange={mixer.setPrintability} />
      </div>

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
        {visibleAxes.map((axis) => (
          <SelectField
            key={axis.id}
            label={axis.label}
            value={mix.attributes[axis.id].id}
            options={axis.options}
            onChange={(optionId) => mixer.selectAttribute(axis.id, optionId)}
            hint={axisHint(axis.id)}
            {...(allowsFreeText(axis.id)
              ? {
                  overrideText: mix.attributeOverrides?.[axis.id] ?? null,
                  onOverrideChange: (text: string) => mixer.setAttributeOverride(axis.id, text),
                }
              : {})}
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
        <IdeaBreakdown
          mix={mix}
          data={data}
          onSelectSecondaryProduct={mixer.selectSecondaryProduct}
          onSelectCharacter={mixer.selectCharacter}
          onSelectFusion={mixer.selectFusion}
          onSecondaryOverrideChange={mixer.setSecondaryOverride}
          onCharacterOverrideChange={mixer.setCharacterOverride}
        />
        <PromptPanel
          prompt={mixer.prompt}
          title="Prompt ảnh — Gemini"
          hint="Dán vào Gemini để ra ảnh sản phẩm. Ảnh này là đầu vào cho tool dựng mô hình 3D."
        />
        <PromptPanel
          prompt={mixer.flowPrompt}
          title="Prompt ảnh nhiều góc — Google Flow"
          hint="Dán vào flow.google để ra MỘT ảnh chứa bốn góc nhìn của cùng vật thể. Tool dựng mesh sát hơn hẳn so với ảnh đơn, và thấy được mặt sau — chỗ hình dạng không in được hay trốn."
          controls={<FlowSourceToggle value={mixer.flowSource} onChange={mixer.setFlowSource} />}
        />
        <PrintSettingsPanel settings={mixer.printSettings} />
        <MeshChecklistPanel items={mixer.meshChecklist} />
      </div>
    </div>
  );
}
