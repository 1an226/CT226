const Messages = ({ logs }) => (
  <div className="messages-tab">
    <h2>SYSTEM MESSAGES</h2>
    <div className="messages-list">
      {logs.length === 0 && (
        <div className="message-entry">
          <span className="message-text">Waiting for system events...</span>
        </div>
      )}
      {logs.map(log => (
        <div key={log.id} className="message-entry">
          <span className="message-text" style={{ whiteSpace: 'pre-line' }}>{log.text}</span>
          <span className="message-time">{log.time}</span>
        </div>
      ))}
    </div>
  </div>
);

export default Messages;
