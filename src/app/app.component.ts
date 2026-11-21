import { Component } from '@angular/core';
import { TripPlannerComponent } from './components/trip-planner/trip-planner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TripPlannerComponent],
  template: '<app-trip-planner />',
  styles: [':host { display: block; }'],
})
export class AppComponent {}
