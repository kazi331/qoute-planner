import { Routes } from '@angular/router';
import { TripPlannerComponent } from './components/trip-planner/trip-planner.component';
import { TripRatesComponent } from './components/trip-rates/trip-rates.component';

export const appRoutes: Routes = [
  { path: '', component: TripPlannerComponent },
  { path: 'rates', component: TripRatesComponent },
  { path: '**', redirectTo: '' },
];
