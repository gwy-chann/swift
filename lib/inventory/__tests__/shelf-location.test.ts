import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseShelfLocation, isShelfLocationAssigned } from '../shelf-location.ts';

describe('shelf-location domain engine', () => {
  describe('parseShelfLocation', () => {
    it('correctly parses standard two-part rack and shelf locations', () => {
      const result = parseShelfLocation('Rack A-01 / Shelf 2');
      assert.equal(result.isAssigned, true);
      assert.equal(result.zoneOrRack, 'Rack A-01');
      assert.equal(result.shelfOrBin, 'Shelf 2');
      assert.equal(result.formatted, 'Rack A-01 / Shelf 2');
    });

    it('correctly parses aisle and shelf formats', () => {
      const result = parseShelfLocation('Aisle 1 / Shelf 1');
      assert.equal(result.isAssigned, true);
      assert.equal(result.zoneOrRack, 'Aisle 1');
      assert.equal(result.shelfOrBin, 'Shelf 1');
      assert.equal(result.formatted, 'Aisle 1 / Shelf 1');
    });

    it('correctly parses single-segment locations (e.g. Tire Rack 2 / Floor)', () => {
      const result = parseShelfLocation('Tire Rack 2 / Floor');
      assert.equal(result.isAssigned, true);
      assert.equal(result.zoneOrRack, 'Tire Rack 2');
      assert.equal(result.shelfOrBin, 'Floor');
      assert.equal(result.formatted, 'Tire Rack 2 / Floor');
    });

    it('identifies unassigned location for empty string', () => {
      const result = parseShelfLocation('');
      assert.equal(result.isAssigned, false);
      assert.equal(result.formatted, 'Unassigned Bay');
      assert.equal(result.zoneOrRack, '');
    });

    it('identifies unassigned location for whitespace string', () => {
      const result = parseShelfLocation('    ');
      assert.equal(result.isAssigned, false);
      assert.equal(result.formatted, 'Unassigned Bay');
    });

    it('identifies unassigned location for null or undefined', () => {
      const resultNull = parseShelfLocation(null);
      assert.equal(resultNull.isAssigned, false);
      assert.equal(resultNull.formatted, 'Unassigned Bay');

      const resultUndef = parseShelfLocation(undefined);
      assert.equal(resultUndef.isAssigned, false);
      assert.equal(resultUndef.formatted, 'Unassigned Bay');
    });

    it('identifies unassigned location for explicit "unassigned" keyword', () => {
      const result = parseShelfLocation('unassigned');
      assert.equal(result.isAssigned, false);
      assert.equal(result.formatted, 'Unassigned Bay');
    });
  });

  describe('isShelfLocationAssigned', () => {
    it('returns true for non-empty assigned locations', () => {
      assert.equal(isShelfLocationAssigned('Rack B-04 / Shelf 1'), true);
    });

    it('returns false for empty or unassigned locations', () => {
      assert.equal(isShelfLocationAssigned(''), false);
      assert.equal(isShelfLocationAssigned('   '), false);
      assert.equal(isShelfLocationAssigned(null), false);
      assert.equal(isShelfLocationAssigned('Unassigned'), false);
    });
  });
});
