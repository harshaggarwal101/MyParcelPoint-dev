import { useEffect, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import api from "../../services/api";
import { FaSearch } from "react-icons/fa";
import "./Users.css"; 

const Users = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data.users || []);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteUser = async (id) => {
    try {
      const confirmDelete = window.confirm("Are you sure?");
      if (!confirmDelete) return;
      await api.delete(`/admin/users/${id}`);
      alert("User Deleted");
      fetchUsers();
    } catch (error) {
      alert(error?.response?.data?.message || "Delete Failed");
    }
  };

  const toggleUserStatus = async (id, isBlocked) => {
    try {
      await api.put(`/admin/users/${id}/status`, {
        isBlocked: !isBlocked,
      });
      alert(
        !isBlocked
          ? "User Blocked Successfully"
          : "User Unblocked Successfully"
      );
      fetchUsers();
    } catch (error) {
      alert(error?.response?.data?.message || "Action Failed");
    }
  };

  const totalAdmins = users.filter(
    (user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN"
  ).length;

  const totalMerchants = users.filter(
    (user) => user.role === "MERCHANT"
  ).length;

  const pendingUsers = users.filter(
    (user) => user.role === "MERCHANT" && !user.isApproved
  ).length;

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleClass = (role) => {
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "users-role-admin";
    if (role === "MERCHANT") return "users-role-merchant";
    return "users-role-default";
  };

  return (
    <div className="users-container">
      <AdminSidebar />
      <div className="users-main">
        <div className="users-header-block">
          <h1 className="users-header-title">👥 Users Management</h1>
          <p className="users-header-subtitle">Manage platform users, admins and merchants</p>
        </div>

        <div className="users-stats-grid">
          <div className="users-stat-card users-stat-card-blue">
            <div className="users-stat-label">Total Users</div>
            <h2 className="users-stat-value">{users.length}</h2>
          </div>
          <div className="users-stat-card users-stat-card-green">
            <div className="users-stat-label">Admins</div>
            <h2 className="users-stat-value">{totalAdmins}</h2>
          </div>
          <div className="users-stat-card users-stat-card-yellow">
            <div className="users-stat-label">Merchants</div>
            <h2 className="users-stat-value">{totalMerchants}</h2>
          </div>
          <div className="users-stat-card users-stat-card-red">
            <div className="users-stat-label">Pending Users</div>
            <h2 className="users-stat-value">{pendingUsers}</h2>
          </div>
        </div>

        <div className="users-search-box">
          <FaSearch color="#94a3b8" size={16} />
          <input 
            type="text" 
            placeholder="Search users by name, email or role..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="users-search-input" 
          />
        </div>

        <div className="users-table-container">
          <div className="users-table-header">
            <h3 className="users-table-title">User List</h3>
          </div>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="users-th">NAME</th>
                  <th className="users-th">EMAIL</th>
                  <th className="users-th">ROLE</th>
                  <th className="users-th">STATUS</th>
                  <th className="users-th">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td className="users-td">
                        <div className="users-user-info">
                          <div className="users-avatar">
                            {user.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="users-user-name">{user.name}</span>
                        </div>
                      </td>
                      <td className="users-td">
                        <span className="users-email-text">{user.email}</span>
                      </td>
                      <td className="users-td">
                        <span className={`users-role-badge ${getRoleClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="users-td">
                        <span className={`users-status-badge ${user.isBlocked ? 'users-status-blocked' : 'users-status-active'}`}>
                          {user.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="users-td">
                        <div className="users-action-group">
                          <button 
                            className={`users-action-btn ${user.isBlocked ? 'users-action-btn-unblock' : 'users-action-btn-block'}`}
                            onClick={() => toggleUserStatus(user._id, user.isBlocked)}
                          >
                            {user.isBlocked ? "Unblock" : "Block"}
                          </button>
                          <button 
                            className="users-action-btn users-action-btn-delete"
                            onClick={() => deleteUser(user._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="users-no-data">No Users Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;