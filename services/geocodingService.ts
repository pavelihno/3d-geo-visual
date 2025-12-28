import { SearchResult } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_QUERY_LENGTH = 3;

interface GeocodingOptions {
	signal?: AbortSignal;
	limit?: number;
}

interface NominatimResult {
	display_name: string;
	lat: string;
	lon: string;
	type?: string;
	address?: {
		city?: string;
		town?: string;
		village?: string;
		hamlet?: string;
		suburb?: string;
		road?: string;
		county?: string;
		state?: string;
		country?: string;
	};
}

const normalizeResult = (entry: NominatimResult): SearchResult => {
	const name =
		entry.address?.city ||
		entry.address?.town ||
		entry.address?.village ||
		entry.address?.hamlet ||
		entry.address?.suburb ||
		entry.address?.road ||
		entry.display_name;

	const country = entry.address?.country || '';
	const region = entry.address?.state || entry.address?.county || '';
	const placeType = entry.type ? entry.type.replace(/_/g, ' ') : '';
	const descriptionParts = [placeType, region, country].map((part) => part.trim()).filter(Boolean);

	return {
		name,
		lat: Number.parseFloat(entry.lat),
		lng: Number.parseFloat(entry.lon),
		description: descriptionParts.join(' • ') || entry.display_name,
		country,
	};
};

export const searchLocations = async (query: string, options: GeocodingOptions = {}): Promise<SearchResult[]> => {
	const trimmed = query.trim();
	if (trimmed.length < MIN_QUERY_LENGTH) return [];

	const limit = options.limit ?? 5;
	const url = new URL(NOMINATIM_URL);
	url.searchParams.set('format', 'json');
	url.searchParams.set('q', trimmed);
	url.searchParams.set('addressdetails', '1');
	url.searchParams.set('limit', String(limit));

	const response = await fetch(url.toString(), {
		signal: options.signal,
		headers: {
			'User-Agent': '3d-geo-visual/1.0 (https://github.com/google-cloud-labs/vertex-ai-samples)',
			Accept: 'application/json',
		},
	});

	if (response.status === 429) {
		throw new Error('RATE_LIMIT_EXCEEDED');
	}

	if (!response.ok) {
		throw new Error('GEOCODING_FAILED');
	}

	const data: NominatimResult[] = await response.json();
	return data.map(normalizeResult);
};
