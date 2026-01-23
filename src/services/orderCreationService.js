import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";

// Parse item code mapping from environment variable
const parseItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_ITEM_CODE_MAPPING ||
    "13505757:FG867,13505844:FG860,13505845:FG864,13505786:FG861,13505758:FG869,13505790:FG863,13505957:FG960";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

// ITEM CODE MAPPING from environment variables
const ITEM_CODE_MAPPING = parseItemCodeMapping();

// OCR.SPACE Configuration from environment variables
const OCR_SPACE_API_KEY =
  import.meta.env.VITE_OCR_SPACE_API_KEY || "K88641853888957";
const OCR_SPACE_URL =
  import.meta.env.VITE_OCR_SPACE_URL || "https://api.ocr.space/parse/image";

// Default settings from environment variables
const DEFAULT_SETTINGS = {
  WAREHOUSE: import.meta.env.VITE_DEFAULT_WAREHOUSE || "Dandora",
  SELLING_PRICE_LIST:
    import.meta.env.VITE_DEFAULT_SELLING_PRICE_LIST || "Supermarkets Price",
  ORDER_TYPE: import.meta.env.VITE_DEFAULT_ORDER_TYPE || "Route",
  REMARKS: import.meta.env.VITE_DEFAULT_REMARKS || "CT226",
  IS_TOP_UP: import.meta.env.VITE_DEFAULT_IS_TOP_UP === "true",
};

// Performance settings from environment variables
const PERFORMANCE_SETTINGS = {
  PDFJS_VERSION: import.meta.env.VITE_PDFJS_VERSION || "3.11.174",
  PRODUCT_CACHE_DURATION:
    parseInt(import.meta.env.VITE_PRODUCT_CACHE_DURATION) || 5 * 60 * 1000,
  MIN_TEXT_LENGTH: parseInt(import.meta.env.VITE_MIN_TEXT_LENGTH) || 50,
};

// Validation settings from environment variables
const VALIDATION_SETTINGS = {
  MIN_QUANTITY: parseInt(import.meta.env.VITE_MIN_QUANTITY) || 1,
  MAX_QUANTITY: parseInt(import.meta.env.VITE_MAX_QUANTITY) || 10000,
  MIN_ITEM_COUNT: parseInt(import.meta.env.VITE_MIN_ITEM_COUNT) || 1,
};

// OCR.SPACE Configuration
const getOCRSpaceConfig = () => ({
  language: import.meta.env.VITE_OCR_SPACE_LANGUAGE || "eng",
  isTable: import.meta.env.VITE_OCR_SPACE_IS_TABLE === "true",
  OCREngine: import.meta.env.VITE_OCR_SPACE_OCREngine || "2",
  isOverlayRequired:
    import.meta.env.VITE_OCR_SPACE_IS_OVERLAY_REQUIRED === "true",
});

// Tesseract Configuration
const getTesseractConfig = () => ({
  tessedit_char_whitelist:
    "0123456789PabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -/,.",
  preserve_interword_spaces: "1",
  tessedit_pageseg_mode: "6",
  textord_tablefind_recognize_tables: "1",
});

