
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

        if (error) {
          console.warn('[VIEW] Supabase error:', error.message);
        } else if (data) {
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
        } else {
          console.warn('[VIEW] no Supabase payload, falling back to DDS');
        }
      }

      console.log('[VIEW] fetching from DDS');
      const resp = await apiClient.get(`/orders/detail/${soNumber}`);
      const detail = resp.data?.payload || resp.data;
      console.log('[VIEW] DDS response:', detail);
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
                    console.log('[VIEW] button handler firing');
                    openOrderPreview(soNumber);
                  }}
                  style={{ marginLeft: 'auto', fontSize: '0.8rem', cursor: 'pointer', position: 'relative', zIndex: 20 }}
                >
                  VIEW
                </button>
              )}
            </div>
          );
        })}
      </div>

      {loadingPreview && <div className="loading-state">Loading order...</div>}

      {preview && !loadingPreview && (
        <div className="order-preview" style={{ marginTop: '20px' }}>
          <h3>ORDER DETAIL</h3>
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
              <table>
                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {(preview.orderItems || []).map((it, i) => (
                    <tr key={i}>
                      <td>{it.itemName || it.itemCode}</td>
                      <td>{it.quantity}</td>
                      <td>{it.itemRate || it.unitPrice}</td>
                      <td>{it.netAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <button type="button" onClick={closePreview} style={{ marginTop: '10px' }}>Close</button>
        </div>
      )}
    </div>
  );
};

export default Messages;
