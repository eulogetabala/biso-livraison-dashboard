import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = {
  lat: number;
  lng: number;
  label?: string;
  kind: 'restaurant' | 'driver' | 'destination';
};

type Props = {
  points: MapPoint[];
  selectedId?: string;
  height?: number;
  /** Affiche tous les livreurs (points multiples kind=driver) */
  showAllDrivers?: boolean;
  /** Recalcule le zoom uniquement quand cette clé change */
  fitKey?: string;
};

const BRAZZAVILLE: L.LatLngExpression = [-4.2634, 15.2429];

const KIND_COLORS: Record<MapPoint['kind'], string> = {
  restaurant: '#1e3a7a',
  driver: '#FE6400',
  destination: '#16a34a',
};

function makeIcon(kind: MapPoint['kind'], pulse = false) {
  const color = KIND_COLORS[kind];
  return L.divIcon({
    className: '',
    html: `<span class="tracking-marker ${pulse ? 'tracking-marker--pulse' : ''}" style="--marker-color:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ points, fitKey }: { points: MapPoint[]; fitKey?: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(BRAZZAVILLE, 13);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngExpression));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true });
  }, [map, fitKey, points.length]);
  return null;
}

function MapResize({ height }: { height: number }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map, height]);
  return null;
}

export default function TrackingMap({
  points,
  selectedId,
  height = 480,
  showAllDrivers = false,
  fitKey,
}: Props) {
  const validPoints = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const routeLine = useMemo(() => {
    if (showAllDrivers) return [];
    const restaurant = validPoints.find((p) => p.kind === 'restaurant');
    const driver = validPoints.find((p) => p.kind === 'driver');
    const destination = validPoints.find((p) => p.kind === 'destination');
    const line: L.LatLngExpression[] = [];
    if (restaurant) line.push([restaurant.lat, restaurant.lng]);
    if (driver) line.push([driver.lat, driver.lng]);
    else if (destination && restaurant) line.push([destination.lat, destination.lng]);
    if (driver && destination) line.push([destination.lat, destination.lng]);
    return line.length >= 2 ? line : [];
  }, [validPoints, showAllDrivers]);

  const hasGps = validPoints.length > 0;

  return (
    <div className="tracking-map tracking-map--leaflet" style={{ height }}>
      <MapContainer
        center={BRAZZAVILLE}
        zoom={13}
        scrollWheelZoom
        className="tracking-leaflet-map"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResize height={height} />
        <FitBounds points={validPoints} fitKey={fitKey ?? selectedId} />

        {routeLine.length >= 2 ? (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: '#FE6400', weight: 4, dashArray: '10 8', opacity: 0.85 }}
          />
        ) : null}

        {validPoints.map((point, index) => (
          <Marker
            key={`${point.kind}-${point.lat}-${point.lng}-${index}`}
            position={[point.lat, point.lng]}
            icon={makeIcon(point.kind, point.kind === 'driver' && !!selectedId)}
          >
            {point.label ? (
              <Popup>
                <strong>{point.label}</strong>
              </Popup>
            ) : null}
          </Marker>
        ))}
      </MapContainer>

      {!hasGps ? (
        <div className="tracking-map-overlay">
          Aucune coordonnée GPS pour cette livraison — la carte affiche Brazzaville par défaut.
        </div>
      ) : null}

      <div className="tracking-map-legend">
        <span><i className="dot dot--restaurant" /> Restaurant</span>
        <span><i className="dot dot--driver" /> Livreur</span>
        <span><i className="dot dot--destination" /> Client</span>
      </div>
    </div>
  );
}

export function trackingToMapPoints(row: {
  restaurantName: string;
  restaurantLatitude?: number | null;
  restaurantLongitude?: number | null;
  driverFirstName: string;
  driverLastName: string;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
}): MapPoint[] {
  const points: MapPoint[] = [];
  if (row.restaurantLatitude != null && row.restaurantLongitude != null) {
    points.push({
      lat: row.restaurantLatitude,
      lng: row.restaurantLongitude,
      label: row.restaurantName,
      kind: 'restaurant',
    });
  }
  if (row.driverLatitude != null && row.driverLongitude != null) {
    points.push({
      lat: row.driverLatitude,
      lng: row.driverLongitude,
      label: `${row.driverFirstName} ${row.driverLastName.charAt(0)}.`,
      kind: 'driver',
    });
  }
  if (row.deliveryLatitude != null && row.deliveryLongitude != null) {
    points.push({
      lat: row.deliveryLatitude,
      lng: row.deliveryLongitude,
      label: 'Client',
      kind: 'destination',
    });
  }
  return points;
}