// ========== PDF TEXT EXTRACTION ==========
const extractTextFromPDF = async (pdfFile) => {
  try {
    console.log("Extracting text from PDF using PDF.js...");

    // Set up PDF.js worker with version from environment variable
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PERFORMANCE_SETTINGS.PDFJS_VERSION}/pdf.worker.min.js`;

    // Convert file to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let fullText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Extract text items and preserve their order
      const pageText = textContent.items.map((item) => item.str).join(" ");

      fullText += pageText + "\n\n"; // Add spacing between pages

      console.log(`Extracted page ${pageNum}: ${pageText.length} chars`);
    }

    console.log(
      "PDF text extraction successful, total text length:",
      fullText.length,
    );
    console.log("Sample PDF text:", fullText.substring(0, 300));

    return fullText;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

// OCR.SPACE Extraction
const extractTextWithOCRSpace = async (imageFile) => {
  try {
    console.log("Using OCR.Space API...");

    // Convert file to base64
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const ocrConfig = getOCRSpaceConfig();

    // Create form data for OCR.Space
    const formData = new FormData();
    formData.append("base64Image", `data:image/png;base64,${base64Image}`);
    formData.append("language", ocrConfig.language);
    formData.append("isTable", ocrConfig.isTable ? "true" : "false");
    formData.append("OCREngine", ocrConfig.OCREngine);
    formData.append("scale", "true");
    formData.append(
      "isOverlayRequired",
      ocrConfig.isOverlayRequired ? "true" : "false",
    );

    // Call OCR.Space API
    const response = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: {
        apikey: OCR_SPACE_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR.Space API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(
        "OCR processing failed: " + (result.ErrorMessage || "Unknown error"),
      );
    }

    // Extract text from all results
    let fullText = "";
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      result.ParsedResults.forEach((parsedResult, index) => {
        if (parsedResult.ParsedText) {
          fullText += parsedResult.ParsedText + "\n";
        }
      });
    }

    console.log("OCR.Space successful, text length:", fullText.length);
    console.log("Sample text:", fullText.substring(0, 300));

    return fullText;
  } catch (error) {
    console.error("OCR.Space failed:", error.message);
    throw error;
  }
};

// Extract LPO Number
const extractLPONumber = (text) => {
  // Look for patterns like P038255442
  const patterns = [
    /P\d{9}/, // P followed by 9 digits
    /P\.O\.?\s*[:#]?\s*(\d+)/i, // P.O. with digits
    /Purchase\s*Order\s*[:\s]*(\w+)/i, // Purchase Order: number
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract just the number part
      let lpo = match[1] || match[0];
      lpo = lpo.replace(/[^\d]/g, ""); // Keep only digits
      if (lpo.length >= 6) {
        return `P${lpo}`; // Add P prefix
      }
    }
  }

  // Check for asterisk pattern *P038255442*
  const asteriskMatch = text.match(/\*P\d{9}\*/);
  if (asteriskMatch) {
    return asteriskMatch[0].replace(/\*/g, ""); // Remove asterisks
  }

  return "UNKNOWN_LPO";
};

// Find Items and Quantities
const findItemsAndQuantities = (text) => {
  console.log(
    "FOCUSED extraction: Looking ONLY for item codes and quantities...",
  );
  const items = [];

  // Clean text: remove tabs, normalize spaces
  const cleanText = text.replace(/\t/g, " ").replace(/\s+/g, " ");

  // METHOD 1: Look for 8-digit item codes followed by quantity
  const itemQuantityPattern = /(\d{8})\D+?(\d+(?:,\d{3})*\.\d{2})/g;

  let match;
  while ((match = itemQuantityPattern.exec(cleanText)) !== null) {
    const itemCode = match[1];
    const quantityStr = match[2].replace(/,/g, "");
    const quantity = parseFloat(quantityStr);

    // Validate it's a known item code and reasonable quantity
    if (
      ITEM_CODE_MAPPING[itemCode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY &&
      quantity <= VALIDATION_SETTINGS.MAX_QUANTITY
    ) {
      items.push({
        ocrItemCode: itemCode,
        actualItemCode: ITEM_CODE_MAPPING[itemCode],
        quantity: Math.round(quantity),
        foundQuantity: quantity,
        method: "item_quantity_pattern",
      });
      console.log(
        `Found: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
      );
    }
  }

  // METHOD 2: Line-by-line search for item codes
  if (items.length === 0) {
    const lines = text.split("\n");

    for (const line of lines) {
      // Look for any known item code in the line
      for (const [ocrCode, actualCode] of Object.entries(ITEM_CODE_MAPPING)) {
        if (line.includes(ocrCode)) {
          // Look for quantity pattern near the item code
          const quantityMatch = line.match(/(\d+(?:,\d{3})*\.\d{2})/);
          if (quantityMatch) {
            const quantityStr = quantityMatch[1].replace(/,/g, "");
            const quantity = parseFloat(quantityStr);

            if (
              quantity >= VALIDATION_SETTINGS.MIN_QUANTITY &&
              quantity <= VALIDATION_SETTINGS.MAX_QUANTITY
            ) {
              items.push({
                ocrItemCode: ocrCode,
                actualItemCode: actualCode,
                quantity: Math.round(quantity),
                foundQuantity: quantity,
                method: "line_search",
              });
              console.log(
                `Line search: ${ocrCode} -> ${actualCode} x ${quantity}`,
              );
              break; // Found this item, move to next line
            }
          }
        }
      }
    }
  }

  // Remove duplicates (same item code)
  const uniqueItems = [];
  const seenCodes = new Set();

  for (const item of items) {
    if (!seenCodes.has(item.ocrItemCode)) {
      seenCodes.add(item.ocrItemCode);
      uniqueItems.push(item);
    }
  }

  console.log(`Total unique items found: ${uniqueItems.length}`);

  if (uniqueItems.length > 0) {
    console.log("Found items:");
    uniqueItems.forEach((item) => {
      console.log(
        `  ${item.ocrItemCode} -> ${item.actualItemCode}: ${item.quantity} (${item.method})`,
      );
    });
  } else {
    console.log("No items found. Debug text:", text.substring(0, 500));
  }

  return uniqueItems;
};

