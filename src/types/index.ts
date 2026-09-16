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
 * `pose` / `expression` / `outfit` / `costume` / `base` chỉ ghép vào prompt khi sản phẩm là
 * nhân vật (`ProductCategory.isCharacter` / `Product.isCharacter`) hoặc mix đang bật lớp
 * nhân vật — xem lib/characterTraits.ts.
 */
export type AttributeAxisId =
  'style' | 'surface' | 'color' | 'pose' | 'expression' | 'outfit' | 'costume' | 'base';

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

// ---------------------------------------------------------------------------
// Chuyển file & thông số giữa các slicer — trang "Đổi slicer"
// Nguồn sự thật: docs/research/slicer-interop.md
// ---------------------------------------------------------------------------

/**
 * Họ codebase của slicer — thứ quyết định preset có chuyển thẳng được hay không.
 * 'orca' gồm cả OrcaSlicer và mọi fork của hãng máy (Snapmaker Orca, Creality Print,
 * Anycubic Slicer Next, ElegooSlicer...). 'bambu' là Bambu Studio + fork trực tiếp của nó.
 * Xem docs/research/slicer-interop.md mục 2.
 */
export type SlicerFamily = 'orca' | 'bambu' | 'prusa' | 'cura';

/**
 * Mức độ chuyển được của preset process sang slicer đích.
 * 'direct' — cùng cấu trúc JSON, import là dùng được (chỉ cần xem lại tầng B)
 * 'review' — import được một phần, phải đối chiếu tay
 * 'manual' — khác engine, không import được, phải nhập tay theo bảng ánh xạ
 */
export type PresetTransfer = 'direct' | 'review' | 'manual';

/** Một slicer đích mà user muốn mang file sang. */
export type SlicerTarget = {
  id: string;
  label: string;
  /** Hãng phát hành slicer */
  vendor: string;
  family: SlicerFamily;
  /** Fork từ slicer nào — `null` khi là engine độc lập */
  forkedFrom: string | null;
  presetTransfer: PresetTransfer;
  /** Giải thích tiếng Việt vì sao ở mức đó */
  transferNote: string;
  /** BẮT BUỘC — link tài liệu / trang tải chính hãng */
  sourceUrl: string;
};

/**
 * Tầng của một thông số khi đổi máy:
 * 'geometry' — do hình học mô hình quyết định, đổi máy vẫn giữ nguyên ý nghĩa
 * 'machine'  — phụ thuộc máy + filament cụ thể, PHẢI xem lại tay
 * Xem docs/research/slicer-interop.md mục 4.
 */
export type SettingTier = 'geometry' | 'machine';

/**
 * Khoá này thuộc preset nào trong họ Orca. Quan trọng khi sinh file preset:
 * nhét khoá filament vào preset process thì slicer từ chối hoặc bỏ qua.
 */
export type SettingProfile = 'process' | 'filament';

/** Một dòng trong bảng ánh xạ thông số giữa các slicer. */
export type SettingMapping = {
  /** Tên khoá trong `project_settings.config` của họ Orca/Bambu */
  orcaKey: string;
  profile: SettingProfile;
  /** Nhóm trong giao diện Bambu Studio / OrcaSlicer, ví dụ "Speed" */
  group: string;
  /** Nhãn đúng như hiển thị trong giao diện họ Orca */
  label: string;
  tier: SettingTier;
  /** Khoá tương ứng trong Cura — `null` nghĩa là CHƯA VERIFY / không có tương đương 1-1 */
  curaKey: string | null;
  /** Nhãn Cura, `null` cùng lý do với `curaKey` */
  curaLabel: string | null;
  /** Ghi chú khi ánh xạ không phải 1-1 hoặc cần lưu ý riêng */
  note?: string;
};

/**
 * Preset process chính hãng của một máy, trích từ bộ profile hệ thống của OrcaSlicer.
 * Đây là nguồn duy nhất cho cột "Giá trị quy đổi" ở nhóm phụ thuộc máy — app KHÔNG
 * quy đổi bằng công thức, chỉ tra số mà hãng máy công bố.
 */
