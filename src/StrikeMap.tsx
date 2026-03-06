import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { strikes } from './strikes';
import type { Initiator, Strike } from './strikes';

// ── Colors & labels ──────────────────────────────────────────────────────────
const INITIATOR_COLOR: Record<Initiator, string> = {
  'USA': '#00d4ff',
  'Israel':       '#ffe033',
  'Iran':         '#ff4d00',
  'Hezbollah':    '#cc44ff',
};

const INITIATOR_LABEL: Record<Initiator, string> = {
  'USA': '🇺🇸 United States',
  'Israel':       '🇮🇱 Israel',
  'Iran':         '🇮🇷 Iran',
  'Hezbollah':    '⚡ Hezbollah (Lebanon)',
};

// ── Shape SVG paths ──────────────────────────────────────────────────────────
// Each shape is rendered at `size × size` in a matching viewBox.
// Shapes: Circle · Diamond · Triangle · Cross
function shapeSvgContent(initiator: Initiator, size: number, strokeColor: string): string {
  const h = size / 2;
  const sw = size > 22 ? 2.5 : 2;          // stroke-width
  const stroke = `stroke="${strokeColor}" stroke-width="${sw}"`;
  const fill   = `fill="${INITIATOR_COLOR[initiator]}" fill-opacity="0.92"`;

  switch (initiator) {
    case 'USA':
      // Circle
      return `<circle cx="${h}" cy="${h}" r="${h - sw}" ${fill} ${stroke}/>`;

    case 'Israel': {
      // Diamond (square rotated 45°)
      const p = sw + 1;
      return `<polygon points="${h},${p} ${size - p},${h} ${h},${size - p} ${p},${h}" ${fill} ${stroke}/>`;
    }

    case 'Iran': {
      // Equilateral-ish triangle pointing up
      const p = sw + 1;
      return `<polygon points="${h},${p} ${size - p},${size - p} ${p},${size - p}" ${fill} ${stroke}/>`;
    }

    case 'Hezbollah': {
      // Plus / cross
      const b = Math.round(size * 8 / 22);   // bar thickness
      const o = Math.floor((size - b) / 2);  // offset from edge
      const e = o + b;
      return `<path d="M${o},0 H${e} V${o} H${size} V${e} H${e} V${size} H${o} V${e} H0 V${o} H${o} Z" ${fill} ${stroke}/>`;
    }
  }
}

function makeIcon(initiator: Initiator, active: boolean): L.DivIcon {
  const size   = active ? 26 : 22;
  const stroke = active ? INITIATOR_COLOR[initiator] : 'rgba(255,255,255,0.85)';
  const svg    = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${shapeSvgContent(initiator, size, stroke)}</svg>`;
  return L.divIcon({
    html:        svg,
    className:   'custom-strike-marker',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

// ── ShapePreview (for legend & sidebar) ─────────────────────────────────────
function ShapePreview({ initiator, size = 14 }: { initiator: Initiator; size?: number }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">${shapeSvgContent(initiator, size, 'rgba(255,255,255,0.7)')}</svg>`,
      }}
      style={{ display: 'inline-flex', flexShrink: 0 }}
    />
  );
}

// ── Sorted list for sidebar ──────────────────────────────────────────────────
const sortedStrikes = [...strikes].sort(
  (a, b) => (b.estimatedKIA ?? -1) - (a.estimatedKIA ?? -1)
);

// ── FlyToSelected ────────────────────────────────────────────────────────────
function FlyToSelected({
  selectedId,
  markerRefs,
}: {
  selectedId: number | null;
  markerRefs: React.RefObject<Record<number, LeafletMarker | null>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedId === null) return;
    const strike = strikes.find(s => s.id === selectedId);
    if (!strike) return;

    map.flyTo([strike.lat, strike.lng], 7, { duration: 1.1 });

    const timer = setTimeout(() => {
      markerRefs.current?.[selectedId]?.openPopup();
    }, 1200);

    return () => clearTimeout(timer);
  }, [selectedId, map, markerRefs]);

  return null;
}

