import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, switchMap, takeUntil, tap } from 'rxjs';

import { LOCATIONS, Location, LocationId } from '../../models/location.model';
import { TruckCategory, TRUCK_SPECS, TruckSpec, LOADING_FEE_PER_TRUCK, UNLOADING_FEE_PER_TRUCK } from '../../models/truck.model';
import { TripConfig, QuoteResult, QuoteState } from '../../models/quote.model';
import { QuoteService } from '../../services/quote.service';
import { DraftService } from '../../services/draft.service';

@Component({
  selector: 'app-trip-planner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, RouterLink],
  templateUrl: './trip-planner.component.html',
  styleUrl: './trip-planner.component.scss',
})
export class TripPlannerComponent implements OnInit, OnDestroy {
  readonly locations = LOCATIONS;
  readonly truckSpecs = TRUCK_SPECS;
  readonly truckCategories: TruckSpec[] = Object.values(TRUCK_SPECS);
  readonly loadingFee = LOADING_FEE_PER_TRUCK;
  readonly unloadingFee = UNLOADING_FEE_PER_TRUCK;

  form!: FormGroup;
  readonly initialDropoffControl = new FormControl<LocationId | null>(null, Validators.required);
  quoteState: QuoteState = { status: 'idle' };

  draftSaved = false;
  draftSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  private quoteRequest$ = new Subject<TripConfig>();
  private destroy$ = new Subject<void>();
  private requestCounter = 0;
  private lastQuotedConfig: string | null = null;
  private currentRequestId = 0;

  constructor(
    private fb: FormBuilder,
    private quoteService: QuoteService,
    private draftService: DraftService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupQuoteSubscription();
    this.initialDropoffControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(locationId => {
      if (locationId) {
        this.addDropoff(locationId);
        this.initialDropoffControl.reset(null, { emitEvent: false });
      }
    });
    this.loadDraft();

    // Mark quote as stale when form values change after a successful quote
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.quoteState.status === 'success') {
        const currentConfig = JSON.stringify(this.getConfigFromForm());
        if (currentConfig !== this.lastQuotedConfig) {
          this.quoteState = { status: 'stale', result: this.quoteState.result };
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.draftSaveTimeout) clearTimeout(this.draftSaveTimeout);
  }

