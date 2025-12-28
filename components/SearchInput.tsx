
import React, { useState, useEffect, useRef } from 'react';
import { SearchResult } from '../types';
import { searchLocations } from '../services/geminiService';
import { Search, MapPin } from 'lucide-react';

interface SearchInputProps {
  label: string;
  placeholder: string;
  onSelect: (result: SearchResult) => void;
  value?: string;
  isActive?: boolean;
  onFocus?: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ label, placeholder, onSelect, value, isActive, onFocus }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2 && query !== value) {
        setIsSearching(true);
        const locations = await searchLocations(query);
        setResults(locations);
        setIsSearching(false);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 250); 

    return () => clearTimeout(timer);
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
    <div className="relative w-full">
      <div className="flex justify-between items-end mb-1.5 px-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      </div>
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-300 group-focus-within:text-blue-500'}`}>
          <Search size={18} />
        </div>
        <input
          type="text"
          className={`w-full bg-white border-2 ${isActive ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-100 group-hover:border-gray-200'} text-gray-900 pl-12 pr-4 py-3.5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-semibold placeholder:text-gray-300`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            onFocus?.();
            if (query.length > 2) setShowDropdown(true);
          }}
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-3 bg-white border border-gray-100 rounded-[2rem] shadow-2xl max-h-72 overflow-y-auto custom-scrollbar ring-8 ring-black/5"
        >
          {results.map((res, idx) => (
            <button
              key={`${res.name}-${idx}`}
              className="w-full text-left px-6 py-4 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-4"
              onClick={() => {
                onSelect(res);
                setQuery(res.name);
                setShowDropdown(false);
              }}
            >
              <div className="mt-1 text-blue-500 bg-blue-50 p-2 rounded-xl"><MapPin size={16} /></div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{res.name}</div>
                <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{res.country} • {res.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
