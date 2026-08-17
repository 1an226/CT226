import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AutonomousWorkflow from './AutonomousWorkflow';
import ChatInterface from './ChatInterface';
import Messages from './Messages';
import Checklist from './Checklist';
import agentDataService from '@services/agentDataService';
import agentRuntime from '@services/agentRuntime';
import orderCreationService, { onOrderAudit, getAuditLog } from '@services/orderCreationService';
import './AiMode.css';

const AiMode = ({ user, selectedBranches, onLogout, onClose }) => {
  const [activeTab, setActiveTab] = useState('autonomous');
  const [dataReady, setDataReady] = useState(agentDataService.isReady());
  const [unreadCount, setUnreadCount] = useState(0);
  const [logs, setLogs] = useState([]);

  // Load agent data once
  useEffect(() => {
    if (!agentDataService.isReady()) {
      agentDataService.loadAllData().then(() => setDataReady(true)).catch(() => {});
    } else {
      setDataReady(true);
    }
  }, []);

  // Subscribe to agent events – only add the summary once
  useEffect(() => {
    let summaryAdded = false;
    const unsubscribe = agentRuntime.onProgress((event) => {
      setLogs(prev => {
        // Skip duplicate summary
        if (event.emoji === '' && summaryAdded) return prev;
        if (event.emoji === '') summaryAdded = true;
        const newLog = {
          id: Date.now() + Math.random(),
          emoji: event.emoji || '',
          text: event.message,
          time: new Date().toLocaleTimeString(),
        };
        // Increment unread if the messages tab is not active
        setUnreadCount(count => count + 1);
        return [...prev, newLog];
      });
    });
    // If data was already loaded before subscription, add the summary now
    if (agentDataService.isReady() && !summaryAdded) {
      const customers = agentDataService.getCustomers();
      if (customers.length > 0) {
        const types = ['NAIVAS', 'KHETIA', 'QUICKMART', 'CHANDARANA', 'CLEANSHELF', 'JAZARIBU', 'MAJID'];
        const counts = {};
        for (const t of types) counts[t] = 0;
        for (const c of customers) {
          const name = (c.name || '').toUpperCase();
          for (const t of types) {
            if (name.includes(t)) { counts[t]++; break; }
          }
        }
        const lines = types.map((t, i) => {
          const name = t.charAt(0) + t.slice(1).toLowerCase();
          return `${i+1}. ${name.charAt(0).toUpperCase() + name.slice(1)}: ${counts[t]} outlets`;
        });
        const summaryLog = {
          id: 'summary',
          emoji: '',
          text: lines.join('\n'),
          time: new Date().toLocaleTimeString(),
        };
        setLogs([summaryLog]);
        // Don't count this initial summary as unread
        setUnreadCount(0);
        summaryAdded = true;
      }
    }
    return unsubscribe;
  }, []);

  // Subscribe to order audit results — fires synchronously the instant
  // createOrderFromPO's audit check resolves (pass OR fail), whether the
  // order came from AI Mode's Autonomous tab or the manual-mode flow in
  // App.jsx, since orderCreationService is a shared singleton either way.
  //
  // Seeds from getAuditLog() first, so an order created while this panel
  // was closed still shows up here once it's reopened, instead of being
  // silently missed.
  useEffect(() => {
    const toLog = (event) => ({
      id: 'audit-' + event.timestamp + '-' + Math.random(),
      emoji: event.success ? '✅' : '🚫',
      text: event.message,
      time: new Date(event.timestamp).toLocaleTimeString(),
    });

    const history = getAuditLog();
    if (history.length > 0) {
      setLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newEntries = history.map(toLog).filter(l => !existingIds.has(l.id));
        if (newEntries.length === 0) return prev;
        return [...prev, ...newEntries];
      });
    }

    const unsubscribe = onOrderAudit((event) => {
      setLogs(prev => [...prev, toLog(event)]);
      setUnreadCount(count => count + 1);
    });

    return unsubscribe;
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'messages') {
      setUnreadCount(0);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'autonomous': return <AutonomousWorkflow />;
      case 'chat': return <ChatInterface />;
      case 'messages': return <Messages logs={logs} />;
      case 'checklist': return <Checklist />;
      default: return <AutonomousWorkflow />;
    }
  };

  return (
    <div className="ai-mode-overlay">
      <div className="ai-mode-modal">
        <button className="ai-mode-close" onClick={onClose}>✕</button>
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} />
        <div className="ai-mode-main">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AiMode;
