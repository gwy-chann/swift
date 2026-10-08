import { LaborService } from '@/lib/types/service';

export const MOCK_SERVICES: LaborService[] = [
  {
    code: 'SRV-OIL-01',
    name: 'Standard Oil & Gear Oil Change',
    bay: 'Bay 1 / Quick Bay',
    rate: 100,
    duration: '15 mins',
    description: 'Includes engine oil drain and refill, final drive gear oil top-up, and waste disposal.'
  },
  {
    code: 'SRV-CVT-01',
    name: 'CVT Cleaning & Regreasing',
    bay: 'Bay 2 / Scooter Bay',
    rate: 350,
    duration: '45 mins',
    description: 'Variator, clutch bell, torque drive degreasing, roller weight inspection, and high-temp regreasing.'
  },
  {
    code: 'SRV-TIRE-01',
    name: 'Tubeless Tire Mounting & Bead Sealing',
    bay: 'Bay 1 / Quick Bay',
    rate: 150,
    duration: '20 mins',
    description: 'Pneumatic machine dismounting, rim bead cleaning, sealant application, and high-pressure inflation.'
  },
  {
    code: 'SRV-BRK-01',
    name: 'Brake Caliper Flush & Bleeding',
    bay: 'Bay 3 / Mechanical Bay',
    rate: 250,
    duration: '30 mins',
    description: 'DOT 4 hydraulic fluid flush, piston slide lubrication, and vacuum air purge.'
  },
  {
    code: 'SRV-TUNE-01',
    name: 'Full FI Throttle Body Cleaning & Reset',
    bay: 'Bay 3 / Mechanical Bay',
    rate: 650,
    duration: '60 mins',
    description: 'Ultrasonic injector spray cleaning, throttle body carbon removal, and TPS / IACV calibration.'
  },
  {
    code: 'SRV-FORK-01',
    name: 'Front Shock Re-oil & Seal Replacement',
    bay: 'Bay 4 / Heavy Repair',
    rate: 800,
    duration: '90 mins',
    description: 'Telescopic fork disassembly, inner tube polishing, dual oil seal replacement, and 10W fork oil calibration.'
  }
];
