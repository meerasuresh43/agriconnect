import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { LandCard } from '../components/LandCard';
import { MapView } from '../components/MapView';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Map, List, Sprout, Bot, RotateCcw, ArrowRight, ShieldCheck, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Home = () => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  // Handle "List Your Land" navigation
  const handleListYourLand = () => {
    if (!isAuthenticated) {
      // Unauthenticated visitor -> Landowner Login portal with return destination
      navigate('/login/owner', { state: { from: { pathname: '/add-land' } } });
      return;
    }

    const roleNorm = (user?.role || '').toLowerCase();
    if (roleNorm === 'owner') {
      // Authenticated Landowner -> direct to land-listing form
      navigate('/add-land');
      return;
    }

    // Authenticated Farmer or Admin -> navigate to /add-land (triggers Landowner Access Required screen)
    navigate('/add-land');
  };

  // Filter States
  const [location, setLocation] = useState('');
  const [soilType, setSoilType] = useState('');
  const [waterSource, setWaterSource] = useState('');
  const [crop, setCrop] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');

  const fetchLands = async () => {
    setLoading(true);
    try {
      const params = {};
      if (location) params.location = location;
      if (soilType) params.soil_type = soilType;
      if (waterSource) params.water_source = waterSource;
      if (crop) params.crop = crop;
      if (maxPrice) params.max_price = maxPrice;
      if (minArea) params.min_area = minArea;

      const res = await api.get('/lands', { params });
      if (res.data.success) {
        setLands(res.data.lands);
      }
    } catch (err) {
      console.error('Error loading lands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLands();
  }, [location, soilType, waterSource, crop, maxPrice, minArea]);

  const resetFilters = () => {
    setLocation('');
    setSoilType('');
    setWaterSource('');
    setCrop('');
    setMaxPrice('');
    setMinArea('');
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-agri-light/80 via-agri-light/40 to-white py-12 md:py-20 border-b border-agri-soft overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-agri-dark border border-agri-soft text-xs font-bold shadow-sm">
                <Sprout className="w-4 h-4 text-agri-dark" />
                <span>{t('hero.tagline')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-agri-deep leading-tight tracking-tight">
                {t('hero.title')}
              </h1>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl font-normal">
                {t('hero.subtitle')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#discovery"
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-agri-dark hover:bg-agri-deep transition shadow-md flex items-center gap-2"
                >
                  <span>{t('hero.exploreLands')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  onClick={handleListYourLand}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-agri-deep bg-white hover:bg-agri-light/60 border border-agri-soft transition shadow-xs flex items-center gap-2"
                >
                  <PlusCircle className="w-4.5 h-4.5 text-agri-dark" />
                  <span>List Your Land</span>
                </button>

                <Link
                  to="/ai-assistant"
                  className="px-6 py-3 rounded-xl font-bold text-sm text-agri-dark bg-agri-light hover:bg-agri-soft border border-agri-soft transition flex items-center gap-2"
                >
                  <Bot className="w-4.5 h-4.5 text-agri-dark" />
                  <span>{t('hero.tryAi')}</span>
                </Link>
              </div>

              {/* Quick Platform Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-agri-soft/80 max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-agri-dark">500+</div>
                  <div className="text-xs text-slate-600 font-medium">{t('hero.statLands')}</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-agri-dark">1,200+</div>
                  <div className="text-xs text-slate-600 font-medium">{t('hero.statFarmers')}</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-agri-dark">38</div>
                  <div className="text-xs text-slate-600 font-medium">{t('hero.statDistrict')}</div>
                </div>
              </div>
            </div>

            {/* Hero Image illustration card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-agri-light">
                <img
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1000&q=80"
                  alt="Agricultural Farmland"
                  className="w-full h-80 sm:h-96 object-cover"
                />
                
                {/* Floating Badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-agri-soft shadow-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-agri-light flex items-center justify-center text-agri-dark flex-shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-agri-deep">100% Private Document Storage</h4>
                    <p className="text-[11px] text-slate-600">Patta & Aadhaar records remain strictly confidential.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Land Discovery Section */}
      <section id="discovery" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Section Header & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-agri-deep flex items-center gap-2">
              <Sprout className="w-6 h-6 text-agri-dark" />
              <span>Available Agricultural Lands for Rent</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">Browse verified farmlands with soil type, water source, and rental details.</p>
          </div>

          <div className="flex items-center gap-2.5 self-start">
            <button
              onClick={handleListYourLand}
              className="px-3.5 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>List Your Land</span>
            </button>

            {/* List / Map View Switcher */}
            <div className="inline-flex p-1 bg-agri-light rounded-xl border border-agri-soft">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  viewMode === 'list' ? 'bg-white text-agri-dark shadow-sm' : 'text-agri-deep hover:text-agri-dark'
                }`}
              >
                <List className="w-4 h-4" />
                <span>{t('home.listView')}</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  viewMode === 'map' ? 'bg-white text-agri-dark shadow-sm' : 'text-agri-deep hover:text-agri-dark'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>{t('home.mapView')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar Component */}
        <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri mb-8 space-y-4">
          <div className="flex items-center justify-between border-b border-agri-soft pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-agri-dark">
              <Filter className="w-4 h-4" />
              <span>{t('home.filterTitle')}</span>
            </div>
            <button
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-agri-dark flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('home.resetFilters')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Search location */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('home.searchPlaceholder')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            {/* Soil Type Select */}
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="w-full px-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
            >
              <option value="">{t('home.allSoil')}</option>
              <option value="Alluvial">{t('soilOptions.alluvial')}</option>
              <option value="Red">{t('soilOptions.red')}</option>
              <option value="Black">{t('soilOptions.black')}</option>
              <option value="Clay">{t('soilOptions.clay')}</option>
              <option value="Laterite">{t('soilOptions.laterite')}</option>
              <option value="Sandy">{t('soilOptions.sandy')}</option>
            </select>

            {/* Water Source Select */}
            <select
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
              className="w-full px-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
            >
              <option value="">{t('home.allWater')}</option>
              <option value="Borewell">{t('waterOptions.borewell')}</option>
              <option value="Canal">{t('waterOptions.canal')}</option>
              <option value="Well">{t('waterOptions.well')}</option>
              <option value="Rainfed">{t('waterOptions.rainfed')}</option>
            </select>

            {/* Crop Select */}
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
            >
              <option value="">{t('home.allCrops')}</option>
              <option value="Paddy">{t('cropOptions.paddy')}</option>
              <option value="Turmeric">{t('cropOptions.turmeric')}</option>
              <option value="Cotton">{t('cropOptions.cotton')}</option>
              <option value="Groundnut">{t('cropOptions.groundnut')}</option>
              <option value="Sugarcane">{t('cropOptions.sugarcane')}</option>
              <option value="Banana">{t('cropOptions.banana')}</option>
              <option value="Maize">{t('cropOptions.maize')}</option>
            </select>

            {/* Max Rent Price */}
            <input
              type="number"
              placeholder={t('home.maxPrice')}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
            />

            {/* Min Land Area */}
            <input
              type="number"
              placeholder={t('home.minArea')}
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
              className="w-full px-3 py-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
            />

          </div>
        </div>

        {/* View Mode Content: List vs Map */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-agri-dark">Loading agricultural land listings...</p>
          </div>
        ) : lands.length === 0 ? (
          <div className="bg-agri-light/50 border border-agri-soft rounded-3xl p-10 text-center max-w-lg mx-auto my-8 space-y-4 shadow-sm">
            <Sprout className="w-12 h-12 text-agri-medium mx-auto" />
            <div className="space-y-2">
              <h3 className="text-base font-bold text-agri-deep">
                No agricultural lands are available yet. Landowners can log in to list their land.
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Landowners can log in to list their land.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {(location || soilType || waterSource || crop || maxPrice || minArea) && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-agri-light text-agri-dark border border-agri-soft rounded-xl text-xs font-bold hover:bg-agri-soft transition"
                >
                  {t('home.resetFilters')}
                </button>
              )}
              <button
                onClick={handleListYourLand}
                className="px-5 py-2.5 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition shadow-sm flex items-center gap-2"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>List Your Land</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lands.map((land) => (
              <LandCard key={land.id} land={land} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-600">
              Showing <span className="font-bold text-agri-dark">{lands.length}</span> land locations on OpenStreetMap:
            </div>
            <MapView lands={lands} height="560px" />
          </div>
        )}

      </section>

    </div>
  );
};
