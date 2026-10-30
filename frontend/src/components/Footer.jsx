const Footer = () => {
  return (
    <footer>
      <div className="footer-logo">ATTEST</div>

      <p
        style={{
          color: "#4a9eff",
          fontSize: "12px",
          letterSpacing: "2px",
          textTransform: "uppercase",
        }}
      >
        Protecting Truth Through Technology
      </p>

      <div className="footer-links">
        <a href="#platform">Platform</a>
        <a href="#documentation">Documentation</a>
        <a href="#api">API</a>
        <a href="#support">Support</a>
        <a href="#privacy">Privacy Policy</a>
        <a href="#terms">Terms of Service</a>
        <a href="#contact">Contact</a>
      </div>

      <p className="footer-text">
        © 2025-2026 ATTEST. ALL RIGHTS RESERVED. | BLOCKCHAIN EVIDENCE
        PLATFORM
      </p>
    </footer>
  );
};

export default Footer;
