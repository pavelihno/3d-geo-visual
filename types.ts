
export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  country?: string;
}

export enum DistanceUnit {
  KILOMETERS = 'km',
  MILES = 'mi'
}

export interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  description: string;
  country: string;
}
