import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { MapPin, Droplets, Mountain, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Custom Green SVG Map Marker for Agricultural Lands
const createGreenIcon = (isHovered = false) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="${isHovered ? '#1B4332' : '#2E7D32'}" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="#E8F5E9" />
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-green-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

export const MapView = ({ lands, height = "500px" }) => {
  const { t, translateText } = useLanguage();

  // Default center: Tamil Nadu center (Coimbatore / Trichy / Madurai)
  const defaultCenter = [10.8000, 78.1000];

  return (
    <div style={{ height }} className="relative w-full rounded-2xl overflow-hidden border border-agri-soft shadow-agri">
      <MapContainer
        center={lands.length > 0 ? [lands[0].latitude, lands[0].longitude] : defaultCenter}
        zoom={lands.length > 0 ? 8 : 7}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lands.map((land) => (
          <Marker
            key={land.id}
            position={[land.latitude, land.longitude]}
            icon={createGreenIcon()}
          >
            <Popup>
              <div className="p-1 max-w-xs font-sans">
                <div className="relative h-28 w-full rounded-lg overflow-hidden mb-2 bg-agri-light flex items-center justify-center">
                  {(land.thumbnail || land.images?.[0]) ? (
                    <img
                      src={land.thumbnail || land.images[0]}
                      alt={land.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Mountain className="w-6 h-6 text-agri-medium/70" />
                      <span className="text-[9px] text-slate-500 font-medium">No Photo</span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-agri-dark text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    ₹{land.rent_amount?.toLocaleString()}/mo
                  </span>
                </div>

                <h4 className="font-bold text-xs text-agri-deep line-clamp-1 mb-1">{translateText(land.title)}</h4>
                
                <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-1">
                  <MapPin className="w-3 h-3 text-agri-dark flex-shrink-0" />
                  <span className="truncate">{translateText(land.location)}</span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 mb-3 bg-agri-light p-1.5 rounded">
                  <div className="flex items-center gap-1">
                    <Mountain className="w-3 h-3 text-agri-dark" />
                    <span>{land.area_acres} {t('home.acresUnit')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-agri-dark" />
                    <span className="truncate">{translateText(land.soil_type)}</span>
                  </div>
                </div>

                <Link
                  to={`/lands/${land.id}`}
                  className="flex items-center justify-center gap-1 w-full text-[11px] font-bold py-1.5 px-3 rounded-lg text-white bg-agri-dark hover:bg-agri-deep transition"
                >
                  <span>{t('home.viewDetails')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
