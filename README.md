# Multi-Stop Trip Quote Planner

A self-contained Angular 18 application for configuring multi-stop truck trips, generating fare estimates, and saving drafts locally. Trip and location data are fictional; no backend or external API is required.

## Environment

- **Node.js:** 22.23.2
- **Bun:** 1.4.2 (package manager and script runner)
- **Angular:** 18 (Angular CLI is included as a development dependency)

The versions above were used to build and test the application.

## Setup

```bash
bun i
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

Run the test suite in watch mode:

```bash
bun run test
```

Run the test in a headless browser:

```bash
bun run test --watch=false --browsers=ChromeHeadless
```


## Technical Decisions

- **Reactive Forms** — The trip form uses Angular Reactive Forms and a `FormArray` for the variable-length drop-off list, supporting dynamic stop management and validation.

- **Angular CDK Drag-and-Drop** — Used for stop reordering rather than a custom implementation.

- **Quote race safety** — `switchMap` unsubscribes from the previous request when a new quote starts. A pending quote is also cancelled when its input form changes, and a request ID guard prevents obsolete results from being applied.

- **Testable delay injection** — `QuoteService.setDelayFn()` lets tests replace the random delay with a deterministic duration.

- **Draft sanitization** — `DraftService.loadDraft()` validates and normalizes persisted values before using them, so malformed or outdated local data does not crash the form.

- **Single pricing source** — The Rates page and quote calculation use the same truck and service pricing constants to avoid divergent displayed and calculated rates.

## Issues Addressed

- A quote could otherwise complete for inputs that had changed while it was pending. Form edits now cancel the in-flight request, and request IDs guard against obsolete results.
- Persisted drafts can be malformed or out of date, so restored values are sanitized before they are applied to the form.

## Verification

The automated tests cover pricing and route calculations, quote validation, draft sanitization, stop selection, and asynchronous quote state (including cancellation when inputs change). The application was verified with:

```bash
bun run build
bun run test --watch=false --browsers=ChromeHeadless
```

The verification example from the specification is covered by an automated test:

> Pickup A → Drop B → Drop C, 2 Medium trucks, 5 tonnes, loading assistance only:
> distance 27 km, transport 4,590 BDT, services 1,200 BDT, total 5,790 BDT.

## AI Assistance Disclosure

GitHub Copilot in VS Code was used to assist with implementation and documentation. The implementation and README were reviewed against the assessment requirements, including pricing, validation, draft handling, and asynchronous quote state. The build and headless test suite above were run; the tests cover quote calculations, validation, draft handling, route selection, and asynchronous request state.
