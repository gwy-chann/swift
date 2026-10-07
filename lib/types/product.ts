export type ProductCategory =
  | 'Brakes'
  | 'Drivetrain'
  | 'Fluids'
  | 'Ignition'
  | 'Engine'
  | 'Tires'
  | 'Suspension'
  | 'Electrical'
  | 'Accessories'
  | string;

export interface Product {
  sku: string;
  name: string;
  category: ProductCategory;
  stock: number;
  minThreshold: number;
  location: string; // Shelf / Rack locator e.g. "Rack A-01 / Shelf 2"
  cost: number;
  wholesale: number;
  retail: number;
  oem: boolean;
  model: string; // Target motorcycle model or "Universal"
  brand: string;
  description?: string;
  imageUrl?: string;
}

export type MotorcycleModel =
  | 'Yamaha NMAX 155'
  | 'Yamaha Aerox 155'
  | 'Honda Click 125i/150i'
  | 'Honda ADV 160'
  | 'Suzuki Raider 150 Fi'
  | 'Universal'
  | string;

export interface CompatibilityRule {
  sku: string;
  model: string;
  yearRange?: string;
  notes?: string;
}
