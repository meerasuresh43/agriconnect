import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  User, PlusCircle, Mountain, Bell, ShieldCheck, Trash2, Send, Bot
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const isOwner = user?.role === 'owner';
  const isFarmer = user?.role === 'farmer';

  // Owner Data States
  const [myLands, setMyLands] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  // Farmer Data States
  const [myRequests, setMyRequests] = useState([]);

  // Notifications State
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'lands', 'notifications'

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isOwner) {
        const [landsRes, reqRes, notifRes] = await Promise.all([
          api.get('/lands/my-listings'),
          api.get('/rentals/incoming'),
          api.get('/auth/notifications')
        ]);
        if (landsRes.data.success) setMyLands(landsRes.data.lands);
        if (reqRes.data.success) setIncomingRequests(reqRes.data.requests);
        if (notifRes.data.success) setNotifications(notifRes.data.notifications);
      } else if (isFarmer) {
        const [reqRes, notifRes] = await Promise.all([
          api.get('/rentals/my-requests'),
          api.get('/auth/notifications')
        ]);
        if (reqRes.data.success) setMyRequests(reqRes.data.requests);
        if (notifRes.data.success) setNotifications(notifRes.data.notifications);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Owner Respond to Request (Accept / Reject)
  const handleRespondRequest = async (requestId, status) => {
    try {
      const res = await api.put(`/rentals/${requestId}/respond`, { status });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Respond request error:', err);
    }
  };

  // Owner Delete Land Listing
  const handleDeleteLand = async (landId) => {
    if (!window.confirm('Are you sure you want to unlist this land?')) return;
    try {
      const res = await api.delete(`/lands/${landId}`);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Delete land error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-agri-dark">Loading your AgriConnect dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* User Profile Overview Header */}
        <div className="bg-gradient-to-r from-agri-light via-agri-soft/40 to-white p-6 sm:p-8 rounded-3xl border border-agri-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-agri-soft flex items-center justify-center text-agri-dark shadow-sm">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-agri-deep">{user?.name}</h1>
                {user?.is_verified === 1 && (
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    Verified Identity
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                <span>User ID: <strong className="font-mono text-agri-dark">{user?.farmer_user_id}</strong></span>
                <span>•</span>
                <span>Role: <strong className="capitalize text-agri-deep">{user?.role === 'owner' ? 'Land Owner' : 'Farmer / Consumer'}</strong></span>
                <span>•</span>
                <span>{user?.location || 'Tamil Nadu'}</span>
              </div>
            </div>
          </div>

          {isOwner && (
            <Link
              to="/add-land"
              className="px-5 py-3 rounded-2xl font-extrabold text-xs text-white bg-agri-dark hover:bg-agri-deep transition shadow-md flex items-center gap-2 self-start md:self-center"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('dashboard.addLandBtn')}</span>
            </Link>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {isOwner ? (
            <>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">{t('dashboard.myLands')}</div>
                <div className="text-2xl font-black text-agri-dark mt-1">{myLands.length}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">{t('dashboard.incomingRequests')}</div>
                <div className="text-2xl font-black text-agri-dark mt-1">{incomingRequests.length}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">Accepted Rentals</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {incomingRequests.filter(r => r.status === 'accepted').length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">Notifications</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{notifications.length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">Rental Requests Sent</div>
                <div className="text-2xl font-black text-agri-dark mt-1">{myRequests.length}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">Approved Rentals</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {myRequests.filter(r => r.status === 'accepted').length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri">
                <div className="text-xs font-semibold text-slate-500">Notifications</div>
                <div className="text-2xl font-black text-amber-600 mt-1">{notifications.length}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500">AI Assistant</div>
                  <div className="text-xs font-bold text-agri-dark mt-1">Ready 24/7</div>
                </div>
                <Link to="/ai-assistant" className="p-2.5 bg-agri-light text-agri-dark rounded-xl">
                  <Bot className="w-5 h-5" />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Dashboard Tabs & Content */}
        <div className="bg-white rounded-3xl border border-agri-soft shadow-agri p-6 space-y-6">
          
          <div className="flex border-b border-agri-soft gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'requests' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
              }`}
            >
              {isOwner ? `${t('dashboard.incomingRequests')} (${incomingRequests.length})` : `My Rental Requests (${myRequests.length})`}
            </button>

            {isOwner && (
              <button
                onClick={() => setActiveTab('lands')}
                className={`pb-3 border-b-2 transition ${
                  activeTab === 'lands' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
                }`}
              >
                {t('dashboard.myLands')} ({myLands.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'notifications' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications ({notifications.length})</span>
            </button>
          </div>

          {/* TAB 1: INCOMING REQUESTS (OWNER) / SENT REQUESTS (FARMER) */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {isOwner ? (
                incomingRequests.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 font-medium">No incoming rental requests yet.</div>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <div key={req.id} className="p-5 rounded-2xl border border-agri-soft bg-agri-light/30 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-agri-soft pb-2">
                          <div>
                            <span className="text-[10px] font-bold font-mono bg-agri-light text-agri-dark px-2 py-0.5 rounded">
                              {req.farmer_user_id}
                            </span>
                            <h4 className="font-bold text-sm text-agri-deep mt-1">{req.farmer_name}</h4>
                            <div className="text-xs text-slate-500">Requested Land: <strong>{req.land_title}</strong> ({req.land_location})</div>
                          </div>

                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {translateText(req.status)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 space-y-1">
                          <div><strong>Proposed Rent:</strong> ₹{req.proposed_amount?.toLocaleString()} / month (Original: ₹{req.original_rent?.toLocaleString()})</div>
                          <div><strong>Duration Requested:</strong> {req.duration_requested}</div>
                          <div className="italic bg-white p-2.5 rounded-xl border border-agri-soft mt-1 font-normal">
                            "{req.message || 'No additional message.'}"
                          </div>
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleRespondRequest(req.id, 'accepted')}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition"
                            >
                              {t('dashboard.accept')}
                            </button>
                            <button
                              onClick={() => handleRespondRequest(req.id, 'rejected')}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition"
                            >
                              {t('dashboard.reject')}
                            </button>
                          </div>
                        )}

                        {req.status === 'accepted' && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                            <span>Farmer Phone: <strong>{req.farmer_phone || '+91 Contact Admin'}</strong></span>
                            <span className="text-[10px]">Rental Agreement Confirmed</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                myRequests.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-agri-light/40 rounded-2xl border border-dashed border-agri-soft">
                    <Send className="w-10 h-10 text-agri-medium mx-auto" />
                    <h4 className="text-sm font-bold text-agri-deep">No Rental Requests Sent Yet</h4>
                    <Link to="/" className="inline-block px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold">
                      Explore Lands for Rent
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myRequests.map((req) => (
                      <div key={req.id} className="p-5 rounded-2xl border border-agri-soft bg-agri-light/30 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-agri-soft pb-2">
                          <div>
                            <h4 className="font-bold text-sm text-agri-deep">{req.land_title}</h4>
                            <div className="text-xs text-slate-500">{req.land_location} • Owner: <strong>{req.owner_name}</strong></div>
                          </div>

                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : req.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 space-y-1">
                          <div><strong>Proposed Rent:</strong> ₹{req.proposed_amount?.toLocaleString()} / month</div>
                          <div><strong>Requested Duration:</strong> {req.duration_requested}</div>
                        </div>

                        {req.status === 'accepted' && (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center justify-between">
                            <span>Owner Phone: <strong>{req.owner_phone}</strong></span>
                            <span className="text-[10px]">Contact Owner Directly</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 2: OWNER MY LANDS LIST */}
          {isOwner && activeTab === 'lands' && (
            <div className="space-y-4">
              {myLands.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-agri-light/40 rounded-2xl border border-dashed border-agri-soft">
                  <Mountain className="w-10 h-10 text-agri-medium mx-auto" />
                  <h4 className="text-sm font-bold text-agri-deep">No Farmlands Listed Yet</h4>
                  <Link to="/add-land" className="inline-block px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold">
                    + Add Land for Rent
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myLands.map((land) => (
                    <div key={land.id} className="p-4 rounded-2xl border border-agri-soft bg-white space-y-3 shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-agri-deep line-clamp-1">{land.title}</h4>
                          <div className="text-xs text-slate-500">{land.location} • {land.area_acres} Acres</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          land.status === 'available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {land.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1">
                        <div><strong>Rent:</strong> ₹{land.rent_amount?.toLocaleString()} / month</div>
                        <div><strong>Soil:</strong> {land.soil_type} • <strong>Water:</strong> {land.water_source}</div>
                        <div><strong>Incoming Requests:</strong> <span className="font-bold text-agri-dark">{land.request_count}</span></div>
                      </div>

                      <div className="pt-2 border-t border-agri-soft flex items-center justify-between">
                        <Link to={`/lands/${land.id}`} className="text-xs text-agri-dark font-bold hover:underline">
                          View Details ↗
                        </Link>
                        <button
                          onClick={() => handleDeleteLand(land.id)}
                          className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Unlist Land
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 font-medium">No new notifications.</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-4 rounded-2xl border border-agri-soft bg-agri-light/40 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-agri-deep text-sm">{n.title}</span>
                      <span className="text-[10px] text-slate-500">{n.created_at}</span>
                    </div>
                    <p className="text-slate-700 font-medium">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
