
import React, {
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef
} from 'react';
import { createRoot } from 'react-dom/client';
import Globe from 'react-globe.gl';
import { GeoPoint, DistanceUnit } from '../types';
import { getMidpoint, formatDistance, calculateDistance } from '../utils/geoUtils';

interface WorldGlobeProps {
  points: GeoPoint[];
  unit: DistanceUnit;
  onPointMove: (lat: number, lng: number) => void;
  activePointIndex: number | null;
}

export interface GlobeMethods {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface MarkerLabelProps {
  label: string;
  name: string;
  isActive: boolean;
}

const MarkerLabel: React.FC<MarkerLabelProps> = ({ label, name, isActive }) => (
  <div className="flex flex-col items-center group pointer-events-none">
    <div className="bg-white/90 backdrop-blur-sm border border-black/5 px-2 py-0.5 rounded shadow-sm text-[9px] font-bold text-gray-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      {name}
    </div>
    <div
      className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-white transition-all ${
        isActive ? 'bg-blue-600 ring-4 ring-blue-400/50 scale-125' : 'bg-blue-500'
      }`}
    >
      {label}
    </div>
  </div>
);

interface SegmentLabelProps {
  startLabel: string;
  endLabel: string;
  text: string;
}

const SegmentLabel: React.FC<SegmentLabelProps> = ({ startLabel, endLabel, text }) => (
  <div className="px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg border border-blue-100 shadow-lg flex flex-col items-center pointer-events-none">
    <span className="text-[7px] font-black uppercase tracking-wider text-blue-400 leading-none mb-0.5">
      {startLabel} → {endLabel}
    </span>
    <span className="text-[10px] font-black text-gray-900 leading-none">{text}</span>
  </div>
);

const WorldGlobe = forwardRef<GlobeMethods, WorldGlobeProps>(({ points, unit, onPointMove, activePointIndex }, ref) => {
  // Fix: Added initial value null to useRef to satisfy TypeScript requirement of 1 argument
  const globeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      // Fix: Explicitly passing undefined to pointOfView to handle environments where the getter overload expects at least one argument
      const current = globeRef.current.pointOfView(undefined);
      if (current) {
        globeRef.current.pointOfView({ altitude: current.altitude * 0.7 }, 400);
      }
    },
    zoomOut: () => {
      // Fix: Explicitly passing undefined to pointOfView to handle environments where the getter overload expects at least one argument
      const current = globeRef.current.pointOfView(undefined);
      if (current) {
        globeRef.current.pointOfView({ altitude: Math.min(current.altitude * 1.5, 4) }, 400);
      }
    },
    resetView: () => {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 800);
    }
  }), []);

  // Create sequential arcs: Point[0] -> Point[1], Point[1] -> Point[2]...
  const arcData = useMemo(() => {
    const arcs = [];
    for (let i = 0; i < points.length - 1; i++) {
      arcs.push({
        startLat: points[i].lat,
        startLng: points[i].lng,
        endLat: points[i+1].lat,
        endLng: points[i+1].lng,
        // Color shifts slightly along the path
        color: ['rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 0.9)']
      });
    }
    return arcs;
  }, [points]);

  // Combine markers and distance labels as HTML elements
  const htmlData = useMemo(() => {
    const elements = [];
    
    // 1. Add Point Markers
    points.forEach((p, idx) => {
      elements.push({ ...p, idx, type: 'marker' });
    });
    
    // 2. Add Segment Distance Labels
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const mid = getMidpoint(p1.lat, p1.lng, p2.lat, p2.lng);
      const dist = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng, unit);
      
      elements.push({
        lat: mid.lat,
        lng: mid.lng,
        type: 'segment-label',
        text: formatDistance(dist, unit),
        segmentIndex: i
      });
    }
    
    return elements;
  }, [points, unit]);

  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = points.length === 0;
        controls.autoRotateSpeed = 0.8;
      }
      if (points.length === 0) {
        globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
      }
    }
  }, [points.length]);

  return (
    <div className="w-full h-full bg-[#f0f4f8]">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        htmlElementsData={htmlData}
        htmlElement={(d: any) => {
          const element = document.createElement('div');
          const root = createRoot(element);

          if (d.type === 'marker') {
            const label = String.fromCharCode(65 + d.idx);
            const isActive = d.idx === activePointIndex;
            root.render(<MarkerLabel label={label} name={d.name} isActive={isActive} />);
          } else {
            const startLabel = String.fromCharCode(65 + d.segmentIndex);
            const endLabel = String.fromCharCode(66 + d.segmentIndex);
            root.render(
              <SegmentLabel startLabel={startLabel} endLabel={endLabel} text={d.text} />
            );
          }

          return element;
        }}
        
        arcsData={arcData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={1}
        arcDashAnimateTime={2000}
        arcStroke={1.0}
        arcCurveResolution={128}
        
        onGlobeClick={({ lat, lng }) => {
          if (activePointIndex !== null) onPointMove(lat, lng);
        }}
        
        showAtmosphere={true}
        atmosphereColor="#cfe3ff"
        atmosphereAltitude={0.15}
      />
    </div>
  );
});

export default WorldGlobe;
