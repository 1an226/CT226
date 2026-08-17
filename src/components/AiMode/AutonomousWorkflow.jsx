import { useState } from 'react';
import orderCreationService from '@services/orderCreationService';
import authService from '@services/authService';
import agentRuntime from '@services/agentRuntime';

const AutonomousWorkflow = () => {
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [orderPreview, setOrderPreview] = useState(null);
  const [error, setError] = useState(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [fileDropped, setFileDropped] = useState(false);

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

      // Step 3: Parallel branch switch + AI extraction
      const s3a = addStep('Checking branch context...');
      const s3b = addStep('AI extracting order data...');

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

      setOrderPreview({ ...parsedData, items: matchedItems, customerInfo: customer });
    } catch (err) {
      setError(err.message);
      addStep(`Error: ${err.message}`, 'failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderPreview) return;

    // FIX: createOrderFromPO requires an explicit branch — it will
    // never fall back to "whatever the session happens to be on" (that
    // silent fallback is exactly what caused the Eldoret mix-up). The
    // branch is already sitting on orderPreview.customerInfo from the
    // identifyCustomer step above; the old code just never passed it,
    // so this call has been throwing "customerBranch is required" on
    // every single click since that fix went in.
    const branch = orderPreview.customerInfo?.branch;
    if (!branch) {
      setError('Missing customer branch — refusing to submit without one.');
      addStep('Failed: missing customer branch', 'failed');
      return;
    }

    setProcessing(true);
    try {
      const s = addStep('Creating order...');
      const result = await orderCreationService.createOrderFromPO(orderPreview, branch);

      // FIX: createOrderFromPO can resolve successfully while carrying
      // { success: false, ... } — that's the audit-failed-and-cancelled
      // path, not a thrown error. The old code only checked the catch
      // block, so an audit failure was reported to the user as "Order
      // #Unknown created" instead of surfacing the actual mismatch.
      if (!result.success) {
        markFailed(s, result.error || 'Order failed audit and was cancelled.');
        setError(result.error || 'Order failed audit and was cancelled.');
        return;
      }

      markDone(s, `Order #${result.orderNumber} created and verified.`);
    } catch (err) {
      setError(err.message);
      addStep(`Failed: ${err.message}`, 'failed');
    } finally {
      setProcessing(false);
    }
  };

  const totalAmount = orderPreview?.items?.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0) || 0;

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
          <button className="create-order-btn" onClick={handleCreateOrder} disabled={processing}>
            CREATE ORDER
          </button>
        </div>
      )}
    </div>
  );
};

export default AutonomousWorkflow;
