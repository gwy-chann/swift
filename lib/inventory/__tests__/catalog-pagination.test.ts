import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function paginateItems<T>(items: T[], page: number, pageSize: number): {
  pageItems: T[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = items.length === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endIndex = Math.min(clampedPage * pageSize, items.length);
  const start = (clampedPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    totalPages,
    startIndex,
    endIndex,
  };
}

describe('Inventory Catalog Pagination Logic', () => {
  const mockProducts = Array.from({ length: 78 }, (_, i) => ({
    sku: `SKU-${i + 1}`,
    name: `Product ${i + 1}`
  }));

  it('calculates total pages correctly for 78 items with 10 per page', () => {
    const { totalPages } = paginateItems(mockProducts, 1, 10);
    assert.strictEqual(totalPages, 8);
  });

  it('slices the first page correctly (items 1 to 10)', () => {
    const { pageItems, startIndex, endIndex } = paginateItems(mockProducts, 1, 10);
    assert.strictEqual(pageItems.length, 10);
    assert.strictEqual(pageItems[0].sku, 'SKU-1');
    assert.strictEqual(pageItems[9].sku, 'SKU-10');
    assert.strictEqual(startIndex, 1);
    assert.strictEqual(endIndex, 10);
  });

  it('slices the last page correctly (items 71 to 78)', () => {
    const { pageItems, startIndex, endIndex } = paginateItems(mockProducts, 8, 10);
    assert.strictEqual(pageItems.length, 8);
    assert.strictEqual(pageItems[0].sku, 'SKU-71');
    assert.strictEqual(pageItems[7].sku, 'SKU-78');
    assert.strictEqual(startIndex, 71);
    assert.strictEqual(endIndex, 78);
  });

  it('handles pageSize changes dynamically (e.g. 20 and 50)', () => {
    const result20 = paginateItems(mockProducts, 1, 20);
    assert.strictEqual(result20.totalPages, 4);
    assert.strictEqual(result20.pageItems.length, 20);

    const result50 = paginateItems(mockProducts, 2, 50);
    assert.strictEqual(result50.totalPages, 2);
    assert.strictEqual(result50.pageItems.length, 28);
    assert.strictEqual(result50.startIndex, 51);
    assert.strictEqual(result50.endIndex, 78);
  });

  it('handles empty results cleanly with 0 items', () => {
    const result = paginateItems([], 1, 10);
    assert.strictEqual(result.totalPages, 1);
    assert.strictEqual(result.pageItems.length, 0);
    assert.strictEqual(result.startIndex, 0);
    assert.strictEqual(result.endIndex, 0);
  });
});
