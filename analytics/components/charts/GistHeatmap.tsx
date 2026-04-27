'use client';

import { useState, useCallback } from 'react';
import Map, { Layer, Source, MapMouseEvent } from 'react-map-gl/mapbox';
import type { HeatmapLayerSpecification } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import ChartWrapper from './ChartWrapper';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// Mock gist density points [lng, lat, weight]
const MOCK_POINTS: [number, number, number][] = [
  [3.38, 6.45, 1], [3.40, 6.46, 0.8], [3.37, 6.44, 0.6],   // Lagos
  [36.82, -1.29, 0.9], [36.83, -1.28, 0.7],                  // Nairobi
  [28.04, -26.20, 0.7], [28.05, -26.21, 0.5],                // Johannesburg
  [-0.19, 5.56, 0.6], [-0.20, 5.55, 0.4],                    // Accra
  [32.58, 0.32, 0.5],                                         // Kampala
];

const geojson: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: MOCK_POINTS.map(([lng, lat, weight]) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: { weight },
  })),
};

const heatmapLayer: Omit<HeatmapLayerSpecification, 'source'> = {
  id: 'gist-heatmap',
  type: 'heatmap',
  paint: {
    'heatmap-weight': ['get', 'weight'],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(33,102,172,0)',
      0.2, 'rgb(103,169,207)',
      0.4, 'rgb(209,229,240)',
      0.6, 'rgb(253,219,199)',
      0.8, 'rgb(239,138,98)',
      1, 'rgb(178,24,43)',
    ],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40],
    'heatmap-opacity': 0.85,
  },
};

interface ClickInfo { lng: number; lat: number; }

export default function GistHeatmap() {
  const [clicked, setClicked] = useState<ClickInfo | null>(null);

  const handleClick = useCallback((e: MapMouseEvent) => {
    setClicked({ lng: +e.lngLat.lng.toFixed(4), lat: +e.lngLat.lat.toFixed(4) });
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <ChartWrapper title="Gist Heatmap">
        <p className="text-sm text-gray-500">Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map.</p>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper title="Gist Density Heatmap">
      <div className="relative h-96 w-full overflow-hidden rounded-lg">
        <Map
          initialViewState={{ longitude: 20, latitude: 5, zoom: 2.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={handleClick}
        >
          <Source id="gists" type="geojson" data={geojson}>
            <Layer {...heatmapLayer} />
          </Source>
        </Map>
        {clicked && (
          <div className="absolute bottom-3 left-3 rounded-lg bg-gray-900/90 px-3 py-2 text-xs text-white shadow">
            📍 {clicked.lat}, {clicked.lng}
          </div>
        )}
      </div>
    </ChartWrapper>
  );
}
