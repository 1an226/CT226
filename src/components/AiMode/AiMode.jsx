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
          timestamp: Date.now(),
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
          timestamp: Date.now(),
        };
        setLogs(prev => [summaryLog, ...prev]);
        // Don't count this initial summary as unread
        setUnreadCount(0);
        summaryAdded = true;
      }
    }
    return unsubscribe;
  }, []);

  // Fetch persistent order notifications from Supabase
  useEffect(() => {
    if (!supabase) return;

    const userId = authService.getCurrentUser()?.id
      ? String(authService.getCurrentUser().id)
      : 'anonymous';

    const toLog = (row) => ({
      id: row.id,
      emoji: '',
      text: row.message,
      time: new Date(row.created_at).toLocaleTimeString(),
      timestamp: new Date(row.created_at).getTime(),
    });

    // Initial fetch (descending order)
    supabase
      .from('order_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setLogs(prev => {
            const existing = new Set(prev.map(l => l.id));
            const newLogs = data.map(toLog).filter(l => !existing.has(l.id));
            // Merge and sort descending by time string (approx)
            const combined = [...newLogs, ...prev];
            combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return combined;
          });
        }
      });

    // Realtime subscription for cross-tab sync
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
          const row = payload.new;
          const log = toLog(row);
          setLogs(prev => {
            if (prev.some(l => l.id === row.id)) return prev;
            return [log, ...prev];
          });
          if (activeTabRef.current !== 'messages') {
            setUnreadCount(count => count + 1);
          }
        }
      )
      .subscribe();

    // Local event for same-tab immediate updates
    const unsubscribeLocal = onOrderEvent((event) => {
      const log = {
        id: event.id,
        emoji: '',
        text: event.message,
        time: new Date(event.created_at).toLocaleTimeString(),
      };
      setLogs(prev => {
        if (prev.some(l => l.id === event.id)) return prev;
        return [log, ...prev];
      });
      if (activeTabRef.current !== 'messages') {
        setUnreadCount(count => count + 1);
      }
    });

    const handleFocus = () => {
      // Refetch on window focus to catch missed cross-tab messages
      if (supabase) {
        supabase
          .from('order_notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) {
              setLogs(prev => {
                const existing = new Set(prev.map(l => l.id));
                const newLogs = data.map(toLog).filter(l => !existing.has(l.id));
                if (newLogs.length) {
                  setUnreadCount(count => count + newLogs.length);
                }
                return [...newLogs, ...prev];
              });
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
