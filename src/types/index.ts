/**
 * Nguồn sự thật cho toàn bộ data model.
 * Mọi thay đổi ở đây phải đồng bộ với CLAUDE.md > Data Model.
 */

export type Range = { min: number; max: number };

/** Sản phẩm cụ thể thuộc một danh mục. */
export type Product = {
  /** kebab-case, duy nhất trong phạm vi category, BẤT BIẾN */
  id: string;
  /** Nhãn hiển thị trên UI */
  label: string;
  /** Mảnh câu tiếng Anh ghép vào slot Subject — phải ghép được thành câu tự nhiên */
  promptText: string;
  /**
   * Sản phẩm có mặt / tay chân — chỉ khi đó các axis Thế đứng / Biểu cảm / Trang phục /
   * Bộ cosplay mới có nghĩa. Vắng mặt nghĩa là không phải nhân vật (bình hoa, hộp bút...).
   *
   * Chỉ cần đánh dấu sản phẩm lẻ nằm trong danh mục KHÔNG phải danh mục nhân vật; nếu cả
   * danh mục là nhân vật thì đánh dấu `ProductCategory.isCharacter` gọn hơn.
   * Xem CHARACTER_TRAIT_AXIS_IDS trong lib/characterTraits.ts.
   */
  isCharacter?: boolean;
};

/**
 * Nhóm khái niệm của danh mục. Dùng để đo "khoảng cách ý tưởng" khi lai ghép:
 * ghép hai danh mục khác domain cho ra ý tưởng bất ngờ hơn nhiều so với cùng domain
 * (dụng cụ × đồ chơi lạ hơn hẳn đồ bếp × đồ bếp).
 */
export type CategoryDomain = 'functional' | 'decorative' | 'playful' | 'mechanical' | 'nature';

/** Danh mục sản phẩm. Cascading: random category trước, rồi random product bên trong. */
export type ProductCategory = {
  id: string;
  label: string;
  /** Mảnh câu tiếng Anh mô tả loại sản phẩm, dùng khi cần bổ nghĩa cho Subject */
  promptText: string;
  domain: CategoryDomain;
  /**
   * Cả danh mục là nhân vật — MỌI sản phẩm trong đó bật các axis Thế đứng / Biểu cảm /
   * Trang phục / Bộ cosplay, không cần đánh dấu từng sản phẩm.
   */
  isCharacter?: boolean;
  products: Product[];
};

/** Một lựa chọn trong axis thuộc tính. */
export type AttributeOption = {
  id: string;
  label: string;
  promptText: string;
};

/**
 * Axis thẩm mỹ thuần — chỉ ảnh hưởng prompt ảnh, không ảnh hưởng thông số in.
 * Mỗi axis ~20-30 option.
 *
 * `style` / `surface` / `color` áp dụng cho mọi sản phẩm.
 * `pose` / `expression` / `outfit` / `costume` chỉ ghép vào prompt khi sản phẩm là nhân vật
 * (`ProductCategory.isCharacter` / `Product.isCharacter`) hoặc mix đang bật lớp nhân vật —
 * xem lib/characterTraits.ts.
 */
export type AttributeAxisId =
  'style' | 'surface' | 'color' | 'pose' | 'expression' | 'outfit' | 'costume';

export type AttributeAxis = {
  id: AttributeAxisId;
  label: string;
  options: AttributeOption[];
};

/**
 * Axis kỹ thuật — vừa vào prompt, vừa là input tính thông số in.
 * Số option ít và có chủ đích: mỗi option gắn với một giá trị in thật,
 * nên KHÔNG mở rộng lên 30 option như axis thẩm mỹ.
 */

/** Kích thước — cần số mm thật để đối chiếu khổ in của máy. */
export type SizeOption = AttributeOption & {
  /** Cạnh dài nhất ước lượng, dùng để so với buildVolumeMm */
  longestEdgeMm: number;
};

/** Độ chi tiết → quyết định Layer Height. */
export type DetailOption = AttributeOption & {
  layerHeightMm: number;
};

/** Mục đích sử dụng / độ chịu lực → quyết định Infill + Wall Loops + số lớp vỏ. */
export type StrengthOption = AttributeOption & {
  sparseInfillDensityPercent: number;
  sparseInfillPattern: InfillPattern;
  wallLoops: number;
  topShellLayers: number;
  bottomShellLayers: number;
};

/**
 * Filament tách riêng khỏi AttributeOption vì có ràng buộc in thật.
 * Giá trị `null` nghĩa là CHƯA VERIFY được từ tài liệu Bambu chính thức —
 * UI phải hiển thị "chưa có dữ liệu", TUYỆT ĐỐI không đoán số.
 */
