import { useState, useEffect } from 'react';

const tabs = [
  { id: 'autonomous', label: 'AUTONOMOUS' },
  { id: 'chat', label: 'CHAT' },
  { id: 'messages', label: 'MESSAGES' },
  { id: 'checklist', label: 'CHECKLIST' },
];

const Sidebar = ({ activeTab, onTabChange, unreadCount = 0 }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ai-mode-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
        <span className="brand-main">CT226</span>
        <span className="brand-sub">SLICES OF MATH</span>
      </div>
        <span className="sidebar-clock">{time}</span>
      </div>
      <nav className="sidebar-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            disabled={tab.soon}
          >
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'messages' && unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
            {tab.soon && <span className="soon-tag">SOON</span>}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
