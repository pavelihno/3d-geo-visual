import React, { useState, useEffect, useRef, useMemo } from 'react';
import WorldGlobe, { GlobeMethods } from './components/WorldGlobe';
import SearchInput from './components/SearchInput';
import { ComparisonMode, GeoJsonLike, GeoPoint, DistanceUnit, SearchResult } from './types';
import { calculateDistance, formatDistance } from './utils/geoUtils';
import { getCurrentLocation } from './utils/location';
import { designTokens, getThemeClasses, ThemeMode } from './utils/designTokens';
import { fetchPopulationAndArea } from './services/statisticsService';
import { fetchRegionGeometry } from './services/geometryService';
import {
	ArrowDownUp,
	RotateCcw,
	Plus,
	Minus,
	Map,
	Navigation,
	MousePointer2,
	Edit3,
	ChevronRight,
	Trash2,
	LocateFixed,
	AlertTriangle,
	Moon,
	Sun,
} from 'lucide-react';

const DEFAULT_POINTS: GeoPoint[] = [
	{ name: 'Copenhagen', lat: 55.6761, lng: 12.5683, country: 'Denmark', id: 'default-copenhagen' },
	{ name: 'Moscow', lat: 55.7558, lng: 37.6173, country: 'Russia', id: 'default-moscow' },
];

const BASELINE_REGION: SearchResult = {
	name: 'Denmark',
	description: 'Nordic baseline region',
	country: 'Denmark',
	lat: 56.2639,
	lng: 9.5018,
	id: 'baseline-denmark',
};

const COMPARISON_SLIDER = [ComparisonMode.DISTANCE, ComparisonMode.POPULATION, ComparisonMode.AREA];

