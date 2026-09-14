import { useCallback, useState } from 'react';
import { BUNDLED_DATA, DATA_FILES, cloneData, type IdeaData } from '../data/bundledData';
import {
  connectDirectory,
  downloadJsonFile,
  isConnected,
  isFileSystemAccessSupported,
  readJsonFile,
  writeJsonFile,
} from '../lib/fileSystemStore';
import type { AttributeAxis, ProductCategory } from '../types';

export type DataStatus = {
  connected: boolean;
  directoryName: string | null;
  /** Có thay đổi chưa ghi xuống đĩa */
  dirty: boolean;
  message: string | null;
  error: string | null;
};

/**
 * Quản lý dữ liệu ý tưởng: mặc định lấy từ bundle, kết nối thư mục thì đọc/ghi file thật.
 * Mọi thay đổi giữ trong state cho tới khi user bấm Lưu — tránh ghi đĩa sau mỗi phím gõ.
 */
export function useIdeaData() {
  const [data, setData] = useState<IdeaData>(() => cloneData(BUNDLED_DATA));
  const [status, setStatus] = useState<DataStatus>({
    connected: false,
    directoryName: null,
    dirty: false,
    message: null,
    error: null,
  });

  const markDirty = useCallback(() => {
    setStatus((current) => ({ ...current, dirty: true, message: null }));
  }, []);

  const connect = useCallback(async () => {
    try {
      const name = await connectDirectory();
      if (name === null) return; // user bấm hủy

      const [
        categories,
        attributeAxes,
        technicalAxes,
        mechanisms,
        characters,
        personalizations,
        fusionFormulas,
      ] = await Promise.all([
        readJsonFile<ProductCategory[]>(DATA_FILES.categories),
        readJsonFile<AttributeAxis[]>(DATA_FILES.attributes),
        readJsonFile<IdeaData['technicalAxes']>(DATA_FILES.technicalAxes),
        readJsonFile<IdeaData['mechanisms']>(DATA_FILES.mechanisms),
        readJsonFile<IdeaData['characters']>(DATA_FILES.characters),
        readJsonFile<IdeaData['personalizations']>(DATA_FILES.personalizations),
        readJsonFile<IdeaData['fusionFormulas']>(DATA_FILES.fusionFormulas),
      ]);

      setData({
        categories,
        attributeAxes,
        technicalAxes,
        mechanisms,
        characters,
        personalizations,
        fusionFormulas,
      });
      setStatus({
        connected: true,
        directoryName: name,
        dirty: false,
        message: `Đã đọc dữ liệu từ thư mục "${name}".`,
        error: null,
      });
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Không kết nối được thư mục.',
      }));
    }
  }, []);

  const save = useCallback(async () => {
    try {
      if (!isConnected()) {
        throw new Error('Chưa kết nối thư mục dữ liệu — chưa ghi được xuống đĩa.');
      }
      await Promise.all([
        writeJsonFile(DATA_FILES.categories, data.categories),
        writeJsonFile(DATA_FILES.attributes, data.attributeAxes),
        writeJsonFile(DATA_FILES.technicalAxes, data.technicalAxes),
        writeJsonFile(DATA_FILES.mechanisms, data.mechanisms),
        writeJsonFile(DATA_FILES.characters, data.characters),
        writeJsonFile(DATA_FILES.personalizations, data.personalizations),
        writeJsonFile(DATA_FILES.fusionFormulas, data.fusionFormulas),
      ]);
      setStatus((current) => ({
        ...current,
        dirty: false,
        message: 'Đã ghi xuống file JSON trong thư mục đã kết nối.',
        error: null,
      }));
    } catch (error) {
      setStatus((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Ghi file thất bại.',
      }));
    }
  }, [data]);

  const downloadAll = useCallback(() => {
    downloadJsonFile(DATA_FILES.categories, data.categories);
    downloadJsonFile(DATA_FILES.attributes, data.attributeAxes);
    downloadJsonFile(DATA_FILES.technicalAxes, data.technicalAxes);
    setStatus((current) => ({
      ...current,
      message: 'Đã tải 3 file JSON về máy — chép đè vào src/data/json/ để áp dụng.',
    }));
  }, [data]);

  // ----- Thao tác trên sản phẩm của một danh mục -----

  const addProduct = useCallback(
    (categoryId: string, product: { id: string; label: string; promptText: string }) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? { ...category, products: [...category.products, product] }
            : category,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const updateProduct = useCallback(
    (
      categoryId: string,
      productId: string,
      patch: Partial<{ label: string; promptText: string }>,
    ) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                products: category.products.map((product) =>
                  product.id === productId ? { ...product, ...patch } : product,
                ),
              }
            : category,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const deleteProduct = useCallback(
    (categoryId: string, productId: string) => {
      setData((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                products: category.products.filter((product) => product.id !== productId),
              }
            : category,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  // ----- Thao tác trên option của một axis thẩm mỹ -----

  const addAxisOption = useCallback(
    (axisId: string, option: { id: string; label: string; promptText: string }) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId ? { ...axis, options: [...axis.options, option] } : axis,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const updateAxisOption = useCallback(
    (axisId: string, optionId: string, patch: Partial<{ label: string; promptText: string }>) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId
            ? {
                ...axis,
                options: axis.options.map((option) =>
                  option.id === optionId ? { ...option, ...patch } : option,
                ),
              }
            : axis,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const deleteAxisOption = useCallback(
    (axisId: string, optionId: string) => {
      setData((current) => ({
        ...current,
        attributeAxes: current.attributeAxes.map((axis) =>
          axis.id === axisId
            ? { ...axis, options: axis.options.filter((option) => option.id !== optionId) }
            : axis,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  return {
    data,
    status,
    supportsFileSystem: isFileSystemAccessSupported(),
    connect,
    save,
    downloadAll,
    addProduct,
    updateProduct,
    deleteProduct,
    addAxisOption,
    updateAxisOption,
    deleteAxisOption,
  };
}
