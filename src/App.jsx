import { useState, useEffect, useCallback, useRef, memo } from "react";
import authService from "@services/authService";
import LoginForm from "@auth/LoginForm/LoginForm";
import ordersService from "@services/ordersService";
import customerService from "@services/customerService";
import orderCreationService from "@services/orderCreationService";
import "./App.css";

// Environment configuration
const CONFIG = {
  MAX_FILE_SIZE: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760,
  ALLOWED_FILE_TYPES: (
    import.meta.env.VITE_ALLOWED_FILE_TYPES || "pdf,png,jpg,jpeg,webp,txt"
  ).split(","),
  ALLOWED_OCR_FILE_TYPES: (
    import.meta.env.VITE_ALLOWED_OCR_FILE_TYPES || "pdf,png,jpg,jpeg,webp"
  ).split(","),
  ITEMS_PER_PAGE: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE) || 25,
  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 1000,
  ORDERS_TIMEOUT: parseInt(import.meta.env.VITE_ORDERS_TIMEOUT) || 15000,
  MAX_RETRIES: parseInt(import.meta.env.VITE_MAX_RETRIES) || 3,
  RETRY_DELAY: parseInt(import.meta.env.VITE_RETRY_DELAY) || 2000,
  ENABLE_SAMPLE_DATA: import.meta.env.VITE_ENABLE_SAMPLE_DATA === "true",
  ENABLE_CONSOLE_LOGS: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === "true",
  ENABLE_TOKEN_MONITOR: import.meta.env.VITE_ENABLE_TOKEN_MONITOR === "true",
  DATE_FORMAT_DISPLAY: import.meta.env.VITE_DATE_FORMAT_DISPLAY || "DD/MM/YYYY",
  DATE_FORMAT_API: import.meta.env.VITE_DATE_FORMAT_API || "YYYY-MM-DD",
  DEFAULT_TIMEZONE: import.meta.env.VITE_DEFAULT_TIMEZONE || "Africa/Nairobi",
  APP_NAME: import.meta.env.VITE_APP_NAME || "CT226 DDS Integration System",
  APP_TITLE: import.meta.env.VITE_APP_TITLE || "CT226 • DDS Integration System",
  ENABLE_MULTI_BRANCH: import.meta.env.VITE_ENABLE_MULTI_BRANCH === "true",
  ENABLE_OCR: import.meta.env.VITE_ENABLE_OCR === "true",
  OCR_SERVER_URL:
    import.meta.env.VITE_OCR_SERVER_URL || "http://localhost:3000",
  OCR_SERVER_ENDPOINT:
    import.meta.env.VITE_OCR_SERVER_ENDPOINT || "/api/naivas/ocr",
  ITEM_CODE_MAPPING: (() => {
    const mapping = {};
    const mappingStr = import.meta.env.VITE_ITEM_CODE_MAPPING || "";
    if (mappingStr) {
      mappingStr.split(",").forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key && value) mapping[key.trim()] = value.trim();
      });
    }
    return mapping;
  })(),
  ITEM_NAMES_MAPPING: (() => {
    const mapping = {};
    const mappingStr = import.meta.env.VITE_ITEM_NAMES_MAPPING || "";
    if (mappingStr) {
      mappingStr.split(",").forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key && value) mapping[key.trim()] = value.trim();
      });
    }
    return mapping;
  })(),
  BRANCHES: (import.meta.env.VITE_BRANCHES || "").split(",").filter(Boolean),
  DEFAULT_BRANCH: import.meta.env.VITE_DEFAULT_BRANCH || "Eldoret",
  DEFAULT_WAREHOUSE: import.meta.env.VITE_DEFAULT_WAREHOUSE || "Dandora",
  DEFAULT_ORDER_TYPE: import.meta.env.VITE_DEFAULT_ORDER_TYPE || "Route",
  DEFAULT_REMARKS: import.meta.env.VITE_DEFAULT_REMARKS || "CT226",
  DEFAULT_IS_TOP_UP: import.meta.env.VITE_DEFAULT_IS_TOP_UP === "true",
};

