import { useState, useRef } from 'react';
import orderCreationService from '@services/orderCreationService';
import authService from '@services/authService';
import agentRuntime from '@services/agentRuntime';


function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const AutonomousWorkflow = () => {
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [orderPreview, setOrderPreview] = useState(null);
  const [error, setError] = useState(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [fileDropped, setFileDropped] = useState(false);
  const startTimeRef = useRef(null);

  const addStep = (msg, status = 'running') => {
    const id = Math.random().toString(36).substr(2, 9);
    setSteps(prev => [...prev, { id, msg, status }]);
    return id;
  };

  const markDone = (id, msg = null) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, msg: msg || s.msg, status: 'done' } : s));
  };

  const markFailed = (id, msg) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, msg, status: 'failed' } : s));
  };

  const handleFileDrop = async (file) => {
    if (!agentRuntime.isReady()) {
      setError('System data is still loading. Please wait.');
      return;
    }

    setProcessing(true);
    setError(null);
    setOrderPreview(null);
    setRawOcrText('');
    setShowRawOcr(false);
    setFileDropped(true);
    setSteps([]);
    startTimeRef.current = performance.now();

    try {
      // Step 1: Extract OCR text
      const s1 = addStep('Extracting PDF content...');
      let rawText = '';

      try {
        const arrayBuffer = await file.arrayBuffer();
        rawText = await orderCreationService.extractTextFromPdf(arrayBuffer);
      } catch (e) {
        rawText = '';
      }

      if (rawText.length < 50) {
        rawText = await orderCreationService.getVisionOcrText(file);
      }

      markDone(s1, 'OCR text extracted.');
      setRawOcrText(rawText);

      // Step 2: Identify customer
      const s2 = addStep('Identifying customer...');
      const customer = await agentRuntime.identifyCustomer(rawText, file.name);
      if (!customer || !customer.branch) {
        throw new Error('Could not identify customer or branch.');
      }
      markDone(s2, `Customer: ${customer.name}`);

      // Step 3: Parallel branch switch + deterministic regex extraction
      const s3a = addStep('Checking branch context...');
      const typeLabel = customer.type
        ? customer.type.charAt(0) + customer.type.slice(1).toLowerCase()
        : 'order';
      const s3b = addStep(`${typeLabel} regex extracting...`);

      const [branchMsg, parsedData] = await Promise.all([
        (async () => {
          const current = authService.getCurrentBranch();
          if (current !== customer.branch) {
            await authService.switchBranch(customer.branch);
            return `Switched to ${customer.branch}.`;
          }
          return `Already in ${customer.branch}.`;
        })(),
        orderCreationService.parsePOFromDroppedFile(file, customer.code, customer.type, rawText),
      ]);

      markDone(s3a, branchMsg);
      markDone(s3b, `Extracted ${parsedData.items.length} items.`);

      // Step 4: Match products
      const s4 = addStep('Matching products and prices...');
      const products = await orderCreationService.getProductsByCustomer(customer.type);
      const matchedItems = parsedData.items.map(item => {
        const fgCode = item.fgCode || item.actualItemCode;
        const product = products.find(p => p.itemCode === fgCode);
        return { ...item, fgCode, product, status: product ? 'matched' : 'unmatched' };
      });
      markDone(s4, 'Products matched.');

      const finalOrderData = { ...parsedData, items: matchedItems, customerInfo: customer };
      setOrderPreview(finalOrderData);

      // Step 5: Automatically create order
      const s5 = addStep('Creating order...');
      try {
        const result = await orderCreationService.createOrderFromPO(finalOrderData, customer.branch);

        if (!result.success) {
          markFailed(s5, result.error || 'Order failed audit and was cancelled.');
          setError(result.error || 'Order failed audit and was cancelled.');
        } else {
          const elapsedMs = performance.now() - startTimeRef.current;
          markDone(s5, `Order #${result.orderNumber} created and verified. (${formatDuration(elapsedMs)})`);
        }
      } catch (err) {
        markFailed(s5, err.message);
        setError(err.message);
      }
    } catch (err) {
      setError(err.message);
      addStep(`Error: ${err.message}`, 'failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalAmount = orderPreview?.items?.reduce(
    (sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)),
    0
  ) || 0;

  if (!agentRuntime.isReady()) {
    return (
      <div className="autonomous-workflow">
        <h2 class="section-header">~ AUTONOMOUS ORDER PROCESSING</h2>
        <div className="loading-state-text">
          Loading system data ...
        </div>
      </div>
    );
  }

  return (
    <div className="autonomous-workflow">
      <h2 class="section-header">~ AUTONOMOUS ORDER PROCESSING</h2>

      {!fileDropped && (
        <div
          className={`drop-zone ${processing ? 'processing' : ''}`}
          onDrop={e => { e.preventDefault(); handleFileDrop(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => document.getElementById('auto-file-input').click()}
        >
          {processing ? 'Processing...' : 'Click or drop PDF to process order'}
          <input id="auto-file-input" type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => e.target.files[0] && handleFileDrop(e.target.files[0])} />
        </div>
      )}

      {rawOcrText && (
        <div className="ocr-raw-section">
          <button className="ocr-toggle" onClick={() => setShowRawOcr(!showRawOcr)}>
            RAW OCR TEXT [ {showRawOcr ? '-' : '+'} ]
          </button>
          {showRawOcr && <pre className="ocr-raw-text">{rawOcrText}</pre>}
        </div>
      )}

      {steps.length > 0 && (
        <div className="processing-steps">
          {steps.map(s => (
            <div key={s.id} className={`step ${s.status}`}>
              <span className="step-indicator">
                {s.status === 'running' ? '>' : s.status === 'done' ? '.' : '!'}
              </span>
              <span className="step-text">{s.msg}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-message">Error: {error}</div>}

      {orderPreview && (
        <div className="order-preview">
          <h3>ORDER PREVIEW</h3>
          <div className="order-preview-meta">
            <p>Customer: {orderPreview.customerInfo?.name} ({orderPreview.customerInfo?.code})</p>
            <p>LPO: {orderPreview.lpoNumber}</p>
          </div>
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              {orderPreview.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.product?.itemName || it.description}</td>
                  <td>{it.quantity}</td>
                  <td>{(it.unitPrice || 0).toFixed(2)}</td>
                  <td>{((it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="order-total">Total: Ksh {totalAmount.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default AutonomousWorkflow;