// ── MarkerWithHover ──────────────────────────────────────────────────────────
function MarkerWithHover({
  strike,
  isSelected,
  onMount,
}: {
  strike: Strike;
  isSelected: boolean;
  onMount: (id: number, ref: LeafletMarker) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const [hovered, setHovered] = useState(false);
  const color = INITIATOR_COLOR[strike.initiator];

  const icon = useMemo(
    () => makeIcon(strike.initiator, isSelected || hovered),
    [strike.initiator, isSelected, hovered]
  );

  return (
    <Marker
      position={[strike.lat, strike.lng]}
      icon={icon}
      ref={el => {
        markerRef.current = el;
        if (el) onMount(strike.id, el);
      }}
      eventHandlers={{
        mouseover() {
          setHovered(true);
          markerRef.current?.openPopup();
        },
        mouseout() {
          setHovered(false);
          if (!isSelected) markerRef.current?.closePopup();
        },
      }}
    >
      <Popup closeButton={false} autoPan={false}>
        <div style={{
          minWidth: 230, maxWidth: 310,
          fontFamily: 'system-ui, sans-serif',
          background: '#0f1117', color: '#f0f0f0',
          borderRadius: 8, padding: '12px 14px', margin: -12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8, lineHeight: 1.35, color: '#fff' }}>
            {strike.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 }}>
            <div>
              <span style={{ color: '#888' }}>Date: </span>
              <strong style={{ color: '#fff' }}>{strike.date}</strong>
            </div>
            <div>
              <span style={{ color: '#888' }}>Initiator: </span>
              <span style={{ color, fontWeight: 700 }}>{INITIATOR_LABEL[strike.initiator]}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>Target: </span>
              <span style={{ color: '#ddd' }}>{strike.target}</span>
            </div>
            <div style={{ marginTop: 2, color: '#bbb', lineHeight: 1.45, fontSize: 12 }}>
              {strike.description}
            </div>
            <div style={{
              marginTop: 4, padding: '6px 10px', borderRadius: 6, fontSize: 12,
              background: strike.estimatedKIA && strike.estimatedKIA > 0
                ? 'rgba(255,60,60,0.18)' : 'rgba(0,220,120,0.12)',
              borderLeft: `3px solid ${strike.estimatedKIA && strike.estimatedKIA > 0 ? '#ff3c3c' : '#00dc78'}`,
            }}>
              <span style={{ fontWeight: 700, color: strike.estimatedKIA && strike.estimatedKIA > 0 ? '#ff6b6b' : '#4ade80' }}>
                KIA: {strike.estimatedKIA !== undefined ? strike.estimatedKIA : 'Unknown'}
              </span>
              {strike.kiaNote && (
                <span style={{ display: 'block', color: '#aaa', marginTop: 3, lineHeight: 1.35 }}>
                  {strike.kiaNote}
                </span>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ── StrikeSidebar ────────────────────────────────────────────────────────────
function StrikeSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div style={{
      width: 320, height: '100%',
      background: 'rgba(8,10,18,0.97)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      overflowY: 'auto', flexShrink: 0,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky', top: 0,
        background: 'rgba(8,10,18,0.98)', zIndex: 1,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: 0.3 }}>
          ALL STRIKES
        </div>
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
          Sorted by KIA · click to focus
        </div>
      </div>

      {sortedStrikes.map(strike => {
        const color = INITIATOR_COLOR[strike.initiator];
        const isSelected = strike.id === selectedId;
        const kia = strike.estimatedKIA;

        return (
          <div
            key={strike.id}
            onClick={() => onSelect(strike.id)}
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
              background: isSelected ? 'rgba(255,255,255,0.07)' : 'transparent',
              borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 12.5, color: '#e8e8e8', lineHeight: 1.35, flex: 1 }}>
                {strike.name}
              </div>
              <div style={{
                flexShrink: 0, fontSize: 11, fontWeight: 700,
                padding: '2px 7px', borderRadius: 4,
                background: kia === undefined
                  ? 'rgba(255,255,255,0.1)'
                  : kia > 0
                    ? 'rgba(255,60,60,0.22)'
                    : 'rgba(0,220,120,0.15)',
                color: kia === undefined ? '#888' : kia > 0 ? '#ff7070' : '#4ade80',
              }}>
                {kia === undefined ? '?' : kia === 0 ? '0' : `${kia} KIA`}
              </div>
            </div>
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 7 }}>
              <ShapePreview initiator={strike.initiator} size={12} />
              <span style={{ fontSize: 11, color: '#666' }}>{INITIATOR_LABEL[strike.initiator]}</span>
              <span style={{ fontSize: 11, color: '#444', marginLeft: 'auto' }}>{strike.date}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── StrikeMap (root) ─────────────────────────────────────────────────────────
export default function StrikeMap() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const markerRefs = useRef<Record<number, LeafletMarker | null>>({});

  function handleMarkerMount(id: number, ref: LeafletMarker) {
    markerRefs.current[id] = ref;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <MapContainer center={[32, 44]} zoom={5} style={{ width: '100%', height: '100%' }} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <FlyToSelected selectedId={selectedId} markerRefs={markerRefs} />
          {strikes.map(strike => (
            <MarkerWithHover
              key={strike.id}
              strike={strike}
              isSelected={strike.id === selectedId}
              onMount={handleMarkerMount}
            />
          ))}
        </MapContainer>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 32, left: 16, zIndex: 1000,
          background: 'rgba(10,10,20,0.88)', color: '#fff',
          padding: '12px 16px', borderRadius: 10,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, letterSpacing: 0.3 }}>
            STRIKE INITIATOR
          </div>
          {(Object.keys(INITIATOR_LABEL) as Initiator[]).map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <ShapePreview initiator={key} size={16} />
              <span style={{ color: INITIATOR_COLOR[key], fontWeight: 600, fontSize: 12.5 }}>
                {INITIATOR_LABEL[key]}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 6, opacity: 0.4, fontSize: 11 }}>
            Hover to preview · click to focus
          </div>
        </div>

        {/* Title */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: 'rgba(10,10,20,0.88)', color: '#fff',
          padding: '8px 20px', borderRadius: 8, backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontWeight: 700, fontSize: 16, letterSpacing: 0.3, whiteSpace: 'nowrap',
        }}>
          US–Israel–Iran War: Known Strikes
        </div>
      </div>

      {/* Sidebar */}
      <StrikeSidebar selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}
