export interface LaborService {
  id?: string;
  code: string;
  name: string;
  bay: string; // e.g. "Bay 1 / Quick Bay"
  rate: number; // Flat labor rate in PHP
  duration: string; // e.g. "15 mins", "45 mins"
  description?: string;
  active?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
