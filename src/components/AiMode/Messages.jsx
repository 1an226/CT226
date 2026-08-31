import { useState } from 'react';
import apiClient from '@services/api.js';

const Messages = ({ logs }) => {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const openOrderPreview = async (soNumber) => {
    setLoadingPreview(true);
    setPreview(null);
    try {
      const resp = await apiClient.get(`/orders/detail/${soNumber}`);
      const detail = resp.data?.payload || resp.data;
      setPreview(detail);
    } catch (e) {
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
                  onClick={() => openOrderPreview(soNumber)}
                  style={{ marginLeft: 'auto', fontSize: '0.8rem', cursor: 'pointer' }}
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
                      <td>{it.itemRate}</td>
                      <td>{it.netAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <button onClick={closePreview} style={{ marginTop: '10px' }}>Close</button>
        </div>
      )}
    </div>
  );
};

export default Messages;
