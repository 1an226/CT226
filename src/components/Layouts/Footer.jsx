import React from "react";
// Remove this import since we'll use inline styles or move the CSS
// import "./Footer.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Inline styles to avoid file not found error
  const styles = {
    footer: {
      background: "rgba(0, 30, 0, 0.95)",
      borderTop: "1px solid #00ff00",
      backdropFilter: "blur(10px)",
      padding: "15px 30px",
      marginTop: "auto",
    },
    content: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "20px",
    },
    brand: {
      color: "#00ff00",
      fontFamily: "'Orbitron', monospace",
      fontSize: "0.9rem",
      fontWeight: "500",
      letterSpacing: "1px",
    },
    status: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 15px",
      background: "rgba(0, 50, 0, 0.3)",
      borderRadius: "20px",
      border: "1px solid #003300",
    },
    dot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      backgroundColor: "#00ff00",
      boxShadow: "0 0 8px rgba(0, 255, 0, 0.5)",
      animation: "pulse 2s infinite",
    },
    info: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
      color: "#00aa00",
      fontSize: "0.8rem",
      fontFamily: "'Courier New', monospace",
    },
    bottom: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "15px",
      paddingTop: "15px",
      borderTop: "1px solid rgba(0, 50, 0, 0.5)",
      color: "#006600",
      fontSize: "0.75rem",
      fontFamily: "'Courier New', monospace",
    },
    infoItem: {
      padding: "4px 8px",
      background: "rgba(0, 0, 0, 0.3)",
      borderRadius: "4px",
      border: "1px solid #003300",
    },
  };

  return (
    <footer style={styles.footer}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          @media (max-width: 768px) {
            .footer-content { flex-direction: column; gap: 15px; text-align: center; }
            .footer-info { flex-direction: column; gap: 8px; }
            .footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
          }
        `}
      </style>
      
      <div style={styles.content} className="footer-content">
        <div>
          <span style={styles.brand}>CT226 • DDS Integration System</span>
        </div>

        <div>
          <div style={styles.status}>
            <span style={styles.dot}></span>
            <span style={{color: "#00aa00", fontSize: "0.8rem", fontFamily: "'Courier New', monospace"}}>
              System Online
            </span>
          </div>
        </div>

        <div style={styles.info} className="footer-info">
          <span style={styles.infoItem}>API: mbnl.ddsolutions.tech</span>
          <span style={styles.infoItem}>
            {new Date().toLocaleDateString("en-KE", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span style={styles.infoItem}>
            {new Date().toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        </div>
      </div>

      <div style={styles.bottom} className="footer-bottom">
        <span style={{opacity: "0.8"}}>
          © {currentYear} CT226 Systems. All rights reserved.
        </span>
        <span style={{color: "#00aa00", fontWeight: "bold", opacity: "0.8"}}>
          v1.0.0
        </span>
      </div>
    </footer>
  );
};

export default Footer;