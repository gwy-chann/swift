import { MotorcycleModel, CompatibilityRule } from '@/lib/types/product';

export const MOCK_MOTORCYCLE_MODELS: MotorcycleModel[] = [
  'Yamaha NMAX 155',
  'Yamaha Aerox 155',
  'Honda Click 125i/150i',
  'Honda ADV 160',
  'Suzuki Raider 150 Fi'
];

export const MOCK_COMPATIBILITY_RULES: CompatibilityRule[] = [
  { sku: 'YAM-NMAX-BL01', model: 'Yamaha NMAX 155', yearRange: '2020-2026', notes: 'Front caliper OEM direct fit' },
  { sku: 'RCB-NMAX-BP02', model: 'Yamaha NMAX 155', yearRange: '2019-2026', notes: 'High-temp racing ceramic compound' },
  { sku: 'HON-CLK-CVTB', model: 'Honda Click 125i/150i', yearRange: '2018-2026', notes: 'Gates Bando dual-cog OEM belt' },
  { sku: 'UMA-CLK-CVTR', model: 'Honda Click 125i/150i', yearRange: '2018-2026', notes: 'Reinforced kevlar fiber cord' },
  { sku: 'MOT-3100-10W40', model: 'Universal', notes: 'Compatible with all 4T air and liquid cooled engines' },
  { sku: 'SHL-ADV-AX7', model: 'Universal', notes: 'Compatible with all 4T scooter and manual clutch engines' },
  { sku: 'NGK-CPR8EA9', model: 'Honda Click 125i/150i', yearRange: '2018-2026', notes: 'Standard heat range 8' },
  { sku: 'DEN-IU24-IR', model: 'Yamaha NMAX 155', yearRange: '2016-2026', notes: '0.4mm ultra-fine iridium center electrode' },
  { sku: 'SUZ-RAI-CLUTCH', model: 'Suzuki Raider 150 Fi', yearRange: '2017-2026', notes: 'Genuine Suzuki cork-paper friction plates' },
  { sku: 'KTR-RAI-CL6SP', model: 'Suzuki Raider 150 Fi', yearRange: '2017-2026', notes: 'Heavy-duty 6-spring racing pressure plate kit' },
  { sku: 'MIC-PILOT-ST', model: 'Honda ADV 160', yearRange: '2022-2026', notes: '110/80-14 front tubeless tire' },
  { sku: 'IRC-SCT-OEM', model: 'Yamaha NMAX 155', yearRange: '2020-2026', notes: '130/70-13 rear OEM tubeless tire' }
];
