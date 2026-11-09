import TrackingMap from '../components/TrackingMap';

export default function MapPreview() {
  return (
    <div style={{ padding: 24 }}>
      <TrackingMap
        points={[
          { lat: -4.2634, lng: 15.2429, label: 'Resto', kind: 'restaurant' },
          { lat: -4.2712, lng: 15.2891, label: 'Livreur', kind: 'driver' },
          { lat: -4.2812, lng: 15.3003, label: 'Client', kind: 'destination' },
        ]}
        height={500}
        fitKey="preview"
      />
    </div>
  );
}
