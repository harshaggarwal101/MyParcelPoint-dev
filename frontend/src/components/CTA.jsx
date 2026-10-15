import "./CTA.css";
import { Link } from "react-router-dom";
function CTA() {
  return (
    <section className="cta">
      <div className="cta-content">
        <span>START SHIPPING TODAY</span>

        <h2>Ready To Ship Smarter?</h2>

        <p>
          Manage orders, compare courier rates, generate AWBs, track shipments
          and handle returns from a single logistics platform.
        </p>

        <div className="cta-buttons">
          <Link to="/register">
            <button className="cta-primary">Start Shipping</button>
          </Link>
          <Link to="/tracking">
            <button className="cta-secondary">Track Shipment</button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CTA;