
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import { 
  FaSearch, 
  FaDownload, 
  FaEye, 
  FaBox, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaUndo,
  FaFilter,
  FaSync,
  FaCopy,
  FaTruck,
  FaPhone,
  FaTimes,
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaInfoCircle
} from 'react-icons/fa';
import "./MerchantNDR.css"; 

const MerchantNDR = () => {
  const [ndrRecords, setNdrRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [actionModal, setActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [couriers, setCouriers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reattemptRequested: 0,
    resolved: 0,
    rto: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Fetch NDR Data
  useEffect(() => {
    fetchNDRData();
  }, []);

  const fetchNDRData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ndr');
      const data = response.data.ndrs || response.data;
      
      console.log('NDR Data:', data);
      
      setNdrRecords(data);
      setFilteredRecords(data);
      
      const uniqueCouriers = [
        'ALL',
        ...new Set(
          data
            .map(record => record.courier)
            .filter(Boolean)
        ),
      ];
      setCouriers(uniqueCouriers);

      const pending = data.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'pending';
      }).length;
      
      const reattemptRequested = data.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'reattempt_requested';
      }).length;
      
      const resolved = data.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'resolved';
      }).length;
      
      const rto = data.filter(r => {
        const status = (r.status || '').toLowerCase();
        return status === 'rto';
      }).length;
      
      setStats({
        total: data.length,
        pending,
        reattemptRequested,
        resolved,
        rto
      });
    } catch (error) {
      console.error('Error fetching NDR data:', error);
      showToast('Failed to fetch NDR records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast({ message: '', type: '', visible: false });
    }, 3000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNDRData();
  };

  const handleCopyAWB = async (awb) => {
    try {
      await navigator.clipboard.writeText(awb);
      showToast('AWB copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy AWB', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'AWB', 
      'Order ID', 
      'Customer', 
      'Phone', 
      'Address', 
      'Pincode', 
      'Courier', 
      'NDR Reason', 
      'Sub Reason', 
      'Attempts', 
      'Last Attempt', 
      'Next Attempt',
      'Status',
      'Current Status',
      'Courier Remarks',
      'Remarks'
    ];
    
    const csvData = filteredRecords.map(record => [
      record.awb || '',
      record.orderId?.orderNumber || '',
      record.customerName || record.orderId?.customerName || '',
      record.customerPhone || record.orderId?.customerPhone || '',
      (record.address || '').replace(/"/g, '""'),
      record.pincode || '',
      record.courier || '',
      record.ndrReason || '',
      record.ndrSubReason || '',
      `${record.deliveryAttempts || 0} of ${record.maxAttempts || 3} Attempts`,
      record.lastAttemptDate ? new Date(record.lastAttemptDate).toLocaleDateString('en-IN') : '',
      record.nextAttemptDate ? new Date(record.nextAttemptDate).toLocaleDateString('en-IN') : '',
      record.status || '',
      getSubStatus(record.status),
      (record.courierRemarks || '').replace(/"/g, '""'),
      (record.remarks || '').replace(/"/g, '""')
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

  useEffect(() => {
    filterRecords();
  }, [search, statusFilter, courierFilter, ndrRecords]);

  const filterRecords = () => {
    let filtered = ndrRecords;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(record =>
        ((record.awb || '').toLowerCase()).includes(searchLower) ||
        ((record.orderId?.orderNumber || '').toLowerCase()).includes(searchLower) ||
        ((record.customerName || record.orderId?.customerName || '').toLowerCase()).includes(searchLower)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(record => 
        ((record.status || '').toLowerCase()) === statusFilter.toLowerCase()
      );
    }

    if (courierFilter !== 'ALL') {
      filtered = filtered.filter(record => 
        ((record.courier || '').toLowerCase()) === courierFilter.toLowerCase()
      );
    }

    setFilteredRecords(filtered);
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setViewModal(true);
  };

  const handleAction = (record, type) => {
    setSelectedRecord(record);
    setActionType(type);
    if (type === 'reattempt') {
      setNewAddress(record.address || record.orderId?.customerAddress || '');
      setNewPhone(record.customerPhone || record.orderId?.customerPhone || '');
      setNewPincode(record.pincode || record.orderId?.customerPincode || '');
    }
    setActionModal(true);
  };

  const submitAction = async () => {
    if (!actionNote.trim()) {
      showToast('Please enter remarks before submitting', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const recordId = selectedRecord._id || selectedRecord.id;
      
      if (actionType === 'reattempt') {
        await api.patch(`/ndr/${recordId}/reattempt`, {
          note: actionNote.trim(),
          address: newAddress.trim() || undefined,
          customerPhone: newPhone.trim() || undefined,
          pincode: newPincode.trim() || undefined,
        });
        showToast('Reattempt request submitted successfully', 'success');
      } else if (actionType === 'rto') {
        await api.patch(`/ndr/${recordId}/rto`, {
          note: actionNote.trim()
        });
        showToast('RTO request submitted successfully', 'success');
      }
      
      await fetchNDRData();
      setActionModal(false);
      setActionNote('');
      setNewAddress('');
      setNewPhone('');
      setNewPincode('');
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error performing action:', error);
      showToast(error.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    const normalizedStatus = (status || 'pending').toLowerCase();
    const styles = {
      pending: { background: "rgba(234,179,8,0.15)", color: "#facc15" },
      reattempt_requested: { background: "rgba(139,92,246,0.15)", color: "#a78bfa" },
      reattempt: { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
      rto_requested: { background: "rgba(234,179,8,0.15)", color: "#facc15" },
      resolved: { background: "rgba(34,197,94,0.15)", color: "#4ade80" },
      rto: { background: "rgba(239,68,68,0.15)", color: "#f87171" },
      delivered: { background: "rgba(34,197,94,0.15)", color: "#4ade80" },
      failed: { background: "rgba(239,68,68,0.15)", color: "#f87171" },
      ready_for_reattempt: { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
      out_for_delivery: { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    };
    return styles[normalizedStatus] || { background: "rgba(148,163,184,0.15)", color: "#8896b0" };
  };

  const getSubStatus = (status) => {
    const normalizedStatus = (status || 'pending').toLowerCase();
    const subStatusMap = {
      'pending': 'Awaiting Action',
      'reattempt_requested': 'Waiting for Admin Approval',
      'reattempt': 'Reattempt in Progress',
      'rto_requested': 'Waiting for Admin Approval',
      'resolved': 'Delivery Completed',
      'rto': 'Return to Origin Initiated',
      'delivered': 'Successfully Delivered',
      'failed': 'Delivery Failed',
      'ready_for_reattempt': 'Ready for Reattempt'
    };
    return subStatusMap[normalizedStatus] || normalizedStatus;
  };

  const getReasonBadge = (reason) => {
    const reasonColors = {
      'Customer Not Available': { background: 'rgba(249,115,22,0.15)', color: '#f97316' },
      'Address Issue': { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
      'Customer Refused': { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
      'Phone Unreachable': { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
      'Delivery Delayed': { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
      'Wrong Contact Number': { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
      'Address Not Found': { background: 'rgba(249,115,22,0.15)', color: '#f97316' },
      'Incorrect Address': { background: 'rgba(239,68,68,0.15)', color: '#f87171' }
    };
    return reasonColors[reason] || { background: 'rgba(148,163,184,0.15)', color: '#8896b0' };
  };

  const getCourierIcon = (courier) => {
    const icons = {
      'Delhivery': '📦',
      'Blue Dart': '✈️',
      'FedEx': '📬',
      'DTDC': '🚚',
      'XpressBees': '🐝',
      'Amazon Logistics': '📦',
      'Ecom Express': '🚛',
      'Shadowfax': '⚡'
    };
    return icons[courier] || '📧';
  };

  // Sort records by creation date (newest first)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <>
      <div className="ndr-container">
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="ndr-main">
          <div className="ndr-header">
            <div>
              <h1 className="ndr-title">NDR Management</h1>
              <p className="ndr-subtitle">Non-Delivery Report tracking and resolution</p>
            </div>
            <div className="ndr-header-actions">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`ndr-btn ndr-btn-refresh ${refreshing ? 'ndr-btn-disabled' : ''}`}
              >
                <FaSync size={11} /> {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleExportCSV}
                className="ndr-btn ndr-btn-export"
              >
                <FaDownload size={11} /> Export CSV
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="ndr-stats-grid">
            <div className="ndr-stat-card ndr-stat-total">
              <FaBox className="ndr-stat-icon ndr-stat-icon-total" />
              <div className="ndr-stat-value">{stats.total}</div>
              <div className="ndr-stat-label">Total NDR</div>
            </div>
            <div className="ndr-stat-card ndr-stat-pending">
              <FaClock className="ndr-stat-icon ndr-stat-icon-pending" />
              <div className="ndr-stat-value">{stats.pending}</div>
              <div className="ndr-stat-label">Pending</div>
            </div>
            <div className="ndr-stat-card ndr-stat-reattempt">
              <FaUndo className="ndr-stat-icon ndr-stat-icon-reattempt" />
              <div className="ndr-stat-value">{stats.reattemptRequested}</div>
              <div className="ndr-stat-label">Reattempt Requested</div>
            </div>
            <div className="ndr-stat-card ndr-stat-resolved">
              <FaCheckCircle className="ndr-stat-icon ndr-stat-icon-resolved" />
              <div className="ndr-stat-value">{stats.resolved}</div>
              <div className="ndr-stat-label">Resolved</div>
            </div>
            <div className="ndr-stat-card ndr-stat-rto">
              <FaExclamationTriangle className="ndr-stat-icon ndr-stat-icon-rto" />
              <div className="ndr-stat-value">{stats.rto}</div>
              <div className="ndr-stat-label">Marked RTO</div>
            </div>
          </div>

          {/* Search + Status Filter */}
          <div className="ndr-search-wrapper">
            <FaSearch className="ndr-search-icon" />
            <input 
              type="text" 
              placeholder="Search by AWB, Order ID or Customer Name..." 
              className="ndr-search-input"
              onChange={(e) => setSearch(e.target.value)} 
            />
            
            <div className="ndr-filter-wrapper">
              <FaFilter className="ndr-filter-icon" />
              <select
                className="ndr-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Awaiting Action</option>
                <option value="REATTEMPT_REQUESTED">Reattempt Requested</option>
                <option value="RESOLVED">Resolved</option>
                <option value="RTO">RTO</option>
              </select>
              
              <select
                className="ndr-filter-select"
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
              >
                <option value="ALL">All Couriers</option>
                {couriers.filter(c => c !== 'ALL').map(courier => (
                  <option key={courier} value={courier}>
                    {getCourierIcon(courier)} {courier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ndr-table-card">
            <div className="ndr-table-header">
              <h3 className="ndr-table-title">
                NDR Records
                <span className="ndr-table-count">
                  ({sortedRecords.length} cases)
                </span>
              </h3>
            </div>
            
            <div className="ndr-table-wrapper">
              {loading ? (
                <div className="ndr-loading">
                  <FaSync className="ndr-loading-spinner" />
                  <div>Loading NDR records...</div>
                </div>
              ) : sortedRecords.length === 0 ? (
                <div className="ndr-empty">
                  <div className="ndr-empty-icon">🎉</div>
                  <div className="ndr-empty-title">No NDR cases found</div>
                  <div className="ndr-empty-text">All deliveries are going smoothly! Try adjusting your filters.</div>
                </div>
              ) : (
                <table className="ndr-table">
                  <thead>
                    <tr className="ndr-table-head">
                      {[
                        "AWB",
                        "CUSTOMER",
                        "COURIER",
                        "ATTEMPTS",
                        "CREATED",
                        "STATUS",
                        "ACTIONS"
                      ].map((h) => (
                        <th key={h} className="ndr-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record) => {
                      const statusStyle = getStatusStyle(record.status);
                      const courierIcon = getCourierIcon(record.courier);
                      const subStatus = getSubStatus(record.status);
                      const canTakeAction = (record.status || '').toLowerCase() === 'pending';
                      const isReattemptRequested = (record.status || '').toLowerCase() === 'reattempt_requested';
                      const isRTORequested = (record.status || '').toLowerCase() === 'rto_requested';
                      const isReattempt = (record.status || '').toLowerCase() === 'reattempt';
                      const isResolved = (record.status || '').toLowerCase() === 'resolved';
                      const isRTO = (record.status || '').toLowerCase() === 'rto';
                      
                      const customerName = record.customerName || record.orderId?.customerName || 'N/A';
                      const customerPhone = record.customerPhone || record.orderId?.customerPhone || 'N/A';
                      
                      return (
                        <tr key={record._id || record.id} className="ndr-row">
                          <td className="ndr-td">
                            <div className="ndr-awb-wrapper">
                              <span className="ndr-awb">{record.awb || 'N/A'}</span>
                              <button
                                onClick={() => handleCopyAWB(record.awb)}
                                className="ndr-copy-btn"
                                title="Copy AWB"
                              >
                                <FaCopy size={12} />
                              </button>
                            </div>
                            <div className="ndr-order-id">
                              {record.orderId?.orderNumber || '-'}
                            </div>
                          </td>
                          
                          <td className="ndr-td">
                            <div className="ndr-customer-name">
                              {customerName}
                            </div>
                            <div className="ndr-customer-phone">
                              <FaPhone size={10} /> {customerPhone}
                            </div>
                          </td>
                          
                          <td className="ndr-td">
                            <span className="ndr-courier-badge">
                              <span>{courierIcon}</span>
                              <span>{record.courier || 'N/A'}</span>
                            </span>
                          </td>
                          
                          <td className="ndr-td">
                            <div className="ndr-attempts">
                              {record.deliveryAttempts || 0} / {record.maxAttempts || 3}
                            </div>
                            {record.nextAttemptDate && (
                              <div className="ndr-next-attempt">
                                📅 {new Date(record.nextAttemptDate).toLocaleDateString('en-GB')}
                              </div>
                            )}
                          </td>
                          
                          <td className="ndr-td">
                            <div className="ndr-created-date">
                              {record.createdAt ? 
                                new Date(record.createdAt).toLocaleDateString('en-GB') : 
                                'N/A'
                              }
                            </div>
                            <div className="ndr-created-time">
                              {record.createdAt ? 
                                new Date(record.createdAt).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                ''
                              }
                            </div>
                          </td>
                          
                          <td className="ndr-td">
                            <span 
                              className="ndr-status-badge"
                              style={{
                                background: statusStyle.background,
                                color: statusStyle.color,
                              }}
                            >
                              {record.status || 'PENDING'}
                            </span>
                            <div className="ndr-sub-status">{subStatus}</div>
                          </td>
                          
                          <td className="ndr-td">
                            <div className="ndr-actions">
                              <button
                                onClick={() => handleView(record)}
                                className="ndr-btn ndr-btn-view"
                              >
                                <FaEye size={11} /> View
                              </button>
                              
                              {canTakeAction && (
                                <>
                                  <button
                                    onClick={() => handleAction(record, 'reattempt')}
                                    className="ndr-btn ndr-btn-reattempt"
                                  >
                                    <FaUndo size={11} /> Reattempt
                                  </button>
                                  <button
                                    onClick={() => handleAction(record, 'rto')}
                                    className="ndr-btn ndr-btn-rto"
                                  >
                                    <FaTimes size={11} /> RTO
                                  </button>
                                </>
                              )}
                              
                              {(isReattemptRequested || isRTORequested) && (
                                <span className="ndr-status-tag ndr-tag-waiting">
                                  Awaiting Admin
                                </span>
                              )}
                              
                              {isReattempt && (
                                <span className="ndr-status-tag ndr-tag-reattempting">
                                  Reattempting
                                </span>
                              )}
                              
                              {isResolved && (
                                <span className="ndr-status-tag ndr-tag-delivered">
                                  ✓ Delivered
                                </span>
                              )}
                              
                              {isRTO && (
                                <span className="ndr-status-tag ndr-tag-rto">
                                  ✗ RTO
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* View Modal */}
      {viewModal && selectedRecord && (
        <div className="ndr-modal-overlay" onClick={() => {
          setViewModal(false);
          setSelectedRecord(null);
        }}>
          <div className="ndr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ndr-modal-header">
              <h2 className="ndr-modal-title">
                <FaInfoCircle className="ndr-modal-title-icon" />
                NDR Details
                <span 
                  className="ndr-modal-status"
                  style={{
                    background: getStatusStyle(selectedRecord.status).background,
                    color: getStatusStyle(selectedRecord.status).color,
                  }}
                >
                  {selectedRecord.status || 'PENDING'}
                </span>
              </h2>
              <button onClick={() => {
                setViewModal(false);
                setSelectedRecord(null);
              }} className="ndr-modal-close">
                <FaTimes />
              </button>
            </div>
            <div className="ndr-modal-body">
              {/* Order & Customer Information */}
              <div className="ndr-section-title">
                <FaUser className="ndr-section-icon" />
                Order & Customer Information
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">AWB Number</span>
                <span className="ndr-detail-value">
                  <span className="ndr-detail-awb">{selectedRecord.awb || 'N/A'}</span>
                  <button
                    onClick={() => handleCopyAWB(selectedRecord.awb)}
                    className="ndr-copy-btn ndr-copy-btn-modal"
                  >
                    <FaCopy size={12} /> Copy
                  </button>
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Order ID</span>
                <span className="ndr-detail-value">
                  <strong>{selectedRecord.orderId?.orderNumber || '-'}</strong>
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Customer Name</span>
                <span className="ndr-detail-value">
                  <strong>{selectedRecord.customerName || selectedRecord.orderId?.customerName || 'N/A'}</strong>
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Phone Number</span>
                <span className="ndr-detail-value">
                  <FaPhone className="ndr-detail-phone-icon" />
                  {selectedRecord.customerPhone || selectedRecord.orderId?.customerPhone || 'N/A'}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Email</span>
                <span className="ndr-detail-value">
                  {selectedRecord.orderId?.customerEmail || 'N/A'}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Address</span>
                <span className="ndr-detail-value">
                  <FaMapMarkerAlt className="ndr-detail-map-icon" />
                  {selectedRecord.address || 'N/A'}
                  <div className="ndr-detail-pincode">
                    Pincode: {selectedRecord.pincode || 'N/A'}
                  </div>
                </span>
              </div>

              {/* Delivery Information */}
              <div className="ndr-section-title">
                <FaTruck className="ndr-section-icon" />
                Delivery Information
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Courier</span>
                <span className="ndr-detail-value">
                  {getCourierIcon(selectedRecord.courier)} {selectedRecord.courier || 'N/A'}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">NDR Reason</span>
                <span className="ndr-detail-value">
                  <span 
                    className="ndr-reason-badge"
                    style={{
                      background: getReasonBadge(selectedRecord.ndrReason).background,
                      color: getReasonBadge(selectedRecord.ndrReason).color,
                    }}
                  >
                    {selectedRecord.ndrReason || 'N/A'}
                  </span>
                  {selectedRecord.ndrSubReason && (
                    <div className="ndr-sub-reason">
                      Sub Reason: {selectedRecord.ndrSubReason}
                    </div>
                  )}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Delivery Attempts</span>
                <span className="ndr-detail-value">
                  <div className="ndr-attempts-detail">
                    {selectedRecord.deliveryAttempts || 0} of {selectedRecord.maxAttempts || 3}
                  </div>
                  {selectedRecord.lastAttemptDate && (
                    <div className="ndr-last-attempt">
                      Last Attempt: {new Date(selectedRecord.lastAttemptDate).toLocaleString('en-GB')}
                    </div>
                  )}
                  {selectedRecord.nextAttemptDate && (
                    <div className="ndr-next-attempt-detail">
                      📅 Next Attempt: {new Date(selectedRecord.nextAttemptDate).toLocaleString('en-GB')}
                    </div>
                  )}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Expected Delivery</span>
                <span className="ndr-detail-value">
                  {selectedRecord.expectedDeliveryDate ? 
                    new Date(selectedRecord.expectedDeliveryDate).toLocaleString('en-GB') : 
                    'Pending Courier Update'
                  }
                </span>
              </div>

              {/* Status Information */}
              <div className="ndr-section-title">
                <FaClock className="ndr-section-icon" />
                Status Information
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Current Status</span>
                <span className="ndr-detail-value">
                  <span 
                    className="ndr-status-badge ndr-status-badge-large"
                    style={{
                      background: getStatusStyle(selectedRecord.status).background,
                      color: getStatusStyle(selectedRecord.status).color,
                    }}
                  >
                    {selectedRecord.status || 'PENDING'}
                  </span>
                  <div className="ndr-sub-status-detail">
                    {getSubStatus(selectedRecord.status)}
                  </div>
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Created At</span>
                <span className="ndr-detail-value">
                  <FaCalendarAlt className="ndr-detail-calendar-icon" />
                  {selectedRecord.createdAt ? 
                    new Date(selectedRecord.createdAt).toLocaleString('en-GB') : 
                    'N/A'
                  }
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Updated At</span>
                <span className="ndr-detail-value">
                  {selectedRecord.updatedAt ? 
                    new Date(selectedRecord.updatedAt).toLocaleString('en-GB') : 
                    'N/A'
                  }
                </span>
              </div>

              {/* Remarks */}
              <div className="ndr-section-title">
                <FaFileAlt className="ndr-section-icon" />
                Remarks & Notes
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Remarks</span>
                <span className="ndr-detail-value">
                  {selectedRecord.remarks || 'No remarks added'}
                </span>
              </div>
              
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Courier Remarks</span>
                <span className="ndr-detail-value">
                  {selectedRecord.courierRemarks || 'No remarks from courier'}
                </span>
              </div>

              {/* Attempt History */}
              {selectedRecord.attemptHistory && selectedRecord.attemptHistory.length > 0 && (
                <>
                  <div className="ndr-section-title">
                    <FaClock className="ndr-section-icon" />
                    Attempt History
                  </div>
                  {selectedRecord.attemptHistory.map((attempt, index) => (
                    <div key={index} className="ndr-attempt-history-item">
                      <span className="ndr-attempt-date">
                        {attempt.date || 'N/A'}
                      </span>
                      {attempt.status || 'Attempt'}
                      {attempt.remark && (
                        <span className="ndr-attempt-remark">
                          - {attempt.remark}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && selectedRecord && (
        <div className="ndr-modal-overlay" onClick={() => {
          setActionModal(false);
          setActionNote('');
          setNewAddress('');
          setNewPhone('');
          setNewPincode('');
          setSelectedRecord(null);
        }}>
          <div className="ndr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ndr-modal-header">
              <h2 className="ndr-modal-title">
                {actionType === 'reattempt' ? '🔄 Request Reattempt' : '📦 Mark as RTO'}
              </h2>
              <button onClick={() => {
                setActionModal(false);
                setActionNote('');
                setNewAddress('');
                setNewPhone('');
                setNewPincode('');
                setSelectedRecord(null);
              }} className="ndr-modal-close">
                <FaTimes />
              </button>
            </div>
            <div className="ndr-modal-body">
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">AWB</span>
                <span className="ndr-detail-value">
                  <span className="ndr-detail-awb">{selectedRecord.awb || ''}</span>
                </span>
              </div>
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Order ID</span>
                <span className="ndr-detail-value">{selectedRecord.orderId?.orderNumber || '-'}</span>
              </div>
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Customer</span>
                <span className="ndr-detail-value">{selectedRecord.customerName || selectedRecord.orderId?.customerName || ''}</span>
              </div>
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">Current Status</span>
                <span className="ndr-detail-value">
                  <span 
                    className="ndr-status-badge"
                    style={{
                      background: getStatusStyle(selectedRecord.status).background,
                      color: getStatusStyle(selectedRecord.status).color,
                    }}
                  >
                    {selectedRecord.status || 'PENDING'}
                  </span>
                </span>
              </div>
              <div className="ndr-detail-row">
                <span className="ndr-detail-label">NDR Reason</span>
                <span className="ndr-detail-value">
                  <span 
                    className="ndr-reason-badge"
                    style={{
                      background: getReasonBadge(selectedRecord.ndrReason).background,
                      color: getReasonBadge(selectedRecord.ndrReason).color,
                    }}
                  >
                    {selectedRecord.ndrReason || 'N/A'}
                  </span>
                </span>
              </div>
              
              {actionType === 'reattempt' && (
                <div className="ndr-action-fields">
                  <div className="ndr-action-grid">
                    <div>
                      <label className="ndr-action-label">New Contact Phone</label>
                      <input
                        type="text"
                        className="ndr-action-input"
                        placeholder="Enter phone number..."
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="ndr-action-label">New Pincode</label>
                      <input
                        type="text"
                        className="ndr-action-input"
                        placeholder="Enter pincode..."
                        value={newPincode}
                        onChange={(e) => setNewPincode(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="ndr-action-label">New Delivery Address</label>
                    <textarea
                      className="ndr-action-textarea"
                      placeholder="Enter new delivery address..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="ndr-action-note">
                <label className="ndr-action-label">
                  Action Note <span className="ndr-required">*</span>
                </label>
                <textarea
                  className="ndr-action-textarea"
                  placeholder={actionType === 'reattempt' 
                    ? 'Enter reason for reattempt request...' 
                    : 'Enter reason for marking as RTO...'}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                />
              </div>
              
              <div className="ndr-modal-footer">
                <button
                  onClick={() => {
                    setActionModal(false);
                    setActionNote('');
                    setNewAddress('');
                    setNewPhone('');
                    setNewPincode('');
                    setSelectedRecord(null);
                  }}
                  className="ndr-btn-cancel"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={submitting}
                  className={`ndr-btn-submit ${actionType === 'reattempt' ? 'ndr-btn-reattempt' : 'ndr-btn-rto'}`}
                >
                  {submitting ? '⏳ Submitting...' : (actionType === 'reattempt' ? 'Request Reattempt' : 'Mark RTO')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`ndr-toast ndr-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default MerchantNDR;