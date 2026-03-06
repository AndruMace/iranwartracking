import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { strikes } from './strikes';
import type { Initiator, Strike } from './strikes';

const INITIATOR_COLOR: Record<Initiator, string> = {
  'USA / Israel': '#00d4ff',  // electric cyan
  'Israel':       '#ffe033',  // vivid gold
  'Iran':         '#ff4d00',  // blazing orange-red
  'Hezbollah':    '#cc44ff',  // vivid purple
};

const INITIATOR_LABEL: Record<Initiator, string> = {
  'USA / Israel': '🇺🇸🇮🇱 US / Israel (joint)',
  'Israel':       '🇮🇱 Israel',
  'Iran':         '🇮🇷 Iran',
  'Hezbollah':    '⚡ Hezbollah (Lebanon)',
};

function SetView() {
  const map = useMap();
  useEffect(() => {
    map.setView([32, 44], 5);
  }, [map]);
  return null;
}

interface MarkerWithHoverProps {
  strike: Strike;
}

function MarkerWithHover({ strike }: MarkerWithHoverProps) {
  const markerRef = useRef<LeafletCircleMarker | null>(null);
  const color = INITIATOR_COLOR[strike.initiator];

  return (
    <CircleMarker
      ref={markerRef}
      center={[strike.lat, strike.lng]}
      radius={12}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }}
      eventHandlers={{
        mouseover() {
          markerRef.current?.openPopup();
          markerRef.current?.setStyle({ weight: 3, color: color, fillOpacity: 1 });
        },
        mouseout() {
          markerRef.current?.closePopup();
          markerRef.current?.setStyle({ weight: 2, color: '#ffffff', fillOpacity: 0.9 });
        },
      }}
    >
      <Popup closeButton={false} autoPan={false}>
        <div style={{
          minWidth: 230,
          maxWidth: 310,
          fontFamily: 'system-ui, sans-serif',
          background: '#0f1117',
          color: '#f0f0f0',
          borderRadius: 8,
          padding: '12px 14px',
          margin: -12,
        }}>
          <div style={{
            fontWeight: 700,
            fontSize: 13.5,
            marginBottom: 8,
            lineHeight: 1.35,
            color: '#ffffff',
          }}>
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
            <div
              style={{
                marginTop: 4,
                padding: '6px 10px',
                borderRadius: 6,
                background: strike.estimatedKIA && strike.estimatedKIA > 0
                  ? 'rgba(255,60,60,0.18)'
                  : 'rgba(0,220,120,0.12)',
                borderLeft: `3px solid ${strike.estimatedKIA && strike.estimatedKIA > 0 ? '#ff3c3c' : '#00dc78'}`,
                fontSize: 12,
              }}
            >
              <span style={{
                fontWeight: 700,
                color: strike.estimatedKIA && strike.estimatedKIA > 0 ? '#ff6b6b' : '#4ade80',
              }}>
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
    </CircleMarker>
  );
}

export default function StrikeMap() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapContainer
        center={[32, 44]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl
      >
        <SetView />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          className="map-tiles-dark"
        />
        {strikes.map((strike) => (
          <MarkerWithHover key={strike.id} strike={strike} />
        ))}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 16,
          zIndex: 1000,
          background: 'rgba(10,10,20,0.88)',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: 10,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 13,
          lineHeight: 1.8,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>Strike Initiator</div>
        {(Object.entries(INITIATOR_LABEL) as [Initiator, string][]).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: INITIATOR_COLOR[key],
                flexShrink: 0,
              }}
            />
            {label}
          </div>
        ))}
        <div style={{ marginTop: 10, opacity: 0.55, fontSize: 11 }}>
          Hover a marker for details
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(10,10,20,0.88)',
          color: '#fff',
          padding: '8px 20px',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 0.3,
          whiteSpace: 'nowrap',
        }}
      >
        US–Israel–Iran War: Known Strikes
      </div>
    </div>
  );
}
