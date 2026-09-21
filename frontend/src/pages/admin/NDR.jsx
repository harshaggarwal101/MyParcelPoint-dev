import { useState, useEffect, useCallback } from 'react';
import { FaExclamationTriangle, FaClock, FaRedo, FaUndo, FaEye, FaCheck, FaTimes, FaSearch, FaFileExport, FaCheckCircle, FaSpinner, FaUser, FaTruck, FaComment, FaPhone } from 'react-icons/fa';
import AdminSidebar from '../../components/admin/AdminSidebar';
import api from '../../services/api';
import './NDR.css';

const NDR = () => {
  const [ndrRecords, setNdrRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchAWB, setSearchAWB] = useState('');
  const [searchMerchant, setSearchMerchant] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reattemptRequested: 0,
    rtoRequested: 0,
    resolved: 0
  });

  // =================================
  // FETCH NDR DATA
  // =================================
  const fetchNDR = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/ndr');

      const records = res.data.ndrs || res.data || [];
      setNdrRecords(records);
      setFilteredRecords(records);

      // Calculate stats
      const total = records.length;
      const pending = records.filter(r => r.status === 'PENDING').length;
      const reattemptRequested = records.filter(r => r.status === 'REATTEMPT_REQUESTED').length;
      const rtoRequested = records.filter(r => r.status === 'RTO_REQUESTED').length;
      const resolved = records.filter(r => r.status === 'RESOLVED').length;

      setStats({
        total,
        pending,
        reattemptRequested,
        rtoRequested,
        resolved
      });
    } catch (error) {
      console.error('Error fetching NDR:', error);
      setError('Failed to load NDR records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNDR();
  }, [fetchNDR]);

  // =================================
  // FILTER RECORDS
  // =================================
  useEffect(() => {
    let filtered = ndrRecords;

    if (searchAWB) {
      filtered = filtered.filter(r =>
        r.awb?.toLowerCase().includes(searchAWB.toLowerCase())
      );
    }

    if (searchMerchant) {
      filtered = filtered.filter(r =>
        r.merchantId?.name?.toLowerCase().includes(searchMerchant.toLowerCase())
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (courierFilter !== 'ALL') {
      filtered = filtered.filter(r => r.courier === courierFilter);
    }

    setFilteredRecords(filtered);
  }, [searchAWB, searchMerchant, statusFilter, courierFilter, ndrRecords]);

  // =================================
  // GET UNIQUE COURIERS
  // =================================
  const uniqueCouriers = [...new Set(ndrRecords.map(r => r.courier).filter(Boolean))];

  // =================================
  // SHOW TOAST
  // =================================
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 3000);
  };

  // =================================
  // EXPORT CSV
  // =================================
  const handleExportCSV = () => {
    const headers = [
      'AWB',
      'Merchant',
      'Customer',
      'Phone',
      'Courier',
      'Reason',
      'Attempts',
      'Status',
      'Created At'
    ];

    const csvData = filteredRecords.map(r => [
      r.awb || '',
      r.merchantId?.name || '',
      r.customerName || r.orderId?.customerName || '',
      r.customerPhone || r.orderId?.customerPhone || '',
      r.courier || '',
      r.reason || '',
      `${r.deliveryAttempts || 0}/${r.maxAttempts || 3}`,
      r.status || '',
      r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ndr_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('CSV exported successfully', 'success');
  };

  // =================================
  // APPROVE REATTEMPT
  // =================================
  const approveReattempt = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/ndr/${id}/approve-reattempt`);
      showToast('Reattempt approved successfully', 'success');
      await fetchNDR();
    } catch (error) {
      console.error('Error approving reattempt:', error);
      showToast(error.response?.data?.message || 'Failed to approve reattempt', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =================================
  // APPROVE RTO
  // =================================
  const approveRTO = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/ndr/${id}/approve-rto`);
      showToast('RTO approved successfully', 'success');
      await fetchNDR();
    } catch (error) {
      console.error('Error approving RTO:', error);
      showToast(error.response?.data?.message || 'Failed to approve RTO', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =================================
  // REJECT REQUEST
  // =================================
  const rejectRequest = async (id) => {
    try {
      setActionLoading(true);
      await api.patch(`/admin/ndr/${id}/reject`);
      showToast('Request rejected successfully', 'success');
      await fetchNDR();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showToast(error.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // =================================
  // VIEW DETAILS
  // =================================
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
  };

  // =================================
  // GET STATUS BADGE
  // =================================
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: {
        icon: '🟡',
        label: 'Pending',
        className: 'ndr-status-pending'
      },
      REATTEMPT_REQUESTED: {
        icon: '🔄',
        label: 'Awaiting Approval',
        className: 'ndr-status-reattempt-requested'
      },
      REATTEMPT: {
        icon: '',
        label: 'Approved',
        className: 'ndr-status-reattempt'
      },
      RTO_REQUESTED: {
        icon: '📦',
        label: 'Awaiting RTO Approval',
        className: 'ndr-status-rto-requested'
      },
      RTO: {
        icon: '↩️',
        label: 'RTO Approved',
        className: 'ndr-status-rto'
      },
      RESOLVED: {
        icon: '🎉',
        label: 'Resolved',
        className: 'ndr-status-resolved'
      }
    };
    return badges[status] || badges.PENDING;
  };

  // =================================
  // GET REQUEST TYPE
  // =================================
  const getRequestType = (status) => {
    if (status === 'REATTEMPT_REQUESTED' || status === 'REATTEMPT') {
      return { label: 'Reattempt', className: 'ndr-request-reattempt' };
    }
    if (status === 'RTO_REQUESTED' || status === 'RTO') {
      return { label: 'RTO', className: 'ndr-request-rto' };
    }
    return null;
  };

  // =================================
  // LOADING STATE
  // =================================
  if (loading) {
    return (
      <div className="admin-scope ndr-container">
        <AdminSidebar />
        <div className="ndr-content">
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <FaSpinner size={48} color="#f97316" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', marginTop: '20px' }}>Loading NDR records...</p>
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scope ndr-container">
      <AdminSidebar />

      <div className="ndr-content">
        {/* Toast Notification */}
        {toast.visible && (
          <div className={`ndr-toast ${toast.type === 'success' ? 'ndr-toast-success' : 'ndr-toast-error'}`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="ndr-header">
          <h1 className="ndr-header-title">
            📋 NDR Management
          </h1>
          <p className="ndr-header-subtitle">
            Manage merchant NDR requests and approvals
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="ndr-error">
            ❌ {error}
          </div>
        )}

        {/* Stats Cards - 5 Cards */}
        <div className="ndr-stats-grid">
          <div className="ndr-stat-card">
            <div className="ndr-stat-inner">
              <FaExclamationTriangle size={28} color="#f59e0b" className="ndr-stat-icon" />
              <div>
                <h4 className="ndr-stat-label">Total NDR</h4>
                <h2 className="ndr-stat-value ndr-stat-value-orange">{stats.total}</h2>
              </div>
            </div>
          </div>

          <div className="ndr-stat-card">
            <div className="ndr-stat-inner">
              <FaClock size={28} color="#3b82f6" className="ndr-stat-icon" />
              <div>
                <h4 className="ndr-stat-label">Pending Requests</h4>
                <h2 className="ndr-stat-value ndr-stat-value-blue">{stats.pending}</h2>
              </div>
            </div>
          </div>

          <div className="ndr-stat-card">
            <div className="ndr-stat-inner">
              <FaRedo size={28} color="#10b981" className="ndr-stat-icon" />
              <div>
                <h4 className="ndr-stat-label">Reattempt Requests</h4>
                <h2 className="ndr-stat-value ndr-stat-value-green">{stats.reattemptRequested}</h2>
              </div>
            </div>
          </div>

          <div className="ndr-stat-card">
            <div className="ndr-stat-inner">
              <FaUndo size={28} color="#ef4444" className="ndr-stat-icon" />
              <div>
                <h4 className="ndr-stat-label">RTO Requests</h4>
                <h2 className="ndr-stat-value ndr-stat-value-red">{stats.rtoRequested}</h2>
              </div>
            </div>
          </div>

          <div className="ndr-stat-card">
            <div className="ndr-stat-inner">
              <FaCheckCircle size={28} color="#6366f1" className="ndr-stat-icon" />
              <div>
                <h4 className="ndr-stat-label">Resolved</h4>
                <h2 className="ndr-stat-value ndr-stat-value-purple">{stats.resolved}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="ndr-filters">
          <div className="ndr-search-wrapper">
            <FaSearch className="ndr-search-icon" />
            <input
              type="text"
              placeholder="Search AWB..."
              value={searchAWB}
              onChange={(e) => setSearchAWB(e.target.value)}
              className="ndr-search-input"
            />
          </div>

          <div className="ndr-search-wrapper">
            <FaUser className="ndr-search-icon" />
            <input
              type="text"
              placeholder="Search Merchant..."
              value={searchMerchant}
              onChange={(e) => setSearchMerchant(e.target.value)}
              className="ndr-search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ndr-select"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="REATTEMPT_REQUESTED">Reattempt Requested</option>
            <option value="RTO_REQUESTED">RTO Requested</option>
            <option value="REATTEMPT">Reattempt Approved</option>
            <option value="RTO">RTO Approved</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={courierFilter}
            onChange={(e) => setCourierFilter(e.target.value)}
            className="ndr-select"
          >
            <option value="ALL">All Couriers</option>
            {uniqueCouriers.map((courier) => (
              <option key={courier} value={courier}>{courier}</option>
            ))}
          </select>

          <button
            onClick={fetchNDR}
            className="ndr-btn ndr-btn-refresh"
          >
            <FaRedo size={12} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="ndr-btn ndr-btn-export"
          >
            <FaFileExport size={12} /> Export CSV
          </button>
        </div>

        {/* Result Count */}
        <div className="ndr-result-count">
          Showing {filteredRecords.length} of {ndrRecords.length} NDR Cases
        </div>

        {/* Table */}
        <div className="ndr-table-container">
          <table className="ndr-table">
            <thead className="ndr-thead">
              <tr>
                <th className="ndr-th">AWB</th>
                <th className="ndr-th">Merchant</th>
                <th className="ndr-th">Customer</th>
                <th className="ndr-th">Courier</th>
                <th className="ndr-th">Reason</th>
                <th className="ndr-th ndr-th-center">Attempts</th>
                <th className="ndr-th ndr-th-center">Request</th>
                <th className="ndr-th">Status</th>
                <th className="ndr-th">Created</th>
                <th className="ndr-th ndr-th-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => {
                  const statusBadge = getStatusBadge(r.status);
                  const requestType = getRequestType(r.status);
                  const isReattemptRequested = r.status === 'REATTEMPT_REQUESTED';
                  const isRTORequested = r.status === 'RTO_REQUESTED';

                  return (
                    <tr key={r._id} className="ndr-tr">
                      <td className="ndr-td ndr-td-awb">
                        {r.awb || 'N/A'}
                      </td>
                      <td className="ndr-td">
                        {r.merchantId?.name || 'N/A'}
                      </td>
                      <td className="ndr-td">
                        <div className="ndr-td-customer-name">{r.customerName || r.orderId?.customerName || 'N/A'}</div>
                        <div className="ndr-td-customer-phone">
                          📞 {r.customerPhone || r.orderId?.customerPhone || 'N/A'}
                        </div>
                      </td>
                      <td className="ndr-td">
                        <span className="ndr-courier-badge">
                          <FaTruck size={10} /> {r.courier || 'N/A'}
                        </span>
                      </td>
                      <td className="ndr-td">
                        {r.reason || 'Delivery Failed'}
                      </td>
                      <td className="ndr-td ndr-attempts">
                        {r.deliveryAttempts || 0}/{r.maxAttempts || 3}
                      </td>
                      <td className="ndr-td ndr-th-center">
                        {requestType ? (
                          <span className={`ndr-request-badge ${requestType.className}`}>
                            {requestType.label}
                          </span>
                        ) : (
                          <span className="ndr-request-none">—</span>
                        )}
                      </td>
                      <td className="ndr-td">
                        <span className={`ndr-status-badge ${statusBadge.className}`}>
                          {statusBadge.icon} {statusBadge.label}
                        </span>
                      </td>
                      <td className="ndr-td">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                      <td className="ndr-td ndr-th-center">
                        <div className="ndr-actions">
                          <button
                            onClick={() => handleViewDetails(r)}
                            className="ndr-action-btn ndr-action-btn-view"
                          >
                            <FaEye size={12} /> View
                          </button>

                          {isReattemptRequested && (
                            <>
                              <button
                                onClick={() => approveReattempt(r._id)}
                                disabled={actionLoading}
                                className="ndr-action-btn ndr-action-btn-approve"
                              >
                                <FaCheck size={11} /> Approve
                              </button>
                              <button
                                onClick={() => rejectRequest(r._id)}
                                disabled={actionLoading}
                                className="ndr-action-btn ndr-action-btn-reject"
                              >
                                <FaTimes size={11} /> Reject
                              </button>
                            </>
                          )}

                          {isRTORequested && (
                            <>
                              <button
                                onClick={() => approveRTO(r._id)}
                                disabled={actionLoading}
                                className="ndr-action-btn ndr-action-btn-rto"
                              >
                                <FaCheck size={11} /> Approve
                              </button>
                              <button
                                onClick={() => rejectRequest(r._id)}
                                disabled={actionLoading}
                                className="ndr-action-btn ndr-action-btn-reject"
                              >
                                <FaTimes size={11} /> Reject
                              </button>
                            </>
                          )}

                          {r.status === 'PENDING' && (
                            <span className="ndr-action-no-action">
                              No action needed
                            </span>
                          )}

                          {['REATTEMPT', 'RTO', 'RESOLVED'].includes(r.status) && (
                            <span className="ndr-action-completed">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ padding: 0 }}>
                    <div className="ndr-no-data">
                      <FaExclamationTriangle size={64} className="ndr-no-data-icon" />
                      <h3 className="ndr-no-data-title">
                        No NDR Cases Found
                      </h3>
                      <p className="ndr-no-data-text">
                        All shipments are currently healthy.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {showModal && selectedRecord && (
        <div className="ndr-modal-overlay" onClick={closeModal}>
          <div className="ndr-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ndr-modal-close" onClick={closeModal}>
              ✕
            </button>

            <h2 className="ndr-modal-title">
              📦 NDR Details
            </h2>

            <div className="ndr-modal-grid">
              <div className="ndr-modal-field">
                <div>
                  <label className="ndr-modal-label">AWB Number</label>
                  <div className="ndr-modal-value" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                    {selectedRecord.awb || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="ndr-modal-label">Merchant</label>
                  <div className="ndr-modal-value">{selectedRecord.merchantId?.name || 'N/A'}</div>
                </div>
                <div>
                  <label className="ndr-modal-label">Customer</label>
                  <div className="ndr-modal-value" style={{ fontWeight: '500' }}>
                    {selectedRecord.customerName || selectedRecord.orderId?.customerName || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="ndr-modal-label">Phone</label>
                  <div className="ndr-modal-value ndr-modal-value-phone">
                    <FaPhone size={14} color="#94a3b8" />
                    {selectedRecord.customerPhone || selectedRecord.orderId?.customerPhone || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="ndr-modal-label">Order Number</label>
                  <div className="ndr-modal-value">{selectedRecord.orderId?.orderNumber || 'N/A'}</div>
                </div>
              </div>

              <div className="ndr-modal-field">
                <div>
                  <label className="ndr-modal-label">Courier</label>
                  <div className="ndr-modal-value">{selectedRecord.courier || 'N/A'}</div>
                </div>
                <div>
                  <label className="ndr-modal-label">Reason</label>
                  <div className="ndr-modal-value">{selectedRecord.reason || 'Delivery Failed'}</div>
                </div>
                <div>
                  <label className="ndr-modal-label">Attempts</label>
                  <div className="ndr-modal-value" style={{ fontWeight: '500' }}>
                    {selectedRecord.deliveryAttempts || 0} of {selectedRecord.maxAttempts || 3}
                  </div>
                </div>
                <div>
                  <label className="ndr-modal-label">Status</label>
                  <span className={`ndr-status-badge ${getStatusBadge(selectedRecord.status).className}`}>
                    {getStatusBadge(selectedRecord.status).icon} {getStatusBadge(selectedRecord.status).label}
                  </span>
                </div>
                <div>
                  <label className="ndr-modal-label">Created At</label>
                  <div className="ndr-modal-value">
                    {selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Merchant Note */}
            {selectedRecord.actionNote && (
              <div className="ndr-modal-note">
                <label className="ndr-modal-note-label">
                  <FaComment size={12} style={{ marginRight: '4px' }} /> Merchant Note
                </label>
                <div className="ndr-modal-note-text">{selectedRecord.actionNote}</div>
              </div>
            )}

            {/* Admin Note */}
            {selectedRecord.adminNote && (
              <div className="ndr-modal-note-admin">
                <label className="ndr-modal-note-label ndr-modal-note-label-admin">
                  <FaCheckCircle size={12} style={{ marginRight: '4px' }} /> Admin Note
                </label>
                <div className="ndr-modal-note-text">{selectedRecord.adminNote}</div>
              </div>
            )}

            <div className="ndr-modal-footer">
              <button className="ndr-modal-close-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NDR;