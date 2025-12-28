import React, { useEffect, useRef, useState, useId } from 'react';
import { SearchResult } from '../types';
import { searchLocations } from '../services/geocodingService';
import { Search, MapPin, AlertTriangle } from 'lucide-react';
import { getThemeClasses, ThemeMode, designTokens } from '../utils/designTokens';

interface SearchInputProps {
	label: string;
	placeholder: string;
	onSelect: (result: SearchResult) => void;
	value?: string;
	isActive?: boolean;
	onFocus?: () => void;
	themeMode: ThemeMode;
}

const MIN_QUERY_LENGTH = 3;

const SearchInput: React.FC<SearchInputProps> = ({
	label,
	placeholder,
	onSelect,
	value,
	isActive,
	onFocus,
	themeMode,
}) => {
	const [query, setQuery] = useState(value || '');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const theme = getThemeClasses(themeMode);
	const inputId = useId();
	const errorId = `${inputId}-error`;

	useEffect(() => {
		setQuery(value || '');
	}, [value]);

	useEffect(() => {
		let isActiveSearch = true;
		const controller = new AbortController();

		const timer = setTimeout(async () => {
			const trimmedQuery = query.trim();

			if (trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH) {
				setError(`Please enter at least ${MIN_QUERY_LENGTH} characters to search.`);
				setResults([]);
				setShowDropdown(false);
				setIsSearching(false);
				return;
			}

			if (trimmedQuery.length >= MIN_QUERY_LENGTH && trimmedQuery !== value) {
				setIsSearching(true);
				setError(null);

				try {
					const locations = await searchLocations(trimmedQuery, { signal: controller.signal });
					if (!isActiveSearch || controller.signal.aborted) return;

					setResults(locations);
					setShowDropdown(true);
				} catch (err) {
					if (!isActiveSearch || controller.signal.aborted) return;

					const message =
						err instanceof Error && err.message === 'RATE_LIMIT_EXCEEDED'
							? 'Searches are temporarily rate limited. Please try again in a few moments.'
							: 'Unable to search locations right now. Please try again shortly.';
					setError(message);
					setResults([]);
					setShowDropdown(false);
				} finally {
					if (isActiveSearch) {
						setIsSearching(false);
					}
				}
			} else {
				setResults([]);
				setShowDropdown(false);
				setError(null);
				setIsSearching(false);
			}
		}, 250);

		return () => {
			isActiveSearch = false;
			controller.abort();
			clearTimeout(timer);
		};
	}, [query, value]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className='relative w-full'>
			<div className='flex justify-between items-end mb-2 px-1'>
				<label className={`${designTokens.typography.label} ${theme.textSecondary}`} htmlFor={inputId}>
					{label}
				</label>
			</div>
			<div className='relative group'>
				<div
					className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
						isActive ? 'text-blue-500' : `${theme.palette.textSecondary} group-focus-within:text-blue-400`
					}`}
				>
					<Search size={18} aria-hidden />
				</div>
				<input
					type='text'
					className={`w-full ${theme.palette.surface} border-2 ${
						isActive
							? 'border-blue-500 ring-4 ring-blue-500/10'
							: `${theme.palette.borderStrong} group-hover:border-blue-300/80`
					} ${theme.textPrimary} pl-12 pr-4 py-4 ${
						designTokens.radii.lg
					} focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 outline-none transition-all ${
						designTokens.typography.body
					} placeholder:${theme.textSecondary} ${theme.focusRing}`}
					placeholder={placeholder}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => {
						onFocus?.();
						if (query.length > 2) setShowDropdown(true);
					}}
					id={inputId}
					aria-label={label}
					aria-expanded={showDropdown}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? errorId : undefined}
				/>
				{isSearching && (
					<div className='absolute right-4 top-1/2 -translate-y-1/2'>
						<div className='animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full'></div>
					</div>
				)}
			</div>

			{error && (
				<div
					className='mt-2 flex items-start gap-2 text-xs text-amber-500'
					id={errorId}
					role='alert'
					aria-live='polite'
				>
					<AlertTriangle size={14} className='mt-0.5' aria-hidden />
					<p>{error}</p>
				</div>
			)}

			{showDropdown && results.length > 0 && (
				<div
					ref={dropdownRef}
					className={`absolute z-50 w-full mt-3 ${theme.panel} border ${theme.palette.borderStrong} rounded-[2rem] shadow-2xl max-h-72 overflow-y-auto custom-scrollbar ring-8 ring-black/5 transition-all duration-200`}
					role='listbox'
				>
					{results.map((res, idx) => (
						<button
							key={`${res.name}-${idx}`}
							className={`w-full text-left px-6 py-4 hover:bg-blue-500/10 transition-colors border-b ${theme.palette.borderStrong} last:border-0 flex items-start gap-4 ${theme.textPrimary}`}
							onClick={() => {
								onSelect(res);
								setQuery(res.name);
								setShowDropdown(false);
							}}
							role='option'
							aria-label={`${res.name}, ${res.country}`}
						>
							<div className='mt-1 text-blue-500 bg-blue-50/70 dark:bg-blue-500/20 p-2 rounded-xl'>
								<MapPin size={16} aria-hidden />
							</div>
							<div>
								<div className={`font-bold text-sm ${theme.textPrimary}`}>{res.name}</div>
								<div
									className={`${designTokens.typography.subtle} uppercase tracking-wider ${theme.textSecondary}`}
								>
									{res.country} • {res.description}
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default SearchInput;
