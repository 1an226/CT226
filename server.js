// server.js - Simple OCR Server for Naivas PO (ES Module version)
import express from "express";
import multer from "multer";
import Tesseract from "tesseract.js";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());

// Configuration from environment variables
const config = {
  port: process.env.VITE_OCR_SERVER_PORT || 3000,
  maxFileSize: process.env.VITE_OCR_SERVER_MAX_FILE_SIZE || 10485760,
  timeout: process.env.VITE_OCR_SERVER_TIMEOUT || 60000,
  retryAttempts: process.env.VITE_OCR_SERVER_RETRY_ATTEMPTS || 3,
  retryDelay: process.env.VITE_OCR_SERVER_RETRY_DELAY || 2000,
  
  // Tesseract configuration
  tesseract: {
    language: process.env.VITE_TESSERACT_LANGUAGE || "eng",
    charWhitelist: process.env.VITE_TESSERACT_CHAR_WHITELIST || "0123456789PabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -/,.",
    psm: parseInt(process.env.VITE_TESSERACT_PSM) || 3,
    oem: parseInt(process.env.VITE_TESSERACT_OEM) || 1,
    debug: process.env.VITE_TESSERACT_DEBUG === "true"
  },
  
  // Item mapping from environment variable
  itemMapping: process.env.VITE_ITEM_CODE_MAPPING 
    ? Object.fromEntries(
        process.env.VITE_ITEM_CODE_MAPPING.split(',').map(pair => {
          const [key, value] = pair.split(':');
          return [key.trim(), value.trim()];
        })
      )
    : {
        13505757: "FG867",
        13505844: "FG860",
        13505845: "FG864",
        13505786: "FG861",
        13505758: "FG869",
        13505790: "FG863",
      },
  
  // Item names mapping (optional)
  itemNames: process.env.VITE_ITEM_NAMES_MAPPING
    ? Object.fromEntries(
        process.env.VITE_ITEM_NAMES_MAPPING.split(',').map(pair => {
          const [key, value] = pair.split(':');
          return [key.trim(), value.trim()];
        })
      )
    : {},
};

// File upload setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize
  }
});

// Simple OCR endpoint
app.post("/api/naivas/ocr", upload.single("image"), async (req, res) => {
  try {
    console.log("Processing Naivas PO image...");
    console.log("Config:", {
      language: config.tesseract.language,
      psm: config.tesseract.psm,
      itemCount: Object.keys(config.itemMapping).length
    });

    // 1. Extract text from image
    const {
      data: { text },
    } = await Tesseract.recognize(req.file.buffer, config.tesseract.language, {
      logger: (m) => config.tesseract.debug && console.log(m.status),
      tessedit_char_whitelist: config.tesseract.charWhitelist,
      tessedit_pageseg_mode: config.tesseract.psm,
      tessedit_ocr_engine_mode: config.tesseract.oem,
    });

    console.log("OCR completed");
    console.log("Text length:", text.length);

    // 2. Find LPO number (P followed by 9+ digits)
    const lpoMatch = text.match(/P\d{9,}/);
    const lpoNumber = lpoMatch ? lpoMatch[0] : "Not found";

    // 3. Find items and quantities
    const items = [];

    for (const [code, productCode] of Object.entries(config.itemMapping)) {
      if (text.includes(code)) {
        // Look for quantity after the item code
        const pattern = new RegExp(`${code}[^\\d]*(\\d+(?:\\.\\d+)?)`);
        const match = text.match(pattern);

        if (match) {
          const quantity = parseFloat(match[1]);
          if (quantity > 0) {
            items.push({
              itemCode: code,
              productCode: productCode,
              quantity: quantity,
              itemName: config.itemNames[code] || productCode,
              foundInText: match[0],
            });
            console.log(`✅ Found: ${code} -> ${productCode} x ${quantity}`);
          }
        }
      }
    }

    // 4. Send response
    res.json({
      success: true,
      message: "Naivas PO processed successfully",
      lpoNumber: lpoNumber,
      items: items,
      totalItems: items.length,
      summary: {
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueItems: items.length,
      },
      debug: {
        textLength: text.length,
        config: {
          language: config.tesseract.language,
          charWhitelistLength: config.tesseract.charWhitelist.length,
          itemMappingCount: Object.keys(config.itemMapping).length
        }
      },
    });
  } catch (error) {
    console.error("❌ Error processing image:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to process image. Please try again.",
      config: {
        maxFileSize: config.maxFileSize,
        timeout: config.timeout
      }
    });
  }
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    status: "OCR Server is running!",
    config: {
      port: config.port,
      maxFileSize: config.maxFileSize,
      timeout: config.timeout,
      itemCodes: Object.keys(config.itemMapping)
    },
    endpoints: {
      upload: `POST http://localhost:${config.port}/api/naivas/ocr`,
      test: `GET http://localhost:${config.port}/test`
    },
    itemMapping: config.itemMapping
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "Naivas PO OCR Server",
    version: "1.0.0"
  });
});

// Start server
app.listen(config.port, () => {
  console.log("=".repeat(60));
  console.log("NAIVAS PO OCR SERVER STARTED");
  console.log("=".repeat(60));
  console.log(`Port: ${config.port}`);
  console.log(`Server: http://localhost:${config.port}`);
  console.log(`Upload: POST http://localhost:${config.port}/api/naivas/ocr`);
  console.log(`Test: GET http://localhost:${config.port}/test`);
  console.log(`Health: GET http://localhost:${config.port}/health`);
  console.log("=".repeat(60));
  console.log("Configuration:");
  console.log(`   • Max file size: ${config.maxFileSize} bytes`);
  console.log(`   • Timeout: ${config.timeout}ms`);
  console.log(`   • Language: ${config.tesseract.language}`);
  console.log(`   • Items mapped: ${Object.keys(config.itemMapping).length}`);
  console.log("=".repeat(60));
});