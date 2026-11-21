export type TruckCategory = 'mini' | 'medium' | 'large';

export interface TruckSpec {
  category: TruckCategory;
  label: string;
  capacityTonnes: number;
  ratePerKm: number;
  minimumFare: number;
}

export const TRUCK_SPECS: Record<TruckCategory, TruckSpec> = {
  mini: {
    category: 'mini',
    label: 'Mini (1.5 tonnes)',
    capacityTonnes: 1.5,
    ratePerKm: 50,
    minimumFare: 1200,
  },
  medium: {
    category: 'medium',
    label: 'Medium (3 tonnes)',
    capacityTonnes: 3,
    ratePerKm: 85,
    minimumFare: 2000,
  },
  large: {
    category: 'large',
    label: 'Large (7 tonnes)',
    capacityTonnes: 7,
    ratePerKm: 145,
    minimumFare: 3500,
  },
};

export const LOADING_FEE_PER_TRUCK = 600;
export const UNLOADING_FEE_PER_TRUCK = 400;
