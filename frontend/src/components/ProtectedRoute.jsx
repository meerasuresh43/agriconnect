import React from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, ArrowRight, ShieldCheck, Home } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-agri-dark border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdminRoute = allowedRoles && (allowedRoles.includes('admin') || allowedRoles.includes('main_admin'));
  const isOwnerRoute = allowedRoles && allowedRoles.includes('owner') && !allowedRoles.includes('farmer') && !isAdminRoute;

  // Unauthenticated visitors:
  // - Admin routes -> /admin/login
  // - Landowner routes (e.g. /add-land) -> /login/owner (with preserved return destination)
  // - General routes -> /login
  if (!isAuthenticated) {
    if (isAdminRoute) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (isOwnerRoute) {
      return <Navigate to="/login/owner" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization verification:
  if (allowedRoles) {
    const userRole = (user?.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());
    
    // Admins have access to admin routes, but NOT landowner-specific land-creation routes automatically
    const isAuthorized = normalizedAllowed.includes(userRole) || 
      (normalizedAllowed.includes('admin') && (userRole === 'main_admin' || userRole === 'super_admin'));

    if (!isAuthorized) {
      // Landowner-only access guard for logged-in Farmers or Admins
      if (isOwnerRoute) {
        return (
          <div className="min-h-screen bg-white py-16 px-4 flex items-center justify-center">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-agri-soft shadow-xl text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black text-agri-deep">Landowner Access Required</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You are currently logged in as <span className="font-bold text-agri-deep">{userRole === 'farmer' ? 'a Farmer' : 'an Administrator'}</span> ({user?.name || user?.email}).
                  Only registered Landowners are permitted to create and manage agricultural land listings.
                </p>
              </div>

              <div className="p-3.5 bg-agri-light/60 border border-agri-soft rounded-2xl text-left text-xs text-slate-700 space-y-1">
                <div className="font-bold text-agri-dark flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-agri-dark" />
                  <span>Want to list your agricultural land?</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Switch to your registered Landowner account to proceed directly to the land-listing form.
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login/owner', { state: { from: location } });
                  }}
                  className="w-full py-3 px-4 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>Switch to Landowner Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <Link
                  to="/"
                  className="block w-full py-2.5 bg-agri-light text-agri-deep rounded-xl text-xs font-bold hover:bg-agri-soft transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        );
      }

      return <Navigate to={isAdminRoute ? '/admin/login' : '/'} replace />;
    }
  }

  return children;
};
