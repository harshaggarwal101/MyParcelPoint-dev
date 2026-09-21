
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';
import { FaSearch, FaDownload, FaEye, FaBox, FaClock, FaCheckCircle, FaUndo, FaFilter, FaSync, FaCopy, FaTruck, FaPhone, FaTimes, FaUser, FaMapMarkerAlt, FaCalendarAlt, FaFileAlt, FaInfoCircle, FaLocationArrow } from 'react-icons/fa';
import "./MerchantRTO.css"; 

const MerchantRTO = () => {
  const navigate = useNavigate();
  const [rtoRecords, setRtoRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    initiated: 0,
    transit: 0,
    returned: 0,
    completed: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // Fetch RTO Data
  useEffect(() => {
    fetchRTOData();
  }, []);

  const fetchRTOData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rto');
      const data = response.data.rtos || response.data;
      
      console.log('RTO Data:', data);
      
      setRtoRecords(data);
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

      const initiated = data.filter(r => 
        (r.status || '').toUpperCase() === 'INITIATED'
      ).length;
      
      const transit = data.filter(r => 
        (r.status || '').toUpperCase() === 'IN_TRANSIT'
      ).length;
      
      const returned = data.filter(r => 
        (r.status || '').toUpperCase() === 'RECEIVED_AT_WAREHOUSE'
      ).length;
      
      const completed = data.filter(r => 
        (r.status || '').toUpperCase() === 'COMPLETED'
      ).length;
      
      setStats({
        total: data.length,
        initiated,
        transit,
        returned,
        completed
      });
    } catch (error) {
      console.error('Error fetching RTO data:', error);
      showToast('Failed to fetch RTO records', 'error');
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
    await fetchRTOData();
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
      'RTO Reason', 
      'Sub Reason',
      'Status',
      'Created Date'
    ];
    
    const csvData = filteredRecords.map(record => [
      record.awb || '',
      record.orderId?.orderNumber || '',
      record.orderId?.customerName || '',
      record.orderId?.customerPhone || '',
      (record.orderId?.address || '').replace(/"/g, '""'),
      record.orderId?.pincode || '',
      record.courier || '',
      record.rtoReason || '',
      record.rtoSubReason || '',
      record.status || '',
      record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-IN') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rto_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('CSV exported successfully', 'success');
  };

  useEffect(() => {
    filterRecords();
  }, [search, statusFilter, courierFilter, rtoRecords]);

  const filterRecords = () => {
    let filtered = rtoRecords;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(record =>
        ((record.awb || '').toLowerCase()).includes(searchLower) ||
        ((record.orderId?.orderNumber || '').toLowerCase()).includes(searchLower) ||
        ((record.orderId?.customerName || '').toLowerCase()).includes(searchLower) ||
        ((record.orderId?.customerPhone || '').toLowerCase()).includes(searchLower)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(record => 
        (record.status || '').toUpperCase() === statusFilter
      );
    }

    if (courierFilter !== 'ALL') {
      filtered = filtered.filter(record => 
        (record.courier || '').toLowerCase() === courierFilter.toLowerCase()
      );
    }

    setFilteredRecords(filtered);
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setViewModal(true);
  };

  const handleTrack = (awb) => {
    navigate(`/merchant/tracking/${awb}`);
  };

  // Status Badge matching NDR/Shipments style
  const getStatusStyle = (status) => {
    const normalizedStatus = (status || '').toUpperCase();
    const styles = {
      'INITIATED': { background: "rgba(234,179,8,0.15)", color: "#facc15" },
      'PICKUP_SCHEDULED': { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
      'PICKED_UP': { background: "rgba(139,92,246,0.15)", color: "#a78bfa" },
      'IN_TRANSIT': { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
      'RECEIVED_AT_WAREHOUSE': { background: "rgba(139,92,246,0.15)", color: "#a78bfa" },
      'COMPLETED': { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
    };
    return styles[normalizedStatus] || { background: "rgba(148,163,184,0.15)", color: "#8896b0" };
  };

  const getStatusLabel = (status) => {
    const normalizedStatus = (status || '').toUpperCase();
    const labels = {
      'INITIATED': 'Initiated',
      'PICKUP_SCHEDULED': 'Pickup Scheduled',
      'PICKED_UP': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'RECEIVED_AT_WAREHOUSE': 'Warehouse',
      'COMPLETED': 'Completed'
    };
    return labels[normalizedStatus] || normalizedStatus;
  };

  const getReasonBadge = (reason) => {
    const reasonColors = {
      'Customer Refused': { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
      'Wrong Address': { background: 'rgba(249,115,22,0.15)', color: '#f97316' },
      'Damaged Product': { background: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
      'Wrong Product': { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
      'Delivery Failed': { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
      'Customer Cancelled': { background: 'rgba(148,163,184,0.15)', color: '#8896b0' },
      'Quality Issue': { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
      'Exchange Request': { background: 'rgba(34,197,94,0.15)', color: '#4ade80' }
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
    return icons[courier] || '📦';
  };

  const getTimeline = () => {
    return [
      'INITIATED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'IN_TRANSIT',
      'RECEIVED_AT_WAREHOUSE',
      'COMPLETED'
    ];
  };

  // Sort records by creation date (newest first)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <>
      <div className="rto-container">
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="rto-main">
          <div className="rto-header">
            <div>
              <h1 className="rto-title">RTO Management</h1>
              <p className="rto-subtitle">Return to Origin tracking and monitoring</p>
            </div>
            <div className="rto-header-actions">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`rto-btn rto-btn-refresh ${refreshing ? 'rto-btn-disabled' : ''}`}
              >
                <FaSync size={11} /> {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleExportCSV}
                className="rto-btn rto-btn-export"
              >
                <FaDownload size={11} /> Export CSV
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="rto-stats-grid">
            <div className="rto-stat-card rto-stat-total">
              <FaBox className="rto-stat-icon rto-stat-icon-total" />
              <div className="rto-stat-value">{stats.total}</div>
              <div className="rto-stat-label">Total RTO</div>
            </div>
            <div className="rto-stat-card rto-stat-initiated">
              <FaClock className="rto-stat-icon rto-stat-icon-initiated" />
              <div className="rto-stat-value">{stats.initiated}</div>
              <div className="rto-stat-label">Initiated</div>
            </div>
            <div className="rto-stat-card rto-stat-transit">
              <FaTruck className="rto-stat-icon rto-stat-icon-transit" />
              <div className="rto-stat-value">{stats.transit}</div>
              <div className="rto-stat-label">In Transit</div>
            </div>
            <div className="rto-stat-card rto-stat-returned">
              <FaUndo className="rto-stat-icon rto-stat-icon-returned" />
              <div className="rto-stat-value">{stats.returned}</div>
              <div className="rto-stat-label">Returned</div>
            </div>
            <div className="rto-stat-card rto-stat-completed">
              <FaCheckCircle className="rto-stat-icon rto-stat-icon-completed" />
              <div className="rto-stat-value">{stats.completed}</div>
              <div className="rto-stat-label">Completed</div>
            </div>
          </div>

          {/* Search + Status Filter */}
          <div className="rto-search-wrapper">
            <FaSearch className="rto-search-icon" />
            <input 
              type="text" 
              placeholder="Search by AWB, Order ID or Customer Name..." 
              className="rto-search-input"
              onChange={(e) => setSearch(e.target.value)} 
            />
            
            <div className="rto-filter-wrapper">
              <FaFilter className="rto-filter-icon" />
              <select
                className="rto-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="INITIATED">Initiated</option>
                <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED_AT_WAREHOUSE">Warehouse</option>
                <option value="COMPLETED">Completed</option>
              </select>
              
              <select
                className="rto-filter-select"
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

          <div className="rto-table-card">
            <div className="rto-table-header">
              <h3 className="rto-table-title">
                RTO Records
                <span className="rto-table-count">
                  ({sortedRecords.length} cases)
                </span>
              </h3>
            </div>
            
            <div className="rto-table-wrapper">
              {loading ? (
                <div className="rto-loading">
                  <FaSync className="rto-loading-spinner" />
                  <div>Loading RTO records...</div>
                </div>
              ) : sortedRecords.length === 0 ? (
                <div className="rto-empty">
                  <div className="rto-empty-icon">🔄</div>
                  <div className="rto-empty-title">No RTO cases found</div>
                  <div className="rto-empty-text">All returns are completed! Try adjusting your filters.</div>
                </div>
              ) : (
                <table className="rto-table">
                  <thead>
                    <tr className="rto-table-head">
                      {[
                        "AWB",
                        "CUSTOMER",
                        "COURIER",
                        "RTO REASON",
                        "STATUS",
                        "CREATED",
                        "ACTIONS"
                      ].map((h) => (
                        <th key={h} className="rto-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.map((record) => {
                      const statusStyle = getStatusStyle(record.status);
                      const statusLabel = getStatusLabel(record.status);
                      const reasonBadge = getReasonBadge(record.rtoReason);
                      const courierIcon = getCourierIcon(record.courier);
                      
                      return (
                        <tr key={record._id || record.id} className="rto-row">
                          <td className="rto-td">
                            <div className="rto-awb-wrapper">
                              <span className="rto-awb">{record.awb || 'N/A'}</span>
                              <button
                                onClick={() => handleCopyAWB(record.awb)}
                                className="rto-copy-btn"
                                title="Copy AWB"
                              >
                                <FaCopy size={12} />
                              </button>
                            </div>
                            <div className="rto-order-id">
                              {record.orderId?.orderNumber || '-'}
                            </div>
                          </td>
                          
                          <td className="rto-td">
                            <div className="rto-customer-name">
                              {record.orderId?.customerName || 'N/A'}
                            </div>
                            <div className="rto-customer-phone">
                              <FaPhone size={10} /> {record.orderId?.customerPhone || 'N/A'}
                            </div>
                          </td>
                          
                          <td className="rto-td">
                            <span className="rto-courier-badge">
                              <span>{courierIcon}</span>
                              <span>{record.courier || 'N/A'}</span>
                            </span>
                          </td>
                          
                          <td className="rto-td">
                            <span 
                              className="rto-reason-badge"
                              style={{
                                background: reasonBadge.background,
                                color: reasonBadge.color,
                              }}
                            >
                              {record.rtoReason || 'N/A'}
                            </span>
                            {record.rtoSubReason && (
                              <div className="rto-sub-reason">
                                {record.rtoSubReason}
                              </div>
                            )}
                          </td>
                          
                          <td className="rto-td">
                            <span 
                              className="rto-status-badge"
                              style={{
                                background: statusStyle.background,
                                color: statusStyle.color,
                              }}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          
                          <td className="rto-td">
                            <div className="rto-created-date">
                              {record.createdAt ? 
                                new Date(record.createdAt).toLocaleDateString('en-GB') : 
                                'N/A'
                              }
                            </div>
                            <div className="rto-created-time">
                              {record.createdAt ? 
                                new Date(record.createdAt).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                ''
                              }
                            </div>
                          </td>
                          
                          <td className="rto-td">
                            <div className="rto-actions">
                              <button
                                onClick={() => handleView(record)}
                                className="rto-btn rto-btn-view"
                              >
                                <FaEye size={11} /> View
                              </button>
                              <button
                                onClick={() => handleTrack(record.awb)}
                                className="rto-btn rto-btn-track"
                              >
                                <FaLocationArrow size={11} /> Track
                              </button>
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
        <div className="rto-modal-overlay" onClick={() => {
          setViewModal(false);
          setSelectedRecord(null);
        }}>
          <div className="rto-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rto-modal-header">
              <h2 className="rto-modal-title">
                <FaInfoCircle className="rto-modal-title-icon" />
                RTO Details
                <span 
                  className="rto-modal-status"
                  style={{
                    background: getStatusStyle(selectedRecord.status).background,
                    color: getStatusStyle(selectedRecord.status).color,
                  }}
                >
                  {getStatusLabel(selectedRecord.status)}
                </span>
              </h2>
              <button onClick={() => {
                setViewModal(false);
                setSelectedRecord(null);
              }} className="rto-modal-close">
                <FaTimes />
              </button>
            </div>
            <div className="rto-modal-body">
              {/* Order & Customer Information */}
              <div className="rto-section-title">
                <FaUser className="rto-section-icon" />
                Order & Customer Information
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">AWB Number</span>
                <span className="rto-detail-value">
                  <span className="rto-detail-awb">{selectedRecord.awb || 'N/A'}</span>
                  <button
                    onClick={() => handleCopyAWB(selectedRecord.awb)}
                    className="rto-copy-btn-modal"
                  >
                    <FaCopy size={12} /> Copy
                  </button>
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Order ID</span>
                <span className="rto-detail-value">
                  <strong>{selectedRecord.orderId?.orderNumber || '-'}</strong>
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Customer Name</span>
                <span className="rto-detail-value">
                  <strong>{selectedRecord.orderId?.customerName || 'N/A'}</strong>
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Phone Number</span>
                <span className="rto-detail-value">
                  <FaPhone className="rto-detail-phone-icon" />
                  {selectedRecord.orderId?.customerPhone || 'N/A'}
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Email</span>
                <span className="rto-detail-value">
                  {selectedRecord.orderId?.customerEmail || 'N/A'}
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Delivery Address</span>
                <span className="rto-detail-value">
                  <FaMapMarkerAlt className="rto-detail-map-icon" />
                  {selectedRecord.orderId?.address || 'N/A'}
                  <div className="rto-detail-pincode">
                    Pincode: {selectedRecord.orderId?.pincode || 'N/A'}
                  </div>
                </span>
              </div>

              {/* RTO Information */}
              <div className="rto-section-title">
                <FaTruck className="rto-section-icon" />
                RTO Information
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Courier</span>
                <span className="rto-detail-value">
                  {getCourierIcon(selectedRecord.courier)} {selectedRecord.courier || 'N/A'}
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">RTO Reason</span>
                <span className="rto-detail-value">
                  <span 
                    className="rto-reason-badge-modal"
                    style={{
                      background: getReasonBadge(selectedRecord.rtoReason).background,
                      color: getReasonBadge(selectedRecord.rtoReason).color,
                    }}
                  >
                    {selectedRecord.rtoReason || 'N/A'}
                  </span>
                  {selectedRecord.rtoSubReason && (
                    <div className="rto-sub-reason-modal">
                      Sub Reason: {selectedRecord.rtoSubReason}
                    </div>
                  )}
                </span>
              </div>

              {/* Status Information */}
              <div className="rto-section-title">
                <FaClock className="rto-section-icon" />
                Status Information
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Current Status</span>
                <span className="rto-detail-value">
                  <span 
                    className="rto-status-badge rto-status-badge-large"
                    style={{
                      background: getStatusStyle(selectedRecord.status).background,
                      color: getStatusStyle(selectedRecord.status).color,
                    }}
                  >
                    {getStatusLabel(selectedRecord.status)}
                  </span>
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Created At</span>
                <span className="rto-detail-value">
                  <FaCalendarAlt className="rto-detail-calendar-icon" />
                  {selectedRecord.createdAt ? 
                    new Date(selectedRecord.createdAt).toLocaleString('en-GB') : 
                    'N/A'
                  }
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Updated At</span>
                <span className="rto-detail-value">
                  {selectedRecord.updatedAt ? 
                    new Date(selectedRecord.updatedAt).toLocaleString('en-GB') : 
                    'N/A'
                  }
                </span>
              </div>

              {/* Timeline */}
              <div className="rto-section-title">
                <FaClock className="rto-section-icon" />
                Timeline
              </div>
              
              {getTimeline().map((item) => {
                const currentStatus = (selectedRecord.status || '').toUpperCase();
                const isActive = currentStatus === item;
                const isPast = getTimeline().indexOf(item) < getTimeline().indexOf(currentStatus);
                const isCompleted = currentStatus === 'COMPLETED';
                
                let statusIcon = '⚪';
                if (isActive || (isPast && !isCompleted)) {
                  statusIcon = '🟢';
                } else if (isCompleted && item === 'COMPLETED') {
                  statusIcon = '●';
                }
                
                return (
                  <div
                    key={item}
                    className={`rto-timeline-item ${isActive || (isPast && !isCompleted) ? 'rto-timeline-active' : 'rto-timeline-inactive'}`}
                  >
                    <span>{statusIcon}</span>
                    <span>{item.replace(/_/g, ' ')}</span>
                    {isActive && <span className="rto-timeline-current">● Current</span>}
                  </div>
                );
              })}

              {/* Remarks */}
              <div className="rto-section-title">
                <FaFileAlt className="rto-section-icon" />
                Remarks & Notes
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Remarks</span>
                <span className="rto-detail-value">
                  {selectedRecord.remarks || 'No remarks added'}
                </span>
              </div>
              
              <div className="rto-detail-row">
                <span className="rto-detail-label">Courier Remarks</span>
                <span className="rto-detail-value">
                  {selectedRecord.courierRemarks || 'No remarks from courier'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`rto-toast rto-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
};

export default MerchantRTO;