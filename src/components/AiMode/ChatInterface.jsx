import { useState, useRef, useEffect } from 'react';
import noosService from '@services/noosService';
import authService from '@services/authService';
import { supabase } from '@services/supabaseClient';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const chatRef = useRef(null);

  const userId = authService.getCurrentUser()?.id
    ? String(authService.getCurrentUser().id)
    : 'anonymous';

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (!supabase) {
        setLoadingHistory(false);
        return;
      }

      const { data, error } = await supabase
        .from('noos_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!cancelled && !error) {
        setMessages(data || []);
      }

      if (!cancelled) setLoadingHistory(false);
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    // Add user message locally immediately for responsiveness
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const response = await noosService.execute(text);
      setMessages(prev => [...prev, { role: 'noos', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages" ref={chatRef}>
        {loadingHistory ? (
          <div className="chat-message noos">
            <div className="chat-role">NOOS</div>
            <div className="chat-text">Loading history...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-message noos">
            <div className="chat-role">NOOS</div>
            <div className="chat-text">I am NOOS, the CT226 operating system. Ask me anything.</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-role">
                {msg.role === 'noos' ? 'NOOS' : msg.role === 'system' ? 'SYSTEM' : 'You'}
              </div>
              <div className="chat-text">{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="chat-message noos">
            <div className="chat-role">NOOS</div>
            <div className="chat-text">...</div>
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask NOOS..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
};

export default ChatInterface;
