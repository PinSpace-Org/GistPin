'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { icon } from 'leaflet';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import AddGistModal from './AddGistModal';
import { motion } from 'framer-motion';

export interface Gist {
  id: number;
  content: string;
  lat: number;
  lng: number;
}

const greenIcon = icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center]);
  return null;
}

export default function Map() {
  const [position, setPosition] = useState<[number, number]>([6.5244, 3.3792]);
  const [gists, setGists] = useState<Gist[]>([
    {
      id: 1,
      content: 'Amazing suya spot just opened here!',
      lat: 6.52,
      lng: 3.37,
    },
    {
      id: 2,
      content: 'Heads up, major traffic on this bridge.',
      lat: 6.53,
      lng: 3.38,
    },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
      },
      (err) => {
        console.warn(`Geolocation Error (${err.code}): ${err.message}`);
      }
    );
  }, []);

  const handleAddGist = (content: string) => {
    const newGist: Gist = {
      id: Date.now(),
      content,
      lat: position[0],
      lng: position[1],
    };
    setGists((prevGists) => [...prevGists, newGist]);
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer center={position} zoom={14} className="h-full w-full">
        <ChangeView center={position} zoom={14} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position} icon={greenIcon}>
          <Popup>Your Current Location</Popup>
        </Marker>
        {gists.map((gist) => (
          <Marker key={gist.id} position={[gist.lat, gist.lng]} icon={blueIcon}>
            <Popup>{gist.content}</Popup>
          </Marker>
        ))}
      </MapContainer>

      <motion.button
        onClick={() => setIsModalOpen(true)}
        // 3. Animation props for pulsing effect
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-8 -translate-y-1/2 z-[1000] flex items-center justify-center w-16 h-16  bg-gradient-to-r from-purple-600 via-blue-600 to-navy-400 
                            bg-[size:200%_auto] 
                            hover:bg-[position:100%_center] 
                    transition-all duration-500 ease-in-out disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-full shadow-lg hover:bg-blue-700"
        aria-label="Add new gist"
      >
        <Plus size={32} />
      </motion.button>

      <AddGistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddGist={handleAddGist}
      />
    </div>
  );
}
