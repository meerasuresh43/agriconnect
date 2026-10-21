import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, UserPlus, UserCheck, AlertTriangle, AlertCircle, CheckCircle2,
  Clock, Search, RefreshCw, Eye, Trash2, Building, ClipboardList,
  FileText, LogOut, Lock, X, Flag, Copy
} from 'lucide-react';

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isMainAdmin = (user?.role || '').toLowerCase() === 'main_admin';

  // Navigation section
  const [activeSection, setActiveSection] = useState('overview'); // overview, admins, owners, farmers, documents, duplicates, fraud, listings, rentals, audit

  // Core Data States
  const [stats, setStats] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState({ pendingDocs: [] });
  const [duplicateCases, setDuplicateCases] = useState([]);
  const [fraudReports, setFraudReports] = useState([]);
  const [listings, setListings] = useState([]);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [createAdminModal, setCreateAdminModal] = useState(false);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    actionType: '', // 'suspend_user', 'delete_user', 'reject_verification', 'moderate_listing', 'resolve_duplicate', 'resolve_fraud', 'deactivate_admin', 'delete_admin'
    targetId: null,
    targetName: '',
    title: '',
    promptText: '',
    requiresReason: true,
    confirmBtnText: 'Confirm',
    confirmBtnColor: 'bg-red-600',
    extraData: {}
  });
  const [modalReason, setModalReason] = useState('');

  // Form State for Sub-Admin Creation
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  // Fetch initial overview and stats
  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  // Section-specific Data Fetchers
  const fetchAdmins = async () => {
    if (!isMainAdmin) return;
    setAdminsLoading(true);
    setAdminsError('');
    try {
      const res = await api.get('/admin/admins');
      if (res.data.success) {
        setAdminsList(res.data.admins || []);
      } else {
        setAdminsError(res.data.message || 'Failed to retrieve sub-administrators.');
      }
    } catch (err) {
      console.error('Fetch admins error:', err);
      setAdminsError(err.response?.data?.message || 'Failed to load sub-admin accounts from database. Please check connection and retry.');
    } finally {
      setAdminsLoading(false);
    }
  };

  const fetchUsers = async (role = 'all') => {
    try {
      const res = await api.get('/admin/users', {
        params: {
          role,
          status: statusFilter,
          search: searchQuery
        }
      });
      if (res.data.success) setUsersList(res.data.users);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const fetchVerifications = async () => {
    try {
      const res = await api.get('/admin/verification-requests');
      if (res.data.success) setPendingVerifications(res.data);
    } catch (err) {
      console.error('Fetch verifications error:', err);
    }
  };

  const fetchDuplicates = async () => {
    try {
      const res = await api.get('/admin/duplicate-cases');
      if (res.data.success) setDuplicateCases(res.data.cases);
    } catch (err) {
      console.error('Fetch duplicates error:', err);
    }
  };

  const fetchFraudReports = async () => {
    try {
      const res = await api.get('/admin/fraud-reports');
      if (res.data.success) setFraudReports(res.data.reports);
    } catch (err) {
      console.error('Fetch fraud reports error:', err);
    }
  };

  const fetchListings = async () => {
    try {
      const res = await api.get('/admin/lands');
      if (res.data.success) setListings(res.data.listings);
    } catch (err) {
      console.error('Fetch listings error:', err);
    }
  };

  const fetchRentalRequests = async () => {
    try {
      const res = await api.get('/admin/rental-requests');
      if (res.data.success) setRentalRequests(res.data.requests);
    } catch (err) {
      console.error('Fetch rentals error:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { search: searchQuery } });
      if (res.data.success) setAuditLogs(res.data.logs);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    }
  };

  // Reload current active section
  const refreshCurrentSection = async () => {
    fetchDashboardStats();
    if (activeSection === 'overview') {
      fetchVerifications();
      fetchFraudReports();
    } else if (activeSection === 'admins') {
      fetchAdmins();
    } else if (activeSection === 'owners') {
      fetchUsers('owner');
    } else if (activeSection === 'farmers') {
      fetchUsers('farmer');
    } else if (activeSection === 'documents' || activeSection === 'verifications') {
      fetchVerifications();
    } else if (activeSection === 'duplicates') {
      fetchDuplicates();
    } else if (activeSection === 'fraud') {
      fetchFraudReports();
    } else if (activeSection === 'listings') {
      fetchListings();
    } else if (activeSection === 'rentals') {
      fetchRentalRequests();
    } else if (activeSection === 'audit') {
      fetchAuditLogs();
    }
  };

  useEffect(() => {
    setLoading(true);
    refreshCurrentSection().finally(() => setLoading(false));
  }, [activeSection, statusFilter]);

  // Handle Search Debounce or trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    refreshCurrentSection();
  };

  // Notification helper
  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // ====================================================
  // ACTION HANDLERS
  // ====================================================

  // Create Sub-Admin Form Submission
  const handleCreateSubAdmin = async (e) => {
    e.preventDefault();
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      showNotification('error', 'Passwords do not match.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/admin/admins', newAdminForm);
      if (res.data.success) {
        showNotification('success', 'Sub-Admin account successfully provisioned.');
        setCreateAdminModal(false);
        setNewAdminForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
        fetchAdmins();
        fetchDashboardStats();
      }
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to create sub-admin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Action Modal Confirm (Suspension, Deletion, Rejection, Moderation)
  const handleConfirmModalAction = async () => {
    if (actionModal.requiresReason && !modalReason.trim()) {
      showNotification('error', 'A clear reason is required for administrative audit compliance.');
      return;
    }

    setActionLoading(true);
    try {
      const { actionType, targetId } = actionModal;

      if (actionType === 'suspend_user') {
        await api.patch(`/admin/users/${targetId}/status`, {
          status: 'suspended',
          reason: modalReason.trim()
        });
        showNotification('success', `Account #${targetId} suspended successfully.`);
      } else if (actionType === 'reactivate_user') {
        await api.patch(`/admin/users/${targetId}/status`, {
          status: 'active',
          reason: modalReason.trim() || 'Reactivated by admin'
        });
        showNotification('success', `Account #${targetId} reactivated successfully.`);
      } else if (actionType === 'delete_user') {
        await api.delete(`/admin/users/${targetId}`, {
          data: { reason: modalReason.trim() }
        });
        showNotification('success', `Account #${targetId} removed from active directory.`);
      } else if (actionType === 'moderate_listing') {
        await api.patch(`/admin/lands/${targetId}/status`, {
          approval_status: actionModal.extraData?.approval_status,
          status: actionModal.extraData?.status,
          reason: modalReason.trim()
        });
        showNotification('success', 'Land listing moderation updated.');
      } else if (actionType === 'resolve_duplicate') {
        await api.patch(`/admin/duplicate-cases/${targetId}`, {
          status: actionModal.extraData?.status,
          admin_notes: modalReason.trim(),
          suspend_duplicate: actionModal.extraData?.suspendDuplicate || false,
          suspension_reason: modalReason.trim()
        });
        showNotification('success', 'Duplicate registration case resolved.');
      } else if (actionType === 'resolve_fraud') {
        await api.patch(`/admin/fraud-reports/${targetId}`, {
          status: actionModal.extraData?.status,
          review_notes: modalReason.trim(),
          action_taken: actionModal.extraData?.action_taken,
          suspend_reported_user: actionModal.extraData?.suspendUser || false,
          suspension_reason: modalReason.trim()
        });
        showNotification('success', 'Fraud report status updated.');
      } else if (actionType === 'deactivate_admin') {
        await api.patch(`/admin/admins/${targetId}/status`, {
          status: actionModal.extraData?.status || 'deactivated',
          reason: modalReason.trim()
        });
        showNotification('success', 'Sub-admin status updated.');
      } else if (actionType === 'delete_admin') {
        await api.delete(`/admin/admins/${targetId}`, {
          data: { reason: modalReason.trim() }
        });
        showNotification('success', 'Sub-admin removed successfully.');
      }

      // Close modal and refresh data
      setActionModal({ isOpen: false, actionType: '', targetId: null });
      setModalReason('');
      refreshCurrentSection();
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to open Action Modal
  const openActionModal = ({ actionType, targetId, targetName, title, promptText, requiresReason = true, confirmBtnText = 'Confirm', confirmBtnColor = 'bg-red-600', extraData = {} }) => {
    setModalReason('');
    setActionModal({
      isOpen: true,
      actionType,
      targetId,
      targetName,
      title,
      promptText,
      requiresReason,
      confirmBtnText,
      confirmBtnColor,
      extraData
    });
  };

  // Open view user modal
  const handleInspectUser = async (userId) => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      if (res.data.success) {
        setSelectedUser(res.data.user);
      }
    } catch (err) {
      showNotification('error', 'Could not load user details.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-agri-deep text-white border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">AgriConnect Governance Console</h1>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isMainAdmin
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                }`}>
                  {isMainAdmin ? 'Main Admin (Super Admin)' : 'Sub-Admin Portal'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Logged in as <strong className="text-white">{user?.name}</strong> ({user?.email}) • Active Server-Side RBAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={refreshCurrentSection}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-xs flex items-center gap-1.5 font-bold"
              title="Refresh database records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <button
              onClick={() => { logout(); navigate('/admin/login'); }}
              className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 rounded-xl transition text-xs flex items-center gap-1.5 font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div className={`px-4 py-3 text-xs font-bold border-b flex items-center justify-between transition ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ type: '', message: '' })} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Console Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar (10 Dedicated Sections) */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-1 bg-white p-3 rounded-3xl border border-agri-soft shadow-xs self-start">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Governance Navigation
          </div>

          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'overview'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4" />
              <span>1. Overview</span>
            </div>
            {stats && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${activeSection === 'overview' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {stats.totalUsers}
              </span>
            )}
          </button>

          {/* Sub-Admin Management (Visible ONLY to Main Admin) */}
          {isMainAdmin && (
            <button
              onClick={() => setActiveSection('admins')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                activeSection === 'admins'
                  ? 'bg-agri-dark text-white shadow-xs'
                  : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span>2. Admin Management</span>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">Super</span>
            </button>
          )}

          <button
            onClick={() => setActiveSection('owners')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'owners'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>3. Manage Landowners</span>
            </div>
            {stats && <span className="text-[10px] font-mono text-slate-500">{stats.totalOwners}</span>}
          </button>

          <button
            onClick={() => setActiveSection('farmers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'farmers'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>4. Manage Farmers</span>
            </div>
            {stats && <span className="text-[10px] font-mono text-slate-500">{stats.totalFarmers}</span>}
          </button>

          <button
            onClick={() => setActiveSection('documents')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'documents' || activeSection === 'verifications'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>5. Land Document Verification</span>
            </div>
            {pendingVerifications.pendingDocs?.length > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                {pendingVerifications.pendingDocs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('duplicates')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'duplicates'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4" />
              <span>6. Duplicate Reviews</span>
            </div>
            {stats?.duplicateReviewCases > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                {stats.duplicateReviewCases}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('fraud')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'fraud'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Flag className="w-4 h-4" />
              <span>7. Fraud Reports</span>
            </div>
            {stats?.reportedAccounts > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                {stats.reportedAccounts}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('listings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'listings'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4" />
              <span>8. Manage Listings</span>
            </div>
            {stats && <span className="text-[10px] font-mono text-slate-500">{stats.totalLands}</span>}
          </button>

          <button
            onClick={() => setActiveSection('rentals')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'rentals'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4" />
              <span>9. Rental Requests</span>
            </div>
            {stats && <span className="text-[10px] font-mono text-slate-500">{stats.totalRentalRequests}</span>}
          </button>

          <button
            onClick={() => setActiveSection('audit')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
              activeSection === 'audit'
                ? 'bg-agri-dark text-white shadow-xs'
                : 'text-slate-700 hover:bg-agri-light hover:text-agri-deep'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>10. Activity Logs</span>
            </div>
            <Lock className="w-3 h-3 text-slate-400" />
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6 overflow-hidden">
          
          {/* ==================================================== */}
          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {/* ==================================================== */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Database Real Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-2xl border border-agri-soft shadow-xs">
                  <div className="text-xs font-semibold text-slate-500">Total Registered Users</div>
                  <div className="text-2xl font-black text-agri-dark mt-1">{stats?.totalUsers || 0}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{stats?.totalOwners || 0} Owners • {stats?.totalFarmers || 0} Farmers</div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-agri-soft shadow-xs">
                  <div className="text-xs font-semibold text-slate-500">Pending Land Approvals</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">{stats?.pendingLandVerifications || 0}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{pendingVerifications.pendingDocs?.length || 0} Documents Pending</div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-agri-soft shadow-xs">
                  <div className="text-xs font-semibold text-slate-500">Total Real Land Listings</div>
                  <div className="text-2xl font-black text-agri-dark mt-1">{stats?.totalLands || 0}</div>
                  <div className="text-[11px] text-slate-500 mt-1">100% Database-Driven</div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-agri-soft shadow-xs">
                  <div className="text-xs font-semibold text-slate-500">Duplicate Cases & Fraud</div>
                  <div className="text-2xl font-black text-red-600 mt-1">
                    {(stats?.duplicateReviewCases || 0) + (stats?.reportedAccounts || 0)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{stats?.suspendedAccounts || 0} Suspended Accounts</div>
                </div>
              </div>

              {/* Quick Attention Banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-agri-light/40 rounded-2xl border border-agri-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-agri-dark" />
                      <h3 className="text-sm font-extrabold text-agri-deep">Pending Land Documents</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('documents')}
                      className="text-xs font-bold text-agri-dark hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    {pendingVerifications.pendingDocs?.length || 0} land ownership documents (Patta / Chitta / Adangal) are pending administrator verification review.
                  </p>
                </div>

                <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <h3 className="text-sm font-extrabold text-amber-900">Duplicate Registration Review</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('duplicates')}
                      className="text-xs font-bold text-amber-800 hover:underline"
                    >
                      Review Cases ({stats?.duplicateReviewCases || 0})
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    Normalized phone and Aadhaar checks flagged {stats?.duplicateReviewCases || 0} potential duplicate accounts requiring manual administrative comparison.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 2: ADMIN MANAGEMENT (SUPER ADMIN ONLY) */}
          {/* ==================================================== */}
          {activeSection === 'admins' && isMainAdmin && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-agri-deep">Administrator Management</h2>
                  <p className="text-xs text-slate-500">
                    Only the Main Admin can provision, activate, suspend, or delete Sub-Admins.
                  </p>
                </div>
                <button
                  onClick={() => setCreateAdminModal(true)}
                  className="px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition flex items-center gap-2 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Sub-Admin</span>
                </button>
              </div>

              {/* Admins Table or Status Display */}
              {adminsLoading ? (
                <div className="bg-white rounded-3xl border border-agri-soft shadow-xs p-12 text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-500">Loading sub-administrator accounts from database...</p>
                </div>
              ) : adminsError ? (
                <div className="bg-white rounded-3xl border border-red-200 shadow-xs p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-red-900">Failed to Retrieve Sub-Admins</h3>
                    <p className="text-xs text-red-700 max-w-md mx-auto">{adminsError}</p>
                  </div>
                  <button
                    onClick={fetchAdmins}
                    className="px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : adminsList.length === 0 ? (
                <div className="bg-white rounded-3xl border border-agri-soft shadow-xs p-16 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-agri-light border border-agri-soft mx-auto flex items-center justify-center text-agri-dark">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-agri-deep">No Sub-Admin accounts found.</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      No sub-administrators are currently registered in the database. As Main Admin, you can provision new sub-administrators using the button above.
                    </p>
                  </div>
                  <button
                    onClick={() => setCreateAdminModal(true)}
                    className="px-4 py-2 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Sub-Admin</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-agri-soft shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-agri-light/60 text-agri-deep border-b border-agri-soft font-bold">
                          <th className="p-3.5">Admin ID</th>
                          <th className="p-3.5">Full Name</th>
                          <th className="p-3.5">Email</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Actions Logged</th>
                          <th className="p-3.5">Created At</th>
                          <th className="p-3.5 text-right">Governance Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-agri-soft/50">
                        {adminsList.map((adm) => (
                          <tr key={adm.id} className="hover:bg-agri-light/20 transition">
                            <td className="p-3.5 font-mono font-bold text-agri-dark">{adm.farmer_user_id}</td>
                            <td className="p-3.5 font-bold text-agri-deep">{adm.name}</td>
                            <td className="p-3.5 text-slate-600">{adm.email}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-blue-100 text-blue-900 border-blue-300">
                                Sub-Admin
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                adm.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : adm.status === 'suspended'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {adm.status}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-600">{adm.actions_count || 0}</td>
                            <td className="p-3.5 text-slate-500 text-[11px]">{new Date(adm.created_at).toLocaleDateString()}</td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {adm.status === 'active' ? (
                                  <button
                                    onClick={() => openActionModal({
                                      actionType: 'deactivate_admin',
                                      targetId: adm.id,
                                      targetName: adm.name,
                                      title: 'Deactivate Sub-Admin Account',
                                      promptText: `Are you sure you want to deactivate administrative access for ${adm.name}? Their login and session will be immediately revoked.`,
                                      requiresReason: true,
                                      confirmBtnText: 'Deactivate',
                                      confirmBtnColor: 'bg-amber-600',
                                      extraData: { status: 'deactivated' }
                                    })}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold border border-amber-200 transition"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openActionModal({
                                      actionType: 'deactivate_admin',
                                      targetId: adm.id,
                                      targetName: adm.name,
                                      title: 'Reactivate Sub-Admin Account',
                                      promptText: `Reactivate administrative privileges for ${adm.name}?`,
                                      requiresReason: false,
                                      confirmBtnText: 'Reactivate',
                                      confirmBtnColor: 'bg-emerald-600',
                                      extraData: { status: 'active' }
                                    })}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition"
                                  >
                                    Activate
                                  </button>
                                )}

                                <button
                                  onClick={() => openActionModal({
                                    actionType: 'delete_admin',
                                    targetId: adm.id,
                                    targetName: adm.name,
                                    title: 'Remove Sub-Admin Privileges',
                                    promptText: `Permanently revoke admin access and remove ${adm.name}? All audit records created by this administrator will be preserved.`,
                                    requiresReason: true,
                                    confirmBtnText: 'Remove Admin',
                                    confirmBtnColor: 'bg-red-600'
                                  })}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Remove Sub-Admin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 3 & 4: MANAGE LANDOWNERS & FARMERS */}
          {/* ==================================================== */}
          {(activeSection === 'owners' || activeSection === 'farmers') && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-agri-deep">
                    {activeSection === 'owners' ? 'Manage Agricultural Landowners' : 'Manage Registered Farmers'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Searchable, paginated directory with profile inspection, account suspension, and role management.
                  </p>
                </div>

                {/* Search & Filter Bar */}
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name, email, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs focus:outline-none focus:border-agri-dark"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 px-2.5 bg-white border border-agri-soft rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended Only</option>
                  </select>

                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-3xl border border-agri-soft shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-agri-light/60 text-agri-deep border-b border-agri-soft font-bold">
                        <th className="p-3.5">User ID</th>
                        <th className="p-3.5">Name</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5">{activeSection === 'owners' ? 'Land Listings' : 'Rental Requests'}</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-agri-soft/50">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500">
                            No matching user records found in database.
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-agri-light/20 transition">
                            <td className="p-3.5 font-mono font-bold text-agri-dark">{u.farmer_user_id}</td>
                            <td className="p-3.5 font-bold text-agri-deep">{u.name}</td>
                            <td className="p-3.5 text-slate-600">{u.email}</td>
                            <td className="p-3.5 text-slate-600">{u.phone || '—'}</td>
                            <td className="p-3.5 font-mono font-semibold">
                              {activeSection === 'owners' ? u.land_count || 0 : u.request_count || 0}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleInspectUser(u.id)}
                                  className="px-2.5 py-1 bg-agri-light hover:bg-agri-soft text-agri-dark rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                  title="View User Profile"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Profile</span>
                                </button>

                                {u.status === 'active' ? (
                                  <button
                                    onClick={() => openActionModal({
                                      actionType: 'suspend_user',
                                      targetId: u.id,
                                      targetName: u.name,
                                      title: `Suspend Account: ${u.name}`,
                                      promptText: `Suspending this user will immediately revoke active access and block all operations. A suspension reason is required.`,
                                      requiresReason: true,
                                      confirmBtnText: 'Suspend Account',
                                      confirmBtnColor: 'bg-red-600'
                                    })}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold border border-red-200 transition"
                                  >
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openActionModal({
                                      actionType: 'reactivate_user',
                                      targetId: u.id,
                                      targetName: u.name,
                                      title: `Reactivate Account: ${u.name}`,
                                      promptText: `Reactivate this account and restore user privileges?`,
                                      requiresReason: false,
                                      confirmBtnText: 'Reactivate',
                                      confirmBtnColor: 'bg-emerald-600'
                                    })}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition"
                                  >
                                    Reactivate
                                  </button>
                                )}

                                <button
                                  onClick={() => openActionModal({
                                    actionType: 'delete_user',
                                    targetId: u.id,
                                    targetName: u.name,
                                    title: `Delete Account: ${u.name}`,
                                    promptText: `Perform soft-deletion of this account? Associated land and rental records are preserved for legal and audit compliance.`,
                                    requiresReason: true,
                                    confirmBtnText: 'Delete Account',
                                    confirmBtnColor: 'bg-red-700'
                                  })}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 5: LAND DOCUMENT VERIFICATION */}
          {/* ==================================================== */}
          {(activeSection === 'documents' || activeSection === 'verifications') && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs">
                <h2 className="text-base font-black text-agri-deep">Land Document Verification Console</h2>
                <p className="text-xs text-slate-500">
                  Inspect submitted private land ownership documents (Patta, Chitta, Adangal). Private URLs are protected and accessible only to authorized administrators.
                </p>
              </div>

              {/* Pending Land Documents */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Submitted Private Land Documents ({pendingVerifications.pendingDocs?.length || 0})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingVerifications.pendingDocs?.length === 0 ? (
                    <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-dashed border-agri-soft text-slate-500 text-xs">
                      No land documents currently pending verification review.
                    </div>
                  ) : (
                    pendingVerifications.pendingDocs?.map((doc) => (
                      <div key={doc.id} className="p-4 bg-white rounded-2xl border border-agri-soft shadow-xs space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[10px] uppercase font-bold bg-agri-light text-agri-dark px-2 py-0.5 rounded border border-agri-soft">
                            {doc.doc_type} Document
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        </div>

                        <div className="space-y-1 text-slate-700">
                          <div><strong>Land:</strong> {doc.land_title} ({doc.land_location})</div>
                          <div><strong>Landowner:</strong> {doc.owner_name} ({doc.owner_user_id})</div>
                        </div>

                        <div className="pt-2 border-t border-agri-soft flex items-center justify-between">
                          <a
                            href={doc.doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-agri-dark hover:bg-agri-deep transition shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Document</span>
                          </a>

                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Pending Review
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 6: DUPLICATE REGISTRATION REVIEW */}
          {/* ==================================================== */}
          {activeSection === 'duplicates' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs">
                <h2 className="text-base font-black text-agri-deep">Duplicate Registration Detection</h2>
                <p className="text-xs text-slate-500">
                  Accounts flagged by contact and identity heuristics for manual comparison. Sensitive data is masked.
                </p>
              </div>

              <div className="space-y-4">
                {duplicateCases.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-agri-soft text-slate-500 text-xs">
                    No duplicate review cases currently flagged.
                  </div>
                ) : (
                  duplicateCases.map((c) => (
                    <div key={c.id} className="p-5 bg-white rounded-3xl border border-agri-soft shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-agri-soft pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            c.status === 'review_required'
                              ? 'bg-amber-100 text-amber-900'
                              : c.status === 'confirmed_duplicate'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {c.status}
                          </span>
                          <span className="text-xs font-extrabold text-agri-deep">Case #{c.id}</span>
                          <span className="text-xs text-slate-500">• Match: {c.match_type}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>

                      <div className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                        <strong>Detection Reason:</strong> {c.match_reason}
                      </div>

                      {/* Side-by-side Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-agri-light/30 rounded-xl border border-agri-soft space-y-1.5">
                          <div className="font-extrabold text-agri-deep text-xs border-b border-agri-soft/50 pb-1">Primary Account (Earlier)</div>
                          <div><strong>Name:</strong> {c.primary_name}</div>
                          <div><strong>Email:</strong> {c.primary_email}</div>
                          <div><strong>Phone:</strong> {c.primary_phone || '—'}</div>
                          <div><strong>Role:</strong> {c.primary_role}</div>
                          <div><strong>Status:</strong> {c.primary_status}</div>
                        </div>

                        <div className="p-3 bg-agri-light/30 rounded-xl border border-agri-soft space-y-1.5">
                          <div className="font-extrabold text-agri-deep text-xs border-b border-agri-soft/50 pb-1">Flagged Duplicate Account</div>
                          <div><strong>Name:</strong> {c.dup_name}</div>
                          <div><strong>Email:</strong> {c.dup_email}</div>
                          <div><strong>Phone:</strong> {c.dup_phone || '—'}</div>
                          <div><strong>Role:</strong> {c.dup_role}</div>
                          <div><strong>Status:</strong> {c.dup_status}</div>
                        </div>
                      </div>

                      {c.review_notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <strong>Admin Review Notes:</strong> {c.review_notes}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-agri-soft">
                        <button
                          onClick={() => openActionModal({
                            actionType: 'resolve_duplicate',
                            targetId: c.id,
                            targetName: `Case #${c.id}`,
                            title: 'Mark Case as Clear (Legitimate Account)',
                            promptText: 'Explain why these accounts are considered distinct and legitimate:',
                            requiresReason: true,
                            confirmBtnText: 'Clear Case',
                            confirmBtnColor: 'bg-emerald-600',
                            extraData: { status: 'clear' }
                          })}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition"
                        >
                          Mark as Clear
                        </button>

                        <button
                          onClick={() => openActionModal({
                            actionType: 'resolve_duplicate',
                            targetId: c.id,
                            targetName: `Case #${c.id}`,
                            title: 'Confirm Duplicate & Suspend Duplicate Account',
                            promptText: 'Confirm this account as a duplicate. The duplicate account will be suspended. State the audit reason:',
                            requiresReason: true,
                            confirmBtnText: 'Confirm & Suspend Duplicate',
                            confirmBtnColor: 'bg-red-600',
                            extraData: { status: 'confirmed_duplicate', suspendDuplicate: true }
                          })}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Confirm Duplicate
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 7: FRAUD REPORT MANAGEMENT */}
          {/* ==================================================== */}
          {activeSection === 'fraud' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs">
                <h2 className="text-base font-black text-agri-deep">Fraud & Misconduct Reports</h2>
                <p className="text-xs text-slate-500">
                  Review reports submitted by farmers or landowners regarding suspicious listings or misleading information.
                </p>
              </div>

              <div className="space-y-4">
                {fraudReports.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-agri-soft text-slate-500 text-xs">
                    No fraud reports on file.
                  </div>
                ) : (
                  fraudReports.map((r) => (
                    <div key={r.id} className="p-5 bg-white rounded-3xl border border-agri-soft shadow-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-agri-soft pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            r.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'under_review'
                              ? 'bg-blue-100 text-blue-800'
                              : r.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-xs font-extrabold text-agri-deep">Report #{r.id}</span>
                          <span className="text-xs font-semibold text-agri-dark">• Category: {r.category}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1">
                        <div><strong>Reported By:</strong> {r.reporter_name || 'Anonymous User'} ({r.reporter_user_id || '—'})</div>
                        {r.reported_user_name && (
                          <div><strong>Reported User:</strong> {r.reported_user_name} ({r.reported_user_id_code})</div>
                        )}
                        {r.land_title && (
                          <div><strong>Referenced Land:</strong> {r.land_title} ({r.land_location})</div>
                        )}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
                          <strong>Allegation Description:</strong>
                          <p className="mt-1 whitespace-pre-wrap">{r.description}</p>
                        </div>
                      </div>

                      {r.review_notes && (
                        <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                          <strong>Review Notes:</strong> {r.review_notes}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-agri-soft">
                        <button
                          onClick={() => openActionModal({
                            actionType: 'resolve_fraud',
                            targetId: r.id,
                            targetName: `Report #${r.id}`,
                            title: 'Mark Under Review',
                            promptText: 'Add an investigation note:',
                            requiresReason: false,
                            confirmBtnText: 'Set Under Review',
                            confirmBtnColor: 'bg-blue-600',
                            extraData: { status: 'under_review', action_taken: 'Investigation initiated' }
                          })}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition"
                        >
                          Mark Under Review
                        </button>

                        <button
                          onClick={() => openActionModal({
                            actionType: 'resolve_fraud',
                            targetId: r.id,
                            targetName: `Report #${r.id}`,
                            title: 'Dismiss Report as Unsubstantiated',
                            promptText: 'Provide the justification for dismissing this report:',
                            requiresReason: true,
                            confirmBtnText: 'Dismiss Report',
                            confirmBtnColor: 'bg-slate-600',
                            extraData: { status: 'dismissed', action_taken: 'Dismissed upon review' }
                          })}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                        >
                          Dismiss Report
                        </button>

                        <button
                          onClick={() => openActionModal({
                            actionType: 'resolve_fraud',
                            targetId: r.id,
                            targetName: `Report #${r.id}`,
                            title: 'Resolve Report & Take Corrective Action',
                            promptText: 'Enter findings and resolution action taken:',
                            requiresReason: true,
                            confirmBtnText: 'Resolve Report',
                            confirmBtnColor: 'bg-emerald-600',
                            extraData: { status: 'resolved', action_taken: 'Resolved with administrator intervention' }
                          })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Resolve Report
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 8: MANAGE LAND LISTINGS */}
          {/* ==================================================== */}
          {activeSection === 'listings' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-agri-deep">Land Listing Moderation</h2>
                  <p className="text-xs text-slate-500">
                    Approve, reject, or temporarily unlist user-submitted farmland. Only genuine database records are shown.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listings.length === 0 ? (
                  <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-dashed border-agri-soft text-slate-500 text-xs">
                    No land listings currently registered in database.
                  </div>
                ) : (
                  listings.map((land) => (
                    <div key={land.id} className="p-5 bg-white rounded-3xl border border-agri-soft shadow-xs space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-agri-deep">{land.title}</h4>
                          <span className="text-xs text-slate-500">Owner: {land.owner_name} ({land.owner_user_id})</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            land.approval_status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : land.approval_status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {land.approval_status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            Status: {land.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1">
                        <div><strong>Location:</strong> {land.location} ({land.area_acres} Acres)</div>
                        <div><strong>Rent:</strong> ₹{land.rent_amount?.toLocaleString()} / month</div>
                        <div><strong>Soil & Water:</strong> {land.soil_type} • {land.water_source}</div>
                        {land.report_count > 0 && (
                          <div className="text-red-700 font-bold bg-red-50 p-1.5 rounded-lg border border-red-200">
                            ⚠️ Flagged in {land.report_count} user report(s)
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-agri-soft">
                        {land.approval_status !== 'approved' && (
                          <button
                            onClick={() => openActionModal({
                              actionType: 'moderate_listing',
                              targetId: land.id,
                              targetName: land.title,
                              title: `Approve Land Listing: ${land.title}`,
                              promptText: 'Confirm listing approval for public directory visibility:',
                              requiresReason: false,
                              confirmBtnText: 'Approve Listing',
                              confirmBtnColor: 'bg-emerald-600',
                              extraData: { approval_status: 'approved', status: 'available' }
                            })}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                          >
                            Approve
                          </button>
                        )}

                        {land.status === 'available' ? (
                          <button
                            onClick={() => openActionModal({
                              actionType: 'moderate_listing',
                              targetId: land.id,
                              targetName: land.title,
                              title: `Temporarily Hide Listing: ${land.title}`,
                              promptText: 'Enter reason for unlisting:',
                              requiresReason: true,
                              confirmBtnText: 'Hide Listing',
                              confirmBtnColor: 'bg-amber-600',
                              extraData: { status: 'unlisted' }
                            })}
                            className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition"
                          >
                            Hide Listing
                          </button>
                        ) : (
                          <button
                            onClick={() => openActionModal({
                              actionType: 'moderate_listing',
                              targetId: land.id,
                              targetName: land.title,
                              title: `Restore Listing: ${land.title}`,
                              promptText: 'Restore listing to public directory?',
                              requiresReason: false,
                              confirmBtnText: 'Restore to Public',
                              confirmBtnColor: 'bg-emerald-600',
                              extraData: { status: 'available' }
                            })}
                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition"
                          >
                            Restore
                          </button>
                        )}

                        <button
                          onClick={() => openActionModal({
                            actionType: 'moderate_listing',
                            targetId: land.id,
                            targetName: land.title,
                            title: `Reject Land Listing: ${land.title}`,
                            promptText: 'Enter moderation rejection feedback for landowner:',
                            requiresReason: true,
                            confirmBtnText: 'Reject Listing',
                            confirmBtnColor: 'bg-red-600',
                            extraData: { approval_status: 'rejected', status: 'unlisted' }
                          })}
                          className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 9: RENTAL REQUESTS OVERVIEW */}
          {/* ==================================================== */}
          {activeSection === 'rentals' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs">
                <h2 className="text-base font-black text-agri-deep">System Rental Requests</h2>
                <p className="text-xs text-slate-500">
                  Global overview of tenant-landowner rental transactions stored in the database.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-agri-soft shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-agri-light/60 text-agri-deep border-b border-agri-soft font-bold">
                        <th className="p-3.5">Req ID</th>
                        <th className="p-3.5">Land Title</th>
                        <th className="p-3.5">Farmer Requester</th>
                        <th className="p-3.5">Landowner</th>
                        <th className="p-3.5">Duration</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-agri-soft/50">
                      {rentalRequests.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500">
                            No rental requests on record.
                          </td>
                        </tr>
                      ) : (
                        rentalRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-agri-light/20 transition">
                            <td className="p-3.5 font-mono font-bold text-agri-dark">#{req.id}</td>
                            <td className="p-3.5 font-bold text-agri-deep">{req.land_title}</td>
                            <td className="p-3.5">{req.farmer_name} ({req.farmer_user_id_code})</td>
                            <td className="p-3.5">{req.owner_name} ({req.owner_user_id_code})</td>
                            <td className="p-3.5">{req.duration_requested}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : req.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 text-[11px]">{new Date(req.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SECTION 10: ADMIN ACTIVITY LOGS */}
          {/* ==================================================== */}
          {activeSection === 'audit' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-5 rounded-3xl border border-agri-soft shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-agri-deep">Immutable Administrative Audit Trail</h2>
                  <p className="text-xs text-slate-500">
                    Comprehensive log of all governance events. Immutable and tamper-proof.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-agri-soft shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-agri-light/60 text-agri-deep border-b border-agri-soft font-bold">
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5">Admin</th>
                        <th className="p-3.5">Action</th>
                        <th className="p-3.5">Target</th>
                        <th className="p-3.5">Reason / Description</th>
                        <th className="p-3.5">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-agri-soft/50 font-mono text-[11px]">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-500 font-sans text-xs">
                            No audit log records found.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-agri-light/20 transition">
                            <td className="p-3.5 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-3.5 font-bold text-agri-deep font-sans">{log.admin_name}</td>
                            <td className="p-3.5">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5 font-sans font-medium text-slate-700">
                              {log.target_type} #{log.target_id || '—'}
                            </td>
                            <td className="p-3.5 font-sans text-slate-600 max-w-xs truncate">{log.reason || '—'}</td>
                            <td className="p-3.5">
                              <span className="text-emerald-700 font-bold">✓ {log.outcome}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: CREATE SUB-ADMIN MODAL (MAIN ADMIN ONLY) */}
      {/* ==================================================== */}
      {createAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-agri-soft space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-agri-soft pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-agri-dark" />
                <h3 className="text-sm font-black text-agri-deep">Create Sub-Admin Account</h3>
              </div>
              <button onClick={() => setCreateAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Sub-Admin"
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  placeholder="e.g. ramesh.admin@agriconnect.ai"
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={newAdminForm.phone}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={newAdminForm.confirmPassword}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl focus:outline-none focus:border-agri-dark"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateAdminModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-agri-dark hover:bg-agri-deep text-white rounded-xl font-bold transition shadow-xs"
                >
                  {actionLoading ? 'Creating...' : 'Provision Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: GENERIC ACTION & AUDIT CONFIRMATION MODAL */}
      {/* ==================================================== */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-agri-soft space-y-4 animate-scaleUp">
            <div className="flex justify-between items-start border-b border-agri-soft pb-3">
              <div>
                <h3 className="text-sm font-black text-agri-deep">{actionModal.title}</h3>
                <p className="text-xs text-slate-500">{actionModal.targetName}</p>
              </div>
              <button
                onClick={() => setActionModal({ isOpen: false, actionType: '', targetId: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {actionModal.promptText}
            </p>

            {actionModal.requiresReason && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Action (Mandatory for Audit Trail)
                </label>
                <textarea
                  rows="3"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Specify clear, audit-compliant justification..."
                  className="w-full p-2.5 bg-agri-light/30 border border-agri-soft rounded-xl text-xs focus:outline-none focus:border-agri-dark"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-agri-soft">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, actionType: '', targetId: null })}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmModalAction}
                className={`flex-1 py-2.5 ${actionModal.confirmBtnColor} text-white rounded-xl text-xs font-bold transition shadow-xs`}
              >
                {actionLoading ? 'Processing...' : actionModal.confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: VIEW USER PROFILE INSPECTOR */}
      {/* ==================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-agri-soft space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex justify-between items-start border-b border-agri-soft pb-3">
              <div>
                <h3 className="text-sm font-black text-agri-deep">{selectedUser.name}</h3>
                <span className="text-[11px] font-mono text-agri-dark font-bold">{selectedUser.farmer_user_id}</span>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-agri-light/40 p-3.5 rounded-2xl border border-agri-soft">
              <div><strong>Role:</strong> <span className="capitalize">{selectedUser.role}</span></div>
              <div><strong>Status:</strong> <span className="capitalize font-bold">{selectedUser.status}</span></div>
              <div><strong>Email:</strong> {selectedUser.email}</div>
              <div><strong>Phone:</strong> {selectedUser.phone || '—'}</div>
              <div><strong>Location:</strong> {selectedUser.location || '—'}</div>
              <div><strong>Aadhaar (Last 4):</strong> XXXX-XXXX-{selectedUser.aadhaar_last4 || 'XXXX'}</div>
              <div><strong>Registered:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
            </div>

            {selectedUser.lands?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-agri-deep">Registered Lands ({selectedUser.lands.length})</h4>
                <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto">
                  {selectedUser.lands.map((l) => (
                    <div key={l.id} className="p-2.5 bg-white border border-agri-soft rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold">{l.title}</div>
                        <div className="text-[10px] text-slate-500">{l.location} • ₹{l.rent_amount?.toLocaleString()}/mo</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-agri-light text-agri-dark">
                        {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.requests?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-agri-deep">Rental Inquiries ({selectedUser.requests.length})</h4>
                <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto">
                  {selectedUser.requests.map((r) => (
                    <div key={r.id} className="p-2.5 bg-white border border-agri-soft rounded-xl flex justify-between items-center">
                      <div>
                        <div className="font-bold">{r.land_title}</div>
                        <div className="text-[10px] text-slate-500">{r.duration_requested}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-agri-light text-agri-dark">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2 bg-agri-dark text-white rounded-xl text-xs font-bold hover:bg-agri-deep transition shadow-xs"
            >
              Close Profile View
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