// Document Reader Modal Component
const DocumentReaderModal = memo(
  ({
    showDocumentReader,
    setShowDocumentReader,
    selectedCustomer,
    poText,
    setPoText,
    isProcessing,
    setIsProcessing,
    parsedOrderData,
    setParsedOrderData,
    handleProcessPO,
    handleCreateOrder,
  }) => {
    const textAreaRef = useRef(null);
    const [inputMode, setInputMode] = useState("text");
    const [uploadedFile, setUploadedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const fileInputRef = useRef(null);
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
      if (showDocumentReader && textAreaRef.current && inputMode === "text") {
        textAreaRef.current.focus();
        handleAutoPaste();
      }
      return () => {
        if (filePreview) {
          URL.revokeObjectURL(filePreview);
        }
      };
    }, [showDocumentReader, inputMode]);

    const handleAutoPaste = async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim() && !poText) {
            setPoText(text);
          }
        }
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS) console.log("Auto-paste not available");
      }
    };

    const validateFile = (file) => {
      const errors = [];

      if (
        !CONFIG.ALLOWED_OCR_FILE_TYPES.includes(file.type.split("/")[1]) &&
        !CONFIG.ALLOWED_OCR_FILE_TYPES.includes(file.type.split("/")[0])
      ) {
        errors.push(
          `File type ${file.type} not allowed. Supported types: ${CONFIG.ALLOWED_OCR_FILE_TYPES.join(", ")}`,
        );
      }

      if (file.size > CONFIG.MAX_FILE_SIZE) {
        errors.push(
          `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
        );
      }

      return errors;
    };

    const handlePasteFromClipboard = async () => {
      try {
        if (inputMode === "text") {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
              setPoText(text);
              setValidationErrors([]);
            } else {
              setValidationErrors([
                "Clipboard is empty or doesn't contain text",
              ]);
            }
          } else {
            setValidationErrors([
              "Your browser doesn't support clipboard access. Please use Ctrl+V to paste.",
            ]);
          }
        } else {
          try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
              const imageTypes = item.types.find((type) =>
                type.startsWith("image/"),
              );
              if (imageTypes) {
                const blob = await item.getType(imageTypes);
                const file = new File([blob], "pasted-file.png", {
                  type: imageTypes,
                });

                const errors = validateFile(file);
                if (errors.length > 0) {
                  setValidationErrors(errors);
                  return;
                }

                setUploadedFile(file);
                setFilePreview(URL.createObjectURL(file));
                setPoText("");
                setValidationErrors([]);
                break;
              }
            }
          } catch (error) {
            setValidationErrors([
              "Could not paste file. Please ensure you have an image copied to clipboard.",
            ]);
          }
        }
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error("Clipboard paste failed:", error);
        setValidationErrors(["Could not access clipboard. Please try again."]);
      }
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const errors = validateFile(file);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      setUploadedFile(file);
      setValidationErrors([]);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }

      setPoText("");
    };

    const handleClearInput = () => {
      if (inputMode === "text") {
        setPoText("");
        setTimeout(() => {
          textAreaRef.current?.focus();
        }, 0);
      } else {
        if (filePreview) {
          URL.revokeObjectURL(filePreview);
        }
        setUploadedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      setValidationErrors([]);
    };

    const handleProcessInput = async () => {
      setValidationErrors([]);

      if (inputMode === "text" && poText.trim()) {
        if (poText.length < 50) {
          setValidationErrors([
            "PO text appears too short. Minimum 50 characters required.",
          ]);
          return;
        }
        await handleProcessPO(poText, selectedCustomer);
      } else if (inputMode === "file" && uploadedFile) {
        setIsProcessing(true);
        try {
          let poData;
          if (uploadedFile.type === "application/pdf") {
            poData = await orderCreationService.parsePOFromDroppedFile(
              uploadedFile,
              selectedCustomer.code,
            );
          } else if (uploadedFile.type.startsWith("image/")) {
            poData = await orderCreationService.parsePOFromImage(
              uploadedFile,
              selectedCustomer.code,
            );
          } else if (uploadedFile.type === "text/plain") {
            const text = await uploadedFile.text();
            poData = await orderCreationService.parsePOText(
              text,
              selectedCustomer.code,
            );
          }

          const isNaivas = selectedCustomer.name
            ?.toLowerCase()
            .includes("naivas");

          if (!poData.deliveryDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            poData.deliveryDate =
              tomorrow.toISOString().split("T")[0] + "T00:00:00.000Z";
          }

          poData.customerName = selectedCustomer.name;
          poData.customerCode = selectedCustomer.code;
          poData.branch = selectedCustomer.branch;
          poData.isNaivasCustomer = isNaivas;

          setParsedOrderData(poData);
        } catch (error) {
          setValidationErrors([`Failed to process file: ${error.message}`]);
        } finally {
          setIsProcessing(false);
        }
      } else {
        setValidationErrors([
          `Please ${inputMode === "text" ? "enter text" : "upload a file"} first`,
        ]);
      }
    };

    if (!showDocumentReader || !selectedCustomer) return null;

    const isNaivasCustomer = selectedCustomer.name
      ?.toLowerCase()
      .includes("naivas");

    return (
      <div className="modal-overlay">
        <div
          className="modal-content"
          style={{ maxWidth: "800px", maxHeight: "90vh" }}
        >
          <div className="modal-header">
            <h3>
              {selectedCustomer.name}
              {isNaivasCustomer && <span className="naivas-badge">NAIVAS</span>}
            </h3>
            <button
              onClick={() => {
                setShowDocumentReader(false);
                setPoText("");
                if (filePreview) URL.revokeObjectURL(filePreview);
                setUploadedFile(null);
                setFilePreview(null);
                setParsedOrderData(null);
                setValidationErrors([]);
              }}
              className="modal-close-btn"
              disabled={isProcessing}
            >
              ×
            </button>
          </div>

          <div className="modal-body" style={{ overflowY: "auto" }}>
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div
                className="validation-errors"
                style={{
                  background: "#ffebee",
                  border: "1px solid #ffcdd2",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "20px",
                }}
              >
                {validationErrors.map((error, index) => (
                  <div
                    key={index}
                    style={{ color: "#d32f2f", fontSize: "14px" }}
                  >
                    ⚠️ {error}
                  </div>
                ))}
              </div>
            )}

            {/* Input Mode Selector */}
            <div className="mode-selector" style={{ marginBottom: "20px" }}>
              <button
                className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
                onClick={() => setInputMode("text")}
                disabled={isProcessing}
                style={{
                  padding: "10px 20px",
                  marginRight: "10px",
                  background: inputMode === "text" ? "#4CAF50" : "#f0f0f0",
                  color: inputMode === "text" ? "white" : "#666",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Text Input
              </button>
              <button
                className={`mode-btn ${inputMode === "file" ? "active" : ""}`}
                onClick={() => setInputMode("file")}
                disabled={isProcessing}
                style={{
                  padding: "10px 20px",
                  background: inputMode === "file" ? "#4CAF50" : "#f0f0f0",
                  color: inputMode === "file" ? "white" : "#666",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                File Upload
              </button>
            </div>

            {inputMode === "text" ? (
              <div className="text-input-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <label style={{ fontWeight: "bold", fontSize: "16px" }}>
                    Paste Naivas PO Text:
                  </label>
                  <button
                    onClick={handlePasteFromClipboard}
                    className="btn btn-sm"
                    disabled={isProcessing}
                    type="button"
                    style={{
                      padding: "8px 15px",
                      fontSize: "14px",
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Paste from Clipboard
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <textarea
                    ref={textAreaRef}
                    value={poText}
                    onChange={(e) => {
                      setPoText(e.target.value);
                      setValidationErrors([]);
                    }}
                    placeholder={`Paste Naivas PO text here...

The system will automatically detect:
• LPO Numbers (P0XXXXXXXX format)
• Item Codes (13505757, 13505844, etc.)
• Quantities`}
                    disabled={isProcessing || parsedOrderData}
                    style={{
                      width: "100%",
                      minHeight: "250px",
                      padding: "15px",
                      border:
                        validationErrors.length > 0
                          ? "2px solid #f44336"
                          : "2px solid #ddd",
                      borderRadius: "8px",
                      fontFamily: "'Courier New', monospace",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      resize: "vertical",
                      backgroundColor: parsedOrderData ? "#f5f5f5" : "white",
                      outline: "none",
                    }}
                  />
                  {poText && !parsedOrderData && (
                    <button
                      onClick={handleClearInput}
                      style={{
                        position: "absolute",
                        top: "15px",
                        right: "15px",
                        background: "#ff4444",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                      disabled={isProcessing}
                      type="button"
                      title="Clear text"
                    >
                      ×
                    </button>
                  )}
                </div>
                {poText && (
                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {poText.length} characters
                  </div>
                )}
              </div>
            ) : (
              <div className="file-upload-section">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <label style={{ fontWeight: "bold", fontSize: "16px" }}>
                    Upload Naivas PO Document:
                  </label>
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-sm"
                      disabled={isProcessing}
                      type="button"
                      style={{
                        padding: "8px 15px",
                        fontSize: "14px",
                        background: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        marginRight: "10px",
                      }}
                    >
                      Upload File
                    </button>
                    <button
                      onClick={handlePasteFromClipboard}
                      className="btn btn-sm"
                      disabled={isProcessing}
                      type="button"
                      style={{
                        padding: "8px 15px",
                        fontSize: "14px",
                        background: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Paste Image
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CONFIG.ALLOWED_OCR_FILE_TYPES.map(
                    (type) => `.${type}`,
                  ).join(",")}
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />

                {uploadedFile ? (
                  <div>
                    <div
                      style={{
                        border:
                          validationErrors.length > 0
                            ? "2px solid #f44336"
                            : "2px solid #ddd",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "15px",
                        }}
                      >
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            background: "#e3f2fd",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {uploadedFile.type === "application/pdf" ? (
                            <span
                              style={{ fontSize: "24px", color: "#f44336" }}
                            >
                              PDF
                            </span>
                          ) : uploadedFile.type.startsWith("image/") ? (
                            <span
                              style={{ fontSize: "24px", color: "#4CAF50" }}
                            >
                              IMG
                            </span>
                          ) : (
                            <span
                              style={{ fontSize: "24px", color: "#2196F3" }}
                            >
                              TXT
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: "bold",
                              marginBottom: "5px",
                              fontSize: "16px",
                            }}
                          >
                            {uploadedFile.name}
                          </div>
                          <div style={{ color: "#666", fontSize: "14px" }}>
                            {uploadedFile.type} •{" "}
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                      {filePreview && (
                        <div style={{ marginTop: "15px" }}>
                          <img
                            src={filePreview}
                            alt="File preview"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "200px",
                              borderRadius: "6px",
                              border: "1px solid #ddd",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {uploadedFile && !parsedOrderData && (
                      <button
                        onClick={handleClearInput}
                        style={{
                          marginTop: "10px",
                          padding: "8px 15px",
                          background: "#ff4444",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                        }}
                        disabled={isProcessing}
                      >
                        Remove File
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border:
                        validationErrors.length > 0
                          ? "3px dashed #f44336"
                          : "3px dashed #ddd",
                      borderRadius: "8px",
                      padding: "40px",
                      textAlign: "center",
                      background: "#fafafa",
                      cursor: "pointer",
                      transition: "border-color 0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor =
                        validationErrors.length > 0 ? "#f44336" : "#4CAF50")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor =
                        validationErrors.length > 0 ? "#f44336" : "#ddd")
                    }
                  >
                    <div
                      style={{
                        fontSize: "48px",
                        color: "#4CAF50",
                        marginBottom: "15px",
                      }}
                    >
                      UPLOAD
                    </div>
                    <p style={{ margin: 0, color: "#333", fontSize: "16px" }}>
                      Click to upload or paste document
                    </p>
                    <p
                      style={{
                        margin: "10px 0 0 0",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      Supported:{" "}
                      {CONFIG.ALLOWED_OCR_FILE_TYPES.join(", ").toUpperCase()} •
                      Max {(CONFIG.MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Item Codes Reference */}
            <div
              style={{
                background: "#e8f5e9",
                padding: "15px",
                borderRadius: "8px",
                marginTop: "20px",
                border: "1px solid #c8e6c9",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  color: "#2E7D32",
                }}
              >
                Naivas Bread Item Codes Reference
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                  fontSize: "13px",
                }}
              >
                {Object.entries(CONFIG.ITEM_CODE_MAPPING).map(
                  ([code, productCode]) => (
                    <div key={code}>
                      {code} → {CONFIG.ITEM_NAMES_MAPPING[code] || productCode}{" "}
                      ({productCode})
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  margin: "20px 0",
                  border: "1px solid #e0e0e0",
                }}
              >
                <div
                  className="spinner"
                  style={{
                    margin: "0 auto 15px",
                    width: "40px",
                    height: "40px",
                    borderWidth: "4px",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    color: "#666",
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  {parsedOrderData
                    ? "Creating order..."
                    : inputMode === "file"
                      ? "Processing document..."
                      : "Processing PO text..."}
                </p>
              </div>
            )}

            {/* Parsed Order Preview */}
            {parsedOrderData && !isProcessing && (
              <div
                className="parsed-order-preview"
                style={{
                  background: "#e8f5e9",
                  padding: "20px",
                  borderRadius: "8px",
                  marginTop: "20px",
                  border: "2px solid #4CAF50",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <div>
                    <h4
                      style={{ margin: 0, color: "#2E7D32", fontSize: "18px" }}
                    >
                      PO Parsed Successfully
                    </h4>
                    <p
                      style={{
                        margin: "5px 0 0 0",
                        color: "#555",
                        fontSize: "14px",
                      }}
                    >
                      Found {parsedOrderData.items?.length || 0} items
                      {parsedOrderData.lpoNumber &&
                        ` • LPO: ${parsedOrderData.lpoNumber}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setParsedOrderData(null);
                      if (inputMode === "text") {
                        setTimeout(() => textAreaRef.current?.focus(), 0);
                      }
                    }}
                    className="btn btn-sm"
                    style={{
                      background: "#ff9800",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Edit PO
                  </button>
                </div>

                {/* Items List */}
                {parsedOrderData.items && parsedOrderData.items.length > 0 && (
                  <div style={{ marginTop: "15px" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr 1fr 1fr",
                        gap: "10px",
                        padding: "12px",
                        background: "white",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        borderBottom: "2px solid #4CAF50",
                        fontSize: "14px",
                      }}
                    >
                      <div>Item Description</div>
                      <div style={{ textAlign: "center" }}>Quantity</div>
                      <div style={{ textAlign: "center" }}>Unit Price</div>
                      <div style={{ textAlign: "right" }}>Total</div>
                    </div>
                    {parsedOrderData.items.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "3fr 1fr 1fr 1fr",
                          gap: "10px",
                          padding: "12px",
                          background: "white",
                          borderRadius: "6px",
                          marginTop: "8px",
                          borderLeft: `4px solid ${item.status === "matched" ? "#4CAF50" : "#ff9800"}`,
                          fontSize: "14px",
                        }}
                      >
                        <div>
                          <div
                            style={{ fontWeight: "bold", marginBottom: "3px" }}
                          >
                            {item.description}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {item.product
                              ? `${item.product.itemCode} - ${item.product.itemName}`
                              : "Product not found in system"}
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: "center",
                            alignSelf: "center",
                            fontWeight: "500",
                          }}
                        >
                          {item.quantity}
                        </div>
                        <div
                          style={{
                            textAlign: "center",
                            alignSelf: "center",
                            fontWeight: "500",
                          }}
                        >
                          Ksh {item.unitPrice?.toFixed(2)}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            alignSelf: "center",
                            fontWeight: "bold",
                            color: "#2E7D32",
                          }}
                        >
                          Ksh {item.netAmount?.toFixed(2)}
                        </div>
                      </div>
                    ))}

                    {/* Totals */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr 1fr 1fr",
                        gap: "10px",
                        padding: "15px",
                        background: "#2E7D32",
                        color: "white",
                        borderRadius: "6px",
                        marginTop: "12px",
                        fontWeight: "bold",
                        fontSize: "15px",
                      }}
                    >
                      <div>ORDER TOTAL</div>
                      <div style={{ textAlign: "center" }}>
                        {parsedOrderData.items.reduce(
                          (sum, item) => sum + (item.quantity || 0),
                          0,
                        )}
                      </div>
                      <div></div>
                      <div style={{ textAlign: "right" }}>
                        Ksh{" "}
                        {parsedOrderData.items
                          .reduce((sum, item) => sum + (item.netAmount || 0), 0)
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {parsedOrderData.parsingWarnings &&
                  parsedOrderData.parsingWarnings.length > 0 && (
                    <div
                      style={{
                        background: "#fff3cd",
                        padding: "12px",
                        borderRadius: "6px",
                        marginTop: "15px",
                        border: "1px solid #ffc107",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "#856404",
                          marginBottom: "8px",
                        }}
                      >
                        Notices:
                      </div>
                      {parsedOrderData.parsingWarnings.map((warning, index) => (
                        <div
                          key={index}
                          style={{
                            fontSize: "13px",
                            color: "#856404",
                            marginBottom: "3px",
                            paddingLeft: "10px",
                          }}
                        >
                          • {warning}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>

          <div
            className="modal-footer"
            style={{
              padding: "20px",
              borderTop: "2px solid #e0e0e0",
              background: "#f8f9fa",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <button
                onClick={() => {
                  setShowDocumentReader(false);
                  setPoText("");
                  if (filePreview) URL.revokeObjectURL(filePreview);
                  setUploadedFile(null);
                  setFilePreview(null);
                  setParsedOrderData(null);
                  setValidationErrors([]);
                }}
                className="btn btn-secondary"
                disabled={isProcessing}
                style={{
                  minWidth: "100px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>

              {!parsedOrderData ? (
                <button
                  onClick={handleProcessInput}
                  className="btn btn-primary"
                  disabled={
                    isProcessing ||
                    (inputMode === "text" ? !poText.trim() : !uploadedFile)
                  }
                  style={{
                    minWidth: "150px",
                    padding: "10px 25px",
                    fontSize: "16px",
                    fontWeight: "600",
                    background: (
                      inputMode === "text" ? !poText.trim() : !uploadedFile
                    )
                      ? "#cccccc"
                      : "#2196F3",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: (
                      inputMode === "text" ? !poText.trim() : !uploadedFile
                    )
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {isProcessing ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        className="spinner"
                        style={{
                          width: "16px",
                          height: "16px",
                          borderWidth: "2px",
                        }}
                      ></span>
                      Processing...
                    </span>
                  ) : inputMode === "file" ? (
                    "Process Document"
                  ) : (
                    "Process PO"
                  )}
                </button>
              ) : (
                <button
                  onClick={() =>
                    handleCreateOrder(parsedOrderData, selectedCustomer)
                  }
                  className="btn btn-success"
                  disabled={isProcessing}
                  style={{
                    minWidth: "150px",
                    padding: "10px 25px",
                    fontSize: "16px",
                    fontWeight: "600",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {isProcessing ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        className="spinner"
                        style={{
                          width: "16px",
                          height: "16px",
                          borderWidth: "2px",
                        }}
                      ></span>
                      Creating Order...
                    </span>
                  ) : (
                    "Create Order"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// Customer Modal Component
const CustomerModal = memo(
  ({
    showCustomerModal,
    setShowCustomerModal,
    customerSearchQuery,
    setCustomerSearchQuery,
    customersLoading,
    customers,
    filteredCustomers,
    customersError,
    selectedCustomer,
    handleSelectCustomer,
    loadCustomers,
    selectedBranches,
  }) => {
    const searchInputRef = useRef(null);

    useEffect(() => {
      if (showCustomerModal && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [showCustomerModal]);

    const handleClearSearch = () => {
      setCustomerSearchQuery("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };

    if (!showCustomerModal) return null;

    return (
      <div className="modal-overlay">
        <div
          className="modal-content"
          style={{ maxWidth: "1000px", maxHeight: "80vh" }}
        >
          <div className="modal-header">
            <h3>Select Customer for Order Creation</h3>
            <button
              onClick={() => setShowCustomerModal(false)}
              className="modal-close-btn"
              disabled={customersLoading}
            >
              ×
            </button>
          </div>

          <div className="modal-body" style={{ overflowY: "auto" }}>
            <div className="customer-search-section">
              <div className="search-input-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search customers by name, code, or phone..."
                  className="search-input"
                  disabled={customersLoading}
                />
                {customerSearchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="search-clear-btn"
                    disabled={customersLoading}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="search-info">
                {customers.length > 0 && (
                  <span>
                    Found {filteredCustomers.length} of {customers.length}{" "}
                    customers
                    {customerSearchQuery && " matching your search"}
                  </span>
                )}
              </div>
            </div>

            {customersLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>
                  Loading customers from {selectedBranches.length} branch(es)...
                </p>
              </div>
            ) : customersError ? (
              <div className="error-state">
                <p>Error: {customersError}</p>
                <button
                  onClick={loadCustomers}
                  className="btn btn-sm"
                  disabled={customersLoading}
                >
                  Try Again
                </button>
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="customers-list">
                {filteredCustomers.map((customer) => {
                  const isNaivas =
                    customer.name?.toLowerCase().includes("naivas") ||
                    customer.customerType
                      ?.toLowerCase()
                      .includes("supermarket");
                  return (
                    <div
                      key={`${customer.id}-${customer.branch}-${customer.code}`}
                      className={`customer-card ${selectedCustomer?.id === customer.id ? "selected" : ""}`}
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        borderLeft: isNaivas
                          ? "4px solid #4CAF50"
                          : "4px solid #2196F3",
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div className="customer-card-header">
                        <div className="customer-name">
                          {customer.name}
                          {isNaivas && (
                            <span
                              style={{
                                marginLeft: "10px",
                                background: "#4CAF50",
                                color: "white",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              NAIVAS
                            </span>
                          )}
                        </div>
                        <div
                          className="customer-code"
                          style={{ fontWeight: "500", color: "#666" }}
                        >
                          {customer.code}
                        </div>
                      </div>
                      <div className="customer-card-details">
                        <div className="customer-detail">
                          <span className="detail-label">Branch:</span>
                          <span className="detail-value">
                            {customer.branch}
                          </span>
                        </div>
                        <div className="customer-detail">
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">
                            {customer.customerType}
                          </span>
                        </div>
                        <div className="customer-detail">
                          <span className="detail-label">Route:</span>
                          <span className="detail-value">
                            {customer.customerRoute || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div
                        className="customer-action-hint"
                        style={{
                          marginTop: "10px",
                          padding: "8px",
                          background: isNaivas ? "#e8f5e9" : "#f0f0f0",
                          borderRadius: "4px",
                          fontSize: "13px",
                          color: isNaivas ? "#2E7D32" : "#666",
                          textAlign: "center",
                          fontWeight: "500",
                          border: isNaivas
                            ? "1px solid #4CAF50"
                            : "1px solid #ddd",
                        }}
                      >
                        {isNaivas
                          ? "Click to upload Naivas PO"
                          : "Click to upload PO"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  No customers found
                  {customerSearchQuery && " matching your search"}.
                </p>
                {customers.length === 0 && selectedBranches.length > 0 && (
                  <button
                    onClick={loadCustomers}
                    className="btn btn-sm"
                    disabled={customersLoading}
                  >
                    Load Customers
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {selectedCustomer ? (
              <>
                <div className="selected-customer-info">
                  <strong>Selected:</strong> {selectedCustomer.name} (
                  {selectedCustomer.code})
                </div>
                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setShowCustomerModal(false);
                    }}
                    className="btn btn-success"
                  >
                    Next: Upload PO →
                  </button>
                  <button
                    onClick={() => handleSelectCustomer(null)}
                    className="btn btn-secondary"
                  >
                    Change Selection
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={loadCustomers}
                  className="btn btn-primary"
                  disabled={customersLoading}
                >
                  {customersLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);

// Calendar Day Component
const CalendarDay = memo(
  ({
    day,
    date,
    isCurrentMonth,
    isToday,
    isSelected,
    hasOrders,
    orderCount,
    totalValue,
    ordersLoading,
    handleDateSelect,
  }) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayNum = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${dayNum}`;

    return (
      <div
        className={`calendar-day 
        ${isCurrentMonth ? "current-month" : "other-month"} 
        ${isToday ? "today" : ""}
        ${isSelected ? "selected" : ""}
        ${hasOrders ? "has-orders" : ""}`}
        onClick={() =>
          isCurrentMonth && !ordersLoading && handleDateSelect(date)
        }
        title={
          hasOrders
            ? `${orderCount} orders (Ksh ${totalValue?.toLocaleString()})`
            : ""
        }
        style={{ cursor: ordersLoading ? "not-allowed" : "pointer" }}
      >
        <div className="calendar-day-number">{day}</div>
        {hasOrders && (
          <div className="calendar-day-indicator">
            <div className="order-dot"></div>
            {orderCount > 0 && orderCount < 10 && (
              <div className="order-count-small">{orderCount}</div>
            )}
            {orderCount >= 10 && <div className="order-dot-multiple"></div>}
          </div>
        )}
      </div>
    );
  },
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [userBranches, setUserBranches] = useState(CONFIG.BRANCHES);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    branchCounts: {},
    summary: {},
  });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [showDocumentReader, setShowDocumentReader] = useState(false);
  const [poText, setPoText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedOrderData, setParsedOrderData] = useState(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(CONFIG.ITEMS_PER_PAGE);
  const [viewMode, setViewMode] = useState("single");
  const [highlightedDates, setHighlightedDates] = useState({});
  const [calendarStats, setCalendarStats] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [branchSwitching, setBranchSwitching] = useState(false);

  const calendarRef = useRef(null);
  const initializedRef = useRef(false);
  const ordersSearchInputRef = useRef(null);

  // Sync branch state with authService
  useEffect(() => {
    const syncBranchState = () => {
      if (user) {
        const currentBranch = authService.getCurrentBranch();
        const userBranches = authService.getUserBranches() || CONFIG.BRANCHES;

        setUserBranches(userBranches);

        if (
          selectedBranches.length === 0 ||
          (viewMode === "single" && selectedBranches[0] !== currentBranch)
        ) {
          setSelectedBranches([currentBranch || CONFIG.DEFAULT_BRANCH]);
        }
      }
    };

    syncBranchState();

    const handleStorageChange = (e) => {
      if (e.key === "dds_current_branch" || e.key === "dds_user") {
        syncBranchState();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user, viewMode, selectedBranches]);

  const filteredCustomers = customerSearchQuery
    ? customers.filter(
        (customer) =>
          (customer.name &&
            customer.name
              .toLowerCase()
              .includes(customerSearchQuery.toLowerCase())) ||
          (customer.code &&
            customer.code
              .toLowerCase()
              .includes(customerSearchQuery.toLowerCase())) ||
          (customer.telephone &&
            customer.telephone.toString().includes(customerSearchQuery)),
      )
    : customers;

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      (order.customerName &&
        order.customerName.toLowerCase().includes(query)) ||
      (order.customerCode &&
        order.customerCode.toLowerCase().includes(query)) ||
      (order.orderNumber && order.orderNumber.toLowerCase().includes(query)) ||
      (order.lpo && order.lpo.toLowerCase().includes(query)) ||
      (order.totalValue && order.totalValue.toString().includes(query)) ||
      (order.branch && order.branch.toLowerCase().includes(query)) ||
      (order.customerRoute && order.customerRoute.toLowerCase().includes(query))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const loadCustomers = useCallback(
    async (branchesToLoad = null) => {
      const branches = branchesToLoad || selectedBranches;

      if (branches.length === 0) {
        setCustomers([]);
        return;
      }

      setCustomersLoading(true);
      setCustomersError("");
      setSelectedCustomer(null);

      try {
        const result = await customerService.getMultiBranchCustomers(branches, {
          forceRefresh: true,
          silent: false,
        });

        setCustomers(result.customers);

        if (result.errors && result.errors.length > 0) {
          setCustomersError(
            `${result.errors.length} branch(es) failed to load customers`,
          );
        }
      } catch (error) {
        setCustomersError(`Failed to load customers: ${error.message}`);
        setCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    },
    [selectedBranches],
  );

  const openDocumentReader = useCallback((customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setShowDocumentReader(true);
    setPoText("");
    setParsedOrderData(null);
    setIsProcessing(false);
  }, []);

  const handleProcessPO = useCallback(async (text, customer) => {
    if (!text || !text.trim()) {
      alert("Please paste PO text first");
      return;
    }

    if (text.length < 50) {
      alert("PO text appears too short. Minimum 50 characters required.");
      return;
    }

    setIsProcessing(true);

    try {
      const parsedData = await orderCreationService.parsePOText(
        text.trim(),
        customer.code,
      );

      const isNaivas =
        customer.name?.toLowerCase().includes("naivas") ||
        customer.customerType?.toLowerCase().includes("supermarket");

      if (!parsedData.deliveryDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        parsedData.deliveryDate =
          tomorrow.toISOString().split("T")[0] + "T00:00:00.000Z";
      }

      parsedData.customerName = customer.name;
      parsedData.customerCode = customer.code;
      parsedData.branch = customer.branch;
      parsedData.isNaivasCustomer = isNaivas;

      const unmatchedItems = parsedData.items.filter(
        (item) => item.status !== "matched",
      );
      if (unmatchedItems.length > 0 && isNaivas) {
        if (!parsedData.parsingWarnings) parsedData.parsingWarnings = [];
        parsedData.parsingWarnings.push(
          `${unmatchedItems.length} item(s) could not be matched to Naivas MOU products.`,
        );
      }

      setParsedOrderData(parsedData);
    } catch (error) {
      if (CONFIG.ENABLE_CONSOLE_LOGS)
        console.error("PO Processing error:", error);
      alert(
        `Failed to process PO: ${error.message}\n\nPlease check the PO format and try again.`,
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const loadOrdersForDate = useCallback(
    async (date) => {
      if (!selectedBranches || selectedBranches.length === 0) {
        setOrders([]);
        setStats({
          totalOrders: 0,
          totalValue: 0,
          branchCounts: {},
          summary: {},
        });
        return;
      }

      if (!date) {
        return;
      }

      setOrdersLoading(true);
      setOrdersError(null);
      setCurrentPage(1);

      try {
        const result = await ordersService.getMultiBranchOrders(
          selectedBranches,
          date,
          {
            forceRefresh: true,
            silent: false,
            timeout: CONFIG.ORDERS_TIMEOUT,
          },
        );

        setOrders(result.orders);
        setSearchQuery("");

        const branchCounts = {};
        result.orders.forEach((order) => {
          branchCounts[order.branch] = (branchCounts[order.branch] || 0) + 1;
        });

        setStats({
          totalOrders: result.summary.totalOrders,
          totalValue: result.summary.totalValue,
          branchCounts: branchCounts,
          summary: result.summary,
          branchResults: result.branchResults,
        });

        if (result.errors && result.errors.length > 0) {
          const errorMsg = `${result.errors.length} branch(es) failed: ${result.errors.map((e) => e.branch).join(", ")}`;
          setOrdersError(errorMsg);
        } else {
          setOrdersError(null);
        }

        return result.orders;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to fetch orders";
        setOrdersError(errorMessage);
        setOrders([]);
        setStats({
          totalOrders: 0,
          totalValue: 0,
          branchCounts: {},
          summary: {},
        });
        throw err;
      } finally {
        setOrdersLoading(false);
      }
    },
    [selectedBranches],
  );

  const handleCreateOrder = useCallback(
    async (orderData, customer) => {
      setIsProcessing(true);

      try {
        const result = await orderCreationService.createOrderFromPO(
          orderData,
          customer.branch,
        );

        if (result.success) {
          const totalAmount = orderData.items
            ? orderData.items.reduce(
                (sum, item) => sum + (item.netAmount || 0),
                0,
              )
            : 0;

          alert(
            `Order created successfully!\n\nOrder Number: ${result.orderNumber}\nCustomer: ${customer.name}\nTotal: Ksh ${totalAmount.toFixed(2)}\nDelivery: ${new Date(orderData.deliveryDate || new Date()).toLocaleDateString()}`,
          );

          setShowDocumentReader(false);
          setPoText("");
          setParsedOrderData(null);
          setSelectedCustomer(null);

          if (selectedDate) {
            setTimeout(() => {
              loadOrdersForDate(selectedDate);
            }, 1000);
          }
        } else {
          throw new Error(result.error || "Failed to create order");
        }
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error("Order creation error:", error);
        alert(`Failed to create order: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedDate, loadOrdersForDate],
  );

  const handleOpenCreateOrder = async () => {
    if (selectedBranches.length === 0) {
      setCustomersError("Please select branch(es) first");
      return;
    }

    if (viewMode === "single") {
      const currentBranch = authService.getCurrentBranch();
      const targetBranch = selectedBranches[0];

      if (currentBranch !== targetBranch) {
        setBranchSwitching(true);
        try {
          await authService.switchBranch(targetBranch);
        } catch (error) {
          setCustomersError(
            `Failed to switch to ${targetBranch}: ${error.message}`,
          );
          return;
        } finally {
          setBranchSwitching(false);
        }
      }
    }

    setShowCustomerModal(true);
    setCustomerSearchQuery("");
    setSelectedCustomer(null);

    loadCustomers(selectedBranches);
  };

  const handleSelectCustomer = (customer) => {
    openDocumentReader(customer);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCalendar]);

  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);

    if (selectedBranches.length > 0) {
      loadCalendarData(newDate);
    }
  };

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days = [];
    const startDay = firstDay.getDay();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      days.push({
        day,
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, "0");
    const todayDay = String(today.getDate()).padStart(2, "0");
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
    const selectedDateStr = selectedDate;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateYear = date.getFullYear();
      const dateMonth = String(date.getMonth() + 1).padStart(2, "0");
      const dateDay = String(date.getDate()).padStart(2, "0");
      const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;
      const highlight = highlightedDates[dateStr];

      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        hasOrders: highlight?.hasOrders || false,
        orderCount: highlight?.orderCount || 0,
        totalValue: highlight?.totalValue || 0,
      });
    }

    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;

    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasOrders: false,
        orderCount: 0,
        totalValue: 0,
      });
    }

    return days;
  };

  const loadCalendarData = useCallback(
    async (date) => {
      if (selectedBranches.length === 0) return;

      setLoadingCalendar(true);
      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const firstDay = new Date(year, date.getMonth(), 1);
        const lastDay = new Date(year, date.getMonth() + 1, 0);

        const startDate = firstDay.toISOString().split("T")[0];
        const endDate = lastDay.toISOString().split("T")[0];

        const tempHighlights = {};

        if (selectedDate) {
          const selectedStats = await ordersService.getDateStats(
            selectedBranches,
            selectedDate,
            {
              silent: true,
            },
          );

          if (selectedStats.success) {
            tempHighlights[selectedDate] = {
              hasOrders: selectedStats.totalOrders > 0,
              orderCount: selectedStats.totalOrders,
              totalValue: selectedStats.totalValue,
            };
          }
        }

        setHighlightedDates(tempHighlights);
        setCalendarStats(null);
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error("Failed to load calendar data:", error);
      } finally {
        setLoadingCalendar(false);
      }
    },
    [selectedBranches, selectedDate],
  );

  const handleDateSelect = async (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    setSelectedDate(dateStr);
    setShowCalendar(false);

    if (selectedBranches.length > 0) {
      try {
        await loadOrdersForDate(dateStr);
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error(`Failed to load orders: ${error.message}`);
      }
    }
  };

  const handleBranchChange = useCallback(
    async (branch) => {
      if (viewMode === "single" && selectedBranches[0] === branch) {
        return;
      }

      setBranchSwitching(true);

      try {
        const switchSuccess = await authService.switchBranch(branch);

        if (!switchSuccess) {
          throw new Error("Failed to switch branch");
        }

        ordersService.clearCache();
        customerService.clearCache();

        if (viewMode === "single") {
          setSelectedBranches([branch]);
        } else {
          const updatedBranches = selectedBranches.includes(branch)
            ? selectedBranches.filter((b) => b !== branch)
            : [...selectedBranches, branch];
          setSelectedBranches(updatedBranches);
        }

        setSelectedDate("");
        setOrders([]);
        setCustomers([]);
        setSearchQuery("");
        setCustomerSearchQuery("");
        setSelectedCustomer(null);
        setStats({
          totalOrders: 0,
          totalValue: 0,
          branchCounts: {},
          summary: {},
        });
        setOrdersError(null);
        setCustomersError("");
        setCurrentPage(1);

        setShowCustomerModal(false);
        setShowDocumentReader(false);
        setPoText("");
        setParsedOrderData(null);
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error(`Failed to switch branch: ${error.message}`);
        setOrdersError(`Failed to switch branch: ${error.message}`);
      } finally {
        setBranchSwitching(false);
      }
    },
    [viewMode, selectedBranches],
  );

  const handleMultiBranchSelect = async (branches) => {
    setBranchSwitching(true);

    ordersService.clearCache();
    customerService.clearCache();

    setSelectedDate("");
    setSelectedBranches(branches);

    setOrders([]);
    setCustomers([]);
    setSearchQuery("");
    setCustomerSearchQuery("");
    setSelectedCustomer(null);
    setStats({
      totalOrders: 0,
      totalValue: 0,
      branchCounts: {},
      summary: {},
    });
    setOrdersError(null);
    setCustomersError("");
    setCurrentPage(1);

    setShowCustomerModal(false);
    setShowDocumentReader(false);
    setPoText("");
    setParsedOrderData(null);

    loadCalendarData(new Date());

    setTimeout(() => {
      setBranchSwitching(false);
    }, 500);
  };

  const handleRefreshOrders = async () => {
    if (selectedBranches.length > 0 && selectedDate && !ordersLoading) {
      ordersService.clearCache();
      try {
        await loadOrdersForDate(selectedDate);
      } catch (error) {
        if (CONFIG.ENABLE_CONSOLE_LOGS)
          console.error(`Refresh failed: ${error.message}`);
      }
    }
  };

  const handleViewModeChange = async (mode) => {
    setBranchSwitching(true);

    setViewMode(mode);
    if (mode === "single" && selectedBranches.length > 0) {
      const firstBranch = selectedBranches[0];

      ordersService.clearCache();
      customerService.clearCache();

      setSelectedDate("");
      setSelectedBranches([firstBranch]);

      setOrders([]);
      setCustomers([]);
      setSearchQuery("");
      setCustomerSearchQuery("");
      setSelectedCustomer(null);
      setStats({
        totalOrders: 0,
        totalValue: 0,
        branchCounts: {},
        summary: {},
      });
      setOrdersError(null);
      setCustomersError("");
      setCurrentPage(1);

      setShowCustomerModal(false);
      setShowDocumentReader(false);
      setPoText("");
      setParsedOrderData(null);
    }

    setTimeout(() => {
      setBranchSwitching(false);
    }, 500);
  };

  useEffect(() => {
    const initializeApp = async () => {
      if (initializedRef.current) {
        return;
      }

      if (authService.isAuthenticated()) {
        const userData = authService.getCurrentUser();
        setUser(userData);

        const branches = authService.getUserBranches() || CONFIG.BRANCHES;
        setUserBranches(branches);

        let initialBranches = [];
        const currentBranch = authService.getCurrentBranch();
        if (currentBranch) {
          initialBranches = [currentBranch];
        } else if (branches.length > 0) {
          initialBranches = [branches[0]];
          authService.forceUpdateBranch(branches[0]);
        }

        setSelectedBranches(initialBranches);
        setSelectedDate("");

        setOrders([]);
        setStats({
          totalOrders: 0,
          totalValue: 0,
          branchCounts: {},
          summary: {},
        });

        initializedRef.current = true;
      } else {
        initializedRef.current = true;
      }

      setLoading(false);
    };

    if (!initializedRef.current) {
      initializeApp();
    }
  }, []);

  useEffect(() => {
    if (selectedBranches.length > 0) {
      loadCalendarData(new Date());
    }
  }, [selectedBranches, loadCalendarData]);

  useEffect(() => {
    if (showCustomerModal && selectedBranches.length > 0) {
      loadCustomers(selectedBranches);
    }
  }, [showCustomerModal, selectedBranches, loadCustomers]);

  const handleLoginSuccess = async (userData) => {
    setUser(userData);

    const branches = authService.getUserBranches() || CONFIG.BRANCHES;
    setUserBranches(branches);

    if (branches.length > 0) {
      const defaultBranch = branches[0];

      ordersService.clearCache();
      customerService.clearCache();

      setSelectedDate("");

      setSelectedBranches([defaultBranch]);
      setViewMode("single");
      authService.updateCurrentBranch(defaultBranch);

      setOrders([]);
      setCustomers([]);
      setSearchQuery("");
      setCustomerSearchQuery("");
      setSelectedCustomer(null);
      setStats({
        totalOrders: 0,
        totalValue: 0,
        branchCounts: {},
        summary: {},
      });
      setOrdersError(null);
      setCustomersError("");

      setShowCustomerModal(false);
      setShowDocumentReader(false);
      setPoText("");
      setParsedOrderData(null);
    }
  };

  const handleLogout = async () => {
    initializedRef.current = false;
    await authService.logout();
    setUser(null);
    setSelectedBranches([]);
    setUserBranches([]);
    setOrders([]);
    setCustomers([]);
    setHighlightedDates({});
    setCalendarStats(null);
    setSelectedDate("");
    setLoading(false);
    setBranchSwitching(false);
    setShowCustomerModal(false);
    setShowDocumentReader(false);
    setPoText("");
    setParsedOrderData(null);
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Select Date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "N/A";
    }
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const dayNames = [
    { letter: "S", fullName: "Sunday", key: "sun" },
    { letter: "M", fullName: "Monday", key: "mon" },
    { letter: "T", fullName: "Tuesday", key: "tue" },
    { letter: "W", fullName: "Wednesday", key: "wed" },
    { letter: "T", fullName: "Thursday", key: "thu" },
    { letter: "F", fullName: "Friday", key: "fri" },
    { letter: "S", fullName: "Saturday", key: "sat" },
  ];

  const handleClearOrdersSearch = () => {
    setSearchQuery("");
    setTimeout(() => {
      ordersSearchInputRef.current?.focus();
    }, 0);
  };

  const isLoading = loading || branchSwitching;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-logo">{CONFIG.APP_NAME}</div>
          <div className="spinner spinner-lg"></div>
          <p
            style={{
              color: "var(--color-green)",
              marginTop: "var(--space-lg)",
            }}
          >
            Initializing system...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <>
          <header className="app-header">
            <div className="header-left">
              <div className="app-logo">
                <span className="logo-main">CT226</span>
                <span className="logo-sub">SLICES OF MATH</span>
              </div>
            </div>

            <div className="header-right">
              <div className="branch-select-wrapper">
                {viewMode === "single" ? (
                  <select
                    value={
                      authService.getCurrentBranch() ||
                      selectedBranches[0] ||
                      ""
                    }
                    onChange={(e) => handleBranchChange(e.target.value)}
                    className="branch-dropdown"
                    disabled={isLoading}
                  >
                    <option value="">
                      Select Branch ({userBranches.length})
                    </option>
                    {userBranches.map((branch, index) => (
                      <option key={`${branch}-${index}`} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="multi-branch-select">
                    <select
                      multiple
                      value={selectedBranches}
                      onChange={(e) => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value,
                        );
                        handleMultiBranchSelect(selected);
                      }}
                      className="branch-dropdown-multi"
                      disabled={isLoading}
                      size={3}
                    >
                      {userBranches.map((branch, index) => (
                        <option key={`${branch}-${index}`} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                    <div className="multi-branch-actions">
                      <button
                        onClick={() => handleMultiBranchSelect(userBranches)}
                        className="btn btn-sm"
                        disabled={isLoading}
                      >
                        Select All
                      </button>
                      <span className="branch-count">
                        {selectedBranches.length} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {selectedBranches.length > 0 && (
                <button
                  onClick={handleOpenCreateOrder}
                  className="create-order-btn"
                  disabled={isLoading}
                >
                  Create Order
                </button>
              )}

              <div className="user-info">
                <span className="user-name">
                  {user.name ? user.name.toUpperCase() : ""}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="logout-btn"
                disabled={isLoading}
              >
                Logout
              </button>
            </div>
          </header>

          <main className="app-main">
            <div className="dashboard-container">
              <div
                className="card"
                style={{ maxWidth: "1600px", margin: "0 auto" }}
              >
                <div className="card-header">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="card-title">
                        {selectedBranches.length === 0
                          ? "Select Branch(es)"
                          : selectedBranches.length === 1
                            ? `${selectedBranches[0]} Orders`
                            : `${selectedBranches.length} Branches Orders`}
                        {selectedDate && (
                          <span className="card-subtitle">
                            {" "}
                            • {formatDisplayDate(selectedDate)}
                          </span>
                        )}
                      </h2>
                      {selectedBranches.length > 1 && (
                        <div className="branch-tags">
                          {selectedBranches.slice(0, 3).map((branch) => (
                            <span key={`tag-${branch}`} className="branch-tag">
                              {branch} ({stats.branchCounts[branch] || 0})
                            </span>
                          ))}
                          {selectedBranches.length > 3 && (
                            <span className="branch-tag-more">
                              +{selectedBranches.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedBranches.length > 0 && (
                      <div className="date-filter-container">
                        <div
                          className="calendar-trigger-container"
                          ref={calendarRef}
                        >
                          <div
                            className="calendar-input-wrapper"
                            onClick={() => {
                              if (!isLoading) {
                                setCalendarDate(
                                  selectedDate
                                    ? new Date(selectedDate)
                                    : new Date(),
                                );
                                setShowCalendar(!showCalendar);
                              }
                            }}
                            style={{
                              cursor: isLoading ? "not-allowed" : "pointer",
                            }}
                          >
                            <input
                              type="text"
                              value={formatDisplayDate(selectedDate)}
                              readOnly
                              placeholder="Select date to view orders..."
                              className="calendar-input"
                              disabled={isLoading}
                            />
                            <span className="calendar-icon">Calendar</span>
                          </div>

                          {showCalendar && (
                            <div className="calendar-popup">
                              <div className="calendar-header">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateMonth(-1);
                                  }}
                                  className="calendar-nav-btn"
                                  disabled={loadingCalendar || isLoading}
                                >
                                  «
                                </button>
                                <div className="calendar-month-year">
                                  {getMonthName(calendarDate)}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateMonth(1);
                                  }}
                                  className="calendar-nav-btn"
                                  disabled={loadingCalendar || isLoading}
                                >
                                  »
                                </button>
                              </div>

                              {loadingCalendar ? (
                                <div className="calendar-loading">
                                  <div className="spinner spinner-sm"></div>
                                  <p>Loading calendar...</p>
                                </div>
                              ) : (
                                <div className="calendar-grid">
                                  {dayNames.map((day) => (
                                    <div
                                      key={day.key}
                                      className="calendar-day-header"
                                    >
                                      {day.letter}
                                    </div>
                                  ))}

                                  {getCalendarDays().map((day, index) => (
                                    <CalendarDay
                                      key={`${day.date.getTime()}-${index}`}
                                      {...day}
                                      ordersLoading={isLoading}
                                      handleDateSelect={handleDateSelect}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: "var(--space-xl)" }}>
                  <>
                    {selectedDate && selectedBranches.length > 0 && (
                      <div className="stats-summary">
                        <div className="stat-item-main">
                          <div className="stat-label-main">Total Orders</div>
                          <div className="stat-value-main">
                            {stats.totalOrders}
                          </div>
                        </div>

                        <div className="stat-item-main">
                          <div className="stat-label-main">Total Value</div>
                          <div className="stat-value-main">
                            Ksh{" "}
                            {stats.totalValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDate &&
                      selectedBranches.length > 0 &&
                      orders.length > 0 && (
                        <div className="search-container">
                          <div className="search-input-wrapper">
                            <input
                              ref={ordersSearchInputRef}
                              type="text"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                              }}
                              placeholder="Search"
                              className="search-input"
                              disabled={ordersLoading}
                            />
                            {searchQuery && (
                              <button
                                onClick={handleClearOrdersSearch}
                                className="search-clear-btn"
                                disabled={ordersLoading}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {searchQuery && (
                            <div className="search-results-info">
                              Found {filteredOrders.length} matching orders
                            </div>
                          )}
                        </div>
                      )}

                    <div className="orders-container">
                      <div className="orders-header">
                        <h4>Orders List</h4>
                        {selectedDate && (
                          <div className="orders-info">
                            <span>
                              Showing {indexOfFirstItem + 1}-
                              {Math.min(indexOfLastItem, filteredOrders.length)}{" "}
                              of {filteredOrders.length} orders
                              {searchQuery && " (filtered)"}
                            </span>
                          </div>
                        )}
                      </div>

                      {ordersLoading ? (
                        <div className="loading-state">
                          <div className="spinner"></div>
                          <p>Loading orders for {selectedDate}...</p>
                        </div>
                      ) : ordersError ? (
                        <div className="error-state">
                          <p>Error loading orders: {ordersError}</p>
                          {selectedDate && (
                            <button
                              onClick={handleRefreshOrders}
                              className="btn btn-sm"
                              disabled={ordersLoading}
                            >
                              Try Again
                            </button>
                          )}
                        </div>
                      ) : selectedDate && currentOrders.length > 0 ? (
                        <>
                          <div className="table-container">
                            <table className="orders-table">
                              <thead>
                                <tr>
                                  <th>Branch</th>
                                  <th>Order</th>
                                  <th>Customer</th>
                                  <th>Route</th>
                                  <th>LPO</th>
                                  <th>Amount</th>
                                  <th>Order Time</th>
                                  <th>Delivery Date</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentOrders.map((order, index) => (
                                  <tr
                                    key={`${order.id || index}-${order.orderNumber}`}
                                  >
                                    <td className="branch-cell">
                                      <div className="branch-name">
                                        {order.branch}
                                      </div>
                                    </td>
                                    <td className="order-number">
                                      <div className="order-number-text">
                                        {order.orderNumber}
                                      </div>
                                    </td>
                                    <td className="customer-cell">
                                      <div className="customer-name">
                                        {order.customerName}
                                      </div>
                                      <div className="customer-code">
                                        {order.customerCode}
                                      </div>
                                      {order.customerPhone && (
                                        <div className="customer-phone">
                                          {order.customerPhone}
                                        </div>
                                      )}
                                    </td>
                                    <td className="route-cell">
                                      {order.customerRoute}
                                    </td>
                                    <td className="lpo-cell">
                                      {order.lpo || "N/A"}
                                    </td>
                                    <td className="amount-cell">
                                      <div className="amount-value">
                                        Ksh{" "}
                                        {order.totalValue?.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          },
                                        ) || "0.00"}
                                      </div>
                                    </td>
                                    <td className="time-cell">
                                      {formatTime(
                                        order.createdAt || order.orderDate,
                                      )}
                                    </td>
                                    <td className="date-cell">
                                      {order.deliveryDate
                                        ? new Date(
                                            order.deliveryDate,
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </td>
                                    <td className="status-cell">
                                      <span
                                        className={`status-badge status-${order.status?.toLowerCase().replace(/\s+/g, "-") || "pending"}`}
                                      >
                                        {order.status || "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {filteredOrders.length > itemsPerPage && (
                            <div className="pagination-controls">
                              <div className="pagination-info">
                                <span>
                                  Page {currentPage} of {totalPages}
                                </span>
                                <span className="pagination-size">
                                  {itemsPerPage} items per page
                                </span>
                              </div>
                              <div className="pagination-buttons">
                                <button
                                  onClick={handleFirstPage}
                                  disabled={currentPage === 1}
                                  className="pagination-btn"
                                >
                                  First
                                </button>
                                <button
                                  onClick={handlePrevPage}
                                  disabled={currentPage === 1}
                                  className="pagination-btn"
                                >
                                  Previous
                                </button>

                                <div className="page-numbers">
                                  {Array.from(
                                    { length: totalPages },
                                    (_, i) => i + 1,
                                  )
                                    .filter((page) => {
                                      return (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 &&
                                          page <= currentPage + 1)
                                      );
                                    })
                                    .map((page, index, array) => {
                                      const showEllipsis =
                                        index > 0 &&
                                        page > array[index - 1] + 1;
                                      return (
                                        <div
                                          key={page}
                                          className="page-number-wrapper"
                                        >
                                          {showEllipsis && (
                                            <span className="ellipsis">
                                              ...
                                            </span>
                                          )}
                                          <button
                                            onClick={() =>
                                              handlePageChange(page)
                                            }
                                            className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                                          >
                                            {page}
                                          </button>
                                        </div>
                                      );
                                    })}
                                </div>

                                <button
                                  onClick={handleNextPage}
                                  disabled={currentPage === totalPages}
                                  className="pagination-btn"
                                >
                                  Next
                                </button>
                                <button
                                  onClick={handleLastPage}
                                  disabled={currentPage === totalPages}
                                  className="pagination-btn"
                                >
                                  Last
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="empty-state">
                          {selectedBranches.length === 0 ? (
                            <p>Please select branch(es) to view orders</p>
                          ) : !selectedDate ? null : (
                            <>
                              <p>
                                No orders found for{" "}
                                {formatDisplayDate(selectedDate)}
                              </p>
                              <div className="empty-state-actions">
                                <button
                                  onClick={handleOpenCreateOrder}
                                  className="btn btn-sm"
                                >
                                  Create New Order
                                </button>
                                <button
                                  onClick={handleRefreshOrders}
                                  className="btn btn-sm"
                                  disabled={ordersLoading}
                                >
                                  Refresh
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                </div>
              </div>
            </div>
          </main>

          <footer className="app-footer">
            <div className="footer-content">
              <span>
                {CONFIG.APP_NAME} v{import.meta.env.VITE_APP_VERSION || "1.0.0"}
              </span>
              <span>API: mbnl.ddsolutions.tech</span>
              <span>{new Date().getFullYear()} © CT226 Slices of Math</span>
            </div>
          </footer>

          {showCustomerModal && (
            <CustomerModal
              showCustomerModal={showCustomerModal}
              setShowCustomerModal={setShowCustomerModal}
              customerSearchQuery={customerSearchQuery}
              setCustomerSearchQuery={setCustomerSearchQuery}
              customersLoading={customersLoading}
              customers={customers}
              filteredCustomers={filteredCustomers}
              customersError={customersError}
              selectedCustomer={selectedCustomer}
              handleSelectCustomer={handleSelectCustomer}
              loadCustomers={() => loadCustomers(selectedBranches)}
              selectedBranches={selectedBranches}
            />
          )}

          {showDocumentReader && (
            <DocumentReaderModal
              showDocumentReader={showDocumentReader}
              setShowDocumentReader={setShowDocumentReader}
              selectedCustomer={selectedCustomer}
              poText={poText}
              setPoText={setPoText}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              parsedOrderData={parsedOrderData}
              setParsedOrderData={setParsedOrderData}
              handleProcessPO={handleProcessPO}
              handleCreateOrder={handleCreateOrder}
            />
          )}
        </>
      ) : (
        <div className="login-container">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      )}
    </div>
  );
}

export default App;
