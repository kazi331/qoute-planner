import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LOADING_FEE_PER_TRUCK,
  TRUCK_SPECS,
  UNLOADING_FEE_PER_TRUCK,
  TruckSpec,
} from '../../models/truck.model';

@Component({
  selector: 'app-trip-rates',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trip-rates.component.html',
  styleUrl: './trip-rates.component.scss',
})
export class TripRatesComponent {
  readonly truckCategories: TruckSpec[] = Object.values(TRUCK_SPECS);
  readonly loadingFee = LOADING_FEE_PER_TRUCK;
  readonly unloadingFee = UNLOADING_FEE_PER_TRUCK;
}