// Tesseract OCR Function
const extractTextFromImage = async (imageFile) => {
  try {
    console.log("Starting Tesseract OCR...");
    const Tesseract = (await import("tesseract.js")).default;
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    await worker.setParameters(getTesseractConfig());
    const result = await worker.recognize(imageFile);
    await worker.terminate();
    console.log("Tesseract completed successfully");
    return result.data.text;
  } catch (error) {
    console.error("Tesseract failed:", error);
    throw new Error(`OCR failed: ${error.message}`);
  }
};

// Process Dropped File
const processDroppedFile = async (file) => {
  console.log("Processing dropped file:", file.name, file.type);

  // For PDF files: Use PDF.js
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    try {
      console.log("Processing PDF file...");
      const pdfText = await extractTextFromPDF(file);

      if (
        pdfText &&
        pdfText.trim().length > PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH
      ) {
        console.log("PDF extraction successful, text length:", pdfText.length);
        return pdfText;
      } else {
        console.log("PDF output too short, trying OCR fallback...");
        throw new Error("PDF text extraction insufficient");
      }
    } catch (pdfError) {
      console.log(
        "PDF extraction failed, falling back to OCR methods:",
        pdfError.message,
      );
      try {
        console.log("Attempting OCR.Space for PDF...");
        const ocrText = await extractTextWithOCRSpace(file);
        return ocrText;
      } catch (ocrError) {
        console.log("OCR.Space failed for PDF, trying Tesseract...");
        try {
          const tesseractText = await extractTextFromImage(file);
          return tesseractText;
        } catch (tesseractError) {
          throw new Error(
            `All PDF extraction methods failed: ${tesseractError.message}`,
          );
        }
      }
    }
  }

  // For text files, just read them
  if (file.type === "text/plain") {
    return await file.text();
  }

  // For images: Try OCR.Space first, then Tesseract fallback
  if (file.type.startsWith("image/")) {
    try {
      console.log("Attempting OCR.Space...");
      const ocrText = await extractTextWithOCRSpace(file);

      if (
        ocrText &&
        ocrText.trim().length > PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH
      ) {
        console.log("OCR.Space successful");
        return ocrText;
      } else {
        console.log("OCR.Space output too short");
        throw new Error("OCR output insufficient");
      }
    } catch (ocrError) {
      console.log(
        "OCR.Space failed, falling back to Tesseract:",
        ocrError.message,
      );
      try {
        const tesseractText = await extractTextFromImage(file);
        return tesseractText;
      } catch (tesseractError) {
        throw new Error(`Both OCR methods failed: ${tesseractError.message}`);
      }
    }
  }

  // For other files, try to read as text
  try {
    return await file.text();
  } catch (error) {
    throw new Error(
      "Could not read file. Please use PDF, image or text files.",
    );
  }
};

