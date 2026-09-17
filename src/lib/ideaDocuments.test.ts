import { describe, expect, it } from 'vitest';
import { BUNDLED_DATA } from '../data/bundledData';
import { mergeDocuments, splitDocuments } from './ideaDocuments';
import { DOCUMENT_NAMES, type StoredDocument } from './neonDataApi';

describe('mergeDocuments', () => {
  it('thay dữ liệu đóng gói bằng nội dung tải từ Neon', () => {
    const categories = [
      {
        id: 'from-neon',
        label: 'Từ Neon',
        promptText: 'from neon',
        domain: 'playful' as const,
        products: [],
      },
    ];
    const documents: StoredDocument[] = [{ name: 'categories', content: categories, version: 7 }];

    const result = mergeDocuments(documents, BUNDLED_DATA);

    expect(result.data.categories).toEqual(categories);
    expect(result.versions.categories).toBe(7);
    expect(result.missing).not.toContain('categories');
  });

  it('giữ dữ liệu đóng gói cho document server chưa có', () => {
    const result = mergeDocuments([], BUNDLED_DATA);

    expect(result.missing).toEqual([...DOCUMENT_NAMES]);
    expect(result.data.attributeAxes).toEqual(BUNDLED_DATA.attributeAxes);
    expect(result.versions).toEqual({});
  });

  it('coi mảng rỗng là chưa có dữ liệu, không để axis trống', () => {
    const documents: StoredDocument[] = [{ name: 'attributes', content: [], version: 2 }];

    const result = mergeDocuments(documents, BUNDLED_DATA);

    expect(result.missing).toContain('attributes');
    expect(result.data.attributeAxes).toEqual(BUNDLED_DATA.attributeAxes);
  });

  it('không sửa vào dữ liệu đóng gói gốc', () => {
    const before = BUNDLED_DATA.categories.length;
    const result = mergeDocuments(
      [
        {
          name: 'categories',
          content: [
            { id: 'x', label: 'x', promptText: 'x', domain: 'playful' as const, products: [] },
          ],
          version: 1,
        },
      ],
      BUNDLED_DATA,
    );

    result.data.categories.push({
      id: 'y',
      label: 'y',
      promptText: 'y',
      domain: 'playful',
      products: [],
    });
    expect(BUNDLED_DATA.categories.length).toBe(before);
  });
});

describe('splitDocuments', () => {
  it('tách đủ 7 document và trỏ đúng trường', () => {
    const result = splitDocuments(BUNDLED_DATA);

    expect(Object.keys(result).sort()).toEqual([...DOCUMENT_NAMES].sort());
    expect(result.attributes).toBe(BUNDLED_DATA.attributeAxes);
    expect(result.technicalAxes).toBe(BUNDLED_DATA.technicalAxes);
  });
});
