import { GeoBounds, GeoJsonLike, SearchResult } from '../types';

const geometryCache = new Map<string, GeoJsonLike>();
const inflightGeometry = new Map<string, Promise<GeoJsonLike>>();

const getLocationKey = (result: SearchResult) => result.id ?? `${result.name}_${result.lat.toFixed(3)}_${result.lng.toFixed(3)}`;

const createBoundingBoxFeature = (bounds: GeoBounds, name: string): GeoJsonLike => ({
        type: 'Feature',
        properties: { name, source: 'bbox' },
        geometry: {
                type: 'Polygon',
                coordinates: [
                        [
                                [bounds.west, bounds.south],
                                [bounds.east, bounds.south],
                                [bounds.east, bounds.north],
                                [bounds.west, bounds.north],
                                [bounds.west, bounds.south],
                        ],
                ],
        },
});

export const fetchRegionGeometry = async (result: SearchResult): Promise<GeoJsonLike> => {
        const key = getLocationKey(result);

        if (geometryCache.has(key)) {
                return geometryCache.get(key) ?? null;
        }

        if (inflightGeometry.has(key)) {
                return inflightGeometry.get(key)!;
        }

        const request = (async () => {
                const query = `${result.name}, ${result.country}`.trim();
                const url = new URL('https://nominatim.openstreetmap.org/search');
                url.searchParams.set('format', 'geojson');
                url.searchParams.set('polygon_geojson', '1');
                url.searchParams.set('limit', '1');
                url.searchParams.set('q', query);

                const response = await fetch(url.toString(), {
                        headers: {
                                'User-Agent': '3d-geo-visual/1.0',
                                Accept: 'application/geo+json, application/json',
                        },
                });

                if (response.status === 429) {
                        throw new Error('RATE_LIMIT_EXCEEDED');
                }

                if (!response.ok) {
                        throw new Error('GEOMETRY_REQUEST_FAILED');
                }

                const payload = await response.json();
                const feature = Array.isArray(payload?.features) ? payload.features[0] : null;

                const geometry: GeoJsonLike = feature || null;
                const finalGeometry = geometry ?? (result.boundingBox ? createBoundingBoxFeature(result.boundingBox, result.name) : null);

                geometryCache.set(key, finalGeometry);
                inflightGeometry.delete(key);
                return finalGeometry;
        })();

        inflightGeometry.set(key, request);
        return request;
};
