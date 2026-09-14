import { useCallback, useMemo, useState } from 'react';
import type { IdeaData } from '../data/bundledData';
import { FILAMENTS, FILAMENTS_BY_ID } from '../data/filaments';
import { DEFAULT_PRINTER_ID, PRINTERS, PRINTERS_BY_ID } from '../data/printers';
import { buildPrompt } from '../lib/buildPrompt';
import { mixIdeas, type MixInput } from '../lib/mixIdeas';
import { reconcileMix } from '../lib/reconcileMix';
import { resolvePrintSettings } from '../lib/resolvePrintSettings';
import type { AttributeAxisId, CreativityLevel, MixResult } from '../types';

function toMixInput(data: IdeaData): MixInput {
  return { ...data, filaments: FILAMENTS };
}

/**
 * Nhận `data` từ ngoài thay vì import cứng, để trang Mix dùng chung nguồn dữ liệu
 * với trang Quản lý — sửa dữ liệu xong là trang Mix thấy ngay.
 */
export function useIdeaMixer(data: IdeaData) {
  const mixInput = useMemo(() => toMixInput(data), [data]);
  const [rawMix, setMix] = useState<MixResult>(() => mixIdeas(mixInput, Math.random, 3));

  // Dữ liệu có thể đã đổi bên trang Quản lý — đồng bộ lại ngay trong render,
  // không dùng useEffect + setState (gây cascading render)
  const mix = useMemo(() => reconcileMix(rawMix, data), [rawMix, data]);
  const [printerId, setPrinterId] = useState<string>(DEFAULT_PRINTER_ID);
  const [creativity, setCreativity] = useState<CreativityLevel>(3);

  /** Quyết định đã chốt #1: Mix ghi đè TOÀN BỘ lựa chọn hiện tại. */
  const remix = useCallback(() => {
    setMix(mixIdeas(mixInput, Math.random, creativity));
  }, [mixInput, creativity]);

  const selectCategory = useCallback(
    (categoryId: string) => {
      setMix((current) => {
        const category = data.categories.find((item) => item.id === categoryId);
        const firstProduct = category?.products[0];
        if (!category || !firstProduct) return current;
        // Đổi danh mục thì sản phẩm cũ không còn thuộc danh mục mới (cascading)
        return { ...current, category, product: firstProduct };
      });
    },
    [data],
  );

  const selectProduct = useCallback((productId: string) => {
    setMix((current) => {
      const product = current.category.products.find((item) => item.id === productId);
      return product ? { ...current, product } : current;
    });
  }, []);

  const selectAttribute = useCallback(
    (axisId: AttributeAxisId, optionId: string) => {
      setMix((current) => {
        const axis = data.attributeAxes.find((item) => item.id === axisId);
        const option = axis?.options.find((item) => item.id === optionId);
        if (!option) return current;
        return { ...current, attributes: { ...current.attributes, [axisId]: option } };
      });
    },
    [data],
  );

  const selectSize = useCallback(
    (sizeId: string) => {
      setMix((current) => {
        const size = data.technicalAxes.sizes.find((item) => item.id === sizeId);
        return size ? { ...current, size } : current;
      });
    },
    [data],
  );

  const selectDetail = useCallback(
    (detailId: string) => {
      setMix((current) => {
        const detail = data.technicalAxes.details.find((item) => item.id === detailId);
        return detail ? { ...current, detail } : current;
      });
    },
    [data],
  );

  const selectStrength = useCallback(
    (strengthId: string) => {
      setMix((current) => {
        const strength = data.technicalAxes.strengths.find((item) => item.id === strengthId);
        return strength ? { ...current, strength } : current;
      });
    },
    [data],
  );

  const selectFilament = useCallback((filamentId: string) => {
    setMix((current) => {
      const filament = FILAMENTS_BY_ID[filamentId];
      return filament ? { ...current, filament } : current;
    });
  }, []);

  const prompt = useMemo(() => buildPrompt(mix), [mix]);

  const fallbackPrinter = PRINTERS[0];
  if (!fallbackPrinter) {
    throw new Error('Dữ liệu máy in rỗng — src/data/printers.ts phải có ít nhất một máy.');
  }
  const printer = PRINTERS_BY_ID[printerId] ?? fallbackPrinter;
  const printSettings = useMemo(() => resolvePrintSettings(mix, printer), [mix, printer]);

  return {
    mix,
    prompt,
    printer,
    printers: PRINTERS,
    printSettings,
    setPrinterId,
    creativity,
    setCreativity,
    remix,
    selectCategory,
    selectProduct,
    selectAttribute,
    selectSize,
    selectDetail,
    selectStrength,
    selectFilament,
  };
}
