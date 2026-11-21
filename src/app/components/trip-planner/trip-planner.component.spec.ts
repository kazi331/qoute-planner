
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { TripPlannerComponent } from './trip-planner.component';

describe('TripPlannerComponent', () => {
  let component: TripPlannerComponent;
  let fixture: ComponentFixture<TripPlannerComponent>;
  let quoteService: QuoteService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [TripPlannerComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TripPlannerComponent);
    component = fixture.componentInstance;
    quoteService = TestBed.inject(QuoteService);
    quoteService.setDelayFn(() => 0);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty form and idle quote state', () => {
    expect(component.quoteState.status).toBe('idle');
    expect(component.dropoffs.length).toBe(0);
    expect(component.form.get('pickup')?.value).toBeNull();
  });

  it('should show a placeholder drop-off selector and create a stop when selected', () => {
    expect(fixture.nativeElement.querySelector('.dropoff-placeholder select')).toBeTruthy();

    component.initialDropoffControl.setValue('B');
    fixture.detectChanges();

    expect(component.dropoffs.length).toBe(1);
    expect(component.dropoffs.at(0).value).toBe('B');
    expect(fixture.nativeElement.querySelector('.dropoff-placeholder')).toBeNull();
  });

  it('should add and remove dropoff locations', () => {
    component.addDropoff();
    expect(component.dropoffs.length).toBe(1);
    component.addDropoff();
    expect(component.dropoffs.length).toBe(2);
    component.addDropoff();
    expect(component.dropoffs.length).toBe(3);
    // Can't add more than 3
    component.addDropoff();
    expect(component.dropoffs.length).toBe(3);

    component.removeDropoff(1);
    expect(component.dropoffs.length).toBe(2);
  });

  it('should show errors when requesting quote with invalid form', () => {
    component.requestQuote();
    expect(component.quoteState.status).toBe('error');
    expect(component.quoteDrawerOpen).toBeTrue();
    expect(component.pickup.touched).toBeTrue();
    expect(component.initialDropoffControl.touched).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.form-select.ng-invalid.ng-touched')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.form-input.ng-invalid.ng-touched')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.quote-error')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.field-hint.error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.quote-panel.mobile-drawer-open')).toBeTruthy();
    fixture.nativeElement.querySelector('.quote-drawer-close').click();
    expect(component.quoteDrawerOpen).toBeFalse();
    if (component.quoteState.status === 'error') {
      expect(component.quoteState.errors.length).toBeGreaterThan(0);
      expect(component.quoteState.errors).toContain('At least one drop-off location is required.');
    }
  });

  it('should clear to an empty trip configuration', () => {
    component.addDropoff();
    component.clearDraft();

    expect(component.dropoffs.length).toBe(0);
    expect(component.quoteState.status).toBe('idle');
  });

  it('should generate a successful quote', fakeAsync(() => {
    // Fill the form
    component.form.patchValue({
      pickup: 'A',
      truckCategory: 'medium',
      truckCount: 2,
      cargoWeight: 5,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: true,
      unloadingAssistance: false,
    });
    component.addDropoff();
    component.dropoffs.at(0).setValue('B');
    component.addDropoff();
    component.dropoffs.at(1).setValue('C');

    component.requestQuote();
    expect(component.quoteDrawerOpen).toBeTrue();
    tick(10);
    fixture.detectChanges();

    expect(component.quoteState.status).toBe('success');
    expect(component.hasCurrentEstimate).toBeTrue();
    expect(fixture.nativeElement.querySelector('.btn-primary').textContent).toContain('Show Estimation');
    if (component.quoteState.status === 'success') {
      expect(component.quoteState.result.totalQuote).toBe(5790);
      const routeText = fixture.nativeElement.querySelector('.quote-success .route-value')?.textContent ?? '';
      expect(routeText).toContain('Baily Road');
      expect(routeText).toContain('Shahbagh');
      expect(routeText).toContain('Bijoy Sarani');

      const requestId = component.quoteState.requestId;
      component.closeQuoteDrawer();
      component.requestQuote();
      expect(component.quoteState.requestId).toBe(requestId);
      expect(component.quoteDrawerOpen).toBeTrue();
    }
  }));

  it('should mark quote as stale when form changes after success', fakeAsync(() => {
    // Setup valid form
    component.form.patchValue({
      pickup: 'A',
      truckCategory: 'medium',
      truckCount: 2,
      cargoWeight: 5,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: true,
      unloadingAssistance: false,
    });
    component.addDropoff();
    component.dropoffs.at(0).setValue('B');
    component.addDropoff();
    component.dropoffs.at(1).setValue('C');

    component.requestQuote();
    tick(10);
    expect(component.quoteState.status).toBe('success');

    // Now change something
    component.form.patchValue({ truckCount: 3 });
    expect(component.quoteState.status).toBe('stale');
    expect(component.hasCurrentEstimate).toBeFalse();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.btn-primary').textContent).toContain('Get Estimate');
  }));

  it('should only display the latest quote when multiple requests overlap', fakeAsync(() => {
    quoteService.setDelayFn(() => 500);

    component.form.patchValue({
      pickup: 'A',
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 1,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    });
    component.addDropoff();
    component.dropoffs.at(0).setValue('B');

    // First request
    component.requestQuote();
    expect(component.quoteState.status).toBe('pending');

    // Before first resolves, change and request again
    tick(100);
    component.dropoffs.at(0).setValue('C');
    component.requestQuote();

    // Let both complete
    tick(600);

    expect(component.quoteState.status).toBe('success');
    if (component.quoteState.status === 'success') {
      // Should have the route for the second request (A->C), not A->B
      expect(component.quoteState.result.route).toEqual(['A', 'C']);
      expect(component.quoteState.result.distanceKm).toBe(18);
    }
  }));

  it('should cancel a pending quote when the trip inputs change', fakeAsync(() => {
    quoteService.setDelayFn(() => 500);
    component.form.patchValue({
      pickup: 'A',
      truckCategory: 'mini',
      truckCount: 1,
      cargoWeight: 1,
      pickupDate: '2099-12-31',
      pickupTime: '12:00',
      loadingAssistance: false,
      unloadingAssistance: false,
    });
    component.addDropoff();
    component.dropoffs.at(0).setValue('B');

    component.requestQuote();
    expect(component.quoteState.status).toBe('pending');

    component.form.patchValue({ truckCount: 2 });
    expect(component.quoteState.status).toBe('idle');
    expect(component.quoteDrawerOpen).toBeFalse();

    tick(600);
    expect(component.quoteState.status).toBe('idle');
  }));

  it('should increment and decrement truck count within bounds', () => {
    expect(component.truckCount).toBe(1);
    component.decrementTrucks();
    expect(component.truckCount).toBe(1); // Can't go below 1

    component.incrementTrucks();
    expect(component.truckCount).toBe(2);
    component.incrementTrucks();
    component.incrementTrucks();
    component.incrementTrucks();
    expect(component.truckCount).toBe(5);
    component.incrementTrucks();
    expect(component.truckCount).toBe(5); // Can't go above 5
  });
});
