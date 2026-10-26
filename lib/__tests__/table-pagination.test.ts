import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPaginationRange,
  computePaginationIndices,
  paginateArray,
} from '../pagination/pagination-utils.ts';

describe('TablePagination Helper Functions', () => {
  describe('getPaginationRange', () => {
    it('returns all page numbers when totalPages <= 7', () => {
      assert.deepStrictEqual(getPaginationRange(1, 5), [1, 2, 3, 4, 5]);
      assert.deepStrictEqual(getPaginationRange(3, 7), [1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns leading range with ellipsis when currentPage <= 4 in large list', () => {
      assert.deepStrictEqual(getPaginationRange(1, 20), [1, 2, 3, 4, 5, '...', 20]);
      assert.deepStrictEqual(getPaginationRange(4, 20), [1, 2, 3, 4, 5, '...', 20]);
    });

    it('returns trailing range with ellipsis when currentPage >= totalPages - 3', () => {
      assert.deepStrictEqual(getPaginationRange(17, 20), [1, '...', 16, 17, 18, 19, 20]);
      assert.deepStrictEqual(getPaginationRange(20, 20), [1, '...', 16, 17, 18, 19, 20]);
    });

    it('returns middle range with double ellipsis when currentPage is centered', () => {
      assert.deepStrictEqual(getPaginationRange(10, 20), [1, '...', 9, 10, 11, '...', 20]);
    });
  });

  describe('Item slicing mathematics across tables', () => {
    function computeIndices(page: number, pageSize: number, total: number) {
      const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
      const endIndex = Math.min(page * pageSize, total);
      return { startIndex, endIndex };
    }

    it('calculates startIndex and endIndex accurately for page 1', () => {
      const { startIndex, endIndex } = computeIndices(1, 10, 45);
      assert.strictEqual(startIndex, 1);
      assert.strictEqual(endIndex, 10);
    });

    it('calculates startIndex and endIndex accurately for final page', () => {
      const { startIndex, endIndex } = computeIndices(5, 10, 45);
      assert.strictEqual(startIndex, 41);
      assert.strictEqual(endIndex, 45);
    });

    it('handles zero total items safely', () => {
      const { startIndex, endIndex } = computeIndices(1, 10, 0);
      assert.strictEqual(startIndex, 0);
      assert.strictEqual(endIndex, 0);
    });
  });

  describe('computePaginationIndices', () => {
    it('computes correct start, end, and totalPages for 25 items with pageSize 10', () => {
      const p1 = computePaginationIndices(1, 10, 25);
      assert.strictEqual(p1.startIndex, 1);
      assert.strictEqual(p1.endIndex, 10);
      assert.strictEqual(p1.totalPages, 3);

      const p3 = computePaginationIndices(3, 10, 25);
      assert.strictEqual(p3.startIndex, 21);
      assert.strictEqual(p3.endIndex, 25);
      assert.strictEqual(p3.totalPages, 3);
    });
  });

  describe('paginateArray', () => {
    const sampleItems = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    it('slices page 1 correctly', () => {
      assert.deepStrictEqual(paginateArray(sampleItems, 1, 3), ['A', 'B', 'C']);
    });

    it('slices page 2 correctly', () => {
      assert.deepStrictEqual(paginateArray(sampleItems, 2, 3), ['D', 'E', 'F']);
    });

    it('slices last page with remainder correctly', () => {
      assert.deepStrictEqual(paginateArray(sampleItems, 3, 3), ['G']);
    });

    it('clamps page index if beyond totalPages', () => {
      assert.deepStrictEqual(paginateArray(sampleItems, 99, 3), ['G']);
    });
  });
});
