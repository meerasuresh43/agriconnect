import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MapView } from '../components/MapView';
import { MapPin, Mountain, Droplets, Zap, Calendar, ShieldCheck, User, Send, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const LandDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t, translateText } = useLanguage();

  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState('');

  // Modal State for Rental Request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [durationRequested, setDurationRequested] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/lands/${id}`);
      if (res.data.success) {
        setLand(res.data.land);
        setSelectedImg(res.data.land.images?.[0] || '');
        setProposedAmount(res.data.land.rent_amount);
        setDurationRequested(`${res.data.land.duration_months} ${t('details.months')}`);
      }
    } catch (err) {
      console.error('Error loading land details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user.role !== 'farmer') {
      setErrorMessage('Only registered Farmer / Consumer accounts can send rental requests.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await api.post('/rentals/request', {
        land_id: land.id,
        duration_requested: durationRequested,
        proposed_amount: proposedAmount,
        message
      });

      if (res.data.success) {
        setRequestSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setRequestSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit rental request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-agri-dark">Loading Land Specifications...</p>
        </div>
      </div>
    );
  }

  if (!land) {
    return (
      <div className="min-h-screen bg-white py-16 px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-agri-deep">Land Listing Not Found</h2>
        <Link to="/" className="inline-block px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold">
          {t('details.backToLands')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-agri-dark hover:text-agri-deep transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('details.backToLands')}</span>
        </Link>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-agri-soft pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-agri-light text-agri-dark text-xs font-bold px-3 py-1 rounded-full border border-agri-soft">
                🌾 Agricultural Farmland
              </span>
              {land.owner_verified === 1 && (
                <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('details.verified')}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-agri-deep">{translateText(land.title)}</h1>
            
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2 font-medium">
              <MapPin className="w-4 h-4 text-agri-dark flex-shrink-0" />
              <span>{translateText(land.location)}</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-agri-light p-4 rounded-2xl border border-agri-soft text-right self-start">
            <div className="text-xs text-slate-500 font-semibold">{t('details.rentPrice')}</div>
            <div className="text-2xl sm:text-3xl font-black text-agri-dark">
              ₹{land.rent_amount?.toLocaleString()}
              <span className="text-sm font-semibold text-slate-600"> {t('home.rentPerMonth')}</span>
            </div>
            <div className="text-xs text-agri-deep font-medium mt-1">
              {t('details.duration')}: {land.duration_months} {t('details.months')}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="h-96 sm:h-[450px] w-full rounded-2xl overflow-hidden border border-agri-soft bg-agri-light shadow-md flex items-center justify-center">
            {selectedImg ? (
              <img
                src={selectedImg}
                alt={land.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center select-none">
                <Mountain className="w-16 h-16 text-agri-medium/60" />
                <span className="text-sm font-semibold text-slate-500">No Photo Uploaded for this Farmland</span>
              </div>
            )}
          </div>

          {land.images && land.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {land.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImg(img)}
                  className={`relative w-24 h-16 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                    selectedImg === img ? 'border-agri-dark shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Specifications Grid & Owner Info Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Specs Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Core Land Parameters Grid */}
            <div className="bg-white p-6 rounded-2xl border border-agri-soft shadow-agri space-y-4">
              <h3 className="text-lg font-bold text-agri-deep border-b border-agri-soft pb-3">
                Key Land Specifications
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                
                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Mountain className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('details.landArea')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{land.area_acres} {t('details.acres')}</div>
                </div>

                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Droplets className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('details.soilType')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{translateText(land.soil_type)}</div>
                </div>

                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Droplets className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('details.waterSource')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{translateText(land.water_source)}</div>
                </div>

                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('details.electricity')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{translateText(land.electricity)}</div>
                </div>

                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('home.availableFrom')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{land.available_from}</div>
                </div>

                <div className="p-3 bg-agri-light/60 rounded-xl border border-agri-soft/60">
                  <div className="flex items-center gap-2 text-agri-dark mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-500">{t('details.duration')}</span>
                  </div>
                  <div className="text-base font-extrabold text-agri-deep">{land.duration_months} {t('details.months')}</div>
                </div>

              </div>
            </div>

            {/* Previous Crops & Description */}
            <div className="bg-white p-6 rounded-2xl border border-agri-soft shadow-agri space-y-4">
              <h3 className="text-lg font-bold text-agri-deep border-b border-agri-soft pb-3">
                {t('details.description')}
              </h3>

              {land.previous_crops && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{t('details.previousCrops')}</div>
                  <div className="text-sm font-semibold text-emerald-950 mt-1">{translateText(land.previous_crops)}</div>
                </div>
              )}

              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {translateText(land.description) || 'No additional land description provided.'}
              </p>
            </div>

            {/* Map Location */}
            <div className="bg-white p-6 rounded-2xl border border-agri-soft shadow-agri space-y-4">
              <h3 className="text-lg font-bold text-agri-deep flex items-center gap-2 border-b border-agri-soft pb-3">
                <MapPin className="w-5 h-5 text-agri-dark" />
                <span>{t('details.mapLocation')}</span>
              </h3>
              <MapView lands={[land]} height="380px" />
            </div>

          </div>

          {/* Right Column: Owner Profile & Send Rental Request Action (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Owner Info Card */}
            <div className="bg-white p-6 rounded-2xl border border-agri-soft shadow-agri space-y-4">
              <h3 className="text-base font-bold text-agri-deep border-b border-agri-soft pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-agri-dark" />
                <span>{t('details.ownerInfo')}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-agri-soft/50">
                  <span className="text-slate-500 font-medium">Owner Name</span>
                  <span className="font-bold text-agri-deep">{land.owner_name}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-agri-soft/50">
                  <span className="text-slate-500 font-medium">{t('details.ownerId')}</span>
                  <span className="font-mono font-bold text-agri-dark bg-agri-light px-2 py-0.5 rounded">
                    {land.owner_user_id}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-agri-soft/50">
                  <span className="text-slate-500 font-medium">{t('details.ownerLocation')}</span>
                  <span className="font-bold text-agri-deep">{translateText(land.owner_location)}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">{t('details.verificationStatus')}</span>
                  {land.owner_verified === 1 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> {t('details.verified')}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">Pending Verification</span>
                  )}
                </div>
              </div>

              {/* Send Rental Request Action Button */}
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else {
                    setIsModalOpen(true);
                  }
                }}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-agri-dark hover:bg-agri-deep transition shadow-md flex items-center justify-center gap-2 mt-4"
              >
                <Send className="w-4 h-4" />
                <span>{t('home.sendRequest')}</span>
              </button>

              <p className="text-[11px] text-slate-500 text-center leading-tight">
                🔒 Direct messaging connecting land owner with verified farmer.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Send Rental Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-agri-soft shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-agri-soft pb-3">
              <h3 className="text-lg font-bold text-agri-deep">{t('details.requestTitle')}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {requestSuccess ? (
              <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">{t('details.successRequest')}</h4>
                <p className="text-xs text-emerald-700">The land owner will be notified of your request.</p>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4 text-xs">
                
                <div>
                  <label className="block font-bold text-agri-deep mb-1">Land Title</label>
                  <input
                    type="text"
                    disabled
                    value={land.title}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-agri-deep mb-1">Duration Requested</label>
                    <input
                      type="text"
                      required
                      value={durationRequested}
                      onChange={(e) => setDurationRequested(e.target.value)}
                      placeholder="e.g. 12 Months"
                      className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl font-medium focus:outline-none focus:border-agri-dark"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-agri-deep mb-1">{t('details.proposedRent')}</label>
                    <input
                      type="number"
                      required
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(e.target.value)}
                      className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl font-medium focus:outline-none focus:border-agri-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-agri-deep mb-1">Message to Owner</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('details.requestMessagePlaceholder')}
                    className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-agri-dark hover:bg-agri-deep flex items-center justify-center gap-1.5"
                  >
                    {submitting ? t('details.sending') : t('details.submitRequest')}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
