import React from "react";

const Header = ({ user, branch, onLogout, onRefresh }) => {
  const styles = {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "15px 30px",
      background: "rgba(0, 30, 0, 0.95)",
      borderBottom: "1px solid #00ff00",
      backdropFilter: "blur(10px)",
      zIndex: "100",
      position: "sticky",
      top: "0",
      minHeight: "70px",
    },
    logoMain: {
      fontFamily: "'Orbitron', monospace",
      fontSize: "1.8rem",
      fontWeight: "bold",
      color: "#00ff00",
      letterSpacing: "3px",
      textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
    },
    logoSub: {
      fontSize: "0.7rem",
      color: "#00aa00",
      letterSpacing: "1px",
      marginTop: "2px",
      fontFamily: "'Courier New', monospace",
    },
    center: {
      flex: "1",
      display: "flex",
      justifyContent: "center",
      margin: "0 20px",
    },
    switcher: {
      display: "flex",
      gap: "10px",
      background: "rgba(0, 0, 0, 0.4)",
      padding: "5px",
      borderRadius: "8px",
      border: "1px solid #003300",
    },
    btn: {
      background: "transparent",
      color: "#00aa00",
      border: "1px solid transparent",
      padding: "8px 20px",
      borderRadius: "6px",
      cursor: "pointer",
      fontFamily: "'Courier New', monospace",
      fontSize: "0.9rem",
      transition: "all 0.3s ease",
      minWidth: "160px",
    },
    btnActive: {
      background: "rgba(0, 100, 0, 0.4)",
      color: "#00ff00",
      borderColor: "#00ff00",
      boxShadow: "0 0 10px rgba(0, 255, 0, 0.2)",
    },
    right: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
    },
    userInfo: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "4px",
    },
    userName: {
      color: "#00ff00",
      fontSize: "0.9rem",
      fontWeight: "bold",
      fontFamily: "'Courier New', monospace",
    },
    userRole: {
      color: "#00aa00",
      fontSize: "0.75rem",
      textTransform: "uppercase",
      letterSpacing: "1px",
      fontFamily: "'Courier New', monospace",
    },
    userBranch: {
      color: "#00cc00",
      fontSize: "0.7rem",
      background: "rgba(0, 100, 0, 0.3)",
      padding: "2px 6px",
      borderRadius: "3px",
      marginTop: "2px",
      fontFamily: "'Courier New', monospace",
    },
    actions: {
      display: "flex",
      gap: "10px",
    },
    refreshBtn: {
      padding: "8px 16px",
      borderRadius: "4px",
      fontFamily: "'Courier New', monospace",
      fontSize: "0.85rem",
      cursor: "pointer",
      transition: "all 0.3s ease",
      background: "rgba(0, 100, 0, 0.3)",
      color: "#00ff00",
      border: "1px solid #00aa00",
    },
    logoutBtn: {
      padding: "8px 16px",
      borderRadius: "4px",
      fontFamily: "'Courier New', monospace",
      fontSize: "0.85rem",
      cursor: "pointer",
      transition: "all 0.3s ease",
      background: "rgba(100, 0, 0, 0.3)",
      color: "#ff5555",
      border: "1px solid #aa0000",
    },
  };

  return (
    <header style={styles.header}>
      <style>
        {`
          .header-btn:hover {
            background: rgba(0, 50, 0, 0.3) !important;
            color: #00ff00 !important;
          }
          
          .refresh-btn:hover {
            background: rgba(0, 150, 0, 0.4) !important;
            border-color: #00ff00 !important;
          }
          
          .logout-btn:hover {
            background: rgba(150, 0, 0, 0.4) !important;
            border-color: #ff0000 !important;
          }
          
          @media (max-width: 768px) {
            .app-header {
              flex-direction: column;
              gap: 15px;
              padding: 15px;
            }
            
            .header-center {
              order: 3;
              width: 100%;
              margin: 10px 0;
            }
            
            .dashboard-switcher {
              width: 100%;
              justify-content: center;
            }
            
            .header-right {
              width: 100%;
              justify-content: space-between;
            }
            
            .user-info {
              align-items: flex-start;
            }
          }
        `}
      </style>
      
      <div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={styles.logoMain}>CT226</span>
          <span style={styles.logoSub}>SLICES OF MATH</span>
        </div>
      </div>

      <div style={styles.center}>
        <div style={styles.switcher} className="dashboard-switcher">
          <button
            style={{...styles.btn, ...styles.btnActive}}
            onClick={() => {}}
          >
            📊 Orders Dashboard
          </button>
          <button
            style={styles.btn}
            onClick={() => {}}
            className="header-btn"
          >
            📈 Main Dashboard
          </button>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user?.name || "Guest"}</span>
          <span style={styles.userRole}>{user?.details?.userRole || "User"}</span>
          <span style={styles.userBranch}>{branch || "No Branch"}</span>
        </div>

        <div style={styles.actions}>
          <button
            onClick={onRefresh}
            style={styles.refreshBtn}
            className="refresh-btn"
            title="Refresh Data"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onLogout}
            style={styles.logoutBtn}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

// Make sure this line exists and is correct:
export default Header;