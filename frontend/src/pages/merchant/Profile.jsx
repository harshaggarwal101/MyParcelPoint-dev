import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import "./Profile.css";

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [profile, setProfile] = useState({
    companyName: "",
    name: "",
    phone: "",
    gstNumber: "",
    panNumber: "",
    bankAccount: "",
    ifscCode: "",
    bankName: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    profilePicture: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/merchant/profile");

      setProfile({
        companyName:
          res.data.merchant?.companyName || res.data.user?.companyName || "",
        name: res.data.user?.name || "",
        phone: res.data.user?.phone || "",
        gstNumber:
          res.data.merchant?.gstNumber || res.data.user?.gstNumber || "",
        panNumber:
          res.data.merchant?.panNumber || res.data.user?.panNumber || "",
        bankAccount:
          res.data.merchant?.bankAccount || res.data.user?.accountNumber || "",
        ifscCode: res.data.merchant?.ifscCode || res.data.user?.ifscCode || "",
        bankName: res.data.merchant?.bankName || res.data.user?.bankName || "",
        address: res.data.merchant?.address || res.data.user?.address || "",
        city: res.data.user?.city || "",
        state: res.data.user?.state || "",
        pincode: res.data.user?.pincode || "",
        profilePicture:
          res.data.merchant?.profilePicture ||
          res.data.user?.profilePicture ||
          "",
      });

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Failed to load profile. Please try again.",
      );
      console.error("Fetch Profile Error:", error);
    }
  };

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      let res;

      if (imageFile) {
        const formData = new FormData();
        Object.keys(profile).forEach((key) => {
          formData.append(key, profile[key]);
        });
        formData.append("profilePicture", imageFile);

        res = await api.put("/merchant/profile", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.put("/merchant/profile", profile);
      }

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        window.dispatchEvent(new Event("userUpdated"));
      }

      await fetchProfile();
      alert(res.data?.message || "Profile Updated Successfully");

      setEditMode(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      alert(error?.response?.data?.message || "Profile Update Failed");
      console.error("Save Profile Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const [passwordMode, setPasswordMode] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const savePassword = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      alert("Please fill both old and new password");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert("New password must be at least 8 characters long");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordData.newPassword)) {
      alert(
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.",
      );
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.put("/merchant/change-password", {
        currentPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      alert(res.data.message || "Password changed successfully");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMode(false);
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to change password");
      console.error("Change Password Error:", error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancel = async () => {
    setEditMode(false);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    await fetchProfile();
  };

  // ==========================================
  // NEW: Dynamic Production & Local URL Logic
  // ==========================================
  const backendUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5001";

  const displayImage =
    imagePreview ||
    (profile.profilePicture
      ? profile.profilePicture.startsWith("http")
        ? profile.profilePicture
        : `${backendUrl}${profile.profilePicture}`
      : null);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />

      <div className="profile-container">
        <h1>My Profile</h1>

        <div style={{ width: "100%", maxWidth: "1400px" }}>
          <div className="profile-card">
            <div className="profile-header">
              <div
                className={`profile-avatar-wrapper ${editMode ? "editable" : ""}`}
                onClick={() =>
                  editMode &&
                  document.getElementById("profile-pic-upload").click()
                }
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="profile-avatar-img"
                  />
                ) : (
                  <div className="profile-avatar">
                    {profile.companyName
                      ? profile.companyName.charAt(0).toUpperCase()
                      : "M"}
                  </div>
                )}

                {editMode && (
                  <div className="profile-avatar-overlay">
                    <span>Upload</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                id="profile-pic-upload"
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleImageChange}
              />

              <div>
                <h2>{profile.companyName || "Merchant Account"}</h2>
                <p>Manage your company information and business details</p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div className="profile-stat">
                <h4>Company</h4>
                <p>{profile.companyName || "Not Added"}</p>
              </div>
              <div className="profile-stat">
                <h4>GST</h4>
                <p>{profile.gstNumber || "Not Added"}</p>
              </div>
              <div className="profile-stat">
                <h4>PAN</h4>
                <p>{profile.panNumber || "Not Added"}</p>
              </div>
              <div className="profile-stat">
                <h4>IFSC Code</h4>
                <p>{profile.ifscCode || "Not Added"}</p>
              </div>
            </div>

            <div className="profile-form">
              <input
                type="text"
                name="companyName"
                placeholder="Company Name"
                value={profile.companyName}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="name"
                placeholder="Owner Name"
                value={profile.name}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="phone"
                placeholder="Mobile Number"
                value={profile.phone}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="gstNumber"
                placeholder="GST Number"
                value={profile.gstNumber}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="panNumber"
                placeholder="PAN Number"
                value={profile.panNumber}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="bankAccount"
                placeholder="Bank Account Number"
                value={profile.bankAccount}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="ifscCode"
                placeholder="IFSC Code (e.g. SBIN0001234)"
                value={profile.ifscCode}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="bankName"
                placeholder="Bank Name & Branch"
                value={profile.bankName}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={profile.city}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="state"
                placeholder="State"
                value={profile.state}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <input
                type="text"
                name="pincode"
                placeholder="Pincode"
                value={profile.pincode}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-input" : ""}
              />
              <textarea
                name="address"
                placeholder="Address"
                value={profile.address}
                onChange={handleChange}
                readOnly={!editMode}
                className={!editMode ? "readonly-textarea" : ""}
              />

              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="edit-button"
                >
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={saveProfile}
                    disabled={loading}
                    className="save-button"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="cancel-button"
                    style={{ background: "#6b7280" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-card" style={{ marginTop: "20px" }}>
            <div className="profile-header">
              <div>
                <h2>Change Password</h2>
                <p>Update your account password</p>
              </div>
            </div>

            <div className="profile-form">
              <input
                type="password"
                name="oldPassword"
                placeholder="Current Password"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                readOnly={!passwordMode}
                className={!passwordMode ? "readonly-input" : ""}
              />
              <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                readOnly={!passwordMode}
                className={!passwordMode ? "readonly-input" : ""}
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                readOnly={!passwordMode}
                className={!passwordMode ? "readonly-input" : ""}
              />

              {!passwordMode ? (
                <button
                  onClick={() => setPasswordMode(true)}
                  className="edit-button"
                >
                  Change Password
                </button>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={savePassword}
                    disabled={passwordLoading}
                    className="save-button"
                  >
                    {passwordLoading ? "Saving..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode(false);
                      setPasswordData({
                        oldPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    disabled={passwordLoading}
                    className="cancel-button"
                    style={{ background: "#6b7280" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
