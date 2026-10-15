import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import logoImage from "../assets/logos/myParcelPoint.jpg"

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Tracking", path: "/tracking" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="container">
        {/* Logo */}
        <div className="logo">
          <Link to="/">
            <img
              src={logoImage}
              alt="MyParcelPoint Logo"
              className="logo-icon"
            />

            <span className="logo-text">
              MyParcel<span>Point</span>
            </span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div
          className={`menu-toggle ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Navigation */}
        <div className={`nav-wrapper ${menuOpen ? "active" : ""}`}>
          <nav>
            <ul>
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={location.pathname === link.path ? "active" : ""}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right Buttons */}
          <div className="nav-actions">
            <Link to="/login">
              <button className="login-btn">Sign In</button>
            </Link>

            <Link to="/register">
              <button className="register-btn">Get Started</button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;