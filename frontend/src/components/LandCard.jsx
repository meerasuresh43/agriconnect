import { Link } from 'react-router-dom';
import { MapPin, Mountain, Droplets, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const LandCard = ({ land }) => {
  const { t, translateText } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-agri-soft overflow-hidden shadow-agri shadow-agri-hover transition-all duration-300 flex flex-col justify-between group">
      
      {/* Image Header */}
      <div className="relative h-48 w-full bg-agri-light overflow-hidden flex items-center justify-center">
        {(land.thumbnail || land.images?.[0]) ? (
          <img
            src={land.thumbnail || land.images[0]}
            alt={land.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-4 text-center select-none">
            <Mountain className="w-10 h-10 text-agri-medium/70" />
            <span className="text-[11px] font-semibold text-slate-500">No Land Photo Uploaded</span>
          </div>
        )}
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-agri-dark text-white font-extrabold text-sm px-3 py-1 rounded-full shadow-md">
          ₹{land.rent_amount?.toLocaleString()} <span className="text-[11px] font-normal opacity-90">{land.rent_unit === 'per_year' ? '/ yr' : t('home.rentPerMonth')}</span>
        </div>

        {/* Verified Owner Badge */}
        {land.owner_verified === 1 && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-agri-dark text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-agri-soft">
            <ShieldCheck className="w-3.5 h-3.5 text-agri-dark fill-agri-light" />
            <span>{t('home.verifiedBadge')}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-agri-deep line-clamp-1 group-hover:text-agri-dark transition">
            {translateText(land.title)}
          </h3>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mt-1">
            <MapPin className="w-3.5 h-3.5 text-agri-dark flex-shrink-0" />
            <span className="truncate">{translateText(land.location)}</span>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-2 mt-4 bg-agri-light/60 p-2.5 rounded-xl border border-agri-soft/50 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-white text-agri-dark border border-agri-soft">
                <Mountain className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-medium">{t('home.areaLabel')}</div>
                <div className="font-bold text-agri-deep">{land.area_acres} {t('home.acresUnit')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-white text-agri-dark border border-agri-soft">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[10px] text-slate-500 font-medium">{t('home.soilTypeLabel')}</div>
                <div className="font-bold text-agri-deep truncate" title={translateText(land.soil_type)}>
                  {translateText(land.soil_type)}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[11px] font-semibold bg-agri-light text-agri-dark px-2.5 py-0.5 rounded-md border border-agri-soft">
              💧 {translateText(land.water_source)}
            </span>
            {land.previous_crops && (
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-100">
                🌾 {translateText(land.previous_crops.split(',')[0])}
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-agri-soft/80 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            {t('home.availableFrom')}: <span className="font-bold text-agri-deep">{land.available_from}</span>
          </div>

          <Link
            to={`/lands/${land.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-agri-dark hover:bg-agri-deep transition shadow-sm"
          >
            <span>{t('home.viewDetails')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>

    </div>
  );
};
