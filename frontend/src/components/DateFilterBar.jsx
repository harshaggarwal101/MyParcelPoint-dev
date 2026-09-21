import { useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import "./DateFilterBar.css";

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "last30days", label: "Last 30 Days" },
  { id: "thismonth", label: "This Month" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom Range" },
];

const DateFilterBar = ({ onFilterChange, activeFilter = "all" }) => {
  const [selectedFilter, setSelectedFilter] = useState(activeFilter);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handlePresetSelect = (id) => {
    setSelectedFilter(id);
    if (id !== "custom") {
      onFilterChange({ filter: id, startDate: "", endDate: "" });
    }
  };

  const handleCustomDateApply = (start, end) => {
    if (start && end) {
      onFilterChange({ filter: "custom", startDate: start, endDate: end });
    }
  };

  return (
    <div className="date-filter-bar">
      <div className="date-filter-title">
        <FaCalendarAlt color="#f97316" />
        <span>Date Filter:</span>
      </div>

      <div className="date-preset-pills">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`preset-pill-btn ${selectedFilter === p.id ? "active" : ""}`}
            onClick={() => handlePresetSelect(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {selectedFilter === "custom" && (
        <div className="custom-date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              handleCustomDateApply(e.target.value, endDate);
            }}
          />
          <span className="custom-date-sep">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              handleCustomDateApply(startDate, e.target.value);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DateFilterBar;
