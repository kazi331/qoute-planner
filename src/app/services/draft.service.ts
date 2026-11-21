import { Injectable } from '@angular/core';
import { TripConfig } from '../models/quote.model';
import { LOCATIONS, LocationId } from '../models/location.model';
import { TruckCategory, TRUCK_SPECS } from '../models/truck.model';

const DRAFT_KEY = 'trip_planner_draft';

const VALID_LOCATION_IDS = new Set<string>(LOCATIONS.map(l => l.id));
const VALID_TRUCK_CATEGORIES = new Set<string>(Object.keys(TRUCK_SPECS));

@Injectable({ providedIn: 'root' })
export class DraftService {

  saveDraft(config: TripConfig): boolean {
    try {
      const json = JSON.stringify(config);
      localStorage.setItem(DRAFT_KEY, json);
      return true;
    } catch {
      return false;
    }
  }

  loadDraft(): TripConfig | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      return this.sanitize(parsed);
    } catch {
      this.clearDraft();
      return null;
    }
  }

  clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }

  private sanitize(data: Record<string, unknown>): TripConfig {
    const pickup = this.isValidLocationId(data['pickup']) ? data['pickup'] as LocationId : null;

    let dropoffs: LocationId[] = [];
    if (Array.isArray(data['dropoffs'])) {
      dropoffs = data['dropoffs']
        .filter((id: unknown) => this.isValidLocationId(id))
        .slice(0, 3) as LocationId[];
    }

    // Remove duplicates across pickup and dropoffs
    const seen = new Set<string>();
    if (pickup) seen.add(pickup);
    dropoffs = dropoffs.filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const truckCategory = this.isValidTruckCategory(data['truckCategory'])
      ? data['truckCategory'] as TruckCategory
      : 'mini';

    let truckCount = typeof data['truckCount'] === 'number' ? data['truckCount'] : 1;
    truckCount = Math.max(1, Math.min(5, Math.round(truckCount)));

    let cargoWeight: number | null = null;
    if (typeof data['cargoWeight'] === 'number' && data['cargoWeight'] > 0) {
      cargoWeight = data['cargoWeight'];
    }

    const pickupDate = typeof data['pickupDate'] === 'string' ? data['pickupDate'] : '';
    const pickupTime = typeof data['pickupTime'] === 'string' ? data['pickupTime'] : '';

    const loadingAssistance = typeof data['loadingAssistance'] === 'boolean' ? data['loadingAssistance'] : false;
    const unloadingAssistance = typeof data['unloadingAssistance'] === 'boolean' ? data['unloadingAssistance'] : false;

    return {
      pickup,
      dropoffs,
      truckCategory,
      truckCount,
      cargoWeight,
      pickupDate,
      pickupTime,
      loadingAssistance,
      unloadingAssistance,
    };
  }

  private isValidLocationId(value: unknown): boolean {
    return typeof value === 'string' && VALID_LOCATION_IDS.has(value);
  }

  private isValidTruckCategory(value: unknown): boolean {
    return typeof value === 'string' && VALID_TRUCK_CATEGORIES.has(value);
  }
}
