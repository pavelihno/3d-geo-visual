import React, { useState, useEffect, useRef, useMemo } from 'react';
import WorldGlobe, { GlobeMethods } from './components/WorldGlobe';
import SearchInput from './components/SearchInput';
import { GeoPoint, DistanceUnit, SearchResult } from './types';
import { calculateDistance, formatDistance } from './utils/geoUtils';
import { getCurrentLocation } from './utils/location';
import { designTokens, getThemeClasses, ThemeMode } from './utils/designTokens';
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
	{ name: 'Copenhagen', lat: 55.6761, lng: 12.5683, country: 'Denmark' },
	{ name: 'Moscow', lat: 55.7558, lng: 37.6173, country: 'Russia' },
];

const App: React.FC = () => {
	const [points, setPoints] = useState<GeoPoint[]>(DEFAULT_POINTS);
	const [unit, setUnit] = useState<DistanceUnit>(DistanceUnit.KILOMETERS);
	const [activeEditingIndex, setActiveEditingIndex] = useState<number | null>(null);
	const [isLocating, setIsLocating] = useState<boolean>(false);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [themeMode, setThemeMode] = useState<ThemeMode>('light');
	const globeRef = useRef<GlobeMethods>(null);

	const theme = getThemeClasses(themeMode);
	const totalDistance = useMemo(() => {
		let dist = 0;
		for (let i = 0; i < points.length - 1; i++) {
			dist += calculateDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng, unit);
		}
		return dist;
	}, [points, unit]);
	const totalDistanceLabel = useMemo(() => formatDistance(totalDistance, unit), [totalDistance, unit]);
	const totalDistanceValue = totalDistanceLabel.split(' ')[0] ?? '0';

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', themeMode);
	}, [themeMode]);

	const handleSelect = (index: number) => (result: SearchResult) => {
		setPoints((prev) => {
			if (!prev[index]) return prev;
			const newPoint = { name: result.name, lat: result.lat, lng: result.lng, country: result.country };
			const newPoints = [...prev];
			newPoints[index] = newPoint;
			return newPoints;
		});
		setActiveEditingIndex(null);
	};

	const addPoint = () => {
		const lastPoint = points[points.length - 1] ?? DEFAULT_POINTS[DEFAULT_POINTS.length - 1];
		// Create a generic "Next Stop" placeholder based on last point or default
		const newPoint = { ...lastPoint, name: `Stop ${points.length + 1}` };
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
		const newPoint = { name: `Custom Pin ${label}`, lat, lng };
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
						},
					];
				}
				const updatedPoints = [...prev];
				updatedPoints[0] = {
					name: 'Current Location',
					lat,
					lng,
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
		setPoints(DEFAULT_POINTS.map((point) => ({ ...point })));
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
								Total Journey Distance
							</p>
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
										<span className='truncate max-w-[120px] sm:max-w-[160px]'>{p.name}</span>
										{i < points.length - 1 && (
											<ChevronRight size={12} className='text-blue-300 shrink-0' />
										)}
									</React.Fragment>
								))}
							</div>
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
