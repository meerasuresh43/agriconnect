import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export const AdminLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        role: 'admin'
      });

      if (res.data.success) {
        const { token, user: loggedInUser } = res.data;
        const normRole = (loggedInUser?.role || '').toLowerCase();
        if (normRole !== 'admin' && normRole !== 'main_admin') {
          setError('Access denied: Account does not possess administrative privileges.');
          setLoading(false);
          return;
        }

        login(loggedInUser, token);
        navigate('/admin');
      } else {
        setError(res.data.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      if (err.response?.data?.is_suspended) {
        setError(err.response.data.message || 'Your account has been suspended.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'Invalid administrator credentials. Please check and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-agri-deep to-emerald-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Top Security Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl mb-2">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            AgriConnect Administration
          </h1>
          <p className="text-xs text-emerald-200">
            Secure Management Console • Main Admin & Sub-Admin Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-agri-soft space-y-6">
          <div className="border-b border-agri-soft pb-4">
            <h2 className="text-lg font-black text-agri-deep">Administrator Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your official administrative email or User ID to proceed.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Email or ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="superadmin@agriconnect.ai or AGRI-ADM-XXXX"
                  className="w-full px-3.5 py-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-agri-dark hover:bg-agri-deep'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Access Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-agri-soft/60 flex items-center justify-between text-xs text-slate-500 font-medium">
            <Link to="/" className="inline-flex items-center gap-1 text-agri-dark hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to AgriConnect</span>
            </Link>
            <span className="text-[11px] text-slate-400">Strict Server-side RBAC</span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-emerald-200/80">
          🔒 Public user self-registration as an administrator is prohibited.
        </div>

      </div>
    </div>
  );
};
