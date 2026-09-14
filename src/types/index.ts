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
 * Mỗi axis ~30 option.
 */
export type AttributeAxisId = 'style' | 'surface' | 'color';

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
  buildVolumeMm: { x: number; y: number; z: number };
  isEnclosed: boolean;
  /** Filament máy in tốt */
  supportedFilamentIds: string[];
  /** Filament in được nhưng Bambu không khuyến nghị trên máy này */
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
};

/** Mức độ nghiêm trọng của cảnh báo về tính khả thi khi in. */
export type WarningLevel = 'info' | 'warning';

export type PrintWarning = {
  level: WarningLevel;
  /** Thông điệp tiếng Việt hiển thị cho user */
  message: string;
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
 * Thông số in suy ra từ MixResult + máy in đã chọn, tổ chức theo đúng 5 tab của
 * Bambu Studio để user đối chiếu được từng ô.
 */
export type PrintSettings = {
  printer: Printer;
  filament: Filament;
  /** Tên preset theo quy ước Bambu: "0.20mm Standard @BBL A1" */
  presetName: string;
  tabs: SettingsTab[];
  /** Giữ riêng vì đây là dữ liệu có nguồn Bambu chính thức, hiển thị nổi bật */
  temperature: {
    nozzleC: Range | null;
    bedC: Range | null;
  };
  warnings: PrintWarning[];
};
