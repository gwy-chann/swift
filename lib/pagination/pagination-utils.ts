/**
 * Pure pagination calculation helpers and utilities
 */

export function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export function computePaginationIndices(page: number, pageSize: number, totalItems: number) {
  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return { startIndex, endIndex, totalPages };
}

export function paginateArray<T>(items: readonly T[] | T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const effectivePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}