  private buildForm(): void {
    this.form = this.fb.group({
      pickup: [null as LocationId | null, Validators.required],
      dropoffs: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1), Validators.maxLength(3)]
      ),
      truckCategory: ['medium' as TruckCategory, Validators.required],
      truckCount: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
      cargoWeight: [null as number | null, [Validators.required, Validators.min(0.01)]],
      pickupDate: ['', Validators.required],
      pickupTime: ['', Validators.required],
      loadingAssistance: [false],
      unloadingAssistance: [false],
    });
  }

  get dropoffs(): FormArray {
    return this.form.get('dropoffs') as FormArray;
  }

  get pickup(): FormControl {
    return this.form.get('pickup') as FormControl;
  }

  get truckCount(): number {
    return this.form.get('truckCount')?.value ?? 1;
  }

  get truckCategoryValue(): TruckCategory {
    return this.form.get('truckCategory')?.value ?? 'mini';
  }

  get maxCapacity(): number {
    const spec = TRUCK_SPECS[this.truckCategoryValue];
    return spec.capacityTonnes * this.truckCount;
  }

  get cargoOverCapacity(): boolean {
    const weight = this.form.get('cargoWeight')?.value;
    return typeof weight === 'number' && weight > this.maxCapacity;
  }

  get pickupScheduleInvalid(): boolean {
    const date = this.form.get('pickupDate')?.value;
    const time = this.form.get('pickupTime')?.value;
    return this.quoteState.status === 'error' && !!date && !!time && !this.isPickupInFuture();
  }

  get availablePickupLocations(): Location[] {
    const usedDropoffs = new Set(this.dropoffs.controls.map(c => c.value));
    return LOCATIONS.filter(l => !usedDropoffs.has(l.id));
  }

  availableDropoffLocations(currentIndex: number): Location[] {
    const pickupId = this.pickup.value;
    const otherDropoffs = this.dropoffs.controls
      .filter((_, i) => i !== currentIndex)
      .map(c => c.value);
    const used = new Set([pickupId, ...otherDropoffs].filter(Boolean));
    return LOCATIONS.filter(l => !used.has(l.id));
  }

  addDropoff(locationId: LocationId | null = null): void {
    if (this.dropoffs.length >= 3) return;
    this.dropoffs.push(new FormControl(locationId, Validators.required));
  }

  removeDropoff(index: number): void {
    if (this.dropoffs.length <= 1) return; // Minimum 1 dropoff required
    this.dropoffs.removeAt(index);
  }

  dropDropoff(event: CdkDragDrop<string[]>): void {
    const values = this.dropoffs.controls.map(c => c.value);
    moveItemInArray(values, event.previousIndex, event.currentIndex);
    values.forEach((val, i) => {
      this.dropoffs.at(i).setValue(val);
    });
  }

  incrementTrucks(): void {
    const ctrl = this.form.get('truckCount')!;
    if (ctrl.value < 5) ctrl.setValue(ctrl.value + 1);
  }

  decrementTrucks(): void {
    const ctrl = this.form.get('truckCount')!;
    if (ctrl.value > 1) ctrl.setValue(ctrl.value - 1);
  }

  getLocationLabel(id: LocationId | null): string {
    if (!id) return '';
    const loc = LOCATIONS.find(l => l.id === id);
    return loc?.name ?? '';
  }

  // Quote handling
  private setupQuoteSubscription(): void {
    this.quoteRequest$.pipe(
      tap(() => {
        this.requestCounter++;
        this.currentRequestId = this.requestCounter;
        this.quoteState = { status: 'pending', requestId: this.currentRequestId };
      }),
      switchMap(config => {
        const reqId = this.currentRequestId;
        return this.quoteService.generateQuote(config).pipe(
          tap(result => {
            if (reqId === this.currentRequestId) {
              this.lastQuotedConfig = JSON.stringify(config);
              this.quoteState = { status: 'success', result, requestId: reqId };
            }
          })
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  requestQuote(): void {
    const config = this.getConfigFromForm();
    const errors = this.quoteService.validateForQuote(config);
    if (errors.length > 0) {
      this.form.markAllAsTouched();
      if (this.dropoffs.length === 0) {
        this.initialDropoffControl.markAsTouched();
      }
      this.quoteState = { status: 'error', errors };
      return;
    }
    this.quoteRequest$.next(config);
  }

  getConfigFromForm(): TripConfig {
    const v = this.form.getRawValue();
    return {
      pickup: v.pickup,
      dropoffs: v.dropoffs.filter((d: LocationId | null) => d !== null) as LocationId[],
      truckCategory: v.truckCategory,
      truckCount: v.truckCount,
      cargoWeight: v.cargoWeight,
      pickupDate: v.pickupDate,
      pickupTime: v.pickupTime,
      loadingAssistance: v.loadingAssistance,
      unloadingAssistance: v.unloadingAssistance,
    };
  }

  // Draft handling
  saveDraft(): void {
    const config = this.getConfigFromForm();
    const success = this.draftService.saveDraft(config);
    if (success) {
      this.draftSaved = true;
      if (this.draftSaveTimeout) clearTimeout(this.draftSaveTimeout);
      this.draftSaveTimeout = setTimeout(() => this.draftSaved = false, 2500);
    }
  }

  private loadDraft(): void {
    const draft = this.draftService.loadDraft();
    if (!draft) return;

    this.form.patchValue({
      pickup: draft.pickup,
      truckCategory: draft.truckCategory,
      truckCount: draft.truckCount,
      cargoWeight: draft.cargoWeight,
      pickupDate: draft.pickupDate,
      pickupTime: draft.pickupTime,
      loadingAssistance: draft.loadingAssistance,
      unloadingAssistance: draft.unloadingAssistance,
    });

    // Restore dropoffs (ensure at least 1)
    this.dropoffs.clear();
    for (const d of draft.dropoffs) {
      this.dropoffs.push(new FormControl(d, Validators.required));
    }
  }

  clearDraft(): void {
    this.draftService.clearDraft();
    this.form.reset({
      pickup: null,
      truckCategory: 'medium',
      truckCount: 1,
      cargoWeight: null,
      pickupDate: '',
      pickupTime: '',
      loadingAssistance: false,
      unloadingAssistance: false,
    });
    this.dropoffs.clear();
    this.initialDropoffControl.reset(null, { emitEvent: false });
    this.quoteState = { status: 'idle' };
    this.lastQuotedConfig = null;
  }

  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  isPickupInFuture(): boolean {
    const date = this.form.get('pickupDate')?.value;
    const time = this.form.get('pickupTime')?.value;
    if (!date || !time) return false;
    const dt = new Date(`${date}T${time}`);
    return !isNaN(dt.getTime()) && dt > new Date();
  }

  get formHasContent(): boolean {
    const v = this.form.getRawValue();
    return !!(v.pickup || this.dropoffs.length > 0 || v.cargoWeight || v.pickupDate || v.pickupTime);
  }
}
