import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserPlus, ShieldCheck, Sprout, AlertCircle } from 'lucide-react';

export const Register = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [role, setRole] = useState('farmer'); // 'farmer' or 'owner'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    aadhaar: '',
    preferredCrop: 'Paddy / Sugarcane',
    preferredLandSize: '3 - 5 Acres',
    preferredDuration: '12 Months',
    budgetRange: '₹15,000 - ₹25,000 / month'
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/register', {
        ...formData,
        role
      });

      if (res.data.success) {
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-agri-light border border-agri-soft mx-auto flex items-center justify-center text-agri-dark">
            <Sprout className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-agri-deep">Create AgriConnect AI Account</h2>
          <p className="text-xs text-slate-600">Join the digital farming platform connecting land owners and farmers.</p>
        </div>

        {/* Role Tab Switcher */}
        <div className="flex bg-agri-light p-1 rounded-2xl border border-agri-soft">
          <button
            type="button"
            onClick={() => setRole('farmer')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'farmer' ? 'bg-white text-agri-dark shadow-sm' : 'text-agri-deep hover:text-agri-dark'
            }`}
          >
            🌾 {t('nav.farmer')}
          </button>
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'owner' ? 'bg-white text-agri-dark shadow-sm' : 'text-agri-deep hover:text-agri-dark'
            }`}
          >
            🏡 {t('nav.landOwner')}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="bg-white p-6 sm:p-8 rounded-3xl border border-agri-soft shadow-agri space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Ramasamy K."
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                placeholder="name@domain.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Location / District</label>
              <input
                type="text"
                name="location"
                placeholder="e.g. Thanjavur, Tamil Nadu"
                value={formData.location}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-agri-deep mb-1">Aadhaar (Last 4 Digits - Private)</label>
              <input
                type="text"
                name="aadhaar"
                maxLength={4}
                placeholder="e.g. 8821"
                value={formData.aadhaar}
                onChange={handleChange}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>
          </div>

          {/* Additional Preferences if Role == Farmer */}
          {role === 'farmer' && (
            <div className="p-4 bg-agri-light/60 rounded-2xl border border-agri-soft space-y-3 pt-3">
              <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider">Farmer Land Preferences</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-agri-deep mb-1">Preferred Crops</label>
                  <input
                    type="text"
                    name="preferredCrop"
                    value={formData.preferredCrop}
                    onChange={handleChange}
                    className="w-full p-2 bg-white border border-agri-soft rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-agri-deep mb-1">Preferred Land Size</label>
                  <input
                    type="text"
                    name="preferredLandSize"
                    value={formData.preferredLandSize}
                    onChange={handleChange}
                    className="w-full p-2 bg-white border border-agri-soft rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>A auto-generated secure User ID (e.g. AGRI-OWN-4102) will be created. Aadhaar is kept 100% private.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-agri-dark hover:bg-agri-deep transition shadow-md flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
          </button>

        </form>

        <div className="text-center text-xs text-slate-600 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-agri-dark font-bold hover:underline">
            Login Here
          </Link>
        </div>

      </div>
    </div>
  );
};
