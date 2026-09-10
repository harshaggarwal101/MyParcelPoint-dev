import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Checkbox,
  Autocomplete,
  TextField as MuiTextField,
  InputAdornment,
  TablePagination,
  Skeleton,
  Box as MuiBox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warehouse as WarehouseIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import Sidebar from "../../components/Sidebar";
import "./Warehouse.css";

const Warehouse = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    warehouseName: '',
    warehouseCode: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    alternatePhone: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    warehouseType: 'MAIN',
    dailyCapacity: '',
    pickupStartTime: '',
    pickupEndTime: '',
    workingDays: [],
    pickupInstructions: '',
    allowCOD: false,
    allowReversePickup: false,
    isDefault: false,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    warehouseId: null,
    warehouseName: "",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    filterWarehouses();
  }, [warehouses, searchQuery, filterStatus]);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      showSnackbar('Failed to fetch warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterWarehouses = () => {
    let filtered = [...warehouses];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.warehouseName?.toLowerCase().includes(query) ||
          w.warehouseCode?.toLowerCase().includes(query) ||
          w.companyName?.toLowerCase().includes(query) ||
          w.city?.toLowerCase().includes(query) ||
          w.contactPerson?.toLowerCase().includes(query)
      );
    }

    if (filterStatus === 'ACTIVE') {
      filtered = filtered.filter((w) => w.isActive);
    } else if (filterStatus === 'INACTIVE') {
      filtered = filtered.filter((w) => !w.isActive);
    } else if (filterStatus === 'DEFAULT') {
      filtered = filtered.filter((w) => w.isDefault);
    }

    setFilteredWarehouses(filtered);
  };

  const handleOpenDialog = (warehouse = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        warehouseName: warehouse.warehouseName || '',
        warehouseCode: warehouse.warehouseCode || '',
        companyName: warehouse.companyName || '',
        contactPerson: warehouse.contactPerson || '',
        phone: warehouse.phone || '',
        alternatePhone: warehouse.alternatePhone || '',
        email: warehouse.email || '',
        gstNumber: warehouse.gstNumber || '',
        panNumber: warehouse.panNumber || '',
        addressLine1: warehouse.addressLine1 || '',
        addressLine2: warehouse.addressLine2 || '',
        landmark: warehouse.landmark || '',
        city: warehouse.city || '',
        state: warehouse.state || '',
        pincode: warehouse.pincode || '',
        country: warehouse.country || 'India',
        warehouseType: warehouse.warehouseType || 'MAIN',
        dailyCapacity: warehouse.dailyCapacity || '',
        pickupStartTime: warehouse.pickupStartTime || '',
        pickupEndTime: warehouse.pickupEndTime || '',
        workingDays: warehouse.workingDays || [],
        pickupInstructions: warehouse.pickupInstructions || '',
        allowCOD: warehouse.allowCOD || false,
        allowReversePickup: warehouse.allowReversePickup || false,
        isDefault: warehouse.isDefault || false,
        isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        warehouseName: '',
        warehouseCode: '',
        companyName: '',
        contactPerson: '',
        phone: '',
        alternatePhone: '',
        email: '',
        gstNumber: '',
        panNumber: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        warehouseType: 'MAIN',
        dailyCapacity: '',
        pickupStartTime: '',
        pickupEndTime: '',
        workingDays: [],
        pickupInstructions: '',
        allowCOD: false,
        allowReversePickup: false,
        isDefault: false,
        isActive: true,
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWarehouse(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.warehouseName.trim()) {
      errors.warehouseName = 'Warehouse name is required';
    }
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    if (!formData.contactPerson.trim()) {
      errors.contactPerson = 'Contact person is required';
    }
    if (!formData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Phone number must be 10 digits';
    }
    if (formData.alternatePhone && !/^\d{10}$/.test(formData.alternatePhone)) {
      errors.alternatePhone = 'Alternate phone number must be 10 digits';
    }
    if (formData.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (formData.gstNumber && !/^[A-Z0-9]{15}$/.test(formData.gstNumber)) {
      errors.gstNumber = 'GST number must be 15 characters';
    }
    if (formData.panNumber && !/^[A-Z0-9]{10}$/.test(formData.panNumber)) {
      errors.panNumber = 'PAN number must be 10 characters';
    }
    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 is required';
    }
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    if (!formData.pincode) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = 'Pincode must be 6 digits';
    }
    if (formData.pickupStartTime && formData.pickupEndTime) {
      if (formData.pickupStartTime >= formData.pickupEndTime) {
        errors.pickupEndTime = 'Pickup end time must be after start time';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const url = editingWarehouse
        ? `/warehouses/${editingWarehouse._id}`
        : '/warehouses';
      const method = editingWarehouse ? 'put' : 'post';

      const submitData = { ...formData };
      delete submitData.warehouseCode;

      const response = await api[method](url, submitData);

      if (response.data.success) {
        showSnackbar(
          editingWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully',
          'success'
        );
        handleCloseDialog();
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      showSnackbar(
        error.response?.data?.message || 'Failed to save warehouse',
        'error'
      );
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/warehouses/${deleteDialog.warehouseId}`);

      if (response.data.success) {
        showSnackbar('Warehouse deleted successfully', 'success');
        setDeleteDialog({ open: false, warehouseId: null, warehouseName: "" });
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      showSnackbar(
        error.response?.data?.message || 'Failed to delete warehouse',
        'error'
      );
    }
  };

  const handleSetDefault = async (warehouseId) => {
    try {
      const response = await api.patch(`/warehouses/${warehouseId}/default`);

      if (response.data.success) {
        showSnackbar('Default warehouse updated successfully', 'success');
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error setting default warehouse:', error);
      showSnackbar('Failed to set default warehouse', 'error');
    }
  };

  const handleToggleStatus = async (warehouseId, currentStatus) => {
    try {
      const response = await api.put(`/warehouses/${warehouseId}`, {
        isActive: !currentStatus,
      });

      if (response.data.success) {
        showSnackbar(`Warehouse ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error toggling warehouse status:', error);
      showSnackbar('Failed to update warehouse status', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: 'success' });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (isActive) => {
    return isActive ? (
      <Chip label="Active" color="success" size="small" />
    ) : (
      <Chip label="Inactive" color="error" size="small" />
    );
  };

  const getTypeChip = (type) => {
    const typeMap = {
      MAIN: { color: 'primary', label: 'Main' },
      BRANCH: { color: 'secondary', label: 'Branch' },
      FULFILLMENT: { color: 'info', label: 'Fulfillment' },
    };
    const config = typeMap[type] || { color: 'default', label: type };
    return <Chip label={config.label} color={config.color} size="small" variant="outlined" />;
  };

  const workingDaysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const renderSkeleton = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index}>
        <TableCell><Skeleton variant="text" /></TableCell>
        <TableCell><Skeleton variant="text" /></TableCell>
        <TableCell><Skeleton variant="text" /></TableCell>
        <TableCell><Skeleton variant="text" /></TableCell>
        <TableCell><Skeleton variant="text" /></TableCell>
        <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
        <TableCell><Skeleton variant="rectangular" width={40} height={24} /></TableCell>
        <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
        <TableCell><Skeleton variant="rectangular" width={120} height={36} /></TableCell>
      </TableRow>
    ));
  };

  const renderEmptyState = () => (
    <div className="warehouse-empty-state">
      <WarehouseIcon className="warehouse-empty-icon" />
      <Typography className="warehouse-empty-title">
        No Warehouses Found
      </Typography>
      <Typography className="warehouse-empty-subtitle">
        {searchQuery || filterStatus !== 'ALL' 
          ? 'No warehouses match your search criteria' 
          : 'Get started by creating your first warehouse'}
      </Typography>
      {!searchQuery && filterStatus === 'ALL' && (
        <button className="warehouse-empty-btn" onClick={() => handleOpenDialog()}>
          <AddIcon /> Add Warehouse
        </button>
      )}
    </div>
  );

  return (
    <div className="merchant-scope">
      <div className="warehouse-container">
        <div className="warehouse-sidebar">
          <Sidebar />
        </div>

        <main className="warehouse-main">
          {/* Orange Gradient Header */}
          <div className="warehouse-header">
            <div className="warehouse-header-left">
              <div className="warehouse-header-icon">
                <WarehouseIcon />
              </div>
              <div>
                <h1 className="warehouse-header-title">Warehouses</h1>
                <p className="warehouse-header-subtitle">Manage your warehouse locations</p>
              </div>
            </div>
            <div className="warehouse-header-actions">
              <button className="warehouse-header-btn warehouse-header-btn-primary" onClick={() => handleOpenDialog()}>
                <AddIcon /> Add Warehouse
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="warehouse-stats-grid">
            <div className="warehouse-stat-card">
              <div className="warehouse-stat-label">Total Warehouses</div>
              <div className="warehouse-stat-value">{warehouses.length}</div>
            </div>
            <div className="warehouse-stat-card">
              <div className="warehouse-stat-label">Active</div>
              <div className="warehouse-stat-value success">
                {warehouses.filter((w) => w.isActive).length}
              </div>
            </div>
            <div className="warehouse-stat-card">
              <div className="warehouse-stat-label">Default</div>
              <div className="warehouse-stat-value primary">
                {warehouses.filter((w) => w.isDefault).length}
              </div>
            </div>
            <div className="warehouse-stat-card">
              <div className="warehouse-stat-label">Total Capacity</div>
              <div className="warehouse-stat-value orange">
                {warehouses.reduce((sum, w) => sum + (parseInt(w.dailyCapacity) || 0), 0)}
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="warehouse-search-filter">
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  placeholder="Search warehouses by name, code, company, city, or contact person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#f97316" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Filter by Status"
                  >
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                    <MenuItem value="DEFAULT">Default</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </div>

          {/* Warehouse Table */}
          <div className="warehouse-table-wrapper">
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Warehouse</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell align="center">Default</TableCell>
                    <TableCell align="center">COD</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    renderSkeleton()
                  ) : filteredWarehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ p: 0 }}>
                        {renderEmptyState()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWarehouses
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((warehouse) => (
                        <TableRow key={warehouse._id} hover>
                          <TableCell>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: "14px" }}>
                                {warehouse.warehouseName}
                              </span>
                              {warehouse.isDefault && (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  color: "#38bdf8",
                                  background: "rgba(56, 189, 248, 0.12)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  width: "fit-content"
                                }}>
                                  ★ Primary
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span style={{
                              fontFamily: 'monospace',
                              color: '#fb923c',
                              background: 'rgba(249, 115, 22, 0.12)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {warehouse.warehouseCode}
                            </span>
                          </TableCell>
                          <TableCell style={{ color: "#cbd5e1" }}>{warehouse.companyName || "-"}</TableCell>
                          <TableCell style={{ color: "#cbd5e1" }}>{warehouse.city || "-"}</TableCell>
                          <TableCell style={{ color: "#cbd5e1" }}>{warehouse.state || "-"}</TableCell>
                          <TableCell style={{ color: "#cbd5e1" }}>{warehouse.phone || "-"}</TableCell>
                          <TableCell align="center">
                            {warehouse.isDefault ? (
                              <Chip 
                                label="Default" 
                                size="small" 
                                sx={{ 
                                  bgcolor: 'rgba(59, 130, 246, 0.2)', 
                                  color: '#60a5fa', 
                                  fontWeight: 700, 
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  borderRadius: '6px'
                                }} 
                              />
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleSetDefault(warehouse._id)}
                                sx={{
                                  color: '#94a3b8',
                                  borderColor: '#334155',
                                  fontSize: '11px',
                                  textTransform: 'none',
                                  borderRadius: '6px',
                                  py: 0.4,
                                  px: 1,
                                  '&:hover': {
                                    borderColor: '#f97316',
                                    color: '#f97316',
                                    bgcolor: 'rgba(249, 115, 22, 0.08)'
                                  }
                                }}
                              >
                                Set Default
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {warehouse.allowCOD ? (
                              <Chip label="Yes" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600, borderRadius: '6px' }} />
                            ) : (
                              <Chip label="No" size="small" sx={{ bgcolor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', borderRadius: '6px' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {warehouse.isActive ? (
                              <Chip label="Active" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 600, borderRadius: '6px' }} />
                            ) : (
                              <Chip label="Inactive" size="small" sx={{ bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 600, borderRadius: '6px' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <Tooltip title="Toggle Status">
                                <Switch
                                  checked={warehouse.isActive}
                                  onChange={() => handleToggleStatus(warehouse._id, warehouse.isActive)}
                                  size="small"
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: '#f97316',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: '#f97316',
                                    },
                                  }}
                                />
                              </Tooltip>
                              <Tooltip title="Edit Warehouse">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(warehouse)}
                                  sx={{ color: '#38bdf8', '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Warehouse">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      warehouseId: warehouse._id,
                                      warehouseName: warehouse.warehouseName,
                                    })
                                  }
                                  sx={{ color: '#f87171', '&:hover': { bgcolor: 'rgba(248, 113, 113, 0.1)' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredWarehouses.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </div>

        {/* ============================================ */}
        {/* ADD/EDIT DIALOG - PROFESSIONAL CARDS LAYOUT */}
        {/* ============================================ */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          PaperProps={{
            sx: {
              maxWidth: '1000px',
              borderRadius: 4,
              width: '100%',
              maxHeight: '90vh',
            }
          }}
          className="warehouse-dialog"
        >
          <DialogTitle sx={{ 
            fontWeight: 700, 
            color: '#0f172a', 
            padding: '24px 32px 16px 32px',
            fontSize: '20px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
          </DialogTitle>
          
          <DialogContent sx={{ padding: '32px' }}>
            <Grid container spacing={3}>
              
              {/* ===== SECTION 1: BASIC INFORMATION ===== */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ 
                  p: 3, 
                  border: '1px solid #f1f5f9', 
                  borderRadius: 3,
                  backgroundColor: '#fafbfc',
                }}>
                  <Typography sx={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <Box sx={{ 
                      width: '4px', 
                      height: '18px', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }} />
                    Basic Information
                  </Typography>
                  
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Warehouse Name *"
                        name="warehouseName"
                        value={formData.warehouseName}
                        onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
                        required
                        error={!!formErrors.warehouseName}
                        helperText={formErrors.warehouseName}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Company Name *"
                        name="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                        error={!!formErrors.companyName}
                        helperText={formErrors.companyName}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Contact Person *"
                        name="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        required
                        error={!!formErrors.contactPerson}
                        helperText={formErrors.contactPerson}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Phone Number *"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        required
                        error={!!formErrors.phone}
                        helperText={formErrors.phone}
                        inputProps={{ maxLength: 10 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Alternate Phone"
                        name="alternatePhone"
                        value={formData.alternatePhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            alternatePhone: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        error={!!formErrors.alternatePhone}
                        helperText={formErrors.alternatePhone || 'Optional'}
                        inputProps={{ maxLength: 10 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={!!formErrors.email}
                        helperText={formErrors.email || 'Optional'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="GST Number"
                        name="gstNumber"
                        value={formData.gstNumber}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                        error={!!formErrors.gstNumber}
                        helperText={formErrors.gstNumber || 'Optional • 15 characters'}
                        inputProps={{ maxLength: 15 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="PAN Number"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        error={!!formErrors.panNumber}
                        helperText={formErrors.panNumber || 'Optional • 10 characters'}
                        inputProps={{ maxLength: 10 }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* ===== SECTION 2: ADDRESS ===== */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ 
                  p: 3, 
                  border: '1px solid #f1f5f9', 
                  borderRadius: 3,
                  backgroundColor: '#fafbfc',
                }}>
                  <Typography sx={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <Box sx={{ 
                      width: '4px', 
                      height: '18px', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }} />
                    Address
                  </Typography>
                  
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address Line 1 *"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                        required
                        error={!!formErrors.addressLine1}
                        helperText={formErrors.addressLine1}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address Line 2"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                        helperText="Optional"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Landmark"
                        name="landmark"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        helperText="Optional"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="City *"
                        name="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        error={!!formErrors.city}
                        helperText={formErrors.city}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="State *"
                        name="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                        error={!!formErrors.state}
                        helperText={formErrors.state}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Pincode *"
                        name="pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        required
                        error={!!formErrors.pincode}
                        helperText={formErrors.pincode || '6 digits'}
                        inputProps={{ maxLength: 6 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Country"
                        name="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* ===== SECTION 3: WAREHOUSE DETAILS ===== */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ 
                  p: 3, 
                  border: '1px solid #f1f5f9', 
                  borderRadius: 3,
                  backgroundColor: '#fafbfc',
                }}>
                  <Typography sx={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <Box sx={{ 
                      width: '4px', 
                      height: '18px', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }} />
                    Warehouse Details
                  </Typography>
                  
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Warehouse Type</InputLabel>
                        <Select
                          name="warehouseType"
                          value={formData.warehouseType}
                          onChange={(e) => setFormData({ ...formData, warehouseType: e.target.value })}
                          label="Warehouse Type"
                        >
                          <MenuItem value="MAIN">Main</MenuItem>
                          <MenuItem value="BRANCH">Branch</MenuItem>
                          <MenuItem value="FULFILLMENT">Fulfillment</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Daily Capacity (Orders)"
                        name="dailyCapacity"
                        type="number"
                        value={formData.dailyCapacity}
                        onChange={(e) => setFormData({ ...formData, dailyCapacity: e.target.value })}
                        helperText="Optional"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="isDefault"
                            checked={formData.isDefault}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#f97316' } }}
                          />
                        }
                        label="Default Warehouse"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* ===== SECTION 4: PICKUP SCHEDULE ===== */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ 
                  p: 3, 
                  border: '1px solid #f1f5f9', 
                  borderRadius: 3,
                  backgroundColor: '#fafbfc',
                }}>
                  <Typography sx={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <Box sx={{ 
                      width: '4px', 
                      height: '18px', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }} />
                    Pickup Schedule
                  </Typography>
                  
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Pickup Start Time"
                        name="pickupStartTime"
                        type="time"
                        value={formData.pickupStartTime}
                        onChange={(e) => setFormData({ ...formData, pickupStartTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Pickup End Time"
                        name="pickupEndTime"
                        type="time"
                        value={formData.pickupEndTime}
                        onChange={(e) => setFormData({ ...formData, pickupEndTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        error={!!formErrors.pickupEndTime}
                        helperText={formErrors.pickupEndTime || 'Must be after start time'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Autocomplete
                        multiple
                        options={workingDaysList}
                        value={formData.workingDays}
                        onChange={(event, newValue) => {
                          setFormData({ ...formData, workingDays: newValue });
                        }}
                        renderInput={(params) => (
                          <MuiTextField
                            {...params}
                            label="Working Days"
                            placeholder="Select working days"
                            size="small"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              {...getTagProps({ index })}
                              size="small"
                              sx={{ 
                                backgroundColor: '#f1f5f9', 
                                color: '#0f172a',
                                fontWeight: 500,
                                '&:hover': {
                                  backgroundColor: '#e2e8f0',
                                }
                              }}
                            />
                          ))
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#ffffff',
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Pickup Instructions"
                        name="pickupInstructions"
                        value={formData.pickupInstructions}
                        onChange={(e) => setFormData({ ...formData, pickupInstructions: e.target.value })}
                        multiline
                        rows={2}
                        helperText="Optional"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#ffffff',
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* ===== SECTION 5: SETTINGS ===== */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ 
                  p: 3, 
                  border: '1px solid #f1f5f9', 
                  borderRadius: 3,
                  backgroundColor: '#fafbfc',
                }}>
                  <Typography sx={{ 
                    fontSize: '15px', 
                    fontWeight: 600, 
                    color: '#0f172a',
                    mb: 2,
                    pb: 1,
                    borderBottom: '2px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <Box sx={{ 
                      width: '4px', 
                      height: '18px', 
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }} />
                    Settings
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="allowCOD"
                            checked={formData.allowCOD}
                            onChange={(e) => setFormData({ ...formData, allowCOD: e.target.checked })}
                            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#f97316' } }}
                          />
                        }
                        label="Allow COD"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="allowReversePickup"
                            checked={formData.allowReversePickup}
                            onChange={(e) => setFormData({ ...formData, allowReversePickup: e.target.checked })}
                            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#f97316' } }}
                          />
                        }
                        label="Allow Reverse Pickup"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ 
            padding: '16px 32px 24px 32px', 
            borderTop: '1px solid #f1f5f9',
            gap: '12px',
          }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                color: '#64748b',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: 'rgba(249, 115, 22, 0.05)',
                  color: '#f97316',
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ============================================ */}
        {/* DELETE CONFIRMATION DIALOG */}
        {/* ============================================ */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, warehouseId: null, warehouseName: "" })}
          className="warehouse-delete-dialog"
          PaperProps={{
            sx: {
              borderRadius: 4,
              maxWidth: '500px',
            }
          }}
        >
          <DialogTitle sx={{ 
            color: '#dc2626', 
            fontWeight: 700,
            borderBottom: '1px solid #f1f5f9',
            padding: '24px 28px 16px 28px',
          }}>
            Delete Warehouse
          </DialogTitle>
          <DialogContent sx={{ padding: '24px 28px' }}>
            <Typography>
              Are you sure you want to delete{" "}
              <strong>{deleteDialog.warehouseName}</strong>?
              <br />
              <span style={{ color: '#6b7280', fontSize: '14px', display: 'block', marginTop: '8px' }}>
                This action cannot be undone.
              </span>
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            padding: '16px 28px 24px 28px',
            borderTop: '1px solid #f1f5f9',
            gap: '12px',
          }}>
            <Button 
              onClick={() => setDeleteDialog({ open: false, warehouseId: null, warehouseName: "" })}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              onClick={handleDelete}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  </div>
  );
};

export default Warehouse;