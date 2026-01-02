export interface GeoPoint {
        name: string;
        lat: number;
        lng: number;
        country?: string;
        description?: string;
        id?: string;
        boundingBox?: GeoBounds;
        population?: number | null;
        area?: number | null;
        geometry?: GeoJsonLike | null;
        geometrySource?: 'polygon' | 'bbox' | 'none';
        isLoadingDetails?: boolean;
        detailsError?: string | null;
}

export enum DistanceUnit {
        KILOMETERS = 'km',
        MILES = 'mi',
}

export interface SearchResult {
        name: string;
        lat: number;
        lng: number;
        description: string;
        country: string;
        boundingBox?: GeoBounds;
        id?: string;
}

export interface GeoBounds {
        north: number;
        south: number;
        east: number;
        west: number;
}

export type GeoJsonLike =
        | {
                  type: 'Feature';
                  geometry: any;
                  properties?: Record<string, any>;
          }
        | {
                  type: 'FeatureCollection';
                  features: GeoJsonLike[];
                  properties?: Record<string, any>;
          }
        | null;

export enum ComparisonMode {
        DISTANCE = 'distance',
        POPULATION = 'population',
        AREA = 'area',
}
