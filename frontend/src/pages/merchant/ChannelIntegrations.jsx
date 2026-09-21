import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaStore, FaPlus, FaSync, FaTrash, FaCheckCircle, FaExclamationCircle, FaShoppingBag, FaPlug, FaGlobe, FaToggleOn, FaToggleOff, FaSpinner, FaTimes, FaShoppingCart, FaBoxOpen } from "react-icons/fa";
import "./ChannelIntegrations.css";

const CHANNEL_TYPES = [
  {
    id: "SHOPIFY",
    name: "Shopify",
    description: "Auto-sync orders, inventory & fulfillments directly from your Shopify store.",
    icon: <FaShoppingBag className="channel-type-icon shopify" />,
    color: "#96bf48",
    badge: "Popular",
    fields: [
      { name: "storeName", label: "Store Name", placeholder: "My Shopify Store" },
      { name: "storeUrl", label: "Shopify Store Domain", placeholder: "mystore.myshopify.com" },
      { name: "accessToken", label: "Admin API Access Token", placeholder: "shpat_xxxxxxxxxxxxxxxx" },
    ],
  },
  {
    id: "WOOCOMMERCE",
    name: "WooCommerce",
    description: "Connect your WordPress WooCommerce store via REST API keys.",
    icon: <FaShoppingCart className="channel-type-icon woocommerce" />,
    color: "#96588a",
    badge: "Popular",
    fields: [
      { name: "storeName", label: "Store Name", placeholder: "My WooCommerce Shop" },
      { name: "storeUrl", label: "Website URL", placeholder: "https://example.com" },
      { name: "apiKey", label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxxxxx" },
      { name: "apiSecret", label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxxxxx" },
    ],
  },
  {
    id: "CUSTOM",
    name: "Custom Webhook / API",
    description: "Connect custom website via Webhooks & MyParcelPoint REST API.",
    icon: <FaPlug className="channel-type-icon custom" />,
    color: "#2563eb",
    badge: "Flexible",
    fields: [
      { name: "storeName", label: "Integration Name", placeholder: "Custom E-Commerce API" },
      { name: "storeUrl", label: "Website Domain", placeholder: "https://mybrand.com" },
      { name: "apiKey", label: "API Key / Secret Token", placeholder: "secret_token_xxxxxxxx" },
    ],
  },
];

const UPCOMING_CHANNELS = [
  { name: "Magento 2", icon: <FaBoxOpen className="channel-type-icon magento" /> },
  { name: "Amazon IN", icon: <FaStore className="channel-type-icon amazon" /> },
];


const ChannelIntegrations = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(CHANNEL_TYPES[0]);
  const [formData, setFormData] = useState({
    storeName: "",
    storeUrl: "",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await api.get("/channels");
      setChannels(res.data.channels || []);
    } catch (err) {
      console.error("Error fetching channels:", err);
    } finally {
      setLoading(false);
    }
  };

  const openConnectModal = (type) => {
    setSelectedType(type);
    setFormData({
      storeName: "",
      storeUrl: "",
      apiKey: "",
      apiSecret: "",
      accessToken: "",
    });
    setMessage({ text: "", type: "" });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConnectStore = async (e) => {
    e.preventDefault();
    if (!formData.storeName || !formData.storeUrl) {
      setMessage({ text: "Please enter Store Name and Store URL", type: "error" });
      return;
    }

    try {
      setSubmitLoading(true);
      setMessage({ text: "", type: "" });
      const res = await api.post("/channels", {
        channelName: selectedType.id,
        ...formData,
      });

      alert(res.data.message || "Store connected successfully!");
      setModalOpen(false);
      fetchChannels();
    } catch (err) {
      setMessage({
        text: err?.response?.data?.message || "Failed to connect store. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleAutoSync = async (id) => {
    try {
      const res = await api.patch(`/channels/${id}/toggle-sync`);
      setChannels(channels.map((c) => (c._id === id ? res.data.channel : c)));
    } catch {
      alert("Failed to toggle auto-sync");
    }
  };

  const handleSyncOrders = async (id) => {
    try {
      setSyncingId(id);
      const res = await api.post(`/channels/${id}/sync`);
      alert(res.data.message);
      fetchChannels();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to sync orders");
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (id, name) => {
    if (!window.confirm(`Are you sure you want to disconnect '${name}'?`)) return;

    try {
      await api.delete(`/channels/${id}`);
      setChannels(channels.filter((c) => c._id !== id));
      alert("Store disconnected successfully");
    } catch {
      alert("Failed to disconnect store");
    }
  };

  const getChannelIcon = (name) => {
    switch (name) {
      case "SHOPIFY":
        return <FaShoppingBag className="connected-card-icon shopify" />;
      case "WOOCOMMERCE":
        return <FaShoppingCart className="connected-card-icon woocommerce" />;
      default:
        return <FaPlug className="connected-card-icon custom" />;
    }
  };

  return (
    <div className="channels-page-container">
      <div className="channels-sidebar">
        <Sidebar />
      </div>

      <main className="channels-main-content">
        {/* PAGE HEADER */}
        <div className="channels-header">
          <div>
            <h1 className="channels-title">Channel Integrations</h1>
            <p className="channels-subtitle">
              Connect your Shopify, WooCommerce, or custom online stores to automatically sync orders & tracking.
            </p>
          </div>
        </div>

        {/* CONNECTED STORES SECTION */}
        <section className="channels-section">
          <h2 className="section-title">
            <FaStore /> Connected Stores ({channels.length})
          </h2>

          {loading ? (
            <div className="loading-state">
              <FaSpinner className="spin-icon" /> Loading your store integrations...
            </div>
          ) : channels.length > 0 ? (
            <div className="connected-grid">
              {channels.map((ch) => (
                <div key={ch._id} className="connected-card">
                  <div className="connected-card-header">
                    <div className="channel-icon-wrapper">{getChannelIcon(ch.channelName)}</div>
                    <div className="channel-info">
                      <h3>{ch.storeName}</h3>
                      <a href={ch.storeUrl} target="_blank" rel="noreferrer" className="store-link">
                        <FaGlobe /> {ch.storeUrl}
                      </a>
                    </div>
                    <span className="status-badge active">
                      <FaCheckCircle /> Connected
                    </span>
                  </div>

                  <div className="connected-card-body">
                    <div className="stat-row">
                      <span>Channel Type</span>
                      <strong>{ch.channelName}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Last Synced</span>
                      <strong>
                        {ch.lastSyncedAt
                          ? new Date(ch.lastSyncedAt).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Never"}
                      </strong>
                    </div>
                    <div className="stat-row">
                      <span>Auto Order Sync</span>
                      <button
                        onClick={() => handleToggleAutoSync(ch._id)}
                        className={`toggle-btn ${ch.autoSync ? "on" : "off"}`}
                        title="Toggle Auto-Sync"
                      >
                        {ch.autoSync ? <FaToggleOn /> : <FaToggleOff />}
                        <span>{ch.autoSync ? "Enabled" : "Disabled"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="connected-card-actions">
                    <button
                      onClick={() => handleSyncOrders(ch._id)}
                      disabled={syncingId === ch._id}
                      className="btn-sync"
                    >
                      <FaSync className={syncingId === ch._id ? "spin-icon" : ""} />
                      {syncingId === ch._id ? "Syncing..." : "Sync Orders Now"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(ch._id, ch.storeName)}
                      className="btn-disconnect"
                      title="Disconnect Store"
                    >
                      <FaTrash /> Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FaShoppingBag className="empty-icon" />
              <h3>No Stores Connected Yet</h3>
              <p>Connect your first e-commerce store below to start auto-importing orders into MyParcelPoint.</p>
            </div>
          )}
        </section>

        {/* AVAILABLE INTEGRATIONS SECTION */}
        <section className="channels-section">
          <h2 className="section-title">
            <FaPlug /> Available Integrations
          </h2>

          <div className="available-grid">
            {CHANNEL_TYPES.map((type) => (
              <div key={type.id} className="available-card">
                <div className="available-card-top">
                  {type.icon}
                  {type.badge && <span className="type-badge">{type.badge}</span>}
                </div>
                <h3>{type.name}</h3>
                <p>{type.description}</p>

                <button onClick={() => openConnectModal(type)} className="btn-connect">
                  <FaPlus /> Connect {type.name}
                </button>
              </div>
            ))}

          </div>
        </section>

        {/* MODAL: CONNECT STORE */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-header-title">
                  {selectedType.icon}
                  <div>
                    <h2>Connect {selectedType.name}</h2>
                    <p>Enter your store credentials to authorize order syncing</p>
                  </div>
                </div>
                <button className="close-btn" onClick={() => setModalOpen(false)}>
                  <FaTimes />
                </button>
              </div>

              {message.text && (
                <div className={`modal-alert ${message.type}`}>
                  <FaExclamationCircle /> {message.text}
                </div>
              )}

              <form onSubmit={handleConnectStore} className="modal-form">
                {selectedType.fields.map((field) => (
                  <div key={field.name} className="form-group">
                    <label>{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ""}
                      onChange={handleInputChange}
                      required={field.name === "storeName" || field.name === "storeUrl"}
                    />
                  </div>
                ))}

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setModalOpen(false)}
                    disabled={submitLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={submitLoading}>
                    {submitLoading ? (
                      <>
                        <FaSpinner className="spin-icon" /> Connecting...
                      </>
                    ) : (
                      <>Connect Store</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChannelIntegrations;
