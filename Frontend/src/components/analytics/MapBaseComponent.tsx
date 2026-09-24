import React from 'react';

export interface MapBaseProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  children?: React.ReactNode;
}

export const MapBaseComponent: React.FC<MapBaseProps> = ({
  latitude = 0,
  longitude = 0,
  zoom = 12,
  children,
}) => {
  return (
    <div className="relative w-full h-80 bg-gray-100 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700 z-10">
        Lat: {latitude.toFixed(4)} | Lng: {longitude.toFixed(4)} | Zoom: {zoom}
      </div>
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
        [Interactive Spatial Map Canvas Viewport]
      </div>
      {children}
    </div>
  );
};

export default MapBaseComponent;
