
import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import AutonomousWorkflow from './AutonomousWorkflow';
import ChatInterface from './ChatInterface';
import Messages from './Messages';
import Checklist from './Checklist';
import agentDataService from '@services/agentDataService';
import agentRuntime from '@services/agentRuntime';
import orderCreationService, { onOrderEvent } from '@services/orderCreationService';
import { supabase } from '@services/supabaseClient';
import authService from '@services/authService';
import './AiMode.css';

const AiMode = ({ user, selectedBranches, onLogout, onClose }) => {
  const [activeTab, setActiveTab] = useState('autonomous');
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [dataReady, setDataReady] = useState(agentDataService.isReady());
  const [unreadCount, setUnreadCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const summaryAddedRef = useRef(false);

  const toLog = (row) => ({
    id: row.id,
    emoji: '',
    text: row.message,
    time: new Date(row.created_at).toLocaleTimeString(),
    timestamp: new Date(row.created_at).getTime(),
    so_number: row.so_number || null,
    customer_name: row.customer_name || null,
  });

  const addLog = (newLog) => {
    setLogs(prev => {
      // Prevent duplicate SO
      if (newLog.so_number && prev.some(l => l.so_number === newLog.so_number)) return prev;
      if (prev.some(l => l.id === newLog.id)) return prev;
      const combined = [newLog, ...prev];
      combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return combined;
    });
  };

  // Load agent data once
  useEffect(() => {
    if (!agentDataService.isReady()) {
      agentDataService.loadAllData().then(() => setDataReady(true)).catch(() => {});
    } else {
      setDataReady(true);
    }
  }, []);

  // Add summary after data ready
  useEffect(() => {
    if (!dataReady || summaryAddedRef.current) return;
    const customers = agentDataService.getCustomers();
    if (!customers || customers.length === 0) return;

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

    addLog({
      id: 'summary',
      emoji: '',
      text: lines.join('\n'),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      so_number: null,
      customer_name: null,
    });
    summaryAddedRef.current = true;
  }, [dataReady]);

  // Fetch persistent order notifications
  useEffect(() => {
    if (!supabase) return;

    const userId = authService.getCurrentUser()?.id
      ? String(authService.getCurrentUser().id)
      : 'anonymous';

    // Initial fetch
    supabase
      .from('order_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          data.forEach(row => addLog(toLog(row)));
        }
      });

    // Realtime
    const channel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addLog(toLog(payload.new));
          if (activeTabRef.current !== 'messages') {
            setUnreadCount(count => count + 1);
          }
        }
      )
      .subscribe();

    // Local event
    const unsubscribeLocal = onOrderEvent((event) => {
      addLog({
        id: event.id,
        emoji: '',
        text: event.message,
        time: new Date(event.created_at).toLocaleTimeString(),
        timestamp: new Date(event.created_at).getTime(),
        so_number: event.so_number || null,
        customer_name: event.customer_name || null,
      });
      if (activeTabRef.current !== 'messages') {
        setUnreadCount(count => count + 1);
      }
    });

    // Focus refetch
    const handleFocus = () => {
      if (supabase) {
        supabase
          .from('order_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              data.forEach(row => addLog(toLog(row)));
            }
          });
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      unsubscribeLocal();
      window.removeEventListener('focus', handleFocus);
    };
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
