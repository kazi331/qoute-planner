import { TestBed } from '@angular/core/testing';
import { QuoteService } from './quote.service';
import { TripConfig } from '../models/quote.model';
import { firstValueFrom } from 'rxjs';

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuoteService);
    // Use fixed delay for deterministic tests
    service.setDelayFn(() => 0);
  });

  it('should calculate the verification example correctly', async () => {
    // Pickup A -> Drop B -> Drop C, 2 Medium trucks, 5 tonnes, loading only
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['B', 'C'],
      truckCategory: 'medium',
      truckCount: 2,
      cargoWeight: 5,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: true,
      unloadingAssistance: false,
    };

    const result = await firstValueFrom(service.generateQuote(config));

    expect(result.distanceKm).toBe(27);       // A->B = 12, B->C = 15
    expect(result.transportCost).toBe(4590);   // max(27*85, 2000)=2295 per truck * 2
    expect(result.serviceCost).toBe(1200);     // 600 * 2 trucks
    expect(result.totalQuote).toBe(5790);      // 4590 + 1200
  });

  it('should enforce minimum fare when distance-based fare is lower', async () => {
    // A->B = 12 km, Mini rate = 50/km => 600 < min fare 1200
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['B'],
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 1,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    };

    const result = await firstValueFrom(service.generateQuote(config));

    expect(result.farePerTruck).toBe(1200); // min fare applied
    expect(result.transportCost).toBe(1200);
    expect(result.totalQuote).toBe(1200);
  });

  it('should validate cargo weight exceeds capacity', () => {
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['B'],
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 5,  // Mini capacity is 1.5 tonnes
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    };

    const errors = service.validateForQuote(config);
    expect(errors).toContain('Cargo weight exceeds truck capacity (max 1.5 tonnes).');
  });

  it('should reject past pickup date/time', () => {
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['B'],
      truckCategory: 'medium',
      truckCount: 1,
      cargoWeight: 2,
      pickupDate: '2020-01-01',
      pickupTime: '10:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    };

    const errors = service.validateForQuote(config);
    expect(errors).toContain('Pickup time must be in the future.');
  });

  it('should reject duplicate locations', () => {
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['A', 'B'],
      truckCategory: 'medium',
      truckCount: 1,
      cargoWeight: 2,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    };

    const errors = service.validateForQuote(config);
    expect(errors).toContain('Duplicate location is not allowed.');
  });

  it('should validate a fully valid config with no errors', () => {
    const config: TripConfig = {
      pickup: 'A',
      dropoffs: ['B', 'C'],
      truckCategory: 'large',
      truckCount: 2,
      cargoWeight: 10,
      pickupDate: '2099-12-31',
      pickupTime: '23:59',
      loadingAssistance: true,
      unloadingAssistance: true,
    };

    const errors = service.validateForQuote(config);
    expect(errors.length).toBe(0);
  });
});
