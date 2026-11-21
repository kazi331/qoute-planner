export type LocationId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Location {
  id: LocationId;
  name: string;
}

export const LOCATIONS: Location[] = [
  { id: 'A', name: 'Baily Road' },
  { id: 'B', name: 'Shahbagh' },
  { id: 'C', name: 'Bijoy Sarani' },
  { id: 'D', name: 'Banani' },
  { id: 'E', name: 'Uttara' },
];

const DISTANCE_MAP: Record<string, number> = {
  'A-B': 12,
  'A-C': 18,
  'A-D': 26,
  'A-E': 30,
  'B-C': 15,
  'B-D': 29,
  'B-E': 24,
  'C-D': 22,
  'C-E': 28,
  'D-E': 17,
};

export function getDistance(from: LocationId, to: LocationId): number {
  if (from === to) return 0;
  const key1 = `${from}-${to}`;
  const key2 = `${to}-${from}`;
  return DISTANCE_MAP[key1] ?? DISTANCE_MAP[key2] ?? 0;
}

export function calculateRouteDistance(stops: LocationId[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += getDistance(stops[i], stops[i + 1]);
  }
  return total;
}
