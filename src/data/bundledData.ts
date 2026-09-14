import type {
  AttributeAxis,
  DetailOption,
  ProductCategory,
  SizeOption,
  StrengthOption,
} from '../types';
import attributesJson from './json/attributes.json';
import categoriesJson from './json/categories.json';
import technicalAxesJson from './json/technicalAxes.json';

/**
 * Dữ liệu ý tưởng đóng gói sẵn trong bundle — dùng làm giá trị mặc định khi app khởi động.
 *
 * Nguồn sự thật là các file JSON trong `src/data/json/`. Trang Quản lý dữ liệu có thể
 * đọc/ghi thẳng vào chính các file đó qua File System Access API, nên sau khi user
 * kết nối thư mục thì dữ liệu hiển thị lấy từ đĩa chứ không phải từ bundle này.
 *
 * `filaments.ts` và `printers.ts` KHÔNG chuyển sang JSON: chúng gắn với thông số
 * Bambu Lab kèm sourceUrl, không nên sửa tự do qua UI.
 */

export type TechnicalAxesData = {
  sizes: SizeOption[];
  details: DetailOption[];
  strengths: StrengthOption[];
};

export type IdeaData = {
  categories: ProductCategory[];
  attributeAxes: AttributeAxis[];
  technicalAxes: TechnicalAxesData;
};

export const BUNDLED_DATA: IdeaData = {
  categories: categoriesJson as ProductCategory[],
  attributeAxes: attributesJson as AttributeAxis[],
  technicalAxes: technicalAxesJson as TechnicalAxesData,
};

/** Tên file JSON trong `src/data/json/` — dùng khi đọc/ghi qua File System Access API. */
export const DATA_FILES = {
  categories: 'categories.json',
  attributes: 'attributes.json',
  technicalAxes: 'technicalAxes.json',
} as const;

export function cloneData(data: IdeaData): IdeaData {
  return structuredClone(data);
}
