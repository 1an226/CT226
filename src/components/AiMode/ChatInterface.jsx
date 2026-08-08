import { useState, useRef, useEffect } from 'react';
import noosService from '@services/noosService';
import authService from '@services/authService';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { role: 'noos', text: 'I am NOOS, the CT226 operating system. I can help with branches, orders, customers, and routes. Type "help" to see all commands.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    
    const response = await noosService.execute(text);
    setMessages(prev => [...prev, { role: 'noos', text: response }]);
    setLoading(false);
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-role">{msg.role === 'noos' ? 'NOOS' : 'You'}</div>
            <div className="chat-text">{msg.text}</div>
          </div>
        ))}
        {loading && <div className="chat-message noos"><div className="chat-role">NOOS</div><div className="chat-text">...</div></div>}
      </div>
      <div className="chat-input">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask NOOS..." disabled={loading} />
        <button onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
};

export default ChatInterface;
