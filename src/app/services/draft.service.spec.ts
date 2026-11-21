import { TestBed } from '@angular/core/testing';
import { DraftService } from './draft.service';
import { TripConfig } from '../models/quote.model';

describe('DraftService', () => {
  let service: DraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DraftService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and load a valid draft', () => {
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

    service.saveDraft(config);
    const loaded = service.loadDraft();

    expect(loaded).toBeTruthy();
    expect(loaded!.pickup).toBe('A');
    expect(loaded!.dropoffs).toEqual(['B', 'C']);
    expect(loaded!.truckCategory).toBe('medium');
    expect(loaded!.truckCount).toBe(2);
    expect(loaded!.cargoWeight).toBe(5);
    expect(loaded!.loadingAssistance).toBe(true);
    expect(loaded!.unloadingAssistance).toBe(false);
  });

  it('should handle invalid JSON gracefully', () => {
    localStorage.setItem('trip_planner_draft', 'not-valid-json{{{');
    const loaded = service.loadDraft();
    expect(loaded).toBeNull();
  });

  it('should sanitize unknown location IDs', () => {
    const malformed = {
      pickup: 'Z',
      dropoffs: ['A', 'X', 'B'],
      truckCategory: 'medium',
      truckCount: 2,
      cargoWeight: 5,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    };
    localStorage.setItem('trip_planner_draft', JSON.stringify(malformed));

    const loaded = service.loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.pickup).toBeNull();
    expect(loaded!.dropoffs).toEqual(['A', 'B']);
  });

  it('should remove duplicate locations between pickup and dropoffs', () => {
    const malformed = {
      pickup: 'A',
      dropoffs: ['A', 'B', 'B'],
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 1,
      pickupDate: '',
      pickupTime: '',
      loadingAssistance: false,
      unloadingAssistance: false,
    };
    localStorage.setItem('trip_planner_draft', JSON.stringify(malformed));

    const loaded = service.loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.pickup).toBe('A');
    expect(loaded!.dropoffs).toEqual(['B']);
  });

  it('should clamp truck count to valid range', () => {
    const malformed = {
      pickup: 'A',
      dropoffs: ['B'],
      truckCategory: 'medium',
      truckCount: 99,
      cargoWeight: 2,
      pickupDate: '',
      pickupTime: '',
      loadingAssistance: false,
      unloadingAssistance: false,
    };
    localStorage.setItem('trip_planner_draft', JSON.stringify(malformed));

    const loaded = service.loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.truckCount).toBe(5);
  });

  it('should clear draft', () => {
    service.saveDraft({
      pickup: 'A',
      dropoffs: ['B'],
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 1,
      pickupDate: '',
      pickupTime: '',
      loadingAssistance: false,
      unloadingAssistance: false,
    });

    service.clearDraft();
    const loaded = service.loadDraft();
    expect(loaded).toBeNull();
  });
});