// Parse PO Text
const parsePOText = async (text, customerCode = null) => {
  console.log("Starting PO Parsing");

  // Extract LPO number
  const lpoNumber = extractLPONumber(text);
  console.log("Extracted LPO:", lpoNumber);

  // Find items and quantities
  const foundItems = findItemsAndQuantities(text);
  console.log("Found items:", foundItems.length);

  // Get products for matching
  const products = await getNaivasProducts();

  // Map found items to actual products
  const items = [];
  const parsingWarnings = [];
  const parsingErrors = [];

  for (const foundItem of foundItems) {
    const product = products.find(
      (p) => p.itemCode === foundItem.actualItemCode,
    );

    if (product) {
      items.push({
        description: `${product.itemName || "Unknown Product"} (${foundItem.ocrItemCode})`,
        product: product,
        quantity: foundItem.quantity,
        status: "matched",
        unitPrice: product.itemPrice || 0,
        netAmount: foundItem.quantity * (product.itemPrice || 0),
        ocrDetails: {
          ocrItemCode: foundItem.ocrItemCode,
          foundQuantity: foundItem.foundQuantity,
          method: foundItem.method,
        },
      });
      console.log(
        `Matched: ${foundItem.ocrItemCode} -> ${foundItem.actualItemCode} x ${foundItem.quantity}`,
      );
    } else {
      console.log(`No product found for code: ${foundItem.actualItemCode}`);
      parsingErrors.push(
        `Item code ${foundItem.ocrItemCode} not found in system`,
      );
    }
  }

  // Validation
  if (items.length === 0 && text.trim().length > 0) {
    parsingWarnings.push("No items found. Check if:");
    parsingWarnings.push("1. Image is clear and not blurry");
    parsingWarnings.push("2. Item codes match known codes (8 digits)");
    parsingWarnings.push("3. Try different OCR method");
  }

  return {
    customer: customerCode,
    items,
    lpoNumber: lpoNumber,
    detectedFormat: "NAIVAS_PO_FORMAT",
    parsingWarnings: [...parsingWarnings, ...parsingErrors],
    parsingErrors: parsingErrors,
    originalText: text.substring(0, 500),
    summary: {
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.netAmount, 0),
    },
  };
};

// Get Naivas Products
let cachedNaivasProducts = null;
const getNaivasProducts = async () => {
  try {
    if (cachedNaivasProducts) {
      return cachedNaivasProducts;
    }
    const response = await apiClient.get(
      `/item/listByPrice/Naivas%20Special%20Price`,
    );
    let products = [];
    if (response.data?.payload && Array.isArray(response.data.payload)) {
      products = response.data.payload;
    } else if (Array.isArray(response.data)) {
      products = response.data;
    }
    cachedNaivasProducts = products;
    setTimeout(() => {
      cachedNaivasProducts = null;
    }, PERFORMANCE_SETTINGS.PRODUCT_CACHE_DURATION);
    return products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
};

// Parse PO from Dropped File
const parsePOFromDroppedFile = async (file, customerCode = null) => {
  try {
    console.log("Processing Uploaded File");
    const extractedText = await processDroppedFile(file);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the file");
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("First 300 chars:", extractedText.substring(0, 300));

    return await parsePOText(extractedText, customerCode);
  } catch (error) {
    console.error("File processing failed:", error);

    if (error.message.includes("OCR") || error.message.includes("Tesseract")) {
      throw new Error("Text recognition failed. Please try a clearer image.");
    } else {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }
};

// Create Order from PO Data
const createOrderFromPO = async (
  poData,
  warehouse = DEFAULT_SETTINGS.WAREHOUSE,
) => {
  console.log("Creating order from PO data");
  const matchedItems = poData.items.filter((item) => item.status === "matched");

  if (matchedItems.length < VALIDATION_SETTINGS.MIN_ITEM_COUNT) {
    throw new Error("No matched items found for order creation");
  }

  const orderItems = matchedItems.map((item) => ({
    item: item.product,
    quantity: item.quantity,
    amount: item.netAmount || item.product.itemPrice * item.quantity,
  }));

  const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);
  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Get tomorrow's date correctly in GMT+3 timezone
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get date in YYYY-MM-DD format for tomorrow
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  const dueDate = `${year}-${month}-${day}T00:00:00.000Z`;

  console.log("Today's date:", now.toISOString().split("T")[0]);
  console.log("Tomorrow's due date:", dueDate);

  // Get LPO number (use extracted or null)
  const lpoNumber =
    poData.lpoNumber && poData.lpoNumber !== "UNKNOWN_LPO"
      ? poData.lpoNumber
      : null;

  const orderPayload = {
    customer: poData.customer,
    orderType: DEFAULT_SETTINGS.ORDER_TYPE,
    sellingPriceList: DEFAULT_SETTINGS.SELLING_PRICE_LIST,
    dueDate: dueDate,
    isTopUp: DEFAULT_SETTINGS.IS_TOP_UP,
    warehouse: warehouse,
    remarks: DEFAULT_SETTINGS.REMARKS,
    lpo: lpoNumber,
    items: orderItems,
  };

  console.log("Order Payload:", JSON.stringify(orderPayload, null, 2));

  try {
    const response = await apiClient.post("/orders/create", orderPayload);
    return {
      success: true,
      orderNumber: response.data?.payload || "Unknown",
      message: "Order created successfully",
      orderData: orderPayload,
      totalAmount: totalAmount,
      totalQuantity: totalQuantity,
      matchedItems: matchedItems.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Order creation failed:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
    };
  }
};

// Drag and Drop Setup
const setupDragAndDrop = (element, callback) => {
  if (!element) return;
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    element.addEventListener(eventName, preventDefaults, false);
    document.addEventListener(eventName, preventDefaults, false);
  });
  element.addEventListener("drop", handleDrop, false);

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const isText = file.type === "text/plain";
      const isPDF =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const hasValidExtension = file.name.match(
        /\.(png|jpg|jpeg|webp|txt|pdf)$/i,
      );
      if (isImage || isText || isPDF || hasValidExtension) {
        callback(file);
      } else {
        alert("Please drop a PDF, image file (PNG, JPG) or text file.");
      }
    }
  }
};

