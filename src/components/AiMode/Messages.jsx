import { useState } from 'react';
import apiClient from '@services/api.js';
import { supabase } from '@services/supabaseClient';

const Messages = ({ logs }) => {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const openOrderPreview = async (soNumber) => {
    console.log('[VIEW] clicked for', soNumber);
    setLoadingPreview(true);
    setPreview(null);

    try {
      if (supabase) {
        console.log('[VIEW] querying Supabase order_payloads');
        const { data, error } = await supabase
          .from('order_payloads')
          .select('*')
          .eq('so_number', soNumber)
          .maybeSingle();

        if (!error && data) {
          console.log('[VIEW] Supabase payload found:', data);
          const items = data.items_jsonb ? JSON.parse(data.items_jsonb) : [];
          setPreview({
            orderNo: data.so_number,
            customerName: data.customer_name,
            branch: data.branch,
            lpo: data.lpo || 'N/A',
            dueDate: data.delivery_date,
            orderDate: data.order_date,
            total: data.total_amount,
            orderStatus: data.status,
            orderItems: items,
          });
          return;
        }
      }

      console.log('[VIEW] falling back to DDS');
      const resp = await apiClient.get(`/orders/detail/${soNumber}`);
      const detail = resp.data?.payload || resp.data;
      setPreview(detail);
    } catch (e) {
      console.error('[VIEW] error:', e);
      setPreview({ error: 'Could not load order details.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => setPreview(null);

  return (
    <div className="messages-tab">
      <h2>SYSTEM MESSAGES</h2>
      <div className="messages-list">
        {logs.length === 0 && (
          <div className="message-entry">
            <span className="message-text">Waiting for system events...</span>
          </div>
        )}
        {logs.map(log => {
          const soMatch = log.text?.match(/SO-\d{2}-\d{2}-\d{6}/);
          const soNumber = log.so_number || soMatch?.[0];
          return (
            <div key={log.id} className="message-entry">
              <span className="message-text" style={{ whiteSpace: 'pre-line' }}>{log.text}</span>
              <span className="message-time">{log.time}</span>
              {soNumber && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openOrderPreview(soNumber);
                  }}
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    zIndex: 20,
                    position: 'relative',
                  }}
                >
                  VIEW
                </button>
              )}
            </div>
          );
        })}
      </div>

      {loadingPreview && (
        <div className="loading-state" style={{ marginTop: '15px' }}>
          Loading order...
        </div>
      )}

      {preview && !loadingPreview && (
        <div
          style={{
            position: 'fixed',
            top: '10%',
            left: '10%',
            right: '10%',
            bottom: '10%',
            background: '#000',
            border: '2px solid #00ff00',
            zIndex: 10000,
            padding: '20px',
            overflowY: 'auto',
            boxShadow: '0 0 30px rgba(0,255,0,0.5)',
          }}
        >
          <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>ORDER DETAIL</h3>
          {preview.error ? (
            <p className="error-message">{preview.error}</p>
          ) : (
            <>
              <div className="order-preview-meta">
                <p>SO: {preview.orderNo || preview.orderNumber || 'N/A'}</p>
                <p>Customer: {preview.customerName}</p>
                <p>Branch: {preview.branch}</p>
                <p>LPO: {preview.lpo || 'N/A'}</p>
                <p>Delivery Date: {preview.dueDate ? new Date(preview.dueDate).toLocaleDateString() : 'N/A'}</p>
                <p>Status: {preview.orderStatus}</p>
                <p>Total: Ksh {Number(preview.total || 0).toLocaleString()}</p>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #00ff00', padding: '8px', textAlign: 'left' }}>Product</th>
                    <th style={{ border: '1px solid #00ff00', padding: '8px' }}>Qty</th>
                    <th style={{ border: '1px solid #00ff00', padding: '8px' }}>Price</th>
                    <th style={{ border: '1px solid #00ff00', padding: '8px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.orderItems || []).map((it, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #00ff00', padding: '8px' }}>{it.itemName || it.itemCode}</td>
                      <td style={{ border: '1px solid #00ff00', padding: '8px' }}>{it.quantity}</td>
                      <td style={{ border: '1px solid #00ff00', padding: '8px' }}>{it.itemRate || it.unitPrice}</td>
                      <td style={{ border: '1px solid #00ff00', padding: '8px' }}>{it.netAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <button
            type="button"
            onClick={closePreview}
            style={{
              marginTop: '15px',
              padding: '8px 20px',
              background: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default Messages;
