import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, Circle, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import './styles.css';
import 'leaflet/dist/leaflet.css';

const API = 'http://localhost:8000/api';

const formatLabel = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const scoreTone = (score: number) => {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

const deviceOptions = [
  'smartphone',
  'laptop',
  'tablet',
  'television',
  'monitor',
  'keyboard',
  'mouse',
  'printer',
  'other',
];

/*
 * Device-specific functional questions.
 *
 * These questions are based on the type of electronic device.
 * They are used only for Phase-1 decision support and do not
 * claim to diagnose internal hardware faults.
 */
const deviceQuestions: Record<
  string,
  { key: string; label: string; options: string[] }[]
> = {
  smartphone: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'charging',
      label: 'Charges normally',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'display',
      label: 'Display works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'touch',
      label: 'Touchscreen works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'battery',
      label: 'Battery holds charge',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  laptop: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'charging',
      label: 'Charges normally',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'display',
      label: 'Display works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'battery',
      label: 'Battery holds charge',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'keyboard',
      label: 'Keyboard works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  tablet: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'charging',
      label: 'Charges normally',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'display',
      label: 'Display works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'touch',
      label: 'Touchscreen works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'battery',
      label: 'Battery holds charge',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  television: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'display',
      label: 'Display works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'remote',
      label: 'Remote/control works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  monitor: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'display',
      label: 'Display works',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'ports',
      label: 'Input ports work',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  keyboard: [
    {
      key: 'connection',
      label: 'Connects to computer',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'keys',
      label: 'Keys work normally',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  mouse: [
    {
      key: 'connection',
      label: 'Connects to computer',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'buttons',
      label: 'Buttons work normally',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  printer: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'connection',
      label: 'Connects to computer/network',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'printing',
      label: 'Prints normally',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],

  other: [
    {
      key: 'power',
      label: 'Power on',
      options: ['yes', 'no', 'unknown'],
    },
    {
      key: 'working_status',
      label: 'Overall working status',
      options: [
        'working',
        'partially_working',
        'not_working',
      ],
    },
  ],
};

type Analysis = {
  device_type: string | null;
  confidence: number;
  status: string;
  image_quality: Record<string, unknown>;
  findings: string[];
  message: string;
};

type Result = {
  id: number;
  device_type: string;
  condition: string;
  condition_score: number;
  assessment_confidence: number;
  ecoscore: number;
  ecoscore_band: string;
  ecoscore_breakdown: Record<string, number>;
  recommendation_scores: Record<string, number>;
  recommended_action: string;
  stakeholder_category: string;
  explanation: string;
  limitations: string[];
};

function Nav({
  navigate,
}: {
  navigate: (p: 'home' | 'analyze' | 'history') => void;
}) {
  return (
    <nav>
      <button
        className="brand"
        onClick={() => navigate('home')}
      >
        EcoLoop <i>AI</i>
      </button>

      <div>
        <button onClick={() => navigate('home')}>
          Home
        </button>

        <button onClick={() => navigate('analyze')}>
          Analyze
        </button>

        <button onClick={() => navigate('history')}>
          History
        </button>
      </div>
    </nav>
  );
}

function DeviceGlyph({ deviceType }: { deviceType: string }) {
  const glyphs: Record<string, string> = {
    smartphone: '▯',
    laptop: '▱',
    tablet: '▯',
    television: '▭',
    monitor: '▭',
    keyboard: '⌨',
    mouse: '◉',
    printer: '▤',
    other: '◇',
  };
  return <span className="device-glyph-v9" aria-hidden="true">{glyphs[deviceType] ?? glyphs.other}</span>;
}

const categoryGuidance: Record<string, { icon: string; focus: string; detail: string }> = {
  smartphone: { icon: '▯', focus: 'Mobile & electronics specialists', detail: 'We prioritize mobile-phone and electronics services that match the recommended action, then fall back to broader electronics options.' },
  laptop: { icon: '▱', focus: 'Computer & electronics specialists', detail: 'We prioritize computer/electronics services that match the recommended action, then fall back to broader electronics options.' },
  tablet: { icon: '▯', focus: 'Mobile & electronics specialists', detail: 'We prioritize mobile/electronics services that match the recommended action, then fall back to broader electronics options.' },
  television: { icon: '▭', focus: 'TV & electronics specialists', detail: 'We prioritize TV/electronics services that match the recommended action, then fall back to broader electronics options.' },
  monitor: { icon: '▭', focus: 'Computer & electronics specialists', detail: 'We prioritize computer/electronics services that match the recommended action, then fall back to broader electronics options.' },
  keyboard: { icon: '⌨', focus: 'Computer accessory specialists', detail: 'We prioritize computer/electronics services that match the recommended action, then fall back to broader options.' },
  mouse: { icon: '◉', focus: 'Computer accessory specialists', detail: 'We prioritize computer/electronics services that match the recommended action, then fall back to broader options.' },
  printer: { icon: '▤', focus: 'Printer & electronics specialists', detail: 'We prioritize printer/computer/electronics services that match the recommended action, then fall back to broader options.' },
  other: { icon: '◇', focus: 'Electronics & e-waste options', detail: 'We use the recommended action to find relevant mapped options for your device.' },
};

const deviceMarkerColor: Record<string, string> = {
  smartphone: '#1688e8',
  laptop: '#6f3fc1',
  tablet: '#1688e8',
  television: '#e6374a',
  monitor: '#f28a16',
  keyboard: '#5b6b7a',
  mouse: '#4b6578',
  printer: '#76523a',
  other: '#159b78',
};

const deviceMarkerLabel: Record<string, string> = {
  smartphone: 'Mobile',
  laptop: 'Laptop',
  tablet: 'Tablet',
  television: 'TV',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  printer: 'Printer',
  other: 'Device',
};

function deviceSvg(deviceType: string): string {
  const stroke = '#ffffff';
  switch (deviceType) {
    case 'smartphone':
    case 'tablet':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="${stroke}"/></svg>`;
    case 'laptop':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="11" rx="1.5" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M3 19h18l-2-3H5l-2 3Z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>`;
    case 'television':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="13" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M9 21h6M12 18v3" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    case 'monitor':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M9 21h6M12 17v4" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    case 'keyboard':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2" fill="none" stroke="${stroke}" stroke-width="1.8"/><path d="M6 10h1M9 10h1M12 10h1M15 10h1M18 10h1M6 13h1M9 13h6M17 13h1" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    case 'mouse':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="5" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M12 3v6" stroke="${stroke}" stroke-width="2"/><circle cx="12" cy="7" r="1" fill="${stroke}"/></svg>`;
    case 'printer':
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5" fill="none" stroke="${stroke}" stroke-width="2"/><rect x="4" y="9" width="16" height="9" rx="2" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M7 15h10v5H7z" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 12l-8 9-8-9 8-9Z" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;
  }
}

function shopSvg(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v10H4z" fill="none" stroke="#0f6f59" stroke-width="1.8"/><path d="M3 10l2-5h14l2 5" fill="none" stroke="#0f6f59" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 10v2.5M12 10v2.5M17 10v2.5M8 20v-5h8v5" fill="none" stroke="#0f6f59" stroke-width="1.6"/></svg>`;
}

function generalSvg(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

function createMapIcon(
  kind: 'user' | 'place',
  deviceType: string,
  action: string,
  searchTier: 'targeted' | 'compatible' | 'general' = 'targeted',
  selected = false,
) {
  if (kind === 'user') {
    return L.divIcon({
      className: 'ecoloop-map-icon-wrapper',
      html: '<div class="ecoloop-map-user-icon"><span>⌖</span></div>',
      iconSize: [42, 50],
      iconAnchor: [21, 45],
      popupAnchor: [0, -42],
    });
  }

  const color = deviceMarkerColor[deviceType] ?? deviceMarkerColor.other;
  const isGeneral = searchTier === 'general';
  const mainIcon = isGeneral ? generalSvg() : deviceSvg(deviceType);
  const title = isGeneral ? 'General local lead' : `${deviceMarkerLabel[deviceType] ?? 'Device'} option`;

  return L.divIcon({
    className: 'ecoloop-map-icon-wrapper',
    html: `
      <div class="ecoloop-map-place-icon-v13 ${isGeneral ? 'is-general' : ''} ${selected ? 'is-selected' : ''}" style="--marker-color:${color}" title="${title}">
        <span class="place-device-main-v13">${mainIcon}</span>
        <span class="place-shop-badge-v13">${shopSvg()}</span>
      </div>`,
    iconSize: [54, 58],
    iconAnchor: [27, 51],
    popupAnchor: [0, -48],
  });
}

function Stakeholders({ action, deviceType }: { action: string; deviceType: string }) {
  type Place = {
    id: string;
    name: string;
    type: string;
    action: string;
    lat: number;
    lng: number;
    distance_km: number;
    address?: string;
    phone?: string;
    website?: string;
    source: string;
    match_score: number;
    match_level: string;
    match_reasons: string[];
    services?: string[];
    search_tier?: 'targeted' | 'compatible' | 'general';
  };

  type Radius = 10 | 25 | 50;
  const radiusOptions: Radius[] = [10, 25, 50];

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<Radius>(10);
  const [lastRadiusWithResults, setLastRadiusWithResults] = useState<Radius | null>(null);
  const [autoExpand, setAutoExpand] = useState(true);
  const [searchTier, setSearchTier] = useState<'targeted' | 'compatible' | 'general'>('targeted');
  const [searchMessage, setSearchMessage] = useState('');
  const [exhausted50km, setExhausted50km] = useState(false);
  const [externalSearchUrl, setExternalSearchUrl] = useState('');

  const actionLabel = action ? formatLabel(action) : 'Nearby options';
  const deviceLabel = formatLabel(deviceType || 'device');
  const guidance = categoryGuidance[deviceType] ?? categoryGuidance.other;
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? null;

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Location services are not supported by this browser.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Finding the most accurate location available. Keep this page open for a few seconds...');
    setPlacesError('');
    setSearchMessage('');
    setExhausted50km(false);
    setExternalSearchUrl('');
    setSearchTier('targeted');
    setSelectedPlaceId(null);
    setAutoExpand(true);
    setSearchRadius(10);

    let bestPosition: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;
    const startedAt = Date.now();

    const finishLocation = (position: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      if (!position) {
        setLocationStatus('error');
        setLocationMessage('Unable to get a reliable location. Please try again.');
        return;
      }

      const accuracy = position.coords.accuracy;
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy });
      setLocationStatus('success');
      setLocationMessage(
        accuracy <= 30
          ? 'Excellent location accuracy.'
          : accuracy <= 75
            ? 'Good location accuracy.'
            : accuracy <= 150
              ? 'Location found. Nearby results are reasonably approximate.'
              : 'Location found, but desktop Wi-Fi positioning can be approximate.'
      );
    };

    const acceptPosition = (position: GeolocationPosition) => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) bestPosition = position;
      const elapsed = Date.now() - startedAt;
      // Prefer a genuinely good reading, otherwise keep collecting until the 20s window expires.
      if (position.coords.accuracy <= 30 || (position.coords.accuracy <= 75 && elapsed >= 6000)) {
        finishLocation(position);
      }
    };

    // First request a fresh one-shot reading, then continue watching for a better GPS/Wi-Fi fix.
    navigator.geolocation.getCurrentPosition(acceptPosition, () => undefined, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });

    watchId = navigator.geolocation.watchPosition(
      acceptPosition,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          setLocationMessage('Location permission was denied. Allow location access and try again.');
        } else if (bestPosition) {
          finishLocation(bestPosition);
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    window.setTimeout(() => finishLocation(bestPosition), 20000);
  };

  useEffect(() => {
    if (!location) return;

    const loadNearbyPlaces = async () => {
      setPlacesLoading(true);
      setPlacesError('');
      setSelectedPlaceId(null);

      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          action: action || '',
          device_type: deviceType || 'other',
          radius_km: String(searchRadius),
        });
        const response = await fetch(`${API}/stakeholders/nearby?${params.toString()}`);
        if (!response.ok) throw new Error(`Nearby places request failed with status ${response.status}`);

        const data = await response.json();
        const results: Place[] = data.results || [];
        setPlaces(results);
        setSearchTier(data.search_tier || 'targeted');
        setSearchMessage(data.search_message || '');
        setExhausted50km(Boolean(data.exhausted_50km));
        setExternalSearchUrl(data.external_search_url || '');
        if (results.length > 0) {
          setLastRadiusWithResults(searchRadius);
          setSelectedPlaceId(results[0].id);
          setPlacesError('');
          setAutoExpand(false);
        } else if (autoExpand && searchRadius < 50) {
          const nextRadius: Radius = searchRadius === 10 ? 25 : 50;
          setLastRadiusWithResults(null);
          setPlacesError(`No options found within ${searchRadius} km. Expanding the search to ${nextRadius} km...`);
          window.setTimeout(() => setSearchRadius(nextRadius), 700);
        } else {
          setLastRadiusWithResults(null);
          setPlacesError(data.search_message || `No ${actionLabel.toLowerCase()} were found within ${searchRadius} km.`);
        }
      } catch (error) {
        console.error('Nearby places error:', error);
        setPlaces([]);
        setPlacesError('Unable to load nearby places right now. Please try again.');
      } finally {
        setPlacesLoading(false);
      }
    };

    void loadNearbyPlaces();
  }, [location, action, searchRadius]);

  const getDirections = (destinationLat: number, destinationLng: number) => {
    if (!location) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${destinationLat},${destinationLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWebsite = (website: string) => {
    const normalized = website.startsWith('http') ? website : `https://${website}`;
    window.open(normalized, '_blank', 'noopener,noreferrer');
  };

  const accuracyLabel = location
    ? location.accuracy <= 30 ? 'Excellent' : location.accuracy <= 75 ? 'Good' : location.accuracy <= 150 ? 'Approximate' : 'Low precision'
    : '';

  return (
    <section className="stakeholders stakeholders-v9">
      <div className="stakeholder-heading-v9">
        <div className="stakeholder-context-v9">
          <div className="device-context-card-v9">
            <DeviceGlyph deviceType={deviceType} />
            <div>
              <span>ASSESSMENT CONTEXT</span>
              <strong>{deviceLabel}</strong>
              <small>{actionLabel} is the recommended next step</small>
            </div>
          </div>
          <div>
            <span className="step-kicker">03 · REAL-WORLD OPTIONS</span>
            <h2>Find the right place for your {deviceLabel.toLowerCase()}</h2>
            <p>We use your current location and OpenStreetMap data to find real nearby {actionLabel.toLowerCase()} options.</p>
          </div>
        </div>
        <div className="stakeholder-heading-actions-v9">
          {location && <span className="radius-pill">Within {searchRadius} km</span>}
          <button type="button" className="primary-button location-button-v8" onClick={getUserLocation} disabled={locationStatus === 'loading'}>
            <span aria-hidden="true">⌖</span>
            {locationStatus === 'loading' ? 'Improving location...' : location ? 'Refresh location' : 'Use my location'}
          </button>
        </div>
      </div>

      <div className="category-guidance-v10">
        <div className="category-guidance-icon-v10">{guidance.icon}</div>
        <div className="category-guidance-copy-v10">
          <span className="step-kicker">DEVICE-AWARE SEARCH</span>
          <strong>{guidance.focus}</strong>
          <p>{guidance.detail}</p>
        </div>
        <div className="category-action-chip-v10"><span>Recommended</span><strong>{actionLabel}</strong></div>
      </div>

      {locationStatus !== 'idle' && (
        <div className={`location-banner-v8 ${locationStatus}`}>
          <div className="location-banner-icon" aria-hidden="true">{locationStatus === 'success' ? '✓' : locationStatus === 'loading' ? '⌖' : '!'}</div>
          <div>
            <strong>{locationStatus === 'success' ? `Location ready · ${accuracyLabel}` : locationStatus === 'loading' ? 'Improving location accuracy' : locationStatus === 'denied' ? 'Location permission needed' : 'Location unavailable'}</strong>
            <span>{locationMessage}</span>
          </div>
          {location && <b>±{Math.round(location.accuracy)} m</b>}
        </div>
      )}

      {!location && locationStatus === 'idle' && (
        <div className="location-intro-v9">
          <div className="location-intro-device"><DeviceGlyph deviceType={deviceType} /></div>
          <div>
            <strong>Ready to locate a {actionLabel.toLowerCase()} option for your {deviceLabel.toLowerCase()}</strong>
            <p>Allow location access to see real places, distances and turn-by-turn directions.</p>
          </div>
          <button type="button" className="secondary-button" onClick={getUserLocation}>Start location search →</button>
        </div>
      )}

      {location && (
        <>
          <div className="radius-controls-v9">
            <div>
              <span className="step-kicker">SEARCH RANGE</span>
              <strong>Expand the radius if needed</strong>
            </div>
            <div className="radius-options-v9">
              {radiusOptions.map((radius) => (
                <button key={radius} type="button" className={searchRadius === radius ? 'active' : ''} onClick={() => { setAutoExpand(false); setSearchRadius(radius); }} disabled={placesLoading}>
                  {radius} km
                </button>
              ))}
            </div>
          </div>

          <div className="nearby-shell-v8">
            <div className="nearby-map-column-v8">
              <div className="map-toolbar-v8">
                <div><span className="live-dot-v8" /><strong>Live OpenStreetMap</strong></div>
                <span>{places.length > 0 ? `${places.length} options found` : placesLoading ? `Searching ${searchRadius} km...` : `No results in ${searchRadius} km`}</span>
              </div>
              <div className="map-frame-v9">
                <MapContainer center={[location.lat, location.lng]} zoom={13} scrollWheelZoom className="stakeholder-map">
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Circle center={[location.lat, location.lng]} radius={Math.max(location.accuracy, 20)} pathOptions={{ color: '#169b78', fillColor: '#169b78', fillOpacity: 0.08, weight: 1 }} />
                  <Marker position={[location.lat, location.lng]} icon={createMapIcon('user', deviceType, action, 'targeted')}>
                    <Popup><strong>Your location</strong><br />Accuracy ±{Math.round(location.accuracy)} m</Popup>
                  </Marker>
                  {places.map((place, index) => {
                    const markerTier = place.search_tier ?? searchTier;
                    return (
                    <Marker key={place.id} position={[place.lat, place.lng]} icon={createMapIcon('place', deviceType, action, markerTier, selectedPlaceId === place.id)} eventHandlers={{ click: () => setSelectedPlaceId(place.id) }}>
                      <Popup>
                        <strong>{index + 1}. {place.name}</strong><br />
                        {place.type} · {place.distance_km.toFixed(1)} km<br />
                        {place.match_level} device match
                      </Popup>
                    </Marker>
                    );
                  })}
                </MapContainer>
                <div className="map-legend-v13">
                  <span><i className="legend-user-v13" /> You</span>
                  <span><i className="legend-shop-v13" /> Nearby shop</span>
                  <span><i className="legend-device-v13" style={{ background: deviceMarkerColor[deviceType] ?? deviceMarkerColor.other }} /> {deviceMarkerLabel[deviceType] ?? 'Device'}</span>
                  {searchTier === 'general' && <span><i className="legend-general-v13">✦</i> General lead</span>}
                  <span>±{Math.round(location.accuracy)} m</span>
                </div>
              </div>
            </div>

            <div className="nearby-list-column-v8">
              <div className="nearby-list-heading-v9">
                <div><span className="step-kicker">REAL OPTIONS</span><h3>{places.length ? `${places.length} places nearby` : `Options within ${searchRadius} km`}</h3></div>
                <div className="nearby-heading-meta-v10">
                  {lastRadiusWithResults && <span className="result-range-badge-v9">Found within {lastRadiusWithResults} km</span>}
                  <small>Names and contact details depend on OpenStreetMap coverage.</small>
                </div>
              </div>

              {placesLoading && <div className="nearby-loading-v8"><span className="loading-orb-v8" /><strong>Searching OpenStreetMap...</strong><p>Matching your device category with the recommended action using OpenStreetMap tags.</p></div>}

              {!placesLoading && placesError && (
                <div className={`nearby-empty-v9 ${exhausted50km ? 'nearby-exhausted-v12' : ''}`}>
                  <div className="empty-icon-v9"><DeviceGlyph deviceType={deviceType} /></div>
                  <strong>{exhausted50km ? 'We could not find a verified option' : `No mapped options within ${searchRadius} km`}</strong>
                  <p>{searchMessage || placesError}</p>
                  {exhausted50km && <small className="nearby-apology-v12">Sorry — we know your time matters. We searched the available mapped options up to 50 km instead of sending you to an unverified place.</small>}
                  <div className="empty-actions-v9">
                    {!exhausted50km && searchRadius < 50 && <button type="button" className="primary-button" onClick={() => setSearchRadius(searchRadius === 10 ? 25 : 50)}>Expand to {searchRadius === 10 ? 25 : 50} km</button>}
                    {exhausted50km && externalSearchUrl && <button type="button" className="primary-button" onClick={() => window.open(externalSearchUrl, '_blank', 'noopener,noreferrer')}>Open live Google Maps search ↗</button>}
                    <button type="button" className="secondary-button" onClick={() => setSearchRadius(10)}>Search 10 km again</button>
                  </div>
                </div>
              )}

              {!placesLoading && places.length > 0 && searchTier !== 'targeted' && (
                <div className={`nearby-search-note-v12 ${searchTier === 'general' ? 'general' : 'compatible'}`}>
                  <span aria-hidden="true">{searchTier === 'general' ? '↗' : '✓'}</span>
                  <div><strong>{searchTier === 'general' ? 'Broader local leads' : 'Broadened compatible search'}</strong><p>{searchMessage}</p></div>
                </div>
              )}

              {!placesLoading && places.length > 0 && (
                <div className="nearby-results-v9">
                  {places.map((place, index) => (
                    <article key={place.id} className={`place-card-v9 ${selectedPlaceId === place.id ? 'selected' : ''}`} onClick={() => setSelectedPlaceId(place.id)}>
                      <div className="place-index-v9">{String(index + 1).padStart(2, '0')}</div>
                      <div className="place-main-v9"><strong>{place.name}</strong><span>{place.type} · {place.distance_km.toFixed(1)} km away</span><small className={`place-match-v11 ${place.search_tier === 'general' ? 'is-general-lead-v12' : ''}`}><b>{place.match_level} match</b>{place.match_reasons?.[0] ? ` · ${place.match_reasons[0]}` : ''}</small>{place.search_tier === 'general' && <small className="place-contact-note-v12">Service not explicitly mapped — confirm before visiting.</small>}{place.services && place.services.length > 0 && <div className="place-service-chips-v11">{place.services.map((service) => <span className="place-service-chip-v11" key={service}>{service}</span>)}</div>}{place.address ? <small>{place.address}</small> : <small className="place-data-note-v10">Address not listed in OpenStreetMap</small>}</div>
                      <div className="place-actions-v9">
                        <button type="button" className="directions-button-v9" onClick={(event) => { event.stopPropagation(); getDirections(place.lat, place.lng); }}>Directions ↗</button>
                        {place.phone && <a href={`tel:${place.phone}`} onClick={(event) => event.stopPropagation()} aria-label={`Call ${place.name}`}>☎ Call</a>}
                        {place.website && <button type="button" onClick={(event) => { event.stopPropagation(); openWebsite(place.website!); }}>↗ Website</button>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPlace && (
            <div className="selected-place-v9">
              <div><span className="step-kicker">SELECTED OPTION</span><h3>{selectedPlace.name}</h3><p>{selectedPlace.type} · {selectedPlace.distance_km.toFixed(1)} km from your location</p></div>
              <button type="button" className="primary-button" onClick={() => getDirections(selectedPlace.lat, selectedPlace.lng)}>Open route in Google Maps ↗</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: Result;
  onReset: () => void;
}) {
  const ecoScore = Math.max(0, Math.min(100, result.ecoscore));
  const recommendationEntries = Object.entries(result.recommendation_scores).sort(([, a], [, b]) => b - a);
  const breakdownEntries = Object.entries(result.ecoscore_breakdown);

  return (
    <section className="result-shell">
      <section className="result-hero">
        <div className="result-hero-copy">
          <span className="eyebrow">ASSESSMENT COMPLETE · #{result.id}</span>
          <div className="result-title-row">
            <div>
              <span className="result-overline">YOUR DEVICE</span>
              <h1>{formatLabel(result.device_type)}</h1>
            </div>
            <span className="result-status-pill">✓ Decision ready</span>
          </div>
          <p>EcoLoop combined the device recognition result with your functional and condition responses to determine its most suitable next step.</p>
        </div>
        <div className={`eco-score-hero ${scoreTone(ecoScore)}`}>
          <div className="eco-score-ring-wrap">
            <div className="eco-score-ring" style={{ background: `conic-gradient(currentColor ${ecoScore}%, rgba(255,255,255,.09) ${ecoScore}% 100%)` }}>
              <div className="eco-score-ring-inner">
                <span>ECOSCORE</span><strong>{Math.round(ecoScore)}</strong><small>/ 100</small>
              </div>
            </div>
          </div>
          <b>{result.ecoscore_band}</b>
          <span>Overall circular-economy assessment</span>
        </div>
      </section>

      <section className="result-summary-grid">
        <article className="result-summary-card"><span className="summary-icon">◈</span><small>CONDITION</small><strong>{formatLabel(result.condition)}</strong><span>{Math.round(result.condition_score)}/100 condition score</span></article>
        <article className="result-summary-card"><span className="summary-icon">✓</span><small>ASSESSMENT CONFIDENCE</small><strong>{Math.round(result.assessment_confidence)}%</strong><span>Based on the completed assessment</span></article>
        <article className="result-summary-card result-summary-highlight"><span className="summary-icon">↗</span><small>RECOMMENDED ACTION</small><strong>{formatLabel(result.recommended_action)}</strong><span>{formatLabel(result.stakeholder_category)}</span></article>
      </section>

      <section className="recommendation-hero-card">
        <div className="recommendation-main">
          <span className="step-kicker">RECOMMENDED NEXT LIFE</span>
          <h2>{formatLabel(result.recommended_action)}</h2>
          <p>{result.explanation}</p>
          <div className="recommendation-target"><span>Best stakeholder category</span><strong>{formatLabel(result.stakeholder_category)}</strong></div>
        </div>
        <div className="recommendation-mark" aria-hidden="true"><span>→</span></div>
      </section>

      <section className="result-detail-grid">
        <article className="result-card">
          <div className="result-card-heading"><div><span className="step-kicker">01 · ECOSCORE BREAKDOWN</span><h2>What shaped the score?</h2></div><span className="result-card-count">{breakdownEntries.length} factors</span></div>
          <div className="score-factor-list">
            {breakdownEntries.map(([key, value]) => { const score = Math.max(0, Math.min(100, Number(value))); return <div className="score-factor" key={key}><div className="score-factor-label"><span>{formatLabel(key)}</span><strong>{Math.round(score)}</strong></div><div className="score-factor-track"><span style={{ width: `${score}%` }} /></div></div>; })}
          </div>
        </article>

        <article className="result-card">
          <div className="result-card-heading"><div><span className="step-kicker">02 · DECISION COMPARISON</span><h2>Why this option?</h2></div><span className="result-card-count">{recommendationEntries.length} paths</span></div>
          <div className="recommendation-score-list">
            {recommendationEntries.map(([key, value]) => { const score = Math.max(0, Math.min(100, Number(value))); const recommended = key.toLowerCase() === result.recommended_action.toLowerCase(); return <div className={`recommendation-score-row ${recommended ? 'recommended' : ''}`} key={key}><div className="recommendation-score-label"><span>{formatLabel(key)}</span><strong>{Math.round(score)}</strong></div><div className="recommendation-score-track"><span style={{ width: `${score}%` }} /></div>{recommended && <small>Recommended</small>}</div>; })}
          </div>
        </article>
      </section>

      <section className="result-next-step"><div><span className="step-kicker">03 · FIND A REAL-WORLD OPTION</span><h2>Ready to give this device its next life?</h2><p>Use your browser location to find nearby options matching the recommended action. Results are sourced from OpenStreetMap data.</p></div><span className="next-step-arrow">↓</span></section>

      <Stakeholders action={result.recommended_action} deviceType={result.device_type} />

      <section className="notice result-limitations"><div><span className="notice-icon">i</span><div><b>Assessment limitations</b>{result.limitations.map((limitation) => <p key={limitation}>{limitation}</p>)}</div></div></section>

      <div className="result-footer-actions"><button className="secondary-button" onClick={onReset}>← Analyze another device</button><button className="primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
    </section>
  );
}

function App() {
  const [page, navigate] = useState<
    'home' | 'analyze' | 'history'
  >('home');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [result, setResult] =
    useState<Result | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  const [device, setDevice] = useState('smartphone');

  const [loading, setLoading] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<
    'upload' | 'scanning' | 'recognized' | 'assessment'
  >('upload');
  const [questionIndex, setQuestionIndex] = useState(0);

  // Keep answers empty until the user explicitly selects an option.
  // This makes every assessment question mandatory instead of silently
  // submitting pre-filled defaults.
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const refresh = async () => {
    try {
      const response = await fetch(
        `${API}/assessments`
      );

      if (!response.ok) {
        throw new Error(
          'Unable to load assessment history.'
        );
      }

      setHistory(await response.json());
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const choose = (next: File | null) => {
    setFile(next);
    setAnalysis(null);
    setResult(null);
    setAnalysisStage('upload');
    setQuestionIndex(0);
    setAnswers({});
    setPreview(
      next ? URL.createObjectURL(next) : ''
    );
  };

  /*
   * AI IMAGE ANALYSIS
   *
   * Sends the uploaded image to FastAPI.
   *
   * Backend performs:
   * 1. Image validation
   * 2. YOLO device recognition
   * 3. Confidence calculation
   */
  async function upload() {
    if (!file) return;

    setLoading(true);
    setAnalysisStage('scanning');

    try {
      const form = new FormData();

      form.append('image', file);

      const response = await fetch(
        `${API}/analyze`,
        {
          method: 'POST',
          body: form,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Analysis failed: ${response.status}`
        );
      }

      const data: Analysis =
        await response.json();

      setAnalysis(data);
      setAnalysisStage(
        data.status === 'invalid_image'
          ? 'upload'
          : 'recognized'
      );

      /*
       * Automatically select the device recognized
       * by the trained YOLO model.
       */
      if (
        data.status === 'supported' &&
        data.device_type
      ) {
        setDevice(data.device_type);
      }
    } catch (error) {
      setAnalysisStage('upload');
      setAnalysis({
        device_type: null,
        confidence: 0,
        status: 'unknown',
        image_quality: {},
        findings: [],
        message:
          error instanceof Error
            ? error.message
            : 'Unable to analyze the image.',
      });
    } finally {
      setLoading(false);
    }
  }

  /*
   * CREATE FINAL ECOLOOP ASSESSMENT
   */
  async function assess() {
    setLoading(true);

    try {
      const aiSupported =
        analysis?.status === 'supported' &&
        !!analysis.device_type;

      const body = {
        device_type: device,

        recognition_status:
          analysis?.status || 'manual',

        recognition_confidence:
          analysis?.confidence || 0,

        /*
         * AI-supported recognition means this is an
         * AI-assisted assessment.
         *
         * Unknown/unsupported devices use manual fallback.
         */
        manual_assessment: !aiSupported,

        image_path:
          typeof analysis?.image_quality
            ?.stored_path === 'string'
            ? analysis.image_quality.stored_path
            : null,

        answers,

        findings:
          analysis?.findings || [],
      };

      const response = await fetch(
        `${API}/assessment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Assessment failed: ${response.status}`
        );
      }

      const data: Result =
        await response.json();

      setResult(data);

      void refresh();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : 'Unable to calculate the assessment.'
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * HOME PAGE
   *
   * Presentation layer only.
   * Existing AI, assessment, database and map logic is untouched.
   */
  if (page === 'home') {
    return (
      <>
        <Nav navigate={navigate} />

        <main className="home-shell">
          <section className="home-hero">
            <div className="home-copy">
              <div className="home-badge">
                <span className="home-badge-dot" />
                AI-POWERED CIRCULAR TECH
                <span className="home-badge-live">PHASE 1</span>
              </div>

              <h1 className="home-title">
                Give your electronics
                <span>a smarter second life.</span>
              </h1>

              <p className="home-description">
                Upload a device photo and get explainable guidance for
                repair, refurbishment, resale, donation, or responsible
                recycling — powered by real AI recognition and transparent
                decision scoring.
              </p>

              <div className="home-actions">
                <button
                  className="home-primary"
                  onClick={() => navigate('analyze')}
                >
                  <span>Analyze my device</span>
                  <span className="home-arrow">→</span>
                </button>

                <button
                  className="home-secondary"
                  onClick={() => navigate('history')}
                >
                  View assessment history
                  <span>↗</span>
                </button>
              </div>

              <div className="home-trust-row">
                <div>
                  <strong>YOLO</strong>
                  <span>Device recognition</span>
                </div>
                <div>
                  <strong>0–100</strong>
                  <span>EcoScore methodology</span>
                </div>
                <div>
                  <strong>OSM</strong>
                  <span>Nearby matching</span>
                </div>
              </div>
            </div>

            <div className="home-visual" aria-label="EcoLoop AI product preview">
              <div className="home-orbit home-orbit-one" />
              <div className="home-orbit home-orbit-two" />

              <div className="home-glow" />

              <div className="home-ai-card">
                <div className="home-card-top">
                  <div className="home-ai-icon">✦</div>
                  <div>
                    <strong>EcoLoop AI</strong>
                    <span>Decision engine</span>
                  </div>
                  <span className="home-live-dot">LIVE</span>
                </div>

                <div className="home-device-preview">
                  <div className="home-device-screen">
                    <div className="home-device-camera" />
                    <div className="home-device-shine" />
                    <div className="home-device-text">
                      <span>DEVICE</span>
                      <b>SMARTPHONE</b>
                    </div>
                  </div>

                  <div className="home-recognition">
                    <span>AI recognition</span>
                    <strong>92.3%</strong>
                    <div className="home-progress">
                      <span style={{ width: '92.3%' }} />
                    </div>
                    <small>Supported Phase-1 device</small>
                  </div>
                </div>

                <div className="home-score-row">
                  <div className="home-score-ring">
                    <div>
                      <strong>84.7</strong>
                      <span>/100</span>
                    </div>
                  </div>

                  <div className="home-score-copy">
                    <span>ECOSCORE</span>
                    <strong>High circular potential</strong>
                    <p>
                      Transparent factors guide the next responsible action.
                    </p>
                  </div>
                </div>

                <div className="home-recommendation">
                  <div className="home-recommendation-icon">↻</div>
                  <div>
                    <span>RECOMMENDED NEXT STEP</span>
                    <strong>Repair</strong>
                  </div>
                  <span className="home-recommendation-arrow">→</span>
                </div>
              </div>

              <div className="home-float home-float-ai">
                <span>●</span>
                AI recognition
                <strong>Ready</strong>
              </div>

              <div className="home-float home-float-eco">
                <span>♻</span>
                Circular decision
                <strong>Explainable</strong>
              </div>
            </div>
          </section>

          <section className="home-feature-strip">
            <div className="home-feature-intro">
              <span className="eyebrow">ONE SIMPLE FLOW</span>
              <h2>From photo to responsible action.</h2>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">01</span>
              <div>
                <strong>Recognize</strong>
                <p>AI identifies supported devices from a clear photo.</p>
              </div>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">02</span>
              <div>
                <strong>Assess</strong>
                <p>Functional answers make the condition assessment practical.</p>
              </div>
            </div>

            <div className="home-feature">
              <span className="home-feature-number">03</span>
              <div>
                <strong>Act</strong>
                <p>EcoScore and nearby options support the next step.</p>
              </div>
            </div>
          </section>

          <section className="home-note">
            <div className="home-note-icon">i</div>
            <div>
              <strong>Built for responsible decisions</strong>
              <p>
                EcoScore is a Phase-1 decision-support methodology, not a
                scientific Life Cycle Assessment. The platform does not claim
                to diagnose hidden internal hardware faults from a normal photo.
              </p>
            </div>
          </section>
        </main>
      </>
    );
  }

  /*
   * HISTORY PAGE
   *
   * Persistent assessment records from the SQLite-backed API.
   * This page is presentation-only: filters operate on the records
   * already returned by the backend.
   */
  if (page === 'history') {
    const normalizedSearch = historySearch.trim().toLowerCase();
    const filteredHistory = history.filter((row) => {
      const matchesFilter =
        historyFilter === 'all' ||
        String(row.recommended_action || '').toLowerCase() === historyFilter;

      const searchable = [
        row.id,
        row.device_type,
        row.condition,
        row.recommended_action,
        row.stakeholder_category,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(' ')
        .toLowerCase();

      return matchesFilter && searchable.includes(normalizedSearch);
    });

    const scores = history
      .map((row) => Number(row.ecoscore))
      .filter((score) => Number.isFinite(score));
    const averageScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
    const latest = history[0];
    const actionCount = history.reduce<Record<string, number>>((counts, row) => {
      const action = String(row.recommended_action || 'other').toLowerCase();
      counts[action] = (counts[action] || 0) + 1;
      return counts;
    }, {});

    const formatHistoryDate = (value: unknown) => {
      if (!value) return 'Date unavailable';
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
    };

    const displayDevice = (value: unknown) =>
      String(value || 'Unknown device')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
      <>
        <Nav navigate={navigate} />

        <main className="history-shell">
          <section className="history-heading">
            <div>
              <span className="eyebrow">YOUR ECOLOOP JOURNEY</span>
              <h1>Assessment history</h1>
              <p>
                Review the devices you've assessed and the next-life decisions
                EcoLoop calculated from those assessments.
              </p>
            </div>
            <button className="history-new-button" onClick={() => navigate('analyze')}>
              <span>＋</span> Analyze a device
            </button>
          </section>

          <section className="history-stats">
            <article className="history-stat-card">
              <span className="history-stat-icon">◌</span>
              <div>
                <small>ASSESSMENTS</small>
                <strong>{history.length}</strong>
                <span>Total saved records</span>
              </div>
            </article>
            <article className="history-stat-card">
              <span className="history-stat-icon">↗</span>
              <div>
                <small>AVERAGE ECOSCORE</small>
                <strong>{averageScore || '—'}<em>{averageScore ? '/100' : ''}</em></strong>
                <span>Across saved assessments</span>
              </div>
            </article>
            <article className="history-stat-card history-stat-highlight">
              <span className="history-stat-icon">✦</span>
              <div>
                <small>LATEST DECISION</small>
                <strong>{latest ? displayDevice(latest.device_type) : '—'}</strong>
                <span>{latest ? displayDevice(latest.recommended_action) : 'No assessment yet'}</span>
              </div>
            </article>
          </section>

          {history.length > 0 && (
            <section className="history-insight">
              <div className="history-insight-copy">
                <span className="eyebrow">YOUR DECISION PATTERN</span>
                <h2>Every assessment becomes a reusable record.</h2>
                <p>
                  Your saved results make it easy to revisit a device decision
                  without repeating the assessment.
                </p>
              </div>
              <div className="history-action-pills">
                {Object.entries(actionCount)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([action, count]) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setHistoryFilter(action)}
                      className={historyFilter === action ? 'active' : ''}
                    >
                      <span>{displayDevice(action)}</span>
                      <b>{count}</b>
                    </button>
                  ))}
              </div>
            </section>
          )}

          <section className="history-panel">
            <div className="history-toolbar">
              <div>
                <span className="eyebrow">SAVED ASSESSMENTS</span>
                <h2>{filteredHistory.length} {filteredHistory.length === 1 ? 'record' : 'records'}</h2>
              </div>
              <div className="history-controls">
                <div className="history-search">
                  <span>⌕</span>
                  <input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="Search device or action"
                    aria-label="Search assessment history"
                  />
                </div>
                <select
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value)}
                  aria-label="Filter assessment history"
                >
                  <option value="all">All decisions</option>
                  <option value="repair">Repair</option>
                  <option value="refurbish">Refurbish</option>
                  <option value="sell">Sell</option>
                  <option value="donate">Donate</option>
                  <option value="recycle">Recycle</option>
                </select>
              </div>
            </div>

            {filteredHistory.length ? (
              <div className="history-list">
                {filteredHistory.map((row) => {
                  const score = Number(row.ecoscore);
                  const action = String(row.recommended_action || '—');
                  return (
                    <article className="history-row" key={row.id}>
                      <div className="history-device-icon">
                        {String(row.device_type || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="history-row-main">
                        <div className="history-row-title">
                          <strong>{displayDevice(row.device_type)}</strong>
                          <span>#{row.id}</span>
                        </div>
                        <p>
                          {row.condition ? displayDevice(row.condition) : 'Condition assessed'}
                          <span>•</span>
                          {formatHistoryDate(row.created_at)}
                        </p>
                      </div>
                      <div className="history-row-score">
                        <small>ECOSCORE</small>
                        <strong>{Number.isFinite(score) ? score : '—'}<em>/100</em></strong>
                      </div>
                      <div className="history-row-action">
                        <span className={`history-action-tag ${action.toLowerCase()}`}>
                          {displayDevice(action)}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="history-empty">
                <div className="history-empty-icon">⌕</div>
                <h3>{history.length ? 'No matching assessments' : 'Your assessment history is empty'}</h3>
                <p>
                  {history.length
                    ? 'Try another search term or choose a different decision filter.'
                    : 'Analyze your first device and its result will appear here automatically.'}
                </p>
                {!history.length && (
                  <button className="primary" onClick={() => navigate('analyze')}>
                    Analyze my first device →
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="history-note">
            <span>i</span>
            <div>
              <strong>About your records</strong>
              <p>
                History is loaded from the EcoLoop backend's persistent SQLite
                assessment records. Scores and recommendations shown here are
                the values returned by the assessment engine.
              </p>
            </div>
          </section>
        </main>
      </>
    );
  }

  /*
   * ANALYZE PAGE
   *
   * The workflow is intentionally step-based:
   * upload → AI recognition → functional assessment → result.
   * The backend remains the source of truth for recognition and scoring.
   */
  /*
   * QUESTIONNAIRE LOGIC
   *
   * Questions are selected from the device category AND the declared age.
   * Older devices (8+ years) receive two additional lifecycle questions
   * because repair/replacement history becomes more relevant to the
   * recommendation. These are still user-reported questions; they do not
   * claim to diagnose hidden hardware faults.
   */
  const ageYears =
    typeof answers.age_years === 'number'
      ? answers.age_years
      : Number(answers.age_years ?? 0);

  const ageSpecificQuestions =
    ageYears >= 8
      ? [
          {
            key: 'repair_history',
            label: 'Has the device been repaired or had major parts replaced?',
            options: ['yes', 'no', 'unknown'],
            type: 'select',
          },
          {
            key: 'replacement_need',
            label: 'Would you consider replacing the device soon?',
            options: ['yes', 'no', 'unsure'],
            type: 'select',
          },
        ]
      : [];

  const currentQuestions = [
    {
      key: 'age_years',
      label: 'Approximately how old is the device?',
      options: ['0', '1', '2', '3', '4', '5', '6', '7', '8+'],
      type: 'age',
    },
    ...(deviceQuestions[device] || deviceQuestions.other).map((question) => ({
      ...question,
      type: 'select',
    })),
    ...ageSpecificQuestions,
    {
      key: 'visible_damage',
      label: 'How much visible damage does the device have?',
      options: ['none', 'minor', 'major', 'unknown'],
      type: 'select',
    },
  ];

  const safeQuestionIndex = Math.min(
    questionIndex,
    Math.max(currentQuestions.length - 1, 0)
  );

  const currentQuestion = currentQuestions[safeQuestionIndex];

  const answerValue =
    currentQuestion && answers[currentQuestion.key] !== undefined
      ? currentQuestion.key === 'age_years' && Number(answers[currentQuestion.key]) >= 8
        ? '8+'
        : String(answers[currentQuestion.key])
      : '';

  const hasCurrentAnswer = Boolean(
    currentQuestion &&
      answers[currentQuestion.key] !== undefined &&
      answers[currentQuestion.key] !== null &&
      String(answers[currentQuestion.key]).trim() !== ''
  );

  const updateCurrentAnswer = (value: string) => {
    if (!currentQuestion) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.key]:
        currentQuestion.key === 'age_years'
          ? value === '8+'
            ? 8
            : Number(value)
          : value,
    }));

    // If age changes from 8+ back to a younger value, the age-specific
    // questions disappear. Keep the user on a valid question.
    if (currentQuestion.key === 'age_years' && value !== '8') {
      setQuestionIndex(1);
    }
  };

  const nextQuestion = () => {
    if (!currentQuestion || !hasCurrentAnswer) return;

    if (safeQuestionIndex < currentQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
    }
  };

  const previousQuestion = () => {
    if (safeQuestionIndex > 0) {
      setQuestionIndex((index) => index - 1);
    }
  };

  const startAssessment = () => {
    setQuestionIndex(0);
    setAnalysisStage('assessment');
  };

  return (
    <>
      <Nav navigate={navigate} />

      <main className="analyze-shell">
        {result ? (
          <ResultPanel
            result={result}
            onReset={() => choose(null)}
          />
        ) : (
          <>
            <section className="workflow-header">
              <div>
                <span className="eyebrow">AI DEVICE ASSESSMENT · PHASE 1</span>
                <h1>Understand your device before you decide its next life.</h1>
                <p className="muted">
                  A clear photo starts the process. EcoLoop AI recognizes the
                  device, then uses practical functional answers to build the
                  assessment.
                </p>
              </div>

              <div className="workflow-badge">
                <span className="workflow-badge-dot" />
                Decision support
              </div>
            </section>

            <section className="workflow-steps" aria-label="Assessment progress">
              {[
                ['01', 'Upload', analysisStage !== 'upload'],
                ['02', 'AI recognition', analysisStage === 'recognized' || analysisStage === 'assessment'],
                ['03', 'Condition', analysisStage === 'assessment'],
                ['04', 'EcoScore', false],
              ].map(([number, label, complete], index) => {
                const active =
                  (analysisStage === 'upload' && index === 0) ||
                  (analysisStage === 'scanning' && index === 1) ||
                  (analysisStage === 'recognized' && index === 1) ||
                  (analysisStage === 'assessment' && index === 2);

                return (
                  <div
                    className={`workflow-step ${active ? 'active' : ''} ${
                      complete ? 'complete' : ''
                    }`}
                    key={`${number}-${index}`}
                  >
                    <span className="workflow-step-number">
                      {complete ? '✓' : number}
                    </span>
                    <div>
                      <strong>{label}</strong>
                      <small>
                        {complete
                          ? 'Completed'
                          : active
                            ? 'Current step'
                            : 'Next'}
                      </small>
                    </div>
                  </div>
                );
              })}
            </section>

            {analysisStage === 'upload' && !analysis && (
              <section className="upload-workspace">
                <div className="upload-main-card">
                  <div className="upload-card-heading">
                    <span className="step-kicker">STEP 01</span>
                    <h2>Upload your device photo</h2>
                    <p>
                      Use a clear image where the device is visible. A single
                      photo is enough to start.
                    </p>
                  </div>

                  <label className="drop drop-premium">
                    <input
                      aria-label="Upload device image"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(e) =>
                        choose(e.target.files?.[0] || null)
                      }
                    />
                    <span className="upload-icon">↑</span>
                    <b>
                      {file?.name || 'Choose a JPG or PNG image'}
                    </b>
                    <span>Drag & drop or click to browse</span>
                    <small>Maximum 8 MB · Minimum 160 × 160 px</small>
                  </label>

                  {preview && (
                    <div className="selected-image-card">
                      <img
                        className="preview preview-large"
                        src={preview}
                        alt="Selected device"
                      />
                      <div>
                        <span className="success">✓ Image selected</span>
                        <strong>{file?.name}</strong>
                        <small>Ready for AI recognition</small>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!file || loading}
                    className="primary workflow-primary"
                    onClick={upload}
                  >
                    {loading ? 'Starting AI analysis…' : 'Analyze with EcoLoop AI →'}
                  </button>
                </div>

                <aside className="workflow-side-card">
                  <span className="side-card-icon">✦</span>
                  <h3>What happens next?</h3>
                  <div className="side-flow">
                    <div><span>01</span><p>Validate image</p></div>
                    <div><span>02</span><p>Recognize device</p></div>
                    <div><span>03</span><p>Ask functional questions</p></div>
                    <div><span>04</span><p>Calculate EcoScore</p></div>
                  </div>
                  <p className="side-note">
                    AI recognition is limited to the device classes supported
                    by the Phase-1 model.
                  </p>
                </aside>
              </section>
            )}

            {analysisStage === 'scanning' && (
              <section className="ai-scanning-card">
                <div className="scan-visual">
                  {preview ? (
                    <img src={preview} alt="Device being analyzed" />
                  ) : (
                    <div className="scan-placeholder">AI</div>
                  )}
                  <span className="scan-line" />
                  <span className="scan-corner scan-corner-tl" />
                  <span className="scan-corner scan-corner-tr" />
                  <span className="scan-corner scan-corner-bl" />
                  <span className="scan-corner scan-corner-br" />
                </div>

                <div className="scan-copy">
                  <span className="step-kicker">STEP 02 · AI RECOGNITION</span>
                  <h2>EcoLoop AI is analyzing your image</h2>
                  <p>
                    The image is being sent to the Phase-1 recognition model.
                    This may take a few seconds.
                  </p>

                  <div className="scan-progress">
                    <span />
                  </div>

                  <div className="scan-status-list">
                    <div className="scan-status-item active">
                      <span>●</span>
                      <strong>Validating and recognizing</strong>
                      <small>In progress</small>
                    </div>
                    <div className="scan-status-item">
                      <span>○</span>
                      <strong>Determine supported device</strong>
                      <small>Waiting</small>
                    </div>
                    <div className="scan-status-item">
                      <span>○</span>
                      <strong>Prepare assessment</strong>
                      <small>Waiting</small>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {analysis && analysis.status !== 'invalid_image' && analysisStage === 'recognized' && (
              <section className="recognition-workspace">
                <div className="recognition-image-card">
                  {preview && (
                    <img src={preview} alt="Analyzed device" />
                  )}
                  <span className="image-chip">IMAGE ANALYZED</span>
                </div>

                <div className="recognition-card">
                  <span className="success recognition-success">✓ Recognition complete</span>
                  <span className="step-kicker">AI RECOGNITION RESULT</span>
                  <h2>{analysis.device_type}</h2>
                  <p>{analysis.message}</p>

                  <div className="confidence-panel">
                    <div>
                      <span>Model confidence</span>
                      <strong>
                        {(analysis.confidence * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="confidence-track">
                      <span
                        style={{
                          width: `${Math.min(
                            analysis.confidence * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="recognition-actions">
                    <button className="primary workflow-primary" onClick={startAssessment}>
                      Continue to condition assessment →
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setAnalysisStage('upload')}
                    >
                      ← Use another image
                    </button>
                  </div>

                  {analysis.findings.length > 0 && (
                    <div className="finding-list">
                      {analysis.findings.map((finding) => (
                        <span key={finding}>✓ {finding}</span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {analysis && analysis.status === 'invalid_image' && (
              <section className="notice error workflow-error">
                <b>Image needs attention</b>
                <p>{analysis.message}</p>
                <button
                  className="secondary-button"
                  onClick={() => choose(null)}
                >
                  Choose another image
                </button>
              </section>
            )}

            {analysis && analysis.status !== 'supported' &&
              analysis.status !== 'invalid_image' &&
              analysisStage === 'recognized' && (
                <section className="manual-fallback-card">
                  <span className="step-kicker">MANUAL FALLBACK</span>
                  <h2>We couldn't confidently identify this device.</h2>
                  <p>
                    That's okay. Select the device category manually and
                    continue with a limited functional assessment.
                  </p>

                  <label>
                    Device category
                    <select
                      value={device}
                      onChange={(e) => {
                        setDevice(e.target.value);
                        setQuestionIndex(0);
                        setAnswers({});
                      }}
                    >
                      {deviceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button className="primary workflow-primary" onClick={startAssessment}>
                    Continue manually →
                  </button>
                </section>
              )}

            {analysisStage === 'assessment' && (
              <section className="assessment-workspace">
                <div className="assessment-progress-head">
                  <div>
                    <span className="step-kicker">STEP 03 · CONDITION ASSESSMENT</span>
                    <h2>Tell us how the device performs.</h2>
                    <p>
                      Questions are tailored to your <strong>{device}</strong>
                      and adapt further when the device is 8+ years old.
                      Every question is required before continuing.
                    </p>
                  </div>
                  <strong>
                    {safeQuestionIndex + 1}/{currentQuestions.length}
                  </strong>
                </div>

                <div className="question-progress">
                  <span
                    style={{
                      width: `${
                        ((safeQuestionIndex + 1) / currentQuestions.length) * 100
                      }%`,
                    }}
                  />
                </div>

                {ageYears >= 8 && safeQuestionIndex > 0 && (
                  <div className="age-context-banner">
                    <span>8+</span>
                    <p>Older-device questions are included to improve the lifecycle recommendation.</p>
                  </div>
                )}

                <div className="question-card">
                  <div className="question-card-number">
                    {String(safeQuestionIndex + 1).padStart(2, '0')}
                  </div>
                  <div className="question-card-content">
                    <div className="question-meta">
                      <span className="question-label">DEVICE CHECK</span>
                      <span className="required-badge">REQUIRED</span>
                    </div>
                    <h3>{currentQuestion.label}</h3>

                    {currentQuestion.key === 'age_years' ? (
                      <div className="option-grid">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={false}
                            className={
                              answerValue === option
                                ? 'answer-option selected'
                                : 'answer-option'
                            }
                            onClick={() => updateCurrentAnswer(option)}
                          >
                            <span>{option}</span>
                            <small>{option === '0' ? 'New' : option === '8+' ? '8+ years' : `${option} year${option === '1' ? '' : 's'}`}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="option-grid">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={false}
                            className={
                              answerValue === option
                                ? 'answer-option selected'
                                : 'answer-option'
                            }
                            onClick={() => updateCurrentAnswer(option)}
                          >
                            <span>
                              {option.replaceAll('_', ' ')}
                            </span>
                            <small>
                              {option === 'yes'
                                ? 'Working normally'
                                : option === 'no'
                                  ? 'Not working'
                                  : option === 'unknown'
                                    ? 'Not sure'
                                    : option === 'none'
                                      ? 'No visible damage'
                                      : option === 'minor'
                                        ? 'Small / cosmetic'
                                        : option === 'major'
                                          ? 'Significant damage'
                                          : 'Select one'}
                            </small>
                          </button>
                        ))}
                      </div>
                    )}

                    {!hasCurrentAnswer && (
                      <div className="question-required-hint">
                        <span>!</span> Please select an answer before continuing.
                      </div>
                    )}

                    <div className="question-actions">
                      <button
                        type="button"
                        className="text-button"
                        onClick={previousQuestion}
                        disabled={safeQuestionIndex === 0}
                      >
                        ← Back
                      </button>

                      {safeQuestionIndex < currentQuestions.length - 1 ? (
                        <button
                          type="button"
                          className="primary workflow-primary"
                          onClick={nextQuestion}
                          disabled={!hasCurrentAnswer}
                        >
                          {hasCurrentAnswer ? 'Next question →' : 'Select an answer →'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="primary workflow-primary"
                          disabled={loading || !hasCurrentAnswer}
                          onClick={assess}
                        >
                          {loading
                            ? 'Calculating EcoScore…'
                            : 'Calculate EcoScore →'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="assessment-disclaimer">
                  <span>i</span>
                  <p>
                    These questions assess reported functionality and visible
                    condition. A normal photo cannot diagnose hidden internal
                    hardware faults.
                  </p>
                </div>
              </section>
            )}

            {analysis && analysisStage === 'recognized' && (
              <section className="analysis-details">
                <span className="eyebrow">RECOGNITION DETAILS</span>
                <p>{analysis.message}</p>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

createRoot(
  document.getElementById('root')!
).render(<App />);