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
  id?: string;
  sku: string;
  barcode?: string;
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
  createdAt?: string | Date;
  updatedAt?: string | Date;
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

export type FitmentType = 'oem' | 'aftermarket' | 'universal';

export interface MotorcycleModelRecord {
  id: string;
  make: string;
  model: string;
  displacement_cc: number;
  year_start: number;
  year_end?: number | null;
  category: string;
  image_url?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductFitmentRecord {
  id: string;
  product_id: string;
  model_id: string;
  fitment_type: FitmentType;
  year_range?: string | null;
  notes?: string | null;
  created_at?: string | Date;
}