// Test Function with sample data
const testWithScreenshots = async () => {
  const screenshot1Text = `
Purchase Order
*P038185600*
NAIVAS LTD
KEN
Purchase Order
P.O. Date: 20 January, 2026
Delivery Date: 21 January, 2026
Supplier:
MINI BAKERIES (NBI)
Ship To: MOUNTAIN VIEW
MOUNTAIN VIEW
MOUNTAIN VIEW
KEN
Item Code | Bar Code | Item Description | Unit | Quantity | Unit Price | Net Amount
13505757 2037690000000 FRESH WHITE BREAD 400G PCS 60.00 52.50 3,150.00
13505844 0203835000000 FRESH WHITE BREAD 600G PCS 60.00 81.25 4,875.00
13505845 6161107470616 FRESH WHOLEMEAL BREAD 600G PCS 24.00 81.25 1,950.00
13505786 2037680000000 FRESH WHITE BREAD 800GM PCS 60.00 105.00 6,300.00
13505758 6161107470012 FRESH WHOLEMEAL BREAD 400G PCS 15.00 52.50 787.50
13505790 2037720000000 FRESH WHOLEMEAL BREAD 800G PCS 15.00 105.00 1,575.00
Sub total
18,637.50`;

  console.log("Testing with Screenshot 1");
  const result1 = await parsePOText(screenshot1Text);
  console.log("Result 1:", JSON.stringify(result1, null, 2));

  console.log("\nTesting findItemsAndQuantities function directly:");
  const testItems = findItemsAndQuantities(screenshot1Text);
  console.log("Extracted items:", testItems);
};

// Export
export default {
  getNaivasProducts,
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: async (text, customerCode) =>
    parsePOText(text, customerCode),
  createOrderFromPO,
  setupDragAndDrop,
  processDroppedFile,
  extractTextFromImage,
  extractTextFromPDF,
  extractLPONumber,
  findItemsAndQuantities,
  testWithScreenshots,
  ITEM_CODE_MAPPING,
  getConfig: () => ({
    DEFAULT_SETTINGS,
    PERFORMANCE_SETTINGS,
    VALIDATION_SETTINGS,
  }),
};