export type Filament = {
  id: string;
  label: string;
  /** Mô tả bề mặt/chất liệu tiếng Anh cho prompt ảnh */
  promptText: string;
  nozzleTempC: Range | null;
  bedTempC: Range | null;
  /** Cần buồng in kín để tránh cong vênh */
  requiresEnclosure: boolean;
  /** Chứa hạt cứng (CF/GF) — mòn nozzle stainless, cần hardened steel */
  requiresHardenedNozzle: boolean;
  /** BẮT BUỘC — link tài liệu Bambu Lab chính thức */
  sourceUrl: string;
};

export type Printer = {
  id: string;
  label: string;
  /** Hãng máy — dùng trong câu cảnh báo ("Bambu Lab không khuyến nghị...") */
  vendor: string;
  /** Slicer chính hãng của máy này — quyết định tab nào có preset thật */
  slicerId: SlicerId;
  buildVolumeMm: { x: number; y: number; z: number };
  isEnclosed: boolean;
  /** Filament máy in tốt */
  supportedFilamentIds: string[];
  /** Filament in được nhưng hãng không khuyến nghị trên máy này */
  notRecommendedFilamentIds: string[];
  sourceUrl: string;
};

/**
 * Cơ chế in 3D — thứ làm sản phẩm in 3D gây ấn tượng (khớp động in liền khối,
 * bản lề dẻo, nam châm, lắp ghép module...). Đây là chiều độc lập, không phải
 * một món hàng trong danh mục.
 */
export type Mechanism = {
  id: string;
  label: string;
  promptText: string;
  /** Mô tả ngắn tiếng Việt để user hiểu cơ chế này là gì */
  description: string;
};

/** Nhân vật / sinh vật để lai vào đồ vật — nguồn của kiểu "móc khóa hình con chó khớp động". */
export type Character = {
  id: string;
  label: string;
  promptText: string;
};

/** Cách cá nhân hóa sản phẩm: khắc tên, chữ nổi, lithophane... */
export type Personalization = {
  id: string;
  label: string;
  promptText: string;
};

/**
 * Công thức lai ghép hai thực thể. `template` chứa hai chỗ trống:
 * `{A}` là sản phẩm chính, `{B}` là sản phẩm phụ (hoặc nhân vật).
 */
export type FusionFormula = {
  id: string;
  label: string;
  /** Ví dụ: "{A} shaped like {B}" */
  template: string;
};

/**
 * Mức sáng tạo, quyết định bao nhiêu chiều được bật:
 * 1 An toàn — chỉ sản phẩm + thẩm mỹ
 * 2 Thú vị — thêm cơ chế in 3D
 * 3 Lai ghép — thêm thực thể thứ hai + công thức lai
 * 4 Đột phá — thêm nhân vật + cá nhân hóa, ưu tiên cặp danh mục xa nhau
 */
export type CreativityLevel = 1 | 2 | 3 | 4;

/** Kết quả một lần Mix — toàn bộ lựa chọn đã random. */
export type MixResult = {
  creativity: CreativityLevel;
  category: ProductCategory;
  product: Product;
  /** Lựa chọn của từng axis thẩm mỹ */
  attributes: Record<AttributeAxisId, AttributeOption>;
  size: SizeOption;
  detail: DetailOption;
  strength: StrengthOption;
  filament: Filament;

  // ----- Các chiều sáng tạo, chỉ có từ mức tương ứng trở lên -----

  /** Từ mức 2 */
  mechanism: Mechanism | null;
  /** Từ mức 3 — thực thể thứ hai, luôn thuộc danh mục khác danh mục chính */
  secondaryCategory: ProductCategory | null;
  secondaryProduct: Product | null;
  fusion: FusionFormula | null;
  /** Từ mức 4 */
  character: Character | null;
  personalization: Personalization | null;

  /**
   * Text tự do người dùng gõ, thay cho lựa chọn từ danh sách.
   * Khi có giá trị thì buildPrompt dùng nó thay cho promptText của mục tương ứng.
   * Không ghi vào file dữ liệu — chỉ sống trong phiên làm việc.
   */
  secondaryOverride: string | null;
  characterOverride: string | null;

  /**
   * Text tự do cho các axis nhân vật (Thế đứng / Biểu cảm), thay cho lựa chọn từ danh sách.
   * Key vắng mặt = dùng option đã chọn. Cũng chỉ sống trong phiên như hai override trên.
   */
  attributeOverrides?: Partial<Record<AttributeAxisId, string>>;
};

/** Mức độ nghiêm trọng của cảnh báo về tính khả thi khi in. */
export type WarningLevel = 'info' | 'warning';

export type PrintWarning = {
  level: WarningLevel;
  /** Thông điệp tiếng Việt hiển thị cho user */
  message: string;
  /** Link tài liệu chính hãng của con số nêu trong message — có thì UI render "Nguồn ↗" */
  sourceUrl?: string;
};

export type InfillPattern =
  'Grid' | 'Gyroid' | 'Rectilinear' | 'Concentric' | 'Honeycomb' | 'Cubic';

export type SurfacePattern = 'Monotonic' | 'Rectilinear' | 'Concentric';

