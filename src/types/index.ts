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

/** Danh mục sản phẩm. Cascading: random category trước, rồi random product bên trong. */
export type ProductCategory = {
  id: string;
  label: string;
  /** Mảnh câu tiếng Anh mô tả loại sản phẩm, dùng khi cần bổ nghĩa cho Subject */
  promptText: string;
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

/** Mục đích sử dụng / độ chịu lực → quyết định Infill + Wall Loops. */
export type StrengthOption = AttributeOption & {
  sparseInfillDensityPercent: number;
  sparseInfillPattern: InfillPattern;
  wallLoops: number;
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

/** Kết quả một lần Mix — toàn bộ lựa chọn đã random. */
export type MixResult = {
  category: ProductCategory;
  product: Product;
  /** Lựa chọn của từng axis thẩm mỹ */
  attributes: Record<AttributeAxisId, AttributeOption>;
  size: SizeOption;
  detail: DetailOption;
  strength: StrengthOption;
  filament: Filament;
};

/** Mức độ nghiêm trọng của cảnh báo về tính khả thi khi in. */
export type WarningLevel = 'info' | 'warning';

export type PrintWarning = {
  level: WarningLevel;
  /** Thông điệp tiếng Việt hiển thị cho user */
  message: string;
};

/**
 * Thông số in suy ra từ MixResult + máy in đã chọn.
 * Trường `null` = chưa có dữ liệu verify, hiển thị "chưa có dữ liệu".
 */
export type PrintSettings = {
  printer: Printer;
  filament: Filament;
  quality: {
    layerHeightMm: number;
    wallLoops: number;
  };
  strength: {
    sparseInfillDensityPercent: number;
    sparseInfillPattern: InfillPattern;
  };
  temperature: {
    nozzleC: Range | null;
    bedC: Range | null;
  };
  warnings: PrintWarning[];
};

export type InfillPattern = 'Grid' | 'Gyroid' | 'Rectilinear';
