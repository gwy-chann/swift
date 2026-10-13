import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesMotorcycleFilter,
  filterMotorcycleModels,
  DEFAULT_MOTORCYCLE_FILTER_STATE,
  POPULAR_PHILIPPINE_MAKES
} from '../motorcycle-filter.ts';
import { MOCK_MOTORCYCLE_MODEL_RECORDS } from '../../mock-data/motorcycles.ts';

describe('Motorcycle Selector Engine & Filtering (SIAA-23)', () => {
  it('renders all 5 canonical models by default when query and make are unrestricted', () => {
    const results = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, '', 'ALL', 'ALL');
    assert.equal(results.length, 5, 'Should return all 5 default models');
    assert.deepEqual(
      results.map((m) => m.model),
      ['NMAX 155', 'Aerox 155', 'Click 125i/150i', 'ADV 160', 'Raider 150 Fi']
    );
  });

  it('Scenario 1: identifies Yamaha NMAX 155 as the default active model platform', () => {
    const nmax = MOCK_MOTORCYCLE_MODEL_RECORDS[0];
    assert.equal(nmax.make, 'Yamaha');
    assert.equal(nmax.model, 'NMAX 155');
    assert.equal(nmax.displacement_cc, 155);
  });

  it('Scenario 2: shifts active selection rapidly with zero latency overhead', () => {
    const start = performance.now();
    const click = MOCK_MOTORCYCLE_MODEL_RECORDS.find((m) => m.model.includes('Click'));
    const duration = performance.now() - start;

    assert.ok(click, 'Honda Click must exist');
    assert.equal(click.make, 'Honda');
    assert.ok(duration < 50, `Switching and finding model must execute in < 50ms (took ${duration.toFixed(2)}ms)`);
  });

  it('Scenario 3: filters dynamically by model keyword ("ADV", "Raider", "Yamaha")', () => {
    // 1. Keyword: "ADV"
    const advResults = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, 'ADV');
    assert.equal(advResults.length, 1);
    assert.equal(advResults[0].model, 'ADV 160');

    // 2. Keyword: "Raider"
    const raiderResults = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, 'Raider');
    assert.equal(raiderResults.length, 1);
    assert.equal(raiderResults[0].make, 'Suzuki');
    assert.equal(raiderResults[0].model, 'Raider 150 Fi');

    // 3. Keyword: "Yamaha"
    const yamahaResults = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, 'Yamaha');
    assert.equal(yamahaResults.length, 2);
    assert.deepEqual(
      yamahaResults.map((m) => m.model),
      ['NMAX 155', 'Aerox 155']
    );

    // 4. Keyword by displacement: "155"
    const displacement155 = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, '155');
    assert.equal(displacement155.length, 2);
  });

  it('Scenario 3b: filters by brand filter pills ("Yamaha", "Honda", "Suzuki")', () => {
    const yamahaModels = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, '', 'Yamaha');
    assert.equal(yamahaModels.length, 2);
    assert.ok(yamahaModels.every((m) => m.make === 'Yamaha'));

    const hondaModels = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, '', 'Honda');
    assert.equal(hondaModels.length, 2);
    assert.ok(hondaModels.every((m) => m.make === 'Honda'));

    const suzukiModels = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, '', 'Suzuki');
    assert.equal(suzukiModels.length, 1);
    assert.equal(suzukiModels[0].model, 'Raider 150 Fi');
  });

  it('Scenario 4: returns empty array when query does not match any registered bike', () => {
    const emptyResults = filterMotorcycleModels(MOCK_MOTORCYCLE_MODEL_RECORDS, 'Harley Davidson');
    assert.equal(emptyResults.length, 0, 'No matching models should be found');
  });

  it('supports POPULAR_PHILIPPINE_MAKES and default filter state contract', () => {
    assert.ok(POPULAR_PHILIPPINE_MAKES.includes('ALL'));
    assert.ok(POPULAR_PHILIPPINE_MAKES.includes('Yamaha'));
    assert.ok(POPULAR_PHILIPPINE_MAKES.includes('Honda'));
    assert.ok(POPULAR_PHILIPPINE_MAKES.includes('Suzuki'));
    assert.equal(DEFAULT_MOTORCYCLE_FILTER_STATE.selectedMake, 'ALL');
    assert.equal(DEFAULT_MOTORCYCLE_FILTER_STATE.searchQuery, '');
  });
});