/**
 * Một tham số hiển thị trong bảng thông số.
 * `value === null` nghĩa là app KHÔNG có cơ sở để đưa giá trị — hiển thị "chưa có dữ liệu"
 * kèm `note`, TUYỆT ĐỐI không điền số đoán (xem CLAUDE.md > Quy tắc của project).
 */
export type SettingRow = {
  /** Tên đúng như hiển thị trong Bambu Studio, để user tìm được đúng ô */
  label: string;
  value: string | null;
  /** Giải thích ngắn: vì sao giá trị này, hoặc vì sao chưa có */
  note?: string;
};

export type SettingsGroup = {
  /** Tên nhóm trong Bambu Studio, ví dụ "Sparse infill" */
  title: string;
  rows: SettingRow[];
};

/** Một tab trong Bambu Studio: Quality / Strength / Speed / Support / Others */
export type SettingsTabId = 'quality' | 'strength' | 'speed' | 'support' | 'others';

export type SettingsTab = {
  id: SettingsTabId;
  /** Nhãn đúng như tab trong Bambu Studio */
  label: string;
  groups: SettingsGroup[];
};

/**
 * Phần mềm cắt lớp. Anycubic Slicer Next là bản fork của OrcaSlicer, mà OrcaSlicer lại
 * fork từ Bambu Studio — nên tên tham số hai bên trùng nhau, chỉ khác preset máy.
 * Nguồn: https://wiki.anycubic.com/en/software-and-app
 */
export type SlicerId = 'bambu-studio' | 'anycubic-slicer-next';

/** Bảng thông số trình bày theo đúng một slicer cụ thể. */
export type SlicerSettings = {
  id: SlicerId;
  /** Tên phần mềm đúng như hãng đặt */
  label: string;
  /**
   * Tên preset theo quy ước của slicer đó, ví dụ "0.20mm Standard @BBL A1".
   * `null` = slicer này không có profile cho máy đang chọn, hoặc quy ước đặt tên
   * CHƯA VERIFY được từ tài liệu chính hãng — không đoán.
   */
  presetName: string | null;
  /** Lý do khi `presetName === null`, hoặc ghi chú thêm về preset */
  presetNote?: string;
  /** Slicer có profile chính thức cho máy đang chọn không */
  supportsSelectedPrinter: boolean;
  /** Link tải / tài liệu chính hãng của slicer */
  sourceUrl: string;
  tabs: SettingsTab[];
};

/**
 * Thông số in suy ra từ MixResult + máy in đã chọn, tổ chức theo đúng 5 tab của
 * slicer để user đối chiếu được từng ô.
 */
export type PrintSettings = {
  printer: Printer;
  filament: Filament;
  /** Mỗi slicer một bảng — user chọn bảng khớp phần mềm đang dùng */
  slicers: SlicerSettings[];
  /** Giữ riêng vì đây là dữ liệu có nguồn Bambu chính thức, hiển thị nổi bật */
  temperature: {
    nozzleC: Range | null;
    bedC: Range | null;
  };
  warnings: PrintWarning[];
};

/** Tuỳ chọn khi ghép prompt — tách khỏi MixResult vì đây là lựa chọn của user, không random. */
export type BuildPromptOptions = {
  /**
   * Bật ràng buộc hình học in được (liền khối, đế phẳng, overhang ≤45°, bề dày tối thiểu).
   * Mặc định bật. Tắt thì Gemini tự do về hình dạng — ảnh đẹp hơn nhưng dựng mesh
   * thường ra cấu trúc không in nổi.
   */
  printability?: boolean;
};

/**
 * Đầu vào của ảnh nhiều góc dựng ở Flow.
 * 'text'  — gõ thẳng prompt vào Flow, model tự dựng cả vật thể lẫn bốn góc nhìn
 * 'image' — sinh ảnh ở Gemini trước, đưa ảnh đó vào Flow rồi yêu cầu trải ra thành bốn góc.
 *           Hình dạng đã bị ảnh khoá nên prompt ngắn hơn hẳn và các góc bám nhau sát hơn.
 */
export type FlowPromptSource = 'text' | 'image';

export type BuildFlowPromptOptions = BuildPromptOptions & {
  /** Mặc định 'text' */
  source?: FlowPromptSource;
};

/** Mức độ bắt buộc của một mục trong checklist hậu kỳ. */
export type MeshCheckLevel = 'required' | 'conditional';

/**
 * Một việc phải làm SAU khi có file STL — khâu app không kiểm soát được bằng prompt.
 * Xem src/lib/buildMeshChecklist.ts.
 */
export type MeshCheckItem = {
  id: string;
  level: MeshCheckLevel;
  /** Việc cần làm, tiếng Việt */
  label: string;
  /** Lỗi sẽ gặp nếu bỏ qua bước này */
  risk: string;
  /** Công cụ gợi ý */
  tool: string;
};
