import { useState, useRef, useEffect } from 'react';
import noosService from '@services/noosService';
import authService from '@services/authService';
import { supabase } from '@services/supabaseClient';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [orderPreview, setOrderPreview] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const chatRef = useRef(null);

  const userId = authService.getCurrentUser()?.id
    ? String(authService.getCurrentUser().id)
    : 'anonymous';

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!supabase) { setLoadingHistory(false); return; }
      const { data, error } = await supabase
        .from('noos_messages')
        .select('role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (!cancelled && !error) setMessages(data || []);
      if (!cancelled) setLoadingHistory(false);
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, orderPreview]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setOrderPreview(null);
    setOrderCreated(false);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const response = await noosService.execute(text);
      if (typeof response === 'object' && response.type === 'order_preview') {
        setOrderPreview(response.data);
      } else {
        setMessages(prev => [...prev, { role: 'noos', content: response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderPreview) return;
    setCreatingOrder(true);
    try {
      const result = await noosService.confirmOrder(orderPreview);
      if (result.success) {
        setOrderCreated(true);
        setMessages(prev => [...prev, { role: 'system', content: `Order ${result.orderNumber} created and verified.` }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: `Order failed: ${result.error || 'Unknown error'}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: `Order failed: ${error.message}` }]);
    } finally {
      setCreatingOrder(false);
    }
  };

  const totalAmount = orderPreview?.orderData?.items?.reduce(
    (sum, it) => sum + (it.netAmount || 0),
    0
  ) || 0;

  return (
    <div className="chat-interface">
      <div className="chat-messages" ref={chatRef}>
        {loadingHistory ? (
          <div className="chat-message noos"><div className="chat-role">NOOS</div><div className="chat-text">Loading history...</div></div>
        ) : messages.length === 0 ? (
          <div className="chat-message noos"><div className="chat-role">NOOS</div><div className="chat-text">I am NOOS, the CT226 operating system. Ask me anything.</div></div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-role">{msg.role === 'noos' ? 'NOOS' : msg.role === 'system' ? 'SYSTEM' : 'You'}</div>
              <div className="chat-text">{msg.content}</div>
            </div>
          ))
        )}
        {loading && <div className="chat-message noos"><div className="chat-role">NOOS</div><div className="chat-text">...</div></div>}

        {orderPreview && (
          <div className="order-preview">
            <h3>ORDER PREVIEW</h3>
            <div className="order-preview-meta">
              <p>Customer: {orderPreview.customer.name} ({orderPreview.customer.code})</p>
              <p>Branch: {orderPreview.customer.branch}</p>
            </div>
            <table>
              <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                {orderPreview.orderData.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.product?.itemName || it.fg_code}</td>
                    <td>{it.quantity}</td>
                    <td>{(it.unitPrice || 0).toFixed(2)}</td>
                    <td>{((it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="order-total">Total: Ksh {totalAmount.toFixed(2)}</p>
            {!orderCreated ? (
              <button className="create-order-btn" onClick={handleCreateOrder} disabled={creatingOrder}>
                {creatingOrder ? 'CREATING...' : 'CREATE ORDER'}
              </button>
            ) : (
              <div className="success-message" style={{ textAlign: 'center', marginTop: '10px' }}>
                Order created and verified.
              </div>
            )}
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
