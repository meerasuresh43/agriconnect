import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LogIn, User, Sprout, AlertCircle, KeyRound, Home as HomeIcon, Shield, Lock, ArrowRight } from 'lucide-react';

export const Login = ({ defaultRole }) => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial role from prop, URL pathname, or query param
  const getInitialRole = () => {
    if (defaultRole === 'admin' || location.pathname.includes('/admin') || searchParams.get('role') === 'admin') {
      return 'admin';
    }
    if (defaultRole === 'owner' || location.pathname.includes('/owner') || searchParams.get('role') === 'owner') {
      return 'owner';
    }
    if (defaultRole === 'farmer' || searchParams.get('role') === 'farmer') {
      return 'farmer';
    }
    return 'owner';
  };

  const [role, setRole] = useState(getInitialRole); // 'owner' | 'farmer' | 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync state if navigation or query params change
  useEffect(() => {
    const r = getInitialRole();
    setRole(r);
  }, [defaultRole, location.pathname, searchParams]);

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        role // Send the selected login role for strict server-side validation
      });

      if (res.data.success) {
        const { user: loggedInUser, token } = res.data;
        login(loggedInUser, token);

        const normUserRole = (loggedInUser?.role || '').toLowerCase();

        // 1. Admin or Main Admin -> Direct to Admin Console
        if (normUserRole === 'admin' || normUserRole === 'main_admin') {
          navigate('/admin', { replace: true });
          return;
        }

        // 2. Preserved return destination (e.g. /add-land for Landowner)
        const targetPath = location.state?.from?.pathname || 
          (typeof location.state?.from === 'string' ? location.state.from : null);

        if (targetPath && (normUserRole === 'owner' || !targetPath.includes('/add-land'))) {
          navigate(targetPath, { replace: true });
          return;
        }

        // 3. Default to user Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(res.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header with Role-Specific Visuals */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-agri-light border border-agri-soft mx-auto flex items-center justify-center shadow-xs">
            {role === 'owner' && <HomeIcon className="w-7 h-7 text-agri-dark" />}
            {role === 'farmer' && <Sprout className="w-7 h-7 text-agri-dark" />}
            {role === 'admin' && <Shield className="w-7 h-7 text-amber-600" />}
          </div>

          <h2 className="text-2xl font-black text-agri-deep tracking-tight">
            {role === 'owner' && 'Landowner Login'}
            {role === 'farmer' && 'Farmer Login'}
            {role === 'admin' && 'Admin Login'}
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            {role === 'owner' && 'Sign in with your verified Landowner account to list, manage, and rent your agricultural farmlands.'}
            {role === 'farmer' && 'Sign in with your Farmer account to browse verified farmlands and submit rental requests.'}
            {role === 'admin' && 'Secure administrative console for Main Admins and authorized Sub-Admins.'}
          </p>
        </div>

        {/* Three Clearly Visible Login Options */}
        <div className="bg-agri-light p-1.5 rounded-2xl border border-agri-soft">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-1.5">
            Select Login Option
          </div>
          <div className="grid grid-cols-3 gap-1">
            {/* 1. Landowner Login Option */}
            <button
              type="button"
              onClick={() => handleRoleChange('owner')}
              className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                role === 'owner'
                  ? 'bg-white text-agri-dark shadow-sm border border-agri-soft/80'
                  : 'text-agri-deep hover:text-agri-dark hover:bg-white/60'
              }`}
            >
              <HomeIcon className="w-3.5 h-3.5 text-agri-dark flex-shrink-0" />
              <span className="truncate">Landowner Login</span>
            </button>

            {/* 2. Farmer Login Option */}
            <button
              type="button"
              onClick={() => handleRoleChange('farmer')}
              className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                role === 'farmer'
                  ? 'bg-white text-agri-dark shadow-sm border border-agri-soft/80'
                  : 'text-agri-deep hover:text-agri-dark hover:bg-white/60'
              }`}
            >
              <Sprout className="w-3.5 h-3.5 text-agri-dark flex-shrink-0" />
              <span className="truncate">Farmer Login</span>
            </button>

            {/* 3. Admin Login Option */}
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2.5 px-2 text-xs font-bold rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                  : 'text-agri-deep hover:text-amber-800 hover:bg-white/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span className="truncate">Admin Login</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2.5 border border-red-200 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white p-6 sm:p-8 rounded-3xl border border-agri-soft shadow-agri space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-agri-deep mb-1">
              {role === 'owner' && 'Email Address or Landowner ID (e.g. AGRI-OWN-XXXX)'}
              {role === 'farmer' && 'Email Address or Farmer ID (e.g. AGRI-FAR-XXXX)'}
              {role === 'admin' && 'Admin Email or Admin ID (e.g. AGRI-ADM-XXXX)'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                placeholder={
                  role === 'owner'
                    ? 'landowner@domain.com or AGRI-OWN-XXXX'
                    : role === 'farmer'
                    ? 'farmer@domain.com or AGRI-FAR-XXXX'
                    : 'superadmin@agriconnect.ai or AGRI-ADM-XXXX'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-agri-deep mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition shadow-sm flex items-center justify-center gap-2 ${
              loading
                ? 'bg-slate-400 cursor-not-allowed'
                : role === 'admin'
                ? 'bg-agri-deep hover:bg-agri-dark'
                : 'bg-agri-dark hover:bg-agri-deep'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                {role === 'admin' ? <Lock className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>
                  {role === 'owner' && 'Sign In as Landowner'}
                  {role === 'farmer' && 'Sign In as Farmer'}
                  {role === 'admin' && 'Access Admin Console'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Footer Guidance */}
        {role === 'admin' ? (
          <div className="text-center text-[11px] text-slate-500 font-medium bg-agri-light/40 p-3 rounded-xl border border-agri-soft">
            🔒 Public registration for administrator roles is prohibited. Admin accounts are provisioned via secure initialization.
          </div>
        ) : (
          <div className="text-center text-xs text-slate-600 font-medium">
            Don't have an account yet?{' '}
            <Link to={`/register?role=${role}`} className="text-agri-dark font-bold hover:underline">
              Register Here
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
