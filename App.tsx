
import React, { useState, useEffect, useRef } from 'react';
import WorldGlobe, { GlobeMethods } from './components/WorldGlobe';
import SearchInput from './components/SearchInput';
import { GeoPoint, DistanceUnit, SearchResult } from './types';
import { calculateDistance, formatDistance } from './utils/geoUtils';
import { 
  ArrowDownUp, 
  RotateCcw, 
  Plus, 
  Minus, 
  Map, 
  Navigation, 
  MousePointer2,
  Edit3,
  Search,
  ChevronRight,
  Trash2
} from 'lucide-react';

const DEFAULT_POINTS: GeoPoint[] = [
  { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, country: 'Denmark' },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, country: 'Russia' }
];

const App: React.FC = () => {
  const [points, setPoints] = useState<GeoPoint[]>(DEFAULT_POINTS);
  const [unit, setUnit] = useState<DistanceUnit>(DistanceUnit.KILOMETERS);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [activeEditingIndex, setActiveEditingIndex] = useState<number | null>(null);
  const globeRef = useRef<GlobeMethods>(null);

  useEffect(() => {
    let dist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      dist += calculateDistance(
        points[i].lat, 
        points[i].lng, 
        points[i + 1].lat, 
        points[i + 1].lng, 
        unit
      );
    }
    setTotalDistance(dist);
  }, [points, unit]);

  const handleSelect = (index: number) => (result: SearchResult) => {
    const newPoint = { name: result.name, lat: result.lat, lng: result.lng, country: result.country };
    const newPoints = [...points];
    newPoints[index] = newPoint;
    setPoints(newPoints);
    setActiveEditingIndex(null);
  };

  const addPoint = () => {
    const lastPoint = points[points.length - 1];
    // Create a generic "Next Stop" placeholder based on last point or default
    const newPoint = { ...lastPoint, name: `Stop ${points.length + 1}` };
    setPoints([...points, newPoint]);
    setActiveEditingIndex(points.length);
  };

  const removePoint = (index: number) => {
    // Keep at least two points to satisfy "default two points"
    if (points.length <= 2) return;
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    if (activeEditingIndex === index) setActiveEditingIndex(null);
  };

  const reverseJourney = () => {
    setPoints([...points].reverse());
  };

  const handlePointMove = (lat: number, lng: number) => {
    if (activeEditingIndex === null) return;
    const label = String.fromCharCode(65 + activeEditingIndex);
    const newPoint = { name: `Custom Pin ${label}`, lat, lng };
    const newPoints = [...points];
    newPoints[activeEditingIndex] = newPoint;
    setPoints(newPoints);
  };

  const resetAll = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent potential default behavior issues
    setPoints(DEFAULT_POINTS);
    setActiveEditingIndex(null);
    globeRef.current?.resetView();
  };

  return (
    <div className="relative h-screen w-screen bg-[#f8fafc] overflow-hidden flex flex-col lg:flex-row font-sans">
      {/* Visualizer Area */}
      <div className="relative flex-grow h-[50vh] lg:h-full order-2 lg:order-1 border-b lg:border-b-0 border-gray-200">
        <WorldGlobe 
          ref={globeRef}
          points={points} 
          unit={unit}
          onPointMove={handlePointMove}
          activePointIndex={activeEditingIndex}
        />

        {/* Zoom Controls Overlay */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <button 
              onClick={() => globeRef.current?.zoomIn()}
              className="p-4 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all border-b border-gray-100 active:scale-95 touch-manipulation"
              title="Zoom In"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => globeRef.current?.zoomOut()}
              className="p-4 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all active:scale-95 touch-manipulation"
              title="Zoom Out"
            >
              <Minus size={22} strokeWidth={2.5} />
            </button>
          </div>
          <button 
            onClick={() => globeRef.current?.resetView()}
            className="p-4 bg-white border border-gray-200 rounded-2xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-xl active:scale-95 touch-manipulation"
            title="Reset View"
          >
            <Navigation size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Manual Interaction Indicator */}
        {activeEditingIndex !== null && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
              <MousePointer2 size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">
                Tap on Earth to set Point {String.fromCharCode(65 + activeEditingIndex)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Control Sidebar */}
      <div className="w-full lg:w-[420px] h-[50vh] lg:h-full bg-white z-30 flex flex-col order-1 lg:order-2 shadow-[-4px_0_24px_rgba(0,0,0,0.04)] border-l border-gray-100">
        <header className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Map className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">GeoVisual</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1.5">Multi-Stop Journey</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['km', 'mi'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u === 'km' ? DistanceUnit.KILOMETERS : DistanceUnit.MILES)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${unit === (u === 'km' ? DistanceUnit.KILOMETERS : DistanceUnit.MILES) ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-grow p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Point List */}
          <div className="space-y-4">
            {points.map((p, idx) => (
              <div key={idx} className="relative group">
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center mt-6">
                    <div className="w-6 h-6 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    {idx < points.length - 1 && (
                      <div className="w-0.5 h-12 bg-gradient-to-b from-blue-600 to-blue-200 my-1 rounded-full opacity-30"></div>
                    )}
                  </div>
                  
                  <div className="flex-grow pt-3">
                    <div className="relative">
                      <SearchInput 
                        label={`Point ${String.fromCharCode(65 + idx)}`} 
                        placeholder="Search location..." 
                        onSelect={handleSelect(idx)}
                        value={p?.name}
                        isActive={activeEditingIndex === idx}
                        onFocus={() => setActiveEditingIndex(idx)}
                      />
                      <div className="absolute right-0 -top-1 flex gap-1">
                        <button 
                          onClick={() => setActiveEditingIndex(idx)}
                          className={`p-2 transition-colors ${activeEditingIndex === idx ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                        >
                          <Edit3 size={14} />
                        </button>
                        {points.length > 2 && (
                          <button 
                            onClick={() => removePoint(idx)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
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
              className="w-full py-4 border-2 border-dashed border-gray-100 rounded-3xl text-gray-400 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-500 transition-all flex items-center justify-center gap-2 group"
            >
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:scale-110">
                <Plus size={14} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Add Next Stop</span>
            </button>
          </div>

          {/* Journey Controls */}
          <div className="flex justify-center pt-2">
            <button 
              onClick={reverseJourney}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full border border-gray-100 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <ArrowDownUp size={14} />
              Reverse Journey
            </button>
          </div>

          {/* Result Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-8 rounded-[2.5rem] relative overflow-hidden group mt-4">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Navigation size={120} className="rotate-45" />
            </div>
            <div className="relative z-10">
              <p className="text-blue-500/80 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Total Journey Distance</p>
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter flex items-baseline gap-2">
                {formatDistance(totalDistance, unit).split(' ')[0]}
                <span className="text-xl font-bold text-blue-600 uppercase">{unit}</span>
              </h2>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-gray-500 text-[11px] font-medium">
                {points.map((p, i) => (
                  <React.Fragment key={i}>
                    <span className="truncate max-w-[80px]">{p.name}</span>
                    {i < points.length - 1 && <ChevronRight size={12} className="text-blue-300 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="p-8 pt-4 border-t border-gray-50 bg-gray-50/50">
          <button 
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest border border-gray-200 active:scale-95"
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
