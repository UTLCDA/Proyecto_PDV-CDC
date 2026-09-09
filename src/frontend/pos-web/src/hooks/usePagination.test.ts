import { describe, it, expect } from 'vitest';
import { calculateTotalPages, calculateRecordRange } from './usePagination';
import { getPageNumbers } from '../components/common/TablePagination';

describe('usePagination Helpers', () => {
  describe('calculateTotalPages', () => {
    it('calculates total pages correctly for exact multiples', () => {
      expect(calculateTotalPages(100, 25)).toBe(4);
      expect(calculateTotalPages(50, 50)).toBe(1);
    });

    it('calculates total pages correctly with remainder', () => {
      expect(calculateTotalPages(101, 25)).toBe(5);
      expect(calculateTotalPages(1, 25)).toBe(1);
    });

    it('returns at least 1 page for 0 items', () => {
      expect(calculateTotalPages(0, 25)).toBe(1);
    });
  });

  describe('calculateRecordRange', () => {
    it('calculates range for first page', () => {
      const range = calculateRecordRange(1, 25, 100);
      expect(range).toEqual({ startRecord: 1, endRecord: 25 });
    });

    it('calculates range for intermediate page', () => {
      const range = calculateRecordRange(2, 25, 100);
      expect(range).toEqual({ startRecord: 26, endRecord: 50 });
    });

    it('calculates range for last partial page', () => {
      const range = calculateRecordRange(5, 25, 105);
      expect(range).toEqual({ startRecord: 101, endRecord: 105 });
    });

    it('handles 0 total items', () => {
      const range = calculateRecordRange(1, 25, 0);
      expect(range).toEqual({ startRecord: 0, endRecord: 0 });
    });
  });

  describe('getPageNumbers (Numbered Pagination Logic)', () => {
    it('returns all page numbers when totalPages <= 7', () => {
      expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns empty array when totalPages <= 0', () => {
      expect(getPageNumbers(1, 0)).toEqual([]);
    });

    it('displays first 5 pages and ellipsis at the end when near start', () => {
      expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5, '...', 10]);
      expect(getPageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, '...', 10]);
    });

    it('displays ellipsis at start and last 5 pages when near end', () => {
      expect(getPageNumbers(7, 10)).toEqual([1, '...', 6, 7, 8, 9, 10]);
      expect(getPageNumbers(10, 10)).toEqual([1, '...', 6, 7, 8, 9, 10]);
    });

    it('displays middle pages with ellipses on both sides when in center', () => {
      expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
      expect(getPageNumbers(6, 12)).toEqual([1, '...', 5, 6, 7, '...', 12]);
    });
  });
});
