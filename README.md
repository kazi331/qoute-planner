# Multi-Stop Trip Quote Planner

A self-contained Angular 18 application for configuring multi-stop truck trips, generating fare estimates, and saving drafts locally.

## Prerequisites

- **Node.js** 18.19+ or 20+
- **Bun** 1.0+ (package manager)
- Angular CLI is included as a dev dependency

## Setup

```bash
bun install
```

## Development Server

```bash
bun run start
```

Navigate to `http://localhost:4200/`. The application reloads automatically on source changes.

## Build

```bash
bun run build
```

Build artifacts are stored in `dist/`.

## Running Tests

```bash
bun run test
```

For a single headless run:

```bash
npx ng test --no-watch --browsers=ChromeHeadless
```

## Features

1. **Trip Configuration** — Select a pickup and 1–3 ordered drop-off locations with drag-and-drop reordering (Angular CDK). Select truck category, truck count (1–5), and cargo weight with inline capacity validation.

2. **Route Distance** — Uses a symmetric distance matrix between five fictional Dhaka locations. Total distance is the sum of consecutive-pair distances in the user's selected order.

3. **Pricing Engine** — Implements the specified fare formula: `farePerTruck = max(distance * rate, minimumFare)`. Adds optional loading/unloading service fees per truck.

4. **Asynchronous Quotes** — `QuoteService.generateQuote()` returns an Observable with a random 300–1,200 ms simulated delay. The component uses `switchMap` to automatically cancel stale in-flight requests when the user triggers a new quote. The delay function is injectable for deterministic testing.

5. **Draft Persistence** — `DraftService` saves/restores trip configuration to `localStorage`. Sanitizes restored data against unknown location IDs, duplicate locations, out-of-range values, and invalid JSON. A restored draft never carries over a previous quote.

6. **Validation** — Pickup time is validated against the current clock when requesting a quote (not just on edit). Cargo weight is checked against total fleet capacity. Duplicate locations are rejected. Clear error messages are shown per the UI design.

## Technical Decisions

- **Reactive Forms** — The entire trip form uses Angular Reactive Forms with `FormArray` for the variable-length drop-off list. This gives programmatic control over validation, dynamic additions/removals, and value tracking.

- **switchMap for race-condition safety** — When a user fires a new quote request while one is pending, `switchMap` unsubscribes from the old Observable. This guarantees the displayed result always matches the latest request, with no stale-data risk.

- **Testable delay injection** — `QuoteService.setDelayFn()` lets tests swap the random delay for `() => 0`, making async specs deterministic without real timeouts.

- **Draft sanitization** — `DraftService.loadDraft()` runs every restored field through type checks, range clamps, and set-based dedup. Invalid or unknown data gracefully degrades rather than crashing.

- **Angular CDK Drag-and-Drop** — Used for drop-off reordering instead of a custom implementation. Provides accessible keyboard support, smooth animations, and a consistent drag preview.

## Verification

The verification example from the spec passes as an automated test:

> Pickup A → Drop B → Drop C, 2 Medium trucks, 5 tonnes, loading assistance only:
> distance 27 km, transport 4,590 BDT, services 1,200 BDT, total 5,790 BDT.
