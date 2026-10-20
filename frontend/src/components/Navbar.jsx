import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, MapPin, Bot, LayoutDashboard, Shield, LogOut, Globe, PlusCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-agri-soft sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-agri-dark font-bold text-xl hover:opacity-90 transition">
            <div className="w-10 h-10 rounded-full bg-agri-light flex items-center justify-center border border-agri-soft">
              <Sprout className="w-6 h-6 text-agri-dark" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-extrabold text-agri-deep tracking-wide">{t('nav.brand')}</span>
              <span className="text-[10px] text-agri-dark font-medium uppercase tracking-wider">Agri-Tech Platform</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                isActive('/') ? 'bg-agri-light text-agri-dark font-bold' : 'text-agri-deep hover:bg-agri-light/60 hover:text-agri-dark'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {t('nav.home')}
            </Link>

            <Link
              to="/ai-assistant"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                isActive('/ai-assistant') ? 'bg-agri-light text-agri-dark font-bold' : 'text-agri-deep hover:bg-agri-light/60 hover:text-agri-dark'
              }`}
            >
              <Bot className="w-4 h-4 text-agri-dark" />
              {t('nav.aiAssistant')}
            </Link>

            {user?.role === 'owner' && (
              <Link
                to="/add-land"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                  isActive('/add-land') ? 'bg-agri-light text-agri-dark font-bold' : 'text-agri-deep hover:bg-agri-light/60 hover:text-agri-dark'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-agri-dark" />
                Add Land
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                  isActive('/dashboard') ? 'bg-agri-light text-agri-dark font-bold' : 'text-agri-deep hover:bg-agri-light/60 hover:text-agri-dark'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {t('nav.dashboard')}
              </Link>
            )}

            {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'main_admin') && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                  isActive('/admin') ? 'bg-agri-light text-agri-dark font-bold' : 'text-agri-deep hover:bg-agri-light/60 hover:text-agri-dark'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>{(user?.role || '').toLowerCase() === 'main_admin' ? 'Super Admin' : t('nav.admin')}</span>
              </Link>
            )}
          </div>

          {/* Controls: Language Switcher & User Profile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={() => toggleLanguage()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-agri-light text-agri-dark border border-agri-soft text-xs font-bold hover:bg-agri-soft/80 transition"
              title="Switch Tamil / English"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-agri-soft">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-agri-deep">{user.name}</span>
                  <span className="text-[10px] text-agri-dark font-mono bg-agri-light px-1.5 py-0.5 rounded">
                    {user.farmer_user_id}
                  </span>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-agri-dark bg-agri-light hover:bg-agri-soft transition"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-agri-dark hover:bg-agri-deep transition shadow-sm"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => toggleLanguage()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-agri-light text-agri-dark text-xs font-bold border border-agri-soft"
            >
              <Globe className="w-3 h-3" />
              {lang === 'en' ? 'தமிழ்' : 'En'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-agri-dark hover:bg-agri-light rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-agri-soft px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-agri-deep hover:bg-agri-light"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/ai-assistant"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-agri-deep hover:bg-agri-light"
          >
            {t('nav.aiAssistant')}
          </Link>
          {user?.role === 'owner' && (
            <Link
              to="/add-land"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-agri-deep hover:bg-agri-light"
            >
              Add Land for Rent
            </Link>
          )}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-agri-deep hover:bg-agri-light"
            >
              {t('nav.dashboard')}
            </Link>
          )}
          {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'main_admin') && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-amber-700 hover:bg-amber-50"
            >
              {(user?.role || '').toLowerCase() === 'main_admin' ? 'Super Admin' : t('nav.admin')}
            </Link>
          )}

          <div className="pt-2 border-t border-agri-soft flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="text-sm font-bold text-agri-deep">{user.name}</div>
                  <div className="text-xs font-mono text-agri-dark">{user.farmer_user_id}</div>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); navigate('/login'); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-bold text-agri-dark bg-agri-light"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 rounded-lg text-xs font-bold text-white bg-agri-dark"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
