import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { PlusCircle, Upload, ShieldCheck, Mountain, Droplets, CheckCircle2, AlertCircle } from 'lucide-react';

export const AddLand = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    latitude: '10.7870',
    longitude: '79.1378',
    area_acres: '',
    rent_amount: '',
    rent_unit: 'per_month',
    duration_months: '12',
    available_from: new Date().toISOString().split('T')[0],
    soil_type: 'Alluvial Soil',
    water_source: 'Canal & Borewell',
    electricity: '24/7 Free Agri Electricity',
    previous_crops: '',
    description: ''
  });

  const [images, setImages] = useState([]);
  const [ownershipDoc, setOwnershipDoc] = useState(null);
  const [identityDoc, setIdentityDoc] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });

      // Append image files
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          data.append('images', images[i]);
        }
      }

      // Append Private Docs
      if (ownershipDoc) data.append('ownershipDoc', ownershipDoc);
      if (identityDoc) data.append('identityDoc', identityDoc);

      const res = await api.post('/lands', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg('Land listing created successfully!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit land listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="bg-agri-light p-6 rounded-3xl border border-agri-soft">
          <div className="flex items-center gap-2 text-xs font-bold text-agri-dark uppercase tracking-wider mb-1">
            <PlusCircle className="w-4 h-4" />
            <span>Land Owner Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-agri-deep">{t('addLand.title')}</h1>
          <p className="text-xs text-slate-600 mt-1">{t('addLand.subtitle')}</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-agri-soft shadow-agri space-y-6">
          
          {/* Section 1: Basic Land Details */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-agri-deep border-b border-agri-soft pb-2 flex items-center gap-2">
              <Mountain className="w-5 h-5 text-agri-dark" />
              <span>Basic Land Information</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.landTitle')}</label>
              <input
                type="text"
                name="title"
                required
                placeholder={t('addLand.landTitlePlaceholder')}
                value={formData.title}
                onChange={handleChange}
                className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.location')}</label>
                <input
                  type="text"
                  name="location"
                  required
                  placeholder={t('addLand.locationPlaceholder')}
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">Latitude (Map)</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  required
                  value={formData.latitude}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">Longitude (Map)</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  required
                  value={formData.longitude}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.area')}</label>
                <input
                  type="number"
                  step="0.1"
                  name="area_acres"
                  required
                  placeholder="e.g. 4.5"
                  value={formData.area_acres}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.rent')}</label>
                <input
                  type="number"
                  name="rent_amount"
                  required
                  placeholder="e.g. 18000"
                  value={formData.rent_amount}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.duration')}</label>
                <input
                  type="number"
                  name="duration_months"
                  required
                  value={formData.duration_months}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>
            </div>

          </div>

          {/* Section 2: Soil, Water & Cultivation Parameters */}
          <div className="space-y-4 pt-4 border-t border-agri-soft">
            <h3 className="text-base font-bold text-agri-deep flex items-center gap-2">
              <Droplets className="w-5 h-5 text-agri-dark" />
              <span>Soil & Irrigation Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.soilType')}</label>
                <select
                  name="soil_type"
                  value={formData.soil_type}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                >
                  <option value="Alluvial Soil">{t('soilOptions.alluvial')}</option>
                  <option value="Red Loamy Soil">{t('soilOptions.red')}</option>
                  <option value="Black Cotton Soil">{t('soilOptions.black')}</option>
                  <option value="Clay Loam">{t('soilOptions.clay')}</option>
                  <option value="Laterite Soil">{t('soilOptions.laterite')}</option>
                  <option value="Sandy Soil">{t('soilOptions.sandy')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.waterSource')}</label>
                <input
                  type="text"
                  name="water_source"
                  required
                  placeholder="e.g. Canal & Borewell"
                  value={formData.water_source}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.electricity')}</label>
                <input
                  type="text"
                  name="electricity"
                  value={formData.electricity}
                  onChange={handleChange}
                  className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.previousCrops')}</label>
              <input
                type="text"
                name="previous_crops"
                placeholder="e.g. Paddy (Samba), Black Gram, Banana"
                value={formData.previous_crops}
                onChange={handleChange}
                className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.description')}</label>
              <textarea
                rows={3}
                name="description"
                placeholder="Provide land features, road accessibility, motor HP rating..."
                value={formData.description}
                onChange={handleChange}
                className="w-full p-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>
          </div>

          {/* Section 3: File Uploads & Documents */}
          <div className="space-y-4 pt-4 border-t border-agri-soft">
            <h3 className="text-base font-bold text-agri-deep flex items-center gap-2">
              <Upload className="w-5 h-5 text-agri-dark" />
              <span>Media & Land Verification Documents</span>
            </h3>

            {/* Land Images */}
            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">{t('addLand.images')}</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImages(Array.from(e.target.files))}
                className="w-full p-2 bg-agri-light/40 border border-agri-soft rounded-xl text-xs"
              />
            </div>

            {/* Private Verification Docs */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Private Ownership & Identity Documents</span>
              </div>

              <p className="text-[11px] text-emerald-800 leading-tight">
                {t('addLand.privacyNotice')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">{t('addLand.ownershipDoc')}</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setOwnershipDoc(e.target.files[0])}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">{t('addLand.identityDoc')}</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setIdentityDoc(e.target.files[0])}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-agri-dark hover:bg-agri-deep transition shadow-lg flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{submitting ? t('addLand.submitting') : t('addLand.submitBtn')}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
