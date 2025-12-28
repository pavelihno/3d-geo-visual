export interface DeviceLocation {
	lat: number;
	lng: number;
}

export const getCurrentLocation = (): Promise<DeviceLocation> => {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocation is not supported in this browser.'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			(error) => {
				reject(new Error(error.message || 'Unable to retrieve your location.'));
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 5000,
			}
		);
	});
};
