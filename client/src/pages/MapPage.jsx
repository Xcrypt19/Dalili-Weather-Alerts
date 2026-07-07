import { useEffect, useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { api } from '../api/client.js';
import { useI18n } from '../i18n.js';
import LocationPicker from '../components/LocationPicker.jsx';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/** Adds an OpenWeatherMap radar tile overlay onto the Google map (FR-42). */
function RadarOverlay({ radar, layer }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !radar?.available || !window.google) return undefined;
    const template = radar.tileUrlTemplate.replace('precipitation_new', layer);
    const overlay = new window.google.maps.ImageMapType({
      name: 'radar',
      opacity: 0.65,
      tileSize: new window.google.maps.Size(256, 256),
      getTileUrl: (coord, zoom) =>
        template.replace('{z}', zoom).replace('{x}', coord.x).replace('{y}', coord.y),
    });
    map.overlayMapTypes.push(overlay);
    return () => {
      const idx = map.overlayMapTypes.getArray().indexOf(overlay);
      if (idx >= 0) map.overlayMapTypes.removeAt(idx);
    };
  }, [map, radar, layer]);
  return null;
}

function MapInner({ center, locations, radar, onPick }) {
  const { t } = useI18n();
  const [layer, setLayer] = useState('precipitation_new');
  const layers = radar?.layers || ['precipitation_new'];
  const labelFor = (l) => l.replace('_new', '').replace(/^\w/, (c) => c.toUpperCase());

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <LocationPicker locations={locations} onPick={onPick} />
      </div>
      {radar?.available && (
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="card-title" style={{ margin: 0 }}>{t('radarLayer')}:</span>
          {layers.map((l) => (
            <button key={l} className={`pill ${layer === l ? 'active' : ''}`} onClick={() => setLayer(l)}>
              {labelFor(l)}
            </button>
          ))}
        </div>
      )}
      <div className="map-frame">
        <Map
          defaultCenter={center}
          defaultZoom={9}
          mapId="dalili-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {locations.map((l) => (
            <AdvancedMarker key={l.id} position={{ lat: l.latitude, lng: l.longitude }} title={l.name} />
          ))}
          <AdvancedMarker position={center} />
          <RadarOverlay radar={radar} layer={layer} />
        </Map>
      </div>
    </>
  );
}

export default function MapPage() {
  const { t } = useI18n();
  const [center, setCenter] = useState({ lat: -1.2921, lng: 36.8219 });
  const [locations, setLocations] = useState([]);
  const [radar, setRadar] = useState(null);

  const load = useCallback(async () => {
    const d = await api('/dashboard').catch(() => null);
    if (d) {
      setLocations(d.locations || []);
      setRadar(d.radar);
      if (d.activeLocation) setCenter({ lat: d.activeLocation.latitude, lng: d.activeLocation.longitude });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 style={{ margin: 0 }}>{t('map')}</h1>
      {!MAPS_KEY ? (
        <div className="card">
          <p><strong>Google Maps key missing.</strong></p>
          <p className="muted">Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>client/.env</code> to enable the interactive map and radar overlay (FR-11, FR-42).</p>
        </div>
      ) : (
        <APIProvider apiKey={MAPS_KEY}>
          <MapInner
            center={center}
            locations={locations}
            radar={radar}
            onPick={(p) => setCenter({ lat: p.lat, lng: p.lng })}
          />
        </APIProvider>
      )}
    </div>
  );
}
