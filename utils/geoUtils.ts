import { DistanceUnit } from '../types';

export const calculateDistance = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
	unit: DistanceUnit
): number => {
	if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(value))) {
		return 0;
	}
	const R = 6371; // Radius of Earth in KM
	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c;

	return unit === DistanceUnit.KILOMETERS ? distance : distance * 0.621371;
};

export const getMidpoint = (lat1: number, lng1: number, lat2: number, lng2: number) => {
	const toRad = (deg: number) => deg * (Math.PI / 180);
	const toDeg = (rad: number) => rad * (180 / Math.PI);

	const dLng = toRad(lng2 - lng1);
	const lat1Rad = toRad(lat1);
	const lat2Rad = toRad(lat2);
	const lng1Rad = toRad(lng1);

	const Bx = Math.cos(lat2Rad) * Math.cos(dLng);
	const By = Math.cos(lat2Rad) * Math.sin(dLng);

	const midLat = Math.atan2(
		Math.sin(lat1Rad) + Math.sin(lat2Rad),
		Math.sqrt((Math.cos(lat1Rad) + Bx) ** 2 + By ** 2)
	);
	const midLng = lng1Rad + Math.atan2(By, Math.cos(lat1Rad) + Bx);

	return {
		lat: toDeg(midLat),
		lng: toDeg(midLng),
	};
};

export const formatDistance = (dist: number, unit: DistanceUnit): string => {
	return `${dist.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
};
