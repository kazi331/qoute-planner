import { LocationId } from './location.model';
import { TruckCategory } from './truck.model';

export interface TripConfig {
  pickup: LocationId | null;
  dropoffs: LocationId[];
  truckCategory: TruckCategory;
  truckCount: number;
  cargoWeight: number | null;
  pickupDate: string;
  pickupTime: string;
  loadingAssistance: boolean;
  unloadingAssistance: boolean;
}

export interface QuoteResult {
  route: LocationId[];
  distanceKm: number;
  farePerTruck: number;
  transportCost: number;
  serviceCost: number;
  totalQuote: number;
  truckCategory: TruckCategory;
  truckCount: number;
}

export type QuoteState =
  | { status: 'idle' }
  | { status: 'pending'; requestId: number }
  | { status: 'success'; result: QuoteResult; requestId: number }
  | { status: 'stale'; result: QuoteResult }
  | { status: 'error'; errors: string[] };
