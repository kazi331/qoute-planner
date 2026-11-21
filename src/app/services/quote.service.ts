import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { TripConfig, QuoteResult } from '../models/quote.model';
import { calculateRouteDistance, LocationId } from '../models/location.model';
import { TRUCK_SPECS, LOADING_FEE_PER_TRUCK, UNLOADING_FEE_PER_TRUCK } from '../models/truck.model';

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private delayFn: () => number = () => Math.floor(Math.random() * 901) + 300;

  setDelayFn(fn: () => number): void {
    this.delayFn = fn;
  }

  generateQuote(config: TripConfig): Observable<QuoteResult> {
    const route: LocationId[] = [config.pickup!, ...config.dropoffs];
    const distanceKm = calculateRouteDistance(route);
    const spec = TRUCK_SPECS[config.truckCategory];
    const farePerTruck = Math.max(distanceKm * spec.ratePerKm, spec.minimumFare);
    const transportCost = farePerTruck * config.truckCount;

    let serviceCostPerTruck = 0;
    if (config.loadingAssistance) {
      serviceCostPerTruck += LOADING_FEE_PER_TRUCK;
    }
    if (config.unloadingAssistance) {
      serviceCostPerTruck += UNLOADING_FEE_PER_TRUCK;
    }
    const serviceCost = serviceCostPerTruck * config.truckCount;
    const totalQuote = transportCost + serviceCost;

    const result: QuoteResult = {
      route,
      distanceKm,
      farePerTruck,
      transportCost,
      serviceCost,
      totalQuote,
      truckCategory: config.truckCategory,
      truckCount: config.truckCount,
    };

    const delayMs = this.delayFn();
    return of(result).pipe(delay(delayMs));
  }

  validateForQuote(config: TripConfig): string[] {
    const errors: string[] = [];

    if (!config.pickup) {
      errors.push('Pickup location is required.');
    }
    if (config.dropoffs.length === 0) {
      errors.push('At least one drop-off location is required.');
    }
    if (config.dropoffs.length > 3) {
      errors.push('Maximum 3 drop-off locations allowed.');
    }

    const allLocations = [config.pickup, ...config.dropoffs].filter(Boolean) as LocationId[];
    const unique = new Set(allLocations);
    if (unique.size !== allLocations.length) {
      errors.push('Duplicate location is not allowed.');
    }

    if (!config.cargoWeight || config.cargoWeight <= 0) {
      errors.push('Cargo weight must be a positive number.');
    } else {
      const spec = TRUCK_SPECS[config.truckCategory];
      const maxCapacity = spec.capacityTonnes * config.truckCount;
      if (config.cargoWeight > maxCapacity) {
        errors.push(`Cargo weight exceeds truck capacity (max ${maxCapacity} tonnes).`);
      }
    }

    if (config.truckCount < 1 || config.truckCount > 5) {
      errors.push('Number of trucks must be between 1 and 5.');
    }

    if (!config.pickupDate || !config.pickupTime) {
      errors.push('Pickup date and time are required.');
    } else {
      const pickupDateTime = new Date(`${config.pickupDate}T${config.pickupTime}`);
      if (isNaN(pickupDateTime.getTime())) {
        errors.push('Invalid pickup date/time.');
      } else if (pickupDateTime <= new Date()) {
        errors.push('Pickup time must be in the future.');
      }
    }

    return errors;
  }
}
