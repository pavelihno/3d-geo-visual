import { SearchResult } from '../types';

interface LocationStats {
	population: number | null;
	area: number | null;
	label: string;
}

const statsCache = new Map<string, LocationStats>();
const inflight = new Map<string, Promise<LocationStats>>();

const getLocationKey = (result: SearchResult) =>
	result.id ?? `${result.name}_${result.lat.toFixed(3)}_${result.lng.toFixed(3)}`;

const normalizeNumber = (value: unknown): number | null => {
	const num = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(num) ? num : null;
};

export const fetchPopulationAndArea = async (result: SearchResult): Promise<LocationStats> => {
	const key = getLocationKey(result);

	if (statsCache.has(key)) {
		return statsCache.get(key)!;
	}

	if (inflight.has(key)) {
		return inflight.get(key)!;
	}

	const request = (async () => {
		const query = result.country || result.name;
		const url = new URL(`https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`);
		url.searchParams.set('fullText', 'true');
		url.searchParams.set('fields', 'name,population,area');

		const response = await fetch(url.toString(), {
			headers: {
				'User-Agent': '3d-geo-visual/1.0',
			},
		});

		if (response.status === 429) {
			throw new Error('RATE_LIMIT_EXCEEDED');
		}

		if (!response.ok) {
			throw new Error('STATS_REQUEST_FAILED');
		}

		const payload = await response.json();
		const first = Array.isArray(payload) ? payload[0] : payload;

		const stats: LocationStats = {
			population: normalizeNumber(first?.population),
			area: normalizeNumber(first?.area),
			label: first?.name?.common || result.name,
		};

		statsCache.set(key, stats);
		inflight.delete(key);
		return stats;
	})();

	inflight.set(key, request);
	return request;
};