const App: React.FC = () => {
	const [points, setPoints] = useState<GeoPoint[]>(DEFAULT_POINTS);
	const [unit, setUnit] = useState<DistanceUnit>(DistanceUnit.KILOMETERS);
	const [activeEditingIndex, setActiveEditingIndex] = useState<number | null>(null);
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [themeMode, setThemeMode] = useState<ThemeMode>('light');
	const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(ComparisonMode.DISTANCE);
	const [baselineStats, setBaselineStats] = useState<{
		population: number | null;
		area: number | null;
		label: string;
	} | null>(null);
	const [baselineError, setBaselineError] = useState<string | null>(null);
	const [isBaselineLoading, setIsBaselineLoading] = useState(false);
	const globeRef = useRef<GlobeMethods>(null);

	const theme = getThemeClasses(themeMode);
	const comparisonLabel: Record<ComparisonMode, string> = useMemo(
		() => ({
			[ComparisonMode.DISTANCE]: 'Distance',
			[ComparisonMode.POPULATION]: 'Population',
			[ComparisonMode.AREA]: 'Area',
		}),
		[]
	);
	const totalDistance = useMemo(() => {
		let dist = 0;
		for (let i = 0; i < points.length - 1; i++) {
			dist += calculateDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng, unit);
		}
		return dist;
	}, [points, unit]);
	const totalDistanceLabel = useMemo(() => formatDistance(totalDistance, unit), [totalDistance, unit]);
	const totalDistanceValue = totalDistanceLabel.split(' ')[0] ?? '0';

	const regionPolygons = useMemo(
		() =>
			points.flatMap((point) => {
				if (!point.geometry) return [] as GeoJsonLike[];

				if (point.geometry.type === 'FeatureCollection') {
					const features = point.geometry.features || [];
					return features.filter(Boolean).map((feature) => ({
						...feature,
						properties: { ...(feature?.properties || {}), label: point.name },
					})) as GeoJsonLike[];
				}

				return [
					{
						...point.geometry,
						properties: { ...(point.geometry.properties || {}), label: point.name },
					},
				];
			}),
		[points]
	);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', themeMode);
	}, [themeMode]);

	const updatePointAtIndex = (index: number, updater: (prev: GeoPoint) => GeoPoint) => {
		setPoints((prev) => {
			if (!prev[index]) return prev;
			const nextPoints = [...prev];
			nextPoints[index] = updater(prev[index]);
			return nextPoints;
		});
	};

	const toSearchResult = (point: GeoPoint): SearchResult => ({
		name: point.name,
		lat: point.lat,
		lng: point.lng,
		country: point.country || 'Unknown region',
		description: point.description || point.country || point.name,
		boundingBox: point.boundingBox,
		id: point.id,
	});

	const hydratePoint = async (index: number, result: SearchResult) => {
		updatePointAtIndex(index, (prev) => ({ ...prev, isLoadingDetails: true, detailsError: null }));
		try {
			const stats = await fetchPopulationAndArea(result);
			const geometry = await fetchRegionGeometry(result);

			updatePointAtIndex(index, (prev) => {
				const geometrySource: GeoPoint['geometrySource'] = geometry
					? 'polygon'
					: result.boundingBox
					? 'bbox'
					: 'none';

				const boundingFallback: GeoJsonLike | null = result.boundingBox
					? {
							type: 'Feature',
							geometry: {
								type: 'Polygon',
								coordinates: [
									[
										[result.boundingBox.west, result.boundingBox.south],
										[result.boundingBox.east, result.boundingBox.south],
										[result.boundingBox.east, result.boundingBox.north],
										[result.boundingBox.west, result.boundingBox.north],
										[result.boundingBox.west, result.boundingBox.south],
									],
								],
							},
							properties: { name: result.name, source: 'bbox' },
					  }
					: null;

				return {
					...prev,
					population: stats.population,
					area: stats.area,
					geometry: geometry ?? boundingFallback,
					geometrySource,
					isLoadingDetails: false,
					detailsError: null,
				};
			});
		} catch (error) {
			const message =
				error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED'
					? 'Data temporarily rate limited. Please try again soon.'
					: 'Unable to load comparison data right now.';

			updatePointAtIndex(index, (prev) => ({ ...prev, detailsError: message, isLoadingDetails: false }));
		}
	};

	useEffect(() => {
		if (comparisonMode === ComparisonMode.DISTANCE) return;

		points.forEach((point, idx) => {
			const needsPopulation = comparisonMode === ComparisonMode.POPULATION && point.population === undefined;
			const needsArea =
				comparisonMode === ComparisonMode.AREA && (point.area === undefined || point.geometry === undefined);

			if ((needsPopulation || needsArea) && !point.isLoadingDetails) {
				hydratePoint(idx, toSearchResult(point));
			}
		});
	}, [comparisonMode, points]);

	useEffect(() => {
		if (comparisonMode === ComparisonMode.DISTANCE) return;
		if (baselineStats || isBaselineLoading) return;

		setIsBaselineLoading(true);
		setBaselineError(null);

		fetchPopulationAndArea(BASELINE_REGION)
			.then((stats) => {
				setBaselineStats(stats);
			})
			.catch((error) => {
				const message =
					error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED'
						? 'Baseline data temporarily rate limited.'
						: 'Unable to load baseline comparison data.';
				setBaselineError(message);
			})
			.finally(() => setIsBaselineLoading(false));
	}, [comparisonMode, baselineStats, isBaselineLoading]);

	const handleSelect = (index: number) => (result: SearchResult) => {
		setPoints((prev) => {
			if (!prev[index]) return prev;
			const newPoint = {
				name: result.name,
				lat: result.lat,
				lng: result.lng,
				country: result.country,
				description: result.description,
				boundingBox: result.boundingBox,
				id: result.id,
				population: undefined,
				area: undefined,
				geometry: undefined,
				geometrySource: undefined,
				isLoadingDetails: false,
				detailsError: null,
			};
			const newPoints = [...prev];
			newPoints[index] = newPoint;
			return newPoints;
		});
		setActiveEditingIndex(null);
		if (comparisonMode !== ComparisonMode.DISTANCE) {
			hydratePoint(index, result);
		}
	};

	const addPoint = () => {
		const lastPoint = points[points.length - 1] ?? DEFAULT_POINTS[DEFAULT_POINTS.length - 1];
		// Create a generic "Next Stop" placeholder based on last point or default
		const newPoint = {
			...lastPoint,
			name: `Stop ${points.length + 1}`,
			population: undefined,
			area: undefined,
			geometry: undefined,
			geometrySource: undefined,
			detailsError: null,
			isLoadingDetails: false,
		};
		setPoints((prev) => [...prev, newPoint]);
		setActiveEditingIndex(points.length);
	};

	const removePoint = (index: number) => {
		// Keep at least two points to satisfy "default two points"
		if (points.length <= 2) return;
		setPoints((prev) => prev.filter((_, i) => i !== index));
		setActiveEditingIndex((current) => {
			if (current === null) return null;
			if (current === index) return null;
			if (current > index) return current - 1;
			return current;
		});
	};

	const reverseJourney = () => {
		setPoints([...points].reverse());
		setActiveEditingIndex((current) => {
			if (current === null) return null;
			return points.length - 1 - current;
		});
	};

	const handlePointMove = (lat: number, lng: number) => {
		if (activeEditingIndex === null) return;
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
		const label = String.fromCharCode(65 + activeEditingIndex);
		const newPoint = {
			name: `Custom Pin ${label}`,
			lat,
			lng,
			description: 'Custom pin',
			country: 'Custom',
			population: undefined,
			area: undefined,
			geometry: undefined,
			geometrySource: undefined,
			detailsError: null,
			isLoadingDetails: false,
			id: `custom-${label}`,
		};
		setPoints((prev) => {
			if (!prev[activeEditingIndex]) return prev;
			const newPoints = [...prev];
			newPoints[activeEditingIndex] = newPoint;
			return newPoints;
		});
	};

	const setCurrentLocation = async () => {
		try {
			setIsLocating(true);
			setLocationError(null);
			const { lat, lng } = await getCurrentLocation();
			setPoints((prev) => {
				if (prev.length === 0) {
					return [
						{
							name: 'Current Location',
							lat,
							lng,
							description: 'Live position',
							population: undefined,
							area: undefined,
							geometry: undefined,
							geometrySource: undefined,
							detailsError: null,
							isLoadingDetails: false,
							id: 'current-location',
						},
					];
				}
				const updatedPoints = [...prev];
				updatedPoints[0] = {
					name: 'Current Location',
					lat,
					lng,
					description: 'Live position',
					population: undefined,
					area: undefined,
					geometry: undefined,
					geometrySource: undefined,
					detailsError: null,
					isLoadingDetails: false,
					id: 'current-location',
				};
				return updatedPoints;
			});
			setActiveEditingIndex(0);
			globeRef.current?.resetView();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to fetch your location.';
			setLocationError(message);
		} finally {
			setIsLocating(false);
		}
	};

	const resetAll = (e: React.MouseEvent) => {
		e.preventDefault(); // Prevent potential default behavior issues
		setPoints(
			DEFAULT_POINTS.map((point, idx) => ({
				...point,
				name: point.name,
				population: undefined,
				area: undefined,
				geometry: undefined,
				geometrySource: undefined,
				detailsError: null,
				isLoadingDetails: false,
				id: point.id || `default-${idx}`,
			}))
		);
		setActiveEditingIndex(null);
		globeRef.current?.resetView();
	};

	return (
		<div className={`relative app-shell font-sans transition-colors duration-500 ${theme.palette.background}`}>
			{/* Visualizer Area */}
			<div
				className={`relative app-globe overflow-hidden border-b lg:border-b-0 ${theme.palette.borderStrong} ${designTokens.spacing.layoutX}`}
			>
				<WorldGlobe
					ref={globeRef}
					points={points}
					unit={unit}
					comparisonMode={comparisonMode}
					regionPolygons={regionPolygons}
					onPointMove={handlePointMove}
					activePointIndex={activeEditingIndex}
					className={theme.palette.surfaceSubtle}
				/>

				{/* Zoom Controls Overlay */}
				<div className='absolute right-4 sm:right-6 top-4 sm:top-1/2 sm:-translate-y-1/2 z-10 flex sm:flex-col gap-3'>
					<div className={`flex flex-col ${theme.softPanel} overflow-hidden shadow-lg`}>
						<button
							onClick={() => globeRef.current?.zoomIn()}
							className={`p-4 ${theme.palette.textPrimary} hover:${theme.palette.accent} focus-visible:outline-none focus-visible:ring-2 ${theme.palette.ring} transition-colors border-b ${theme.palette.borderStrong} touch-manipulation`}
							title='Zoom In'
							aria-label='Zoom in'
						>
							<Plus size={22} strokeWidth={2.5} />
						</button>
						<button
							onClick={() => globeRef.current?.zoomOut()}
							className={`p-4 ${theme.palette.textPrimary} hover:${theme.palette.accent} focus-visible:outline-none focus-visible:ring-2 ${theme.palette.ring} transition-colors touch-manipulation`}
							title='Zoom Out'
							aria-label='Zoom out'
						>
							<Minus size={22} strokeWidth={2.5} />
						</button>
					</div>
					<button
						onClick={() => globeRef.current?.resetView()}
						className={`p-4 ${theme.softPanel} ${theme.palette.textPrimary} hover:${theme.palette.accent} transition-all shadow-lg active:scale-95 touch-manipulation focus-visible:outline-none focus-visible:ring-2 ${theme.palette.ring}`}
						title='Reset View'
						aria-label='Reset view'
					>
						<Navigation size={22} strokeWidth={2.5} />
					</button>
				</div>

				{/* Manual Interaction Indicator */}
				{activeEditingIndex !== null && (
					<div className='absolute bottom-10 left-1/2 -translate-x-1/2 z-20'>
						<div
							className='bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce'
							role='status'
							aria-live='polite'
						>
							<MousePointer2 size={18} />
							<span className='text-sm font-bold uppercase tracking-wider'>
								Tap on Earth to set Point {String.fromCharCode(65 + activeEditingIndex)}
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Control Sidebar */}
			<div
				className={`app-sidebar z-30 flex flex-col min-h-0 shadow-[-4px_0_24px_rgba(0,0,0,0.04)] border-l ${theme.palette.borderStrong} ${theme.panel}`}
			>
				<header
					className={`${designTokens.spacing.layoutX} ${designTokens.spacing.layoutY} pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between ${designTokens.spacing.gap}`}
				>
					<div className='flex items-center gap-4'>
						<div
							className={`p-3 ${theme.palette.accentSurface} rounded-2xl shadow-lg shadow-blue-200/60 transition-transform duration-300 hover:scale-105`}
						>
							<Map className='text-white' size={24} aria-hidden />
						</div>
						<div>
							<h1 className={`${designTokens.typography.title} ${theme.textPrimary}`}>GeoVisual</h1>
							<p className={`${designTokens.typography.smallCaps} text-blue-400 mt-1.5`}>
								Multi-Stop Journey
							</p>
						</div>
					</div>

					<div className='flex items-center gap-2 sm:gap-3'>
						<div className={`flex ${theme.mutedSurface} ${designTokens.radii.pill} p-1`}>
							{(['km', 'mi'] as const).map((u) => (
								<button
									key={u}
									onClick={() => setUnit(u === 'km' ? DistanceUnit.KILOMETERS : DistanceUnit.MILES)}
									className={`px-3 py-1.5 ${
										designTokens.radii.pill
									} text-[11px] font-black transition-all focus-visible:outline-none focus-visible:ring-2 ${
										theme.palette.ring
									} ${
										unit === (u === 'km' ? DistanceUnit.KILOMETERS : DistanceUnit.MILES)
											? `${theme.panel} ${theme.palette.textPrimary} shadow-sm`
											: `${theme.palette.textSecondary} hover:${theme.palette.textPrimary}`
									}`}
									aria-pressed={unit === (u === 'km' ? DistanceUnit.KILOMETERS : DistanceUnit.MILES)}
									aria-label={`Display distances in ${u === 'km' ? 'kilometers' : 'miles'}`}
								>
									{u.toUpperCase()}
								</button>
							))}
						</div>
						<button
							onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
							className={`p-2.5 ${theme.softPanel} ${theme.focusRing} flex items-center justify-center ${designTokens.radii.lg} transition-transform duration-200 hover:scale-105`}
							aria-pressed={themeMode === 'dark'}
							aria-label={`Activate ${themeMode === 'light' ? 'dark' : 'light'} mode`}
							title='Toggle dark mode'
						>
							{themeMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
						</button>
					</div>
				</header>

				<div className={`${designTokens.spacing.layoutX} -mt-2 space-y-3`}>
					<button
						onClick={setCurrentLocation}
						disabled={isLocating}
						className={`w-full flex items-center justify-center gap-2 ${theme.palette.accentSurface} ${theme.palette.accentHover} disabled:opacity-60 text-white ${designTokens.spacing.controlPadding} ${designTokens.radii.xl} transition-all font-bold text-xs uppercase tracking-widest active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
					>
						<LocateFixed size={16} aria-hidden />
						{isLocating ? 'Detecting...' : 'Use Current Location'}
					</button>
					{locationError && (
						<div
							className={`flex items-center gap-2 p-3 ${designTokens.radii.lg} text-amber-100 bg-amber-500/20 border border-amber-200/70 ${theme.palette.textPrimary}`}
							role='alert'
							aria-live='polite'
						>
							<AlertTriangle size={14} />
							<span className='truncate text-sm'>{locationError}</span>
						</div>
					)}
				</div>

				<div
					className={`flex-grow min-h-0 ${designTokens.spacing.layoutX} ${designTokens.spacing.layoutY} space-y-6 overflow-y-auto custom-scrollbar`}
				>
					<div className='space-y-3' aria-live='polite'>
						<div className='flex items-center justify-between gap-3'>
							<div>
								<p className={`${designTokens.typography.label} ${theme.textSecondary}`}>
									Comparison Mode
								</p>
								<p className={`${designTokens.typography.subtle} ${theme.textSecondary}`}>
									Choose how locations are compared
								</p>
							</div>
							<span className={`text-xs font-black uppercase tracking-widest ${theme.textPrimary}`}>
								{comparisonLabel[comparisonMode]}
							</span>
						</div>
						<div className='space-y-2'>
							<input
								type='range'
								min={0}
								max={COMPARISON_SLIDER.length - 1}
								step={1}
								value={COMPARISON_SLIDER.indexOf(comparisonMode)}
								onChange={(e) => {
									const next = COMPARISON_SLIDER[Number(e.target.value)];
									setComparisonMode(next ?? ComparisonMode.DISTANCE);
								}}
								className='w-full accent-blue-500'
								aria-label='Comparison mode'
							/>
							<div className='flex justify-between text-[11px] text-blue-500 font-black uppercase tracking-[0.15em]'>
								<span>Distance</span>
								<span>Population</span>
								<span>Area</span>
							</div>
						</div>
					</div>

					{/* Point List */}
					<div className='space-y-4'>
						{points.map((p, idx) => (
							<div key={idx} className='relative group'>
								<div className='flex items-start gap-3 sm:gap-4'>
									<div className='flex flex-col items-center mt-6'>
										<div className='w-7 h-7 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm'>
											{String.fromCharCode(65 + idx)}
										</div>
										{idx < points.length - 1 && (
											<div className='w-0.5 h-12 bg-gradient-to-b from-blue-500/60 to-blue-200/50 my-1 rounded-full opacity-70'></div>
										)}
									</div>

									<div className='flex-grow pt-3'>
										<div className='relative'>
											<SearchInput
												label={`Point ${String.fromCharCode(65 + idx)}`}
												placeholder='Search location...'
												onSelect={handleSelect(idx)}
												value={p?.name}
												isActive={activeEditingIndex === idx}
												onFocus={() => setActiveEditingIndex(idx)}
												themeMode={themeMode}
											/>
											<div className='absolute right-0 -top-1 flex gap-1'>
												<button
													onClick={() => setActiveEditingIndex(idx)}
													className={`p-2 transition-colors ${
														designTokens.radii.lg
													} focus-visible:outline-none focus-visible:ring-2 ${
														theme.palette.ring
													} ${
														activeEditingIndex === idx
															? 'text-blue-500'
															: `${theme.palette.textSecondary} hover:${theme.palette.textPrimary}`
													}`}
													aria-label={`Edit point ${String.fromCharCode(65 + idx)}`}
												>
													<Edit3 size={14} />
												</button>
												{points.length > 2 && (
													<button
														onClick={() => removePoint(idx)}
														className={`p-2 ${designTokens.radii.lg} ${theme.focusRing} ${theme.palette.textSecondary} hover:text-red-500 transition-colors`}
														aria-label={`Remove point ${String.fromCharCode(65 + idx)}`}
													>
														<Trash2 size={14} />
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}

						{/* Add Point Action */}
						<button
							onClick={addPoint}
							className={`w-full py-4 border-2 border-dashed ${theme.palette.borderStrong} ${theme.focusRing} ${designTokens.radii.xl} ${theme.palette.textSecondary} hover:border-blue-300 hover:text-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 group`}
							aria-label='Add a new stop'
						>
							<div className='w-6 h-6 rounded-full border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:scale-110'>
								<Plus size={14} />
							</div>
							<span className='text-xs font-black uppercase tracking-widest'>Add Next Stop</span>
						</button>
					</div>

					{/* Journey Controls */}
					<div className='flex justify-center pt-2'>
						<button
							onClick={reverseJourney}
							className={`flex items-center gap-2 px-5 py-2.5 ${theme.softPanel} ${theme.palette.textSecondary} hover:text-blue-500 rounded-full border ${theme.palette.borderStrong} transition-all text-[10px] font-black uppercase tracking-widest ${theme.focusRing}`}
							aria-label='Reverse journey order'
						>
							<ArrowDownUp size={14} />
							Reverse Journey
						</button>
					</div>

					{/* Result Card */}
					<div
						className={`relative overflow-hidden group mt-4 ${theme.panel} border ${theme.palette.borderStrong}`}
					>
						<div className='absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 opacity-70 group-hover:opacity-90 transition-opacity' />
						<div className='absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity'>
							<Navigation size={140} className='rotate-45' />
						</div>
						<div className='relative z-10 p-8 space-y-4'>
							<p className='text-blue-400 text-[11px] font-black uppercase tracking-[0.3em]'>
								{comparisonLabel[comparisonMode]} Insights
							</p>

							{comparisonMode === ComparisonMode.DISTANCE && (
								<>
									<h2
										className={`text-4xl sm:text-5xl font-black tracking-tighter flex items-baseline gap-2 ${theme.textPrimary}`}
									>
										{totalDistanceValue}
										<span className='text-xl font-bold text-blue-500 uppercase'>{unit}</span>
									</h2>
									<div
										className={`flex flex-wrap items-center gap-2 ${theme.textSecondary} text-[11px] font-medium`}
										aria-live='polite'
									>
										{points.map((p, i) => (
											<React.Fragment key={i}>
												<span className='truncate max-w-[120px] sm:max-w-[160px]'>
													{p.name}
												</span>
												{i < points.length - 1 && (
													<ChevronRight size={12} className='text-blue-300 shrink-0' />
												)}
											</React.Fragment>
										))}
									</div>
								</>
							)}

							{comparisonMode === ComparisonMode.POPULATION && (
								<div className='space-y-4' aria-live='polite'>
									<div className='space-y-2'>
										{points.map((p, i) => (
											<div
												key={`${p.name}-${i}`}
												className={`flex items-start justify-between gap-3 border ${theme.palette.borderStrong} rounded-2xl px-4 py-3 ${theme.palette.surfaceSubtle}`}
											>
												<div className='flex items-center gap-2'>
													<div className='w-7 h-7 rounded-full bg-blue-500/10 border border-blue-300 flex items-center justify-center text-[10px] font-black text-blue-500'>
														{String.fromCharCode(65 + i)}
													</div>
													<div>
														<p className={`font-bold ${theme.textPrimary}`}>{p.name}</p>
														<p
															className={`${designTokens.typography.subtle} ${theme.textSecondary}`}
														>
															{p.country}
														</p>
													</div>
												</div>
												<div className='text-right min-w-[120px]'>
													{p.isLoadingDetails ? (
														<div className='flex justify-end'>
															<div
																className='h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
																aria-label='Loading population'
															/>
														</div>
													) : p.population !== null && p.population !== undefined ? (
														<p className='font-black text-sm text-blue-500'>
															{p.population.toLocaleString()}
														</p>
													) : p.detailsError ? (
														<p className='text-xs text-amber-500'>{p.detailsError}</p>
													) : (
														<p className='text-xs text-gray-400'>Population unavailable</p>
													)}
												</div>
											</div>
										))}
									</div>

									<div
										className={`rounded-2xl p-4 ${theme.palette.surface} border ${theme.palette.borderStrong}`}
									>
										<p
											className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textSecondary}`}
										>
											Baseline (Denmark)
										</p>
										{isBaselineLoading ? (
											<div className='flex items-center gap-2 mt-2 text-blue-500'>
												<div
													className='h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
													aria-label='Loading baseline'
												/>
												<span className='text-sm'>Loading baseline stats…</span>
											</div>
										) : baselineStats ? (
											<p className={`text-xl font-black ${theme.textPrimary}`}>
												{baselineStats.population?.toLocaleString() ?? 'Not available'}
											</p>
										) : baselineError ? (
											<p className='text-sm text-amber-500'>{baselineError}</p>
										) : (
											<p className='text-sm text-gray-400'>Baseline unavailable</p>
										)}
									</div>
								</div>
							)}

							{comparisonMode === ComparisonMode.AREA && (
								<div className='space-y-4' aria-live='polite'>
									<div className='grid gap-3'>
										{points.map((p, i) => (
											<div
												key={`${p.name}-${i}`}
												className={`flex items-start justify-between gap-3 border ${theme.palette.borderStrong} rounded-2xl px-4 py-3 ${theme.palette.surfaceSubtle}`}
											>
												<div>
													<p className={`font-bold ${theme.textPrimary}`}>{p.name}</p>
													<p
														className={`${designTokens.typography.subtle} ${theme.textSecondary}`}
													>
														{p.country}
													</p>
												</div>
												<div className='text-right min-w-[160px] space-y-1'>
													{p.isLoadingDetails ? (
														<div className='flex justify-end'>
															<div
																className='h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
																aria-label='Loading area'
															/>
														</div>
													) : p.area !== null && p.area !== undefined ? (
														<p className='font-black text-sm text-blue-500'>
															{p.area.toLocaleString(undefined, {
																maximumFractionDigits: 0,
															})}{' '}
															km²
														</p>
													) : p.detailsError ? (
														<p className='text-xs text-amber-500'>{p.detailsError}</p>
													) : (
														<p className='text-xs text-gray-400'>Area unavailable</p>
													)}
													<p className='text-[11px] text-gray-400'>
														{p.geometrySource === 'polygon'
															? 'Detailed boundary'
															: p.geometrySource === 'bbox'
															? 'Outline fallback'
															: 'No outline available'}
													</p>
												</div>
											</div>
										))}
									</div>

									<div
										className={`rounded-2xl p-4 ${theme.palette.surface} border ${theme.palette.borderStrong}`}
									>
										<p
											className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textSecondary}`}
										>
											Baseline (Denmark)
										</p>
										{isBaselineLoading ? (
											<div className='flex items-center gap-2 mt-2 text-blue-500'>
												<div
													className='h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'
													aria-label='Loading baseline area'
												/>
												<span className='text-sm'>Loading baseline area…</span>
											</div>
										) : baselineStats ? (
											<p className={`text-xl font-black ${theme.textPrimary}`}>
												{baselineStats.area?.toLocaleString(undefined, {
													maximumFractionDigits: 0,
												}) ?? 'Not available'}{' '}
												km²
											</p>
										) : baselineError ? (
											<p className='text-sm text-amber-500'>{baselineError}</p>
										) : (
											<p className='text-sm text-gray-400'>Baseline unavailable</p>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<footer
					className={`${designTokens.spacing.layoutX} ${designTokens.spacing.layoutY} pt-4 border-t ${theme.palette.borderStrong} ${theme.palette.surfaceSubtle}`}
				>
					<button
						onClick={resetAll}
						className={`w-full flex items-center justify-center gap-2 ${theme.softPanel} ${theme.palette.textSecondary} hover:text-red-500 py-4 ${designTokens.radii.lg} transition-all font-bold text-xs uppercase tracking-widest border ${theme.palette.borderStrong} active:scale-95 ${theme.focusRing}`}
						aria-label='Reset journey to default points'
					>
						<RotateCcw size={16} />
						Reset Journey
					</button>
				</footer>
			</div>
		</div>
	);
};

export default App;