export type MachineProcessPreset = {
  /** Khớp `id` trong src/data/printers.ts */
  printerId: string;
  /** Tên preset đúng như trong slicer, ví dụ "0.20mm Standard @Anycubic Kobra X" */
  name: string;
  /** Bậc chất lượng tách từ tên preset, ví dụ "Standard" / "High Quality" */
  qualityTier: string;
  nozzleMm: number;
  layerHeightMm: number;
  /** Chỉ chứa khoá có trong SETTING_MAP, giá trị đã chuẩn hoá thành chuỗi */
  values: Record<string, string>;
  /** BẮT BUỘC — link tới đúng file profile trong repo OrcaSlicer */
  sourceUrl: string;
};

/**
 * Kết quả quy đổi một thông số sang máy đích.
 * 'keep'        — giá trị do hình học quyết định, giữ nguyên số trong file
 * 'target'      — lấy số từ preset chính hãng của máy đích
 * 'unavailable' — không có cơ sở để đưa số, UI hiển thị "chưa có dữ liệu" kèm lý do
 */
export type ConvertedValue =
  | { kind: 'keep'; value: string }
  | {
      kind: 'target';
      value: string;
      preset: MachineProcessPreset;
      /**
       * Số của máy đích KHÁC số trong file — tức là ô user thật sự phải sửa tay.
       * Hai hãng đặt trùng số là chuyện thường (profile fork của nhau), nên nếu không
       * đánh dấu thì vài ô cần đổi sẽ chìm giữa hàng chục ô trùng.
       */
      changed: boolean;
    }
  | { kind: 'unavailable'; reason: string };

/** Một file bên trong archive .3mf (zip). */
export type ArchiveFile = {
  /** Đường dẫn trong archive, ví dụ `3D/3dmodel.model` */
  path: string;
  bytes: Uint8Array;
};

/** Vai trò của từng file trong archive khi đem sang slicer khác. */
export type ArchiveRole = 'geometry' | 'structure' | 'settings' | 'gcode' | 'thumbnail' | 'other';

export type ArchiveEntrySummary = {
  path: string;
  role: ArchiveRole;
  sizeBytes: number;
  /** Có giữ lại trong file hình học xuất ra hay không */
  kept: boolean;
};

/** Một thông số đọc được từ file, đã ghép với dòng ánh xạ tương ứng. */
export type ExtractedSetting = {
  mapping: SettingMapping;
  /** Giá trị dưới dạng chuỗi đã chuẩn hoá (mảng trong config được nối bằng ", ") */
  value: string;
};

/**
 * Kết quả đọc một file project. Mọi thứ ở đây đọc TRỰC TIẾP từ file user đưa vào —
 * app không tự thêm giá trị nào (xem CLAUDE.md > Quy tắc của project).
 */
export type ProjectInspection = {
  fileName: string;
  /** Slicer đã tạo ra file, đọc từ `Metadata/project_settings.config` hoặc metadata 3mf */
  producedBy: string | null;
  /** Tên preset máy ghi trong file, ví dụ "Bambu Lab A1 0.4 nozzle" */
  printerPreset: string | null;
  /** Tên preset process ghi trong file */
  processPreset: string | null;
  /** Tên các preset filament ghi trong file */
  filamentPresets: string[];
  entries: ArchiveEntrySummary[];
  /**
   * Toàn bộ `project_settings.config` đọc nguyên trạng — giữ đúng kiểu giá trị
   * (chuỗi hoặc mảng chuỗi) để khi sinh preset không làm biến dạng dữ liệu gốc.
   * `null` khi file không chứa thông số nào.
   */
  rawSettings: Record<string, unknown> | null;
  /** Thông số đọc được, đã ánh xạ — theo đúng thứ tự của SETTING_MAP */
  settings: ExtractedSetting[];
  /** Khoá có trong file nhưng app chưa có dòng ánh xạ verify được */
  unmappedKeyCount: number;
  warnings: PrintWarning[];
};
