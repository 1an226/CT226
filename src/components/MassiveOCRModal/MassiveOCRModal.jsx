import React, { useState, useRef, useEffect } from "react";
import "./MassiveOCRModal.css";

const MassiveOCRModal = ({
  show,
  onClose,
  customer,
  onProcessText,
  onCreateOrder,
  isProcessing,
  parsedData,
}) => {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("text"); // "text" or "screenshot"
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Focus on text area when modal opens
  useEffect(() => {
    if (show && textAreaRef.current) {
      textAreaRef.current.focus();
      handleAutoPaste();
    }
  }, [show]);

  // Handle auto paste from clipboard
  const handleAutoPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim() && !text) {
          setText(clipboardText);
        }
      }
    } catch (error) {
      console.log("Auto-paste not available");
    }
  };

  // Handle paste from clipboard
  const handlePasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setText(clipboardText);
        } else {
          alert("Clipboard is empty or doesn't contain text");
        }
      } else {
        alert(
          "Your browser doesn't support clipboard access. Please use Ctrl+V to paste.",
        );
      }
    } catch (error) {
      console.error("Clipboard paste failed:", error);
      alert("Could not access clipboard. Please use Ctrl+V to paste manually.");
    }
  };

  // Handle screenshot upload
  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match("image.*")) {
      alert("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setText(""); // Clear text when uploading screenshot
  };

  // Handle screenshot paste from clipboard
  const handlePasteScreenshot = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageTypes = item.types.find((type) => type.startsWith("image/"));
        if (imageTypes) {
          const blob = await item.getType(imageTypes);
          const file = new File([blob], "pasted-screenshot.png", {
            type: imageTypes,
          });
          setScreenshot(file);
          setScreenshotPreview(URL.createObjectURL(file));
          setText(""); // Clear text when pasting screenshot
          break;
        }
      }
    } catch (error) {
      console.error("Screenshot paste failed:", error);
      alert(
        "Could not paste screenshot. Please ensure you have an image copied to clipboard.",
      );
    }
  };

  // Clear all input
  const handleClearAll = () => {
    setText("");
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setTimeout(() => {
      textAreaRef.current?.focus();
    }, 0);
  };

  // Process the input
  const handleProcess = () => {
    if (mode === "text" && text.trim()) {
      onProcessText(text);
    } else if (mode === "screenshot" && screenshot) {
      // For now, we'll just process as text since OCR is disabled
      // In production, you would send the screenshot to an OCR service
      alert(
        "Screenshot OCR processing is currently disabled. Please use text mode.",
      );
    } else {
      alert("Please enter text or upload a screenshot first");
    }
  };

  if (!show || !customer) return null;

  const isNaivasCustomer = customer.name?.toLowerCase().includes("naivas");

  return (
    <div className="massive-ocr-modal-overlay">
      <div className="massive-ocr-modal">
        {/* Header */}
        <div className="massive-ocr-header">
          <div className="massive-ocr-title">
            <h2>Naivas PO Processing</h2>
            <div className="customer-info">
              <span className="customer-name">{customer.name}</span>
              <span className="customer-code">{customer.code}</span>
              {isNaivasCustomer && <span className="naivas-badge">NAIVAS</span>}
            </div>
          </div>
          <button
            className="massive-ocr-close-btn"
            onClick={onClose}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === "text" ? "active" : ""}`}
            onClick={() => setMode("text")}
            disabled={isProcessing}
          >
            Text Input
          </button>
          <button
            className={`mode-btn ${mode === "screenshot" ? "active" : ""}`}
            onClick={() => setMode("screenshot")}
            disabled={isProcessing}
          >
            Screenshot/Image
          </button>
        </div>

        {/* Main Content */}
        <div className="massive-ocr-content">
          {mode === "text" ? (
            <div className="text-input-section">
              <div className="text-input-header">
                <h3>Paste Naivas PO Text</h3>
                <button
                  onClick={handlePasteText}
                  className="paste-btn"
                  disabled={isProcessing}
                >
                  📋 Paste from Clipboard
                </button>
              </div>
              <textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Paste the entire Naivas PO text here...

Example PO text:
*P037926568*
Date: 15/01/2024

13505757 FRESH WHITE BREAD 400G
24

13505844 FRESH WHITE BREAD 600G
12

13505786 FRESH BROWN BREAD 400G
36

The system will automatically detect:
• LPO Numbers (P0XXXXXXXX format)
• Item Codes (13505757, 13505844, etc.)
• Quantities
• Dates`}
                disabled={isProcessing || parsedData}
                className="massive-textarea"
              />
              {text && (
                <div className="text-stats">
                  <span>{text.length} characters</span>
                  <span>{text.split("\n").length} lines</span>
                  <span>{text.split(/\s+/).length} words</span>
                </div>
              )}
            </div>
          ) : (
            <div className="screenshot-section">
              <div className="screenshot-header">
                <h3>Upload Naivas PO Screenshot</h3>
                <div className="screenshot-actions">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-btn"
                    disabled={isProcessing}
                  >
                    📁 Upload Image
                  </button>
                  <button
                    onClick={handlePasteScreenshot}
                    className="paste-btn"
                    disabled={isProcessing}
                  >
                    📋 Paste from Clipboard
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                style={{ display: "none" }}
              />

              {screenshotPreview ? (
                <div className="screenshot-preview-container">
                  <div className="screenshot-preview">
                    <img src={screenshotPreview} alt="Screenshot preview" />
                    <div className="screenshot-info">
                      <span>{screenshot?.name}</span>
                      <span>{(screenshot?.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </div>
                  <div className="screenshot-notice">
                    Note: OCR processing for images is currently disabled.
                    Please use text mode for automatic parsing.
                  </div>
                </div>
              ) : (
                <div
                  className="screenshot-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="dropzone-icon">📷</div>
                  <p>Drag & drop screenshot here or click to browse</p>
                  <p className="dropzone-hint">
                    Supported: JPEG, PNG, BMP • Max 5MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Item Code Reference */}
          <div className="item-codes-reference">
            <h4>Naivas Bread Item Codes Reference</h4>
            <div className="item-codes-grid">
              <div className="item-code-item">
                <span className="code">13505757</span>
                <span className="description">→ White Bread 400g (FG867)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505844</span>
                <span className="description">→ White Bread 600g (FG860)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505845</span>
                <span className="description">→ White Bread 800g (FG864)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505786</span>
                <span className="description">→ Brown Bread 400g (FG861)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505758</span>
                <span className="description">→ Brown Bread 600g (FG869)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505790</span>
                <span className="description">→ Brown Bread 800g (FG863)</span>
              </div>
              <div className="item-code-item">
                <span className="code">13505957</span>
                <span className="description">→ White Bread 200g (FG960)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="massive-ocr-actions">
          <div className="left-actions">
            <button
              onClick={handleClearAll}
              className="clear-btn"
              disabled={isProcessing || (!text && !screenshot)}
            >
              Clear All
            </button>
            <button
              onClick={() => setMode(mode === "text" ? "screenshot" : "text")}
              className="switch-mode-btn"
              disabled={isProcessing}
            >
              Switch to {mode === "text" ? "Screenshot" : "Text"} Mode
            </button>
          </div>

          <div className="right-actions">
            <button
              onClick={onClose}
              className="cancel-btn"
              disabled={isProcessing}
            >
              Cancel
            </button>

            {!parsedData ? (
              <button
                onClick={handleProcess}
                className="process-btn"
                disabled={
                  isProcessing || (mode === "text" ? !text.trim() : !screenshot)
                }
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-small"></span>
                    Processing...
                  </>
                ) : (
                  "Process PO"
                )}
              </button>
            ) : (
              <button
                onClick={() => onCreateOrder(parsedData)}
                className="create-order-btn"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-small"></span>
                    Creating Order...
                  </>
                ) : (
                  "Create Order"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="processing-status">
            <div className="processing-spinner"></div>
            <p>Processing your PO data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassiveOCRModal;
