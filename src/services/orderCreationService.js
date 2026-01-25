import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";

// ============================================
// CONFIGURATION FROM ENVIRONMENT VARIABLES
// ============================================

// Parse item code mapping from environment variable
const parseItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_ITEM_CODE_MAPPING ||
    "13505757:FG867,13505844:FG860,13505845:FG864,13505786:FG861,13505758:FG869,13505790:FG863,13505957:FG960," +
      "13505115:FG003,13500140:FG006,13505114:FG007,13504180:FG008,N051055:FG013,13505111:FG015,N051056:FG017," +
      "13506130:FG018,13500168:FG026,13500398:FG030,13504428:FG031,13504429:FG027";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

// Parse item names mapping from environment variable
const parseItemNamesMapping = () => {
  const mappingStr =
    import.meta.env.VITE_ITEM_NAMES_MAPPING ||
    "13505757:White Bread 400g,13505844:White Bread 600g,13505845:White Bread 800g," +
      "13505786:Brown Bread 400g,13505758:Brown Bread 600g,13505790:Brown Bread 800g," +
      "13505957:Special Bread 600g,13505115:Supa Brown Barrel 600g," +
      "N051055:Supa Butter Toast Bread 1.5kg,N051056:Supa Butter Toast Bread 600g," +
      "13505111:Supa Butter Toast Loaf 400g,13500398:Supa Loaf Family 600g," +
      "13500168:Supa Loaf White Bread 1.5kg,13504429:Supa Loaf White Bread 400g," +
      "13504428:Supa Loaf White Bread 800g,13506130:Supa White Toast 800g," +
      "13505114:Supa White Barrel 600g,13500140:Supa White Barrel Bread 400g," +
      "13504180:Supa Loaf White Barrel 800g";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

// Parse Cleanshelf item code mapping from environment variable
const parseCleanshelfItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_CLEANSHELF_ITEM_CODE_MAPPING ||
    "400348:FG031,400347:FG030,400344:FG018,400343:FG017,400339:FG008,400338:FG007,400337:FG006,400336:FG003,400334:FG027,400330:FG021,400329:FG015,400346:FG026";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

// Parse Jazaribu item code mapping from environment variable
const parseJazaribuItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_JAZARIBU_ITEM_CODE_MAPPING ||
    "JT01093:FG027,JT01098:FG015,JT01090:FG030,JT01094:FG017,JT01091:FG031,JT01097:FG018,JT01100:FG006,JT01103:FG008,JT01102:FG007,JT01099:JT01099";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

// ITEM CODE MAPPINGS from environment variables
const ITEM_CODE_MAPPING = parseItemCodeMapping();
const ITEM_NAMES_MAPPING = parseItemNamesMapping();
const CLEANSHELF_ITEM_CODE_MAPPING = parseCleanshelfItemCodeMapping();
const JAZARIBU_ITEM_CODE_MAPPING = parseJazaribuItemCodeMapping();

// Get FG code from item code based on customer type
const getFGCode = (itemCode, customerType = "NAIVAS") => {
  if (customerType === "CLEANSHELF") {
    return CLEANSHELF_ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "JAZARIBU") {
    return JAZARIBU_ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  return ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
};

// Get product name from item code based on customer type
const getProductName = (itemCode, customerType = "NAIVAS") => {
  if (customerType === "CLEANSHELF") {
    return `Cleanshelf Product ${itemCode}`;
  }
  if (customerType === "JAZARIBU") {
    // Jazaribu product names will be extracted from the order text
    return `Jazaribu Product ${itemCode}`;
  }
  return ITEM_NAMES_MAPPING[itemCode] || `Product ${itemCode}`;
};

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
    import.meta.env.VITE_OCR_SPACE_IS_OVERLAY_REQUIRED === "false",
});

// Tesseract Configuration (from working version)
const getTesseractConfig = () => ({
  tessedit_char_whitelist:
    "0123456789PabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -/,.",
  preserve_interword_spaces: "1",
  tessedit_pageseg_mode: "6",
  textord_tablefind_recognize_tables: "1",
});

// ============================================
// CUSTOMER CONFIGURATION
// ============================================

// CLEANSHELF CUSTOMER CODES (19 codes total)
const CLEANSHELF_CUSTOMER_CODES = [
  // Original 13 codes
  "C06223",
  "C00498",
  "C06885",
  "C00505",
  "C07481",
  "C00494",
  "C07212",
  "C04494",
  "C00500",
  "C04838",
  "C00492",
  "C06602",
  "C00507",
  // New 6 codes
  "C00501",
  "C00497",
  "C00495",
  "C04411",
  "C00502",
  "C05747",
];

// JAZARIBU CUSTOMER CODES (21 codes)
const JAZARIBU_CUSTOMER_CODES = [
  "C07455",
  "C07257",
  "C06702",
  "C06667",
  "C06363",
  "C07071",
  "C06791",
  "C07449",
  "C06531",
  "C06882",
  "C06627",
  "C07106",
  "C06570",
  "C06547",
  "C07177",
  "C06351",
  "C07142",
  "C07451",
  "C07450",
  "C07251",
  "C06721",
];

const CUSTOMER_CONFIG = {
  NAIVAS: {
    name: "Naivas",
    priceList: "Naivas Special Price",
    itemCodePattern: /(135\d{5}|N\d{6})/,
    lpoPattern: /P\d{9}(?:-\d+)?/,
    codeMappings: ITEM_CODE_MAPPING,
    nameMappings: ITEM_NAMES_MAPPING,
  },
  CLEANSHELF: {
    name: "Cleanshelf",
    priceList: "Supermarkets Price",
    itemCodePattern: /4003\d{2}/,
    lpoPattern: /\b\d{5,6}\b/,
    codeMappings: CLEANSHELF_ITEM_CODE_MAPPING,
    nameMappings: {}, // We'll use generic names for Cleanshelf
  },
  JAZARIBU: {
    name: "Jazaribu",
    priceList: "Supermarkets Price",
    itemCodePattern: /JT\d{5}/,
    lpoPattern: /PO-J\d{3}-\d{6}/,
    codeMappings: JAZARIBU_ITEM_CODE_MAPPING,
    nameMappings: {}, // Product names will be extracted from order text
  },
};

// ============================================
// GET PRODUCTS BY CUSTOMER (with cache)
// ============================================
let cachedProducts = {
  NAIVAS: null,
  CLEANSHELF: null,
  JAZARIBU: null,
};

const getProductsByCustomer = async (customerType = "NAIVAS") => {
  try {
    const config = CUSTOMER_CONFIG[customerType];
    if (!config) {
      console.error(`Unknown customer type: ${customerType}`);
      return [];
    }

    if (cachedProducts[customerType]) {
      return cachedProducts[customerType];
    }

    const response = await apiClient.get(
      `/item/listByPrice/${encodeURIComponent(config.priceList)}`,
    );
    let products = [];
    if (response.data?.payload && Array.isArray(response.data.payload)) {
      products = response.data.payload;
    } else if (Array.isArray(response.data)) {
      products = response.data;
    }

    cachedProducts[customerType] = products;
    setTimeout(() => {
      cachedProducts[customerType] = null;
    }, PERFORMANCE_SETTINGS.PRODUCT_CACHE_DURATION);

    console.log(`Fetched ${products.length} products for ${customerType}`);
    return products;
  } catch (error) {
    console.error(`Failed to fetch products for ${customerType}:`, error);
    return [];
  }
};

// Alias for backward compatibility
const getNaivasProducts = () => getProductsByCustomer("NAIVAS");

// ============================================
// PDF TEXT EXTRACTION
// ============================================
const extractTextFromPDF = async (pdfFile) => {
  try {
    console.log("Extracting text from PDF using PDF.js...");

    // Set up PDF.js worker (important for browser)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

// ============================================
// OCR.SPACE Extraction
// ============================================
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

// ============================================
// UPDATED TEXT CLEANUP - PRESERVE NEWLINES FOR CLEANSHELF & JAZARIBU
// ============================================

// Clean and normalize text from OCR/screenshots
const cleanOCRText = (text) => {
  console.log("Cleaning OCR text...");
  console.log("Original text sample:", text.substring(0, 200));

  // FIRST: SUPER AGGRESSIVE N-CODE FIXING - ALL POSSIBLE OCR VARIATIONS
  let cleaned = text;

  // CRITICAL: Fix ALL OCR misreadings for N-codes
  // Pattern 1: NO51055/NO51056 (OCR reads 0 as O)
  cleaned = cleaned.replace(/NO51055/g, "N051055");
  cleaned = cleaned.replace(/NO51056/g, "N051056");

  // Pattern 2: N05105O/N05105o (OCR reads 5 as O/o)
  cleaned = cleaned.replace(/N05105O/g, "N051055");
  cleaned = cleaned.replace(/N05105o/g, "N051055");

  // Pattern 3: Standard variations
  cleaned = cleaned.replace(/[HM]051055/g, "N051055");
  cleaned = cleaned.replace(/[HM]051056/g, "N051056");
  cleaned = cleaned.replace(/IN051055/g, "N051055");
  cleaned = cleaned.replace(/IN051056/g, "N051056");
  cleaned = cleaned.replace(/N\s+051055/g, "N051055");
  cleaned = cleaned.replace(/N\s+051056/g, "N051056");

  // Pattern 4: Digits only (missing N prefix)
  cleaned = cleaned.replace(/\b051055\b/g, "N051055");
  cleaned = cleaned.replace(/\b051056\b/g, "N051056");

  // Pattern 5: Lowercase n
  cleaned = cleaned.replace(/n051055/g, "N051055");
  cleaned = cleaned.replace(/n051056/g, "N051056");

  // Pattern 6: With dashes or other separators
  cleaned = cleaned.replace(/N-051055/g, "N051055");
  cleaned = cleaned.replace(/N-051056/g, "N051056");
  cleaned = cleaned.replace(/N\.051055/g, "N051055");
  cleaned = cleaned.replace(/N\.051056/g, "N051056");

  // Pattern 7: Extra spaces in middle
  cleaned = cleaned.replace(/N 051055/g, "N051055");
  cleaned = cleaned.replace(/N 051056/g, "N051056");

  // Check for Jazaribu format
  const isJazaribuText = /JAZARIBU|JT\d{5}|PO-J\d{3}-\d{6}/i.test(text);

  // Check if this is Cleanshelf text
  const isCleanshelfText =
    /(CLEAN\s*SHELF|FRESHMARKET|LOCAL PURCHASE ORDER|4003\d{2})/i.test(text);

  // For Jazaribu: PRESERVE NEWLINES AND FORMAT
  if (isJazaribuText) {
    console.log("Detected Jazaribu text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n") // Convert Windows line endings to Unix
      .replace(/\r/g, "\n") // Convert Mac line endings to Unix
      .replace(/\t/g, " ") // Convert tabs to spaces
      .replace(/[ \t]+/g, " ") // Normalize multiple spaces/tabs within line
      .replace(/[ \t]+$/gm, "") // Remove trailing spaces from each line
      .replace(/^[ \t]+/gm, "") // Remove leading spaces from each line
      .replace(/\n\s*\n/g, "\n") // Normalize multiple newlines
      .replace(/[|]/g, " ") // Replace pipe with space
      .replace(/[`'"]/g, "") // Remove quotes
      .replace(/[{}]/g, "") // Remove curly braces
      .replace(/[\[\]]/g, "") // Remove brackets
      .replace(/\s*\.\s*/g, ".") // Fix decimal points
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2") // Fix merged decimals: 351.00117.000 -> 351.00 117.000
      .replace(/(\d+\.\d{3})(4003\d{2})/g, "$1 $2"); // Fix merged decimals and codes

    console.log("Jazaribu cleaned text sample:", cleaned.substring(0, 200));
    console.log("Jazaribu cleaned text length:", cleaned.length);
    console.log("Line count after cleaning:", cleaned.split("\n").length);

    return cleaned;
  }

  // For Cleanshelf: PRESERVE NEWLINES, only normalize spaces within lines
  if (isCleanshelfText) {
    console.log("Detected Cleanshelf text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n") // Convert Windows line endings to Unix
      .replace(/\r/g, "\n") // Convert Mac line endings to Unix
      .replace(/\t/g, " ") // Convert tabs to spaces
      .replace(/[ \t]+/g, " ") // Normalize multiple spaces/tabs within line
      .replace(/[ \t]+$/gm, "") // Remove trailing spaces from each line
      .replace(/^[ \t]+/gm, "") // Remove leading spaces from each line
      .replace(/\n\s*\n/g, "\n") // Normalize multiple newlines
      .replace(/[|]/g, " ") // Replace pipe with space
      .replace(/[`'"]/g, "") // Remove quotes
      .replace(/[{}]/g, "") // Remove curly braces
      .replace(/[\[\]]/g, "") // Remove brackets
      .replace(/\s*\.\s*/g, ".") // Fix decimal points
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2") // Fix merged decimals: 351.00117.000 -> 351.00 117.000
      .replace(/(\d+\.\d{3})(4003\d{2})/g, "$1 $2"); // Fix merged decimals and codes

    console.log("Cleanshelf cleaned text sample:", cleaned.substring(0, 200));
    console.log("Cleanshelf cleaned text length:", cleaned.length);
    console.log("Line count after cleaning:", cleaned.split("\n").length);

    return cleaned;
  }

  // For Naivas and other formats: Use original logic
  const isCopyPasteFormat = /135\d{5}\s+\d{13}\s+(?:SUPA|FRESH)/i.test(text);

  if (isCopyPasteFormat) {
    console.log("Detected copy-paste format, using special cleaning...");

    // For copy-paste format: Preserve newlines, only normalize spaces within lines
    cleaned = cleaned
      .replace(/\r\n/g, "\n") // Convert Windows line endings to Unix
      .replace(/\r/g, "\n") // Convert Mac line endings to Unix
      .replace(/\t/g, " ") // Convert tabs to spaces
      .replace(/[ \t]+/g, " ") // Normalize multiple spaces/tabs within line
      .replace(/[ \t]+$/gm, "") // Remove trailing spaces from each line
      .replace(/^[ \t]+/gm, "") // Remove leading spaces from each line
      .replace(/\n\s*\n/g, "\n"); // Normalize multiple newlines

    // Fix item codes merged with barcodes: 135041806161102320305 -> 13504180 6161102320305
    cleaned = cleaned.replace(/(135\d{5})(\d{13})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d{13})/g, "$1 $2");

    // Clean up common OCR errors but preserve decimal number spacing
    cleaned = cleaned
      .replace(/[|]/g, " ") // Replace pipe with space
      .replace(/[`'"]/g, "") // Remove quotes
      .replace(/[{}]/g, "") // Remove curly braces
      .replace(/[\[\]]/g, "") // Remove brackets
      .replace(/\s*\.\s*/g, "."); // Fix decimal points

    console.log("Copy-paste cleaned text sample:", cleaned.substring(0, 200));
    console.log("Copy-paste cleaned text length:", cleaned.length);
    console.log("Line count after cleaning:", cleaned.split("\n").length);
  } else {
    // Original cleaning for other formats
    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n");

    // Separate merged item codes from barcodes
    cleaned = cleaned.replace(/(135\d{5})(\d{13})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d{13})/g, "$1 $2");

    // IMPORTANT FIX: Don't join numbers together for any format
    // Only separate decimal numbers that are merged
    cleaned = cleaned.replace(/(\d+\.\d{2})(\d+\.\d{2,3})(\d{6})/g, "$1 $2 $3"); // Fix pattern like 351.00117.000400348
    cleaned = cleaned.replace(/(\d+\.\d{2})(\d+\.\d{2,3})(\d+)/g, "$1 $2 $3"); // More general pattern

    // Fix item codes merged with quantities
    cleaned = cleaned.replace(/(135\d{5})(\d+\.\d{2})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d+\.\d{2})/g, "$1 $2");

    // Now clean up common OCR errors
    cleaned = cleaned
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".");

    // DON'T join separated numbers - REMOVED this problematic line
    // .replace(/(\d)\s+(\d)/g, "$1$2");

    console.log(
      "Original format cleaned text sample:",
      cleaned.substring(0, 200),
    );
    console.log("Original format cleaned text length:", cleaned.length);
  }

  return cleaned;
};

// ============================================
// CUSTOMER DETECTION BY CUSTOMER CODE ONLY
// ============================================

const detectCustomerTypeByCode = (customerCode = null, text = "") => {
  console.log("=== CHECKING CUSTOMER TYPE BY CODE ===");
  console.log("Customer code provided:", customerCode);

  // If no customer code provided, try to detect from text
  if (!customerCode) {
    console.log("No customer code provided, checking text indicators...");

    // Check for Jazaribu indicators in text
    if (/JAZARIBU|JT\d{5}|PO-J\d{3}-\d{6}/i.test(text)) {
      console.log("Detected Jazaribu from text indicators");
      return "JAZARIBU";
    }

    // Check for Cleanshelf indicators in text
    if (
      /(CLEAN\s*SHELF|FRESHMARKET|LOCAL PURCHASE ORDER|4003\d{2})/i.test(text)
    ) {
      console.log("Detected Cleanshelf from text indicators");
      return "CLEANSHELF";
    }

    console.log("No specific indicators found, defaulting to NAIVAS");
    return "NAIVAS";
  }

  // Check against customer code lists
  if (CLEANSHELF_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Cleanshelf list`);
    return "CLEANSHELF";
  }

  if (JAZARIBU_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Jazaribu list`);
    return "JAZARIBU";
  }

  console.log(
    `Customer code ${customerCode} is not in special lists, defaulting to NAIVAS`,
  );
  return "NAIVAS";
};

// ============================================
// ENHANCED: DETECT TEXT FORMAT WITH AUTO-CUSTOMER DETECTION
// ============================================

const detectTextFormat = (text, customerType = "NAIVAS") => {
  const cleaned = text.toLowerCase();

  console.log("Text for format detection:", cleaned.substring(0, 200));

  // Check for Jazaribu format first
  if (customerType === "JAZARIBU") {
    // Check for Jazaribu Format (your provided format)
    if (
      cleaned.includes("jazaribu") ||
      cleaned.includes("jt0") ||
      cleaned.includes("po-j") ||
      cleaned.includes("supa loaf white bread") ||
      cleaned.includes("supa butter toast loaf")
    ) {
      console.log("Detected Format: Jazaribu standard format");
      return "JAZARIBU_STANDARD";
    }
  }

  // Check for Cleanshelf formats
  if (customerType === "CLEANSHELF") {
    // Check for Cleanshelf Format 1: LOCAL PURCHASE ORDER
    if (
      cleaned.includes("local purchase order") ||
      cleaned.includes("code description pieces unit price amount pack")
    ) {
      console.log("Detected Format: Cleanshelf LOCAL PURCHASE ORDER");
      return "CLEANSHELF_LOCAL_PO";
    }

    // Check for Cleanshelf Format 2: Pending Purchase Orders
    if (
      cleaned.includes("pending purchase orders") ||
      cleaned.includes("outstanding qty") ||
      cleaned.includes("orderd qty")
    ) {
      console.log("Detected Format: Cleanshelf PENDING_ORDERS");
      return "CLEANSHELF_PENDING_ORDERS";
    }
  }

  // Check for Naivas formats
  if (customerType === "NAIVAS") {
    // NEW: Check for copy-paste text format (your new format from the example)
    const hasCopyPasteFormat =
      /^\s*\d{8}\s+\d{13}\s+[A-Z\s]+[A-Z]\s+\d+(?:\.\d{2})?\s+\d+(?:\.\d{2})?\s+[\d,]+\.\d{2}/m.test(
        text,
      ) ||
      /135\d{5}\s+\d{13}\s+SUPA/i.test(text) ||
      /135\d{5}\s+\d{13}\s+FRESH/i.test(text) ||
      (text.includes("SUPA LOAF") &&
        text.includes("PCS") &&
        text.includes("Sub total"));

    if (hasCopyPasteFormat) {
      console.log("Detected Format: Copy-paste text format (new format)");
      return "COPY_PASTE_TEXT";
    }

    // Check for detailed PO format (your new format)
    const hasDetailedPOFormat =
      cleaned.includes("p.o. date:") &&
      cleaned.includes("ship to:") &&
      cleaned.includes("sub total") &&
      (cleaned.includes("purchase order") || cleaned.includes("purchaseorder"));

    if (hasDetailedPOFormat) {
      console.log("Detected Format: Detailed PO with descriptions");
      return "DETAILED_PO";
    }

    // Check for your specific format pattern (from your image)
    if (
      /p\d{9}.*mini.*bakeries.*nbi/i.test(cleaned) &&
      /item.*number.*quantity/i.test(cleaned)
    ) {
      console.log(
        "Detected Format: Your specific format (with P number and MINI BAKERIES)",
      );
      return "YOUR_FORMAT";
    }

    // Check for simple tabular format
    if (cleaned.includes("item number") && cleaned.includes("quantity")) {
      console.log("Detected Format: Simple tabular");
      return "SIMPLE_TABULAR";
    }

    // Format 1: Tabular format with headers
    if (
      cleaned.includes("line number") &&
      cleaned.includes("item number") &&
      cleaned.includes("quantity")
    ) {
      console.log("Detected Format: Tabular with headers");
      return "TABULAR_WITH_HEADERS";
    }

    // Format 2: Standard PO format with item codes and quantities
    if (
      cleaned.includes("item code") &&
      cleaned.includes("quantity") &&
      cleaned.includes("unit price")
    ) {
      console.log("Detected Format: Standard PO");
      return "STANDARD_PO";
    }

    // Format 3: Simple list with codes and quantities
    const itemCodePattern = /(135\d{5}|N\d{6})\D+?(\d+(?:\.\d{2})?)/g;
    const matches = text.match(itemCodePattern);
    if (matches && matches.length >= 2) {
      console.log("Detected Format: Simple list with", matches.length, "items");
      return "SIMPLE_LIST";
    }

    // Format 4: Copy-paste from Excel/CSV
    const csvPattern = /\d+\t+(135\d{5}|N\d{6})\t+\d+(?:\.\d{2})?\t+/;
    if (csvPattern.test(text)) {
      console.log("Detected Format: Excel/CSV copy-paste");
      return "EXCEL_COPY_PASTE";
    }
  }

  console.log("Detected Format: Unknown, using robust parsing");
  return "UNKNOWN";
};

// ============================================
// JAZARIBU PARSER
// ============================================

const parseJazaribuFormat = (text) => {
  console.log("Parsing Jazaribu format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  // Track unique product codes to avoid duplicates
  const seenCodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines and summary lines
    if (
      !line ||
      line.includes("Total KE") ||
      line.includes("Terms and Conditions") ||
      line.includes("Created By") ||
      line.includes("Approved By") ||
      line.includes("Buy-from Vendor") ||
      line.includes("VAT Registration") ||
      line.includes("Order No.") ||
      line.includes("Email") ||
      line.includes("Phone No.") ||
      line.includes("Page") ||
      line.includes("Nairobi") ||
      line === "t" ||
      line.startsWith("t ")
    ) {
      continue;
    }

    // Look for JT codes in the line
    const jtMatch = line.match(/(JT\d{5})/i);
    if (jtMatch) {
      const jtCode = jtMatch[1].toUpperCase();

      // Skip if we've already seen this code
      if (seenCodes.has(jtCode)) {
        console.log(`Skipping duplicate JT code: ${jtCode}`);
        continue;
      }

      console.log(`Found JT code: ${jtCode} in line: ${line}`);

      // Split line by spaces
      const parts = line.split(/\s+/);

      // Debug: Show all parts
      console.log(`Line parts (${parts.length}):`, parts);

      // In Jazaribu format, quantity is usually before "PIECES"
      // Format: [barcode] [JT code] [description...] [quantity] PIECES [unit price] [total price]
      let quantity = null;
      let productName = "";

      // Find "PIECES" and get quantity before it
      for (let j = 0; j < parts.length; j++) {
        if (parts[j].toUpperCase() === "PIECES" && j > 0) {
          // Previous part should be the quantity
          const qtyStr = parts[j - 1];
          quantity = parseInt(qtyStr);

          // Extract product name: everything between JT code and quantity
          const jtIndex = parts.indexOf(jtCode);
          if (jtIndex !== -1 && jtIndex < j - 1) {
            const nameParts = parts.slice(jtIndex + 1, j - 1);
            productName = nameParts.join(" ");
          }

          console.log(
            `Found quantity for ${jtCode}: ${quantity}, Product: ${productName}`,
          );
          break;
        }
      }

      // If we didn't find "PIECES", try alternative parsing
      if (!quantity) {
        // Look for numbers that could be quantities (usually 4-8 in Jazaribu orders)
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          // Check if part is a number between 1 and 20 (typical Jazaribu quantities)
          const num = parseInt(part);
          if (!isNaN(num) && num >= 1 && num <= 20) {
            // Make sure it's not a barcode or price
            if (part.length <= 2 && j > 1) {
              // Quantity is usually 1-2 digits
              // Check context - quantity should be after description and before price
              const nextPart = j + 1 < parts.length ? parts[j + 1] : "";
              const prevPart = j > 0 ? parts[j - 1] : "";

              // If next part looks like a price (contains .00) or is PIECES
              if (
                nextPart.includes(".") ||
                nextPart.toUpperCase() === "PIECES"
              ) {
                quantity = num;

                // Extract product name
                const jtIndex = parts.indexOf(jtCode);
                if (jtIndex !== -1 && jtIndex < j) {
                  const nameParts = parts.slice(jtIndex + 1, j);
                  productName = nameParts.join(" ");
                }

                console.log(
                  `Found quantity (alt) for ${jtCode}: ${quantity}, Product: ${productName}`,
                );
                break;
              }
            }
          }
        }
      }

      // Final fallback: Look for common quantity patterns
      if (!quantity) {
        // Jazaribu quantities are usually small: 4, 5, 6, 8
        const commonQuantities = ["4", "5", "6", "8"];
        for (const qty of commonQuantities) {
          if (line.includes(` ${qty} `) || line.endsWith(` ${qty}`)) {
            quantity = parseInt(qty);
            console.log(`Found quantity (common) for ${jtCode}: ${quantity}`);
            break;
          }
        }
      }

      if (
        quantity !== null &&
        !isNaN(quantity) &&
        JAZARIBU_ITEM_CODE_MAPPING[jtCode] &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
      ) {
        seenCodes.add(jtCode);

        items.push({
          ocrItemCode: jtCode,
          actualItemCode: JAZARIBU_ITEM_CODE_MAPPING[jtCode],
          quantity: quantity,
          foundQuantity: quantity,
          productName: productName || `Jazaribu Product ${jtCode}`,
          method: "jazaribu_format",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(
          `✅ Jazaribu: ${jtCode} -> ${JAZARIBU_ITEM_CODE_MAPPING[jtCode]} x ${quantity}`,
        );
      } else {
        console.log(`❌ Could not parse quantity for ${jtCode}:`, {
          quantityFound: quantity,
          hasMapping: JAZARIBU_ITEM_CODE_MAPPING[jtCode],
          linePreview: line.substring(0, 100),
        });
      }
    }
  }

  console.log(`Total Jazaribu items parsed: ${items.length}`);
  return items;
};

// ============================================
// UPDATED: CLEANSHELF PARSERS - FIXED VERSION
// ============================================

// Parse Cleanshelf LOCAL PURCHASE ORDER format - FIXED VERSION
const parseCleanshelfLocalPO = (text) => {
  console.log("Parsing Cleanshelf LOCAL PURCHASE ORDER format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  let inItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check if we've entered the items section
    if (
      line.includes("CODE DESCRIPTION") ||
      line.includes("Unit price") ||
      line.includes("Amount Pack")
    ) {
      inItemsSection = true;
      console.log("Entered items section at line:", i + 1);
      continue;
    }

    // Check for end of items section
    if (
      line.includes("Delivery Instructions") ||
      line.includes("Prepared By") ||
      line.includes("Authorised By")
    ) {
      inItemsSection = false;
      continue;
    }

    // Skip if not in items section
    if (!inItemsSection) {
      continue;
    }

    // Skip header lines and non-item lines
    if (
      line.includes("LOCAL PURCHASE ORDER") ||
      line.includes("CLEAN SHELF") ||
      line.includes("VALID UPTO:") ||
      line.includes("L.P.O.Date:") ||
      line.includes("VAT NO:") ||
      line.includes("PIN NO:") ||
      /^P051\d+S$/.test(line) ||
      /^0125810H$/.test(line) ||
      line.includes("P.O BOX") ||
      line.includes("WENDANI") ||
      line.includes("01/30/2026") ||
      line.length < 10
    ) {
      continue;
    }

    console.log("Processing line:", line);

    // Fix common OCR pattern: 351.00117.000400348 -> 351.00 117.000 400348
    line = line.replace(/(\d+\.\d{2})(\d+\.\d{3})(4003\d{2})/g, "$1 $2 $3");

    // Fix pattern like: SUPALOAF WHITE 800GM 13 -> SUPALOAF WHITE 800GM 1 3
    line = line.replace(/(\d+[A-Z]+)\s+(\d{2})\s+/g, function (match, p1, p2) {
      if (p2.length === 2 && parseInt(p2) > 9 && parseInt(p2) < 100) {
        return p1 + " " + p2[0] + " " + p2[1] + " ";
      }
      return match;
    });

    // Try to match the Cleanshelf format
    // Example: "351.00 117.000 400348 SUPALOAF WHITE 800GM 1 3"
    // Columns: Amount | Unit price | Code | Description | Pieces | Pack (Quantity)

    // Find the 6-digit code (4003xx)
    const codeMatch = line.match(/(4003\d{2})/);
    if (!codeMatch) {
      continue; // Skip lines without Cleanshelf codes
    }

    const code = codeMatch[1];

    // Split the line by spaces
    const parts = line.split(/\s+/);

    if (parts.length >= 5) {
      // The last part should be the pack quantity (what we want)
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];

      let quantity = null;

      // Try to parse the last part as quantity
      quantity = parseFloat(lastPart.replace(/,/g, ""));

      // If last part is not a valid number, try second last
      if (isNaN(quantity) || quantity <= 0) {
        quantity = parseFloat(secondLastPart.replace(/,/g, ""));
      }

      // If still no valid quantity, look for any number in the last few parts
      if (isNaN(quantity) || quantity <= 0) {
        for (let j = Math.max(0, parts.length - 5); j < parts.length; j++) {
          const potentialQty = parseFloat(parts[j].replace(/,/g, ""));
          if (!isNaN(potentialQty) && potentialQty > 0 && potentialQty < 1000) {
            quantity = potentialQty;
            break;
          }
        }
      }

      if (quantity && !isNaN(quantity) && quantity > 0) {
        // Find the product description
        const codeIndex = parts.indexOf(code);
        let description = "";
        if (codeIndex !== -1 && codeIndex < parts.length - 2) {
          // Get everything from after code up to before the numbers
          const descriptionParts = [];
          for (let j = codeIndex + 1; j < parts.length; j++) {
            if (/^\d+$/.test(parts[j]) || /^\d+\.\d+$/.test(parts[j])) {
              break;
            }
            descriptionParts.push(parts[j]);
          }
          description = descriptionParts.join(" ");
        }

        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description || `Cleanshelf Product ${code}`,
          method: "cleanshelf_local_po",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(
          `✅ Cleanshelf Local PO: ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  console.log(`Parsed ${items.length} items from Cleanshelf Local PO`);

  // If we didn't find items with line-by-line parsing, try regex pattern
  if (items.length === 0) {
    console.log("Trying regex pattern matching...");

    // Pattern to match: number number 4003xx description number number
    const pattern =
      /(\d+\.\d{2})\s+(\d+\.\d{3})\s+(4003\d{2})\s+(.+?)\s+(\d+)\s+(\d+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const code = match[3];
      const quantity = parseFloat(match[6]); // Last number is Pack (quantity)
      const description = match[4];

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_local_po_regex",
          rawLine: match[0].substring(0, 100),
        });
        console.log(
          `✅ Cleanshelf Local PO (regex): ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  return items;
};

// Parse Cleanshelf PENDING ORDERS format - FIXED VERSION
const parseCleanshelfPendingOrders = (text) => {
  console.log("Parsing Cleanshelf PENDING ORDERS format...");
  const items = [];
  const lines = text.split("\n");

  let inItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check if we've entered the items section
    if (
      line.includes("Code Description") ||
      line.includes("Orderd Qty.") ||
      line.includes("Outstanding Qty.")
    ) {
      inItemsSection = true;
      console.log("Entered items section at line:", i + 1);
      continue;
    }

    // Check for end of report
    if (
      line.includes("********* End of Report ********") ||
      line.includes("FRESHMARKET")
    ) {
      break;
    }

    // Skip if not in items section
    if (!inItemsSection) {
      continue;
    }

    // Pattern for lines like: "0.00 8.00 8.00 400329 SUPA BUTTER TOAST WHITE 400GM"
    // We want: code (400329) and quantity (third number, 8.00 - Outstanding Qty.)

    // Find the 6-digit code
    const codeMatch = line.match(/(4003\d{2})/);
    if (!codeMatch) {
      continue;
    }

    const code = codeMatch[1];

    // Split line by spaces
    const parts = line.split(/\s+/);

    if (parts.length >= 4) {
      // Look for three decimal numbers followed by the code
      let quantity = null;

      for (let j = 0; j < parts.length; j++) {
        if (
          /^\d+\.\d{2}$/.test(parts[j]) &&
          j + 2 < parts.length &&
          /^\d+\.\d{2}$/.test(parts[j + 1]) &&
          /^\d+\.\d{2}$/.test(parts[j + 2]) &&
          parts[j + 3] === code
        ) {
          quantity = parseFloat(parts[j + 2]); // Outstanding Qty is the third decimal
          break;
        }
      }

      // Fallback: just look for any decimal number before the code
      if (!quantity || isNaN(quantity)) {
        for (let j = 0; j < parts.length; j++) {
          if (parts[j] === code && j > 0) {
            // Look backward for a decimal number
            for (let k = j - 1; k >= 0; k--) {
              const potentialQty = parseFloat(parts[k]);
              if (!isNaN(potentialQty) && potentialQty > 0) {
                quantity = potentialQty;
                break;
              }
            }
            break;
          }
        }
      }

      if (quantity && !isNaN(quantity) && quantity > 0) {
        // Extract description
        const codeIndex = parts.indexOf(code);
        let description = "";
        if (codeIndex !== -1 && codeIndex < parts.length - 1) {
          description = parts.slice(codeIndex + 1).join(" ");
        }

        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description || `Cleanshelf Product ${code}`,
          method: "cleanshelf_pending_orders",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(
          `✅ Cleanshelf Pending: ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  console.log(`Parsed ${items.length} items from Cleanshelf Pending Orders`);

  // If we didn't find items with line-by-line parsing, try regex pattern
  if (items.length === 0) {
    console.log("Trying regex pattern matching...");

    // Pattern to match: 0.00 8.00 8.00 400329 description
    const pattern =
      /(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(4003\d{2})\s+(.+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const code = match[4];
      const quantity = parseFloat(match[3]); // Third number is Outstanding Qty
      const description = match[5];

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_pending_orders_regex",
          rawLine: match[0].substring(0, 100),
        });
        console.log(
          `✅ Cleanshelf Pending (regex): ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  return items;
};

// ============================================
// UPDATED: EXTRACT LPO NUMBER FOR ALL CUSTOMER TYPES
// ============================================

const extractLPONumber = (text, customerType = "NAIVAS") => {
  console.log(`Extracting LPO number for ${customerType}...`);

  // Clean the text first
  const cleaned = cleanOCRText(text);

  console.log("Looking for LPO in text sample:", cleaned.substring(0, 200));

  // Jazaribu LPO extraction
  if (customerType === "JAZARIBU") {
    // Pattern for Jazaribu LPO: PO-J001-000361
    const jazaribuPattern = /PO-J\d{3}-\d{6}/i;
    const match = cleaned.match(jazaribuPattern);
    if (match) {
      console.log(`✅ Jazaribu LPO found: ${match[0]}`);
      return match[0];
    }

    // Also check for Order No. pattern
    const orderNoPattern = /Order No\.\s*(PO-J\d{3}-\d{6})/i;
    const orderNoMatch = cleaned.match(orderNoPattern);
    if (orderNoMatch) {
      console.log(`✅ Jazaribu LPO found (Order No.): ${orderNoMatch[1]}`);
      return orderNoMatch[1];
    }

    console.log("❌ No Jazaribu LPO found in text");
    return "UNKNOWN_LPO";
  }

  // Cleanshelf LPO extraction
  if (customerType === "CLEANSHELF") {
    // Pattern 1: Look for "L. P. O. No:" followed by number AND date (Format 1)
    // Example: "94843 L. P. O. No: 23-Jan-2026" -> LPO is 94843
    const pattern1 =
      /(\d{5,6})\s+L\.?\s*P\.?\s*O\.?\s*No:\s*\d{2}-[A-Za-z]{3}-\d{4}/i;
    const match1 = text.match(pattern1);
    if (match1) {
      console.log(`✅ Cleanshelf LPO found (Format 1): ${match1[1]}`);
      return match1[1];
    }

    // Pattern 2: Look for "LPO No." followed by number with comma (Format 2)
    // Example: "111,626 LPO No." -> LPO is 111626
    const pattern2 = /([\d,]+)\s+LPO\s*No\./i;
    const match2 = text.match(pattern2);
    if (match2) {
      const lpo = match2[1].replace(/,/g, "");
      console.log(`✅ Cleanshelf LPO found (Format 2): ${lpo}`);
      return lpo;
    }

    // Pattern 3: Look for standalone 5-6 digit numbers in Cleanshelf context
    if (
      text.includes("CLEAN SHELF") ||
      text.includes("CLEANSHELF") ||
      text.includes("FRESHMARKET")
    ) {
      // Look for 5-6 digit numbers that might be LPO
      const pattern3 = /\b(\d{5,6})\b(?!.*\d{2}-[A-Za-z]{3}-\d{4})/; // Not followed by date
      const matches = text.match(pattern3);
      if (matches) {
        console.log(`⚠️ Possible Cleanshelf LPO: ${matches[1]}`);
        return matches[1];
      }
    }

    console.log("❌ No Cleanshelf LPO found in text");
    return "UNKNOWN_LPO";
  }

  // NAIVAS LPO extraction
  const patterns = [
    /\*?P\d{9}-\d+\*?/, // NEW: P038304522-1
    /\*?P\d{9}\*?/, // P038303873 or *P038303873*
    /P\.?O\.?\s*[:#]?\s*0*(\d{6,9})/i, // P.O. 038303873
    /Purchase\s*Order\s*[:\s]*\*?(P\d{9}(?:-\d+)?)\*?/i, // Purchase Order: P038304522-1
    /LPO\s*[:\s]*\*?(P\d{9}(?:-\d+)?)\*?/i, // LPO: P038304522-1
    /\b(P\d{8,10}(?:-\d+)?)\b/, // P followed by 8-10 digits, optional dash
    /\b(\d{9})\b/, // Just 9 digits
    /^P\d{9}\s*:/, // P038303873 : (at start of line)
    /P\d{9}/, // Any P followed by 9 digits
    /P0\d{8}/, // P0 followed by 8 digits
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      console.log("Pattern matched:", pattern, "Result:", match);
      let lpo = match[1] || match[0];

      // Clean up the LPO
      lpo = lpo
        .replace(/\*/g, "")
        .replace(/[^\dP\-]/g, "")
        .replace(/^:/, "")
        .replace(/:$/, "");

      console.log("Cleaned LPO:", lpo);

      // Ensure it starts with P and has 9 digits after P (before dash if present)
      if (/^\d{9}$/.test(lpo)) {
        lpo = "P" + lpo;
        console.log("Added P prefix:", lpo);
      } else if (/^P\d{6,}(?:-\d+)?$/.test(lpo)) {
        // Handle format with dash: P038304522-1
        if (lpo.includes("-")) {
          const [prefix, suffix] = lpo.split("-");
          const digits = prefix.substring(1);
          if (digits.length < 9) {
            lpo = "P" + digits.padStart(9, "0") + "-" + suffix;
            console.log("Padded with zeros (with dash):", lpo);
          }
        } else {
          // Pad with zeros if needed
          const digits = lpo.substring(1);
          if (digits.length < 9) {
            lpo = "P" + digits.padStart(9, "0");
            console.log("Padded with zeros:", lpo);
          }
        }
      }

      if (/^P\d{9}(?:-\d+)?$/.test(lpo)) {
        console.log(`✅ Valid LPO found: ${lpo}`);
        return lpo;
      }
    }
  }

  console.log("❌ No valid LPO found in text");
  return "UNKNOWN_LPO";
};

// ============================================
// NEW: SMART N-CODE DETECTION - ONLY ADD IF CLEAR EVIDENCE
// ============================================

// SMART N-CODE CHECK: Only add N-codes if we have CLEAR evidence they're in the order
const hasClearEvidenceOfNCodes = (cleanedText) => {
  console.log("=== CHECKING FOR N-CODE EVIDENCE ===");

  // Check for specific N-code patterns in the text
  const n055Patterns = [
    /N051055/i,
    /NO51055/i, // OCR misread
    /051055/i, // Missing N prefix
    /BUTTER TOAST BREAD 1\.5KG/i,
    /SUPA BUTTER TOAST BREAD 1\.5KG/i,
  ];

  const n056Patterns = [
    /N051056/i,
    /NO51056/i, // OCR misread
    /051056/i, // Missing N prefix
    /BUTTER TOAST BREAD 600G/i,
    /SUPA BUTTER TOAST BREAD 600G/i,
  ];

  const hasN055Evidence = n055Patterns.some((pattern) =>
    pattern.test(cleanedText),
  );
  const hasN056Evidence = n056Patterns.some((pattern) =>
    pattern.test(cleanedText),
  );

  console.log("N051055 evidence found:", hasN055Evidence);
  console.log("N051056 evidence found:", hasN056Evidence);

  if (hasN055Evidence || hasN056Evidence) {
    console.log("N-code evidence found in text. Sample of relevant text:");

    // Show context around N-code evidence
    if (hasN055Evidence) {
      const match055 = cleanedText.match(
        /(.{0,100}(N051055|NO51055|051055|BUTTER TOAST BREAD 1\.5KG).{0,100})/i,
      );
      if (match055) console.log("N051055 context:", match055[1]);
    }

    if (hasN056Evidence) {
      const match056 = cleanedText.match(
        /(.{0,100}(N051056|NO51056|051056|BUTTER TOAST BREAD 600G).{0,100})/i,
      );
      if (match056) console.log("N051056 context:", match056[1]);
    }
  }

  return { hasN055Evidence, hasN056Evidence };
};

// ============================================
// UPDATED: ULTIMATE N-CODE DETECTION BY LAST 3 DIGITS - ONLY IF EVIDENCE EXISTS
// ============================================

const ultimateNCodeDetection = (text, items) => {
  console.log("=== ULTIMATE N-CODE DETECTION (ONLY IF EVIDENCE) ===");

  // First check for clear evidence
  const nCodeEvidence = hasClearEvidenceOfNCodes(text);

  // Create a map of last 3 digits to item codes for N-codes
  const last3DigitsMap = {
    "055": "N051055", // Last 3 digits 055 -> N051055
    "056": "N051056", // Last 3 digits 056 -> N051056
  };

  // Also map product names to N-codes
  const productNameMap = {
    "BUTTER TOAST BREAD 1.5KG": "N051055",
    "SUPA BUTTER TOAST BREAD 1.5KG": "N051055",
    "BUTTER TOAST BREAD 600G": "N051056",
    "SUPA BUTTER TOAST BREAD 600G": "N051056",
    "BUTTER TOAST BREAD 600GM": "N051056",
    "SUPA BUTTER TOAST BREAD 600GM": "N051056",
  };

  const lines = text.split("\n");
  let foundNCodes = [];

  // METHOD 1: Search by last 3 digits in text - ONLY IF WE HAVE EVIDENCE
  for (const [last3Digits, nCode] of Object.entries(last3DigitsMap)) {
    // Skip if we already found this N-code
    if (items.some((item) => item.ocrItemCode === nCode)) {
      continue;
    }

    // Check if we have evidence for this specific N-code
    const hasEvidence =
      (nCode === "N051055" && nCodeEvidence.hasN055Evidence) ||
      (nCode === "N051056" && nCodeEvidence.hasN056Evidence);

    if (!hasEvidence) {
      console.log(`No evidence for ${nCode}, skipping...`);
      continue;
    }

    console.log(`Searching for ${nCode} by last 3 digits "${last3Digits}"...`);

    // Look for patterns like "51055", "051055", "51056", "051056" in text
    const patterns = [
      new RegExp(`(\\d{0,2}${last3Digits})`, "g"),
      new RegExp(`(\\D${last3Digits}\\D)`, "g"),
      new RegExp(`(${last3Digits}\\d+\\.\\d{4})`, "g"),
      new RegExp(`(\\d{5,6}${last3Digits})`, "g"),
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`Found pattern for ${last3Digits}:`, matches);

        // Try to find quantity near this match
        for (const match of matches) {
          // Look for quantity pattern \d+\.\d{4} near the match
          const matchIndex = text.indexOf(match);
          const searchStart = Math.max(0, matchIndex - 30);
          const searchEnd = Math.min(
            text.length,
            matchIndex + match.length + 30,
          );
          const context = text.substring(searchStart, searchEnd);

          // Look for quantity in context
          const qtyMatch = context.match(/(\d+\.\d{4})/);
          if (qtyMatch) {
            const quantity = parseFloat(qtyMatch[1]);
            if (quantity >= 1 && quantity <= 1000 && ITEM_CODE_MAPPING[nCode]) {
              foundNCodes.push({
                ocrItemCode: nCode,
                actualItemCode: ITEM_CODE_MAPPING[nCode],
                quantity: Math.round(quantity),
                foundQuantity: quantity,
                productName: getProductName(nCode),
                method: "last3digits_pattern",
                lineNumber: items.length + foundNCodes.length + 1,
                context: context,
              });
              console.log(
                `✅ Found ${nCode} by last 3 digits: ${quantity} units`,
              );
              break;
            }
          }
        }
        if (foundNCodes.some((item) => item.ocrItemCode === nCode)) {
          break;
        }
      }
    }
  }

  // METHOD 2: Search by product name - ONLY IF WE HAVE EVIDENCE
  for (const [productName, nCode] of Object.entries(productNameMap)) {
    if (items.some((item) => item.ocrItemCode === nCode)) {
      continue;
    }

    // Check if we have evidence for this specific N-code
    const hasEvidence =
      (nCode === "N051055" && nCodeEvidence.hasN055Evidence) ||
      (nCode === "N051056" && nCodeEvidence.hasN056Evidence);

    if (!hasEvidence) {
      continue;
    }

    if (text.includes(productName)) {
      console.log(`Found product name "${productName}" for ${nCode}`);

      // Find the line with product name
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(productName)) {
          const line = lines[i];

          // Look for quantity in this line
          const qtyMatch = line.match(/(\d+\.\d{4})/);
          if (qtyMatch) {
            const quantity = parseFloat(qtyMatch[1]);
            if (quantity >= 1 && quantity <= 1000 && ITEM_CODE_MAPPING[nCode]) {
              foundNCodes.push({
                ocrItemCode: nCode,
                actualItemCode: ITEM_CODE_MAPPING[nCode],
                quantity: Math.round(quantity),
                foundQuantity: quantity,
                productName: getProductName(nCode),
                method: "product_name_match",
                lineNumber: i + 1,
                rawLine: line.substring(0, 100),
              });
              console.log(
                `✅ Found ${nCode} by product name: ${quantity} units`,
              );
              break;
            }
          }
        }
      }
    }
  }

  // REMOVED: Fallback - if we have exactly 10 items and missing N-codes
  // NO LONGER FORCING N-CODES WHEN THEY'RE NOT IN THE ORDER

  return foundNCodes;
};

// ============================================
// FIXED: PARSE COPY-PASTE TEXT FORMAT - INCLUDES N-CODES
// ============================================

const parseCopyPasteTextFormat = (text) => {
  console.log("Parsing Copy-Paste Text Format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  // Parse ALL lines that look like items
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and summary lines
    if (
      !line ||
      line.includes("Sub total") ||
      line.includes("Order total") ||
      line.includes("VAT") ||
      line.includes("Supplier:") ||
      line.includes("MINI BAKERIES") ||
      line.includes("NAIVAS LTD") ||
      line.includes("Purchase Order") ||
      line.includes("Ship To:") ||
      line.includes("RIRUTA") ||
      line === "t" ||
      line.startsWith("t ")
    ) {
      continue;
    }

    // Look for item codes at the start of line (135xxxxx OR Nxxxxxx)
    const itemCodeMatch = line.match(/^(135\d{5}|N\d{6})/);
    if (itemCodeMatch) {
      const itemCode = itemCodeMatch[1];
      console.log(
        `Found item code: ${itemCode} in line: ${line.substring(0, 80)}...`,
      );

      // Split line by spaces
      const parts = line.split(/\s+/);

      // Debug: Show all parts
      console.log(`Line parts (${parts.length}):`, parts);

      // Find quantity - it's the FIRST decimal number after "PCS"
      let quantity = null;
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === "PCS" && j + 1 < parts.length) {
          // Next part should be the quantity
          const qtyStr = parts[j + 1];
          quantity = parseFloat(qtyStr);
          console.log(`Found quantity after PCS: ${quantity}`);
          break;
        }
      }

      // If we didn't find PCS, look for pattern in the format:
      // Format: [item_code] [barcode] [description...] [quantity] [unit_price] [amount]
      // Quantity is usually the 5th from the end or 6th from the end
      if (quantity === null && parts.length >= 6) {
        // Look for decimal numbers in the line
        const decimalNumbers = [];
        for (let j = 0; j < parts.length; j++) {
          if (/\d+\.\d{2}/.test(parts[j])) {
            decimalNumbers.push({
              index: j,
              value: parseFloat(parts[j]),
              part: parts[j],
            });
          }
        }

        console.log(
          `Found ${decimalNumbers.length} decimal numbers:`,
          decimalNumbers,
        );

        // In your format, we should have 3 decimal numbers at the end:
        // [quantity] [unit_price] [amount]
        // Example: "20.00 117.00 2,340.00"
        if (decimalNumbers.length >= 3) {
          // Take the first of the last 3 decimal numbers as quantity
          quantity = decimalNumbers[decimalNumbers.length - 3].value;
          console.log(
            `Using quantity from position ${decimalNumbers.length - 3}: ${quantity}`,
          );
        } else if (decimalNumbers.length > 0) {
          // Fallback: use the first decimal number that looks like a quantity
          for (const num of decimalNumbers) {
            if (num.value >= 1 && num.value <= 1000 && num.index > 2) {
              quantity = num.value;
              console.log(`Using first reasonable quantity: ${quantity}`);
              break;
            }
          }
        }
      }

      if (
        quantity !== null &&
        !isNaN(quantity) &&
        ITEM_CODE_MAPPING[itemCode] &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
      ) {
        const existingIndex = items.findIndex(
          (item) => item.ocrItemCode === itemCode,
        );

        if (existingIndex === -1) {
          items.push({
            ocrItemCode: itemCode,
            actualItemCode: ITEM_CODE_MAPPING[itemCode],
            quantity: Math.round(quantity),
            foundQuantity: quantity,
            productName: getProductName(itemCode),
            method: "copy_paste_line",
            lineNumber: items.length + 1,
            rawLine: line.substring(0, 100),
          });
          console.log(
            `✅ Added: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
          );
        }
      } else {
        console.log(`❌ Could not parse quantity for ${itemCode}:`, {
          quantityFound: quantity,
          hasMapping: ITEM_CODE_MAPPING[itemCode],
          linePreview: line.substring(0, 100),
        });
      }
    }
  }

  console.log(`Total items parsed: ${items.length}`);
  return items;
};

// ============================================
// NEW: PARSE DETAILED PO FORMAT (your new format)
// ============================================

const parseDetailedPOFormat = (text) => {
  console.log("Parsing Detailed PO Format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Looking for item patterns in detailed format...");

  // Pattern for lines like: "13505786 2037680000000 FRESH WHITE BREAD 800GM PCS 120.00 105.00 12,600.00"
  // We want to capture: item code (13505786) and quantity (120.00)
  const detailedPattern =
    /(135\d{5}|N\d{6})\s+\d+\s+.+?\s+PCS\s+(\d+(?:\.\d{2})?)/g;

  let match;
  while ((match = detailedPattern.exec(text)) !== null) {
    const itemCode = match[1];
    const quantity = parseFloat(match[2]);

    if (
      ITEM_CODE_MAPPING[itemCode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
    ) {
      // Check if we already have this item
      const existingIndex = items.findIndex(
        (item) => item.ocrItemCode === itemCode,
      );

      if (existingIndex === -1) {
        items.push({
          ocrItemCode: itemCode,
          actualItemCode: ITEM_CODE_MAPPING[itemCode],
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: getProductName(itemCode),
          method: "detailed_po_format",
          lineNumber: items.length + 1,
        });
        console.log(
          `Detailed PO: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
        );
      }
    }
  }

  // If we didn't find items with the regex approach, try line-by-line
  if (items.length === 0) {
    console.log("Trying line-by-line parsing for detailed format...");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and summary lines
      if (
        !line ||
        line.includes("Sub total") ||
        line.includes("Order total") ||
        line.includes("VAT") ||
        line.includes("TERMS AND CONDITIONS") ||
        line.includes("Purchase order") ||
        line.includes("NAIVAS LTD") ||
        line.includes("Ship To:") ||
        line.includes("P.O. Date:")
      ) {
        continue;
      }

      // Look for item codes in the line
      const itemCodeMatch = line.match(/(135\d{5}|N\d{6})/);
      if (itemCodeMatch) {
        const itemCode = itemCodeMatch[1];

        // Look for quantity pattern: number with .00 after PCS
        const quantityMatch = line.match(/PCS\s+(\d+(?:\.\d{2})?)/);
        if (!quantityMatch) {
          // Try alternative: look for decimal number near the end
          const numbers = line.match(
            /(\d+(?:\.\d{2})?)\s+(\d+(?:\.\d{2})?)\s+([\d,]+\d{2})/,
          );
          if (numbers) {
            // First number after item code is usually quantity
            const quantity = parseFloat(numbers[1]);

            if (
              ITEM_CODE_MAPPING[itemCode] &&
              quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
            ) {
              const existingIndex = items.findIndex(
                (item) => item.ocrItemCode === itemCode,
              );

              if (existingIndex === -1) {
                items.push({
                  ocrItemCode: itemCode,
                  actualItemCode: ITEM_CODE_MAPPING[itemCode],
                  quantity: Math.round(quantity),
                  foundQuantity: quantity,
                  productName: getProductName(itemCode),
                  method: "detailed_line_by_line",
                  lineNumber: items.length + 1,
                });
                console.log(
                  `Detailed line: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
                );
              }
            }
          }
        } else {
          const quantity = parseFloat(quantityMatch[1]);

          if (
            ITEM_CODE_MAPPING[itemCode] &&
            quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
          ) {
            const existingIndex = items.findIndex(
              (item) => item.ocrItemCode === itemCode,
            );

            if (existingIndex === -1) {
              items.push({
                ocrItemCode: itemCode,
                actualItemCode: ITEM_CODE_MAPPING[itemCode],
                quantity: Math.round(quantity),
                foundQuantity: quantity,
                productName: getProductName(itemCode),
                method: "detailed_line_by_line_pcs",
                lineNumber: items.length + 1,
              });
              console.log(
                `Detailed line (PCS): ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
              );
            }
          }
        }
      }
    }
  }

  return items;
};

// ============================================
// ENHANCED UNIVERSAL PARSER WITH N-CODE PRIORITY
// ============================================

const parseUniversalFormat = (text) => {
  console.log("Using ENHANCED UNIVERSAL parser with N-code priority...");
  const items = [];

  // PHASE 1: Direct N-code extraction (PRIORITY)
  console.log("=== PHASE 1: Direct N-code extraction ===");

  // Direct patterns for N051055 with ALL POSSIBLE OCR VARIATIONS
  const n051055Patterns = [
    /(N051055|NO51055|N05105O|N05105o|051055)\s+(\d+(?:\.\d{2,4})?)/gi,
    /(N051055|NO51055|N05105O|N05105o|051055)(\d+\.\d{2,4})/gi,
    /\|\s*(N051055|NO51055|N05105O|N05105o|051055)\s*\|\s*(\d+(?:\.\d{2,4})?)/gi,
    /(\d+)\s+(N051055|NO51055|N05105O|N05105o|051055)\s+(\d+(?:\.\d{2,4})?)/gi,
    /(N051055|NO51055|N05105O|N05105o|051055).*?(\d+(?:\.\d{2,4})?)\s+\d+(?:\.\d{2})?\s+[\d,]+\.\d{2}/gi,
    /(N051055|NO51055|N05105O|N05105o|051055).*?SUPA.*?BUTTER.*?TOAST.*?BREAD.*?1\.5KG.*?(\d+(?:\.\d{2,4})?)/gi,
  ];

  let foundN055 = false;
  for (const pattern of n051055Patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let quantityStr;
      if (match.length >= 4) {
        quantityStr = match[3] || match[2];
      } else if (match.length === 3) {
        quantityStr = match[2] || match[1].replace(/[^\d.]/g, "");
      } else {
        continue;
      }

      const quantity = parseFloat(quantityStr);
      if (
        !isNaN(quantity) &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY &&
        quantity <= VALIDATION_SETTINGS.MAX_QUANTITY &&
        ITEM_CODE_MAPPING["N051055"]
      ) {
        items.push({
          ocrItemCode: "N051055",
          actualItemCode: ITEM_CODE_MAPPING["N051055"],
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: getProductName("N051055"),
          method: "direct_n051055",
          lineNumber: items.length + 1,
          rawMatch: match[0],
        });
        console.log(
          `✅ Found N051055: ${quantity} units (pattern: ${pattern})`,
        );
        foundN055 = true;
        break; // Found it, no need to check other patterns
      }
    }
    if (foundN055) break;
  }

  // Direct patterns for N051056 with ALL POSSIBLE OCR VARIATIONS
  const n051056Patterns = [
    /(N051056|NO51056|051056)\s+(\d+(?:\.\d{2,4})?)/gi,
    /(N051056|NO51056|051056)(\d+\.\d{2,4})/gi,
    /\|\s*(N051056|NO51056|051056)\s*\|\s*(\d+(?:\.\d{2,4})?)/gi,
    /(\d+)\s+(N051056|NO51056|051056)\s+(\d+(?:\.\d{2,4})?)/gi,
    /(N051056|NO51056|051056).*?(\d+(?:\.\d{2,4})?)\s+\d+(?:\.\d{2})?\s+[\d,]+\.\d{2}/gi,
    /(N051056|NO51056|051056).*?SUPA.*?BUTTER.*?TOAST.*?BREAD.*?600G.*?(\d+(?:\.\d{2,4})?)/gi,
  ];

  let foundN056 = false;
  for (const pattern of n051056Patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let quantityStr;
      if (match.length >= 4) {
        quantityStr = match[3] || match[2];
      } else if (match.length === 3) {
        quantityStr = match[2] || match[1].replace(/[^\d.]/g, "");
      } else {
        continue;
      }

      const quantity = parseFloat(quantityStr);
      if (
        !isNaN(quantity) &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY &&
        quantity <= VALIDATION_SETTINGS.MAX_QUANTITY &&
        ITEM_CODE_MAPPING["N051056"]
      ) {
        items.push({
          ocrItemCode: "N051056",
          actualItemCode: ITEM_CODE_MAPPING["N051056"],
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: getProductName("N051056"),
          method: "direct_n051056",
          lineNumber: items.length + 1,
          rawMatch: match[0],
        });
        console.log(
          `✅ Found N051056: ${quantity} units (pattern: ${pattern})`,
        );
        foundN056 = true;
        break; // Found it, no need to check other patterns
      }
    }
    if (foundN056) break;
  }

  // PHASE 2: General pattern matching for all codes
  console.log("=== PHASE 2: General pattern matching ===");

  const generalPatterns = [
    // Pattern with line numbers: "1 13505757 30.00" or "1 N051055 12.00"
    /(\d+)\s+(135\d{5}|N\d{6})\s+(\d+(?:\.\d{2,4})?)/g,
    // Pattern without line numbers: "13505757 30.00" or "N051055 12.00"
    /(135\d{5}|N\d{6})\s+(\d+(?:\.\d{2,4})?)/g,
    // Pattern for merged OCR: "1350575730.00" or "N05105512.00"
    /(135\d{5})(\d+\.\d{2,4})/g,
    /(N\d{6})(\d+\.\d{2,4})/g,
    // Pattern with pipes: "| 13505757 | 30.00 |" or "| N051055 | 12.00 |"
    /\|\s*(135\d{5}|N\d{6})\s*\|\s*(\d+(?:\.\d{2,4})?)/g,
    // Pattern for detailed format: code, barcode, description, PCS, quantity, price, amount
    /(135\d{5}|N\d{6})\s+\d+\s+.+?\s+PCS\s+(\d+(?:\.\d{2,4})?)/g,
    // Pattern for lines with amounts at the end
    /(135\d{5}|N\d{6})\s+.+?(\d+(?:\.\d{2,4})?)\s+\d+(?:\.\d{2})?\s+[\d,]+\.\d{2}/g,
  ];

  for (const pattern of generalPatterns) {
    let match;
    try {
      while ((match = pattern.exec(text)) !== null) {
        let lineNum, itemCode, quantityStr;

        if (match.length === 4) {
          [, lineNum, itemCode, quantityStr] = match;
        } else if (match.length === 3) {
          [, itemCode, quantityStr] = match;
        } else {
          continue;
        }

        itemCode = itemCode.toUpperCase().replace(/\s+/g, "");
        const quantity = parseFloat(quantityStr);

        // Skip if we already found this N-code in phase 1
        if (
          (itemCode === "N051055" || itemCode === "N051056") &&
          items.some((item) => item.ocrItemCode === itemCode)
        ) {
          continue;
        }

        if (
          ITEM_CODE_MAPPING[itemCode] &&
          quantity >= VALIDATION_SETTINGS.MIN_QUANTITY &&
          quantity <= VALIDATION_SETTINGS.MAX_QUANTITY
        ) {
          // Check if we already have this item
          const existingIndex = items.findIndex(
            (item) => item.ocrItemCode === itemCode,
          );

          if (existingIndex === -1) {
            items.push({
              ocrItemCode: itemCode,
              actualItemCode: ITEM_CODE_MAPPING[itemCode],
              quantity: Math.round(quantity),
              foundQuantity: quantity,
              productName: getProductName(itemCode),
              method: "universal",
              lineNumber: lineNum ? parseInt(lineNum) : items.length + 1,
              rawMatch: match[0],
            });
            console.log(
              `✅ Universal: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error with pattern ${pattern}:`, error);
    }
  }

  // PHASE 3: Fallback for any missed items
  if (items.length === 0) {
    console.log("=== PHASE 3: Fallback extraction ===");
    items.push(...findItemsGeneric(text));
  }

  return items;
};

// ============================================
// ORIGINAL GENERIC PARSING (fallback)
// ============================================

const findItemsGeneric = (text) => {
  console.log("Using generic parsing...");
  const items = [];

  const cleanText = text.replace(/\t/g, " ").replace(/\s+/g, " ");

  // Enhanced pattern to handle both 135xxxxx and Nxxxxxx codes
  const itemQuantityPattern =
    /((?:135\d{5}|N\d{6}))\D+?(\d+(?:,\d{3})*\.\d{2})/g;

  let match;
  while ((match = itemQuantityPattern.exec(cleanText)) !== null) {
    const itemCode = match[1];
    const quantityStr = match[2].replace(/,/g, "");
    const quantity = parseFloat(quantityStr);

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
        method: "generic_pattern",
      });
    }
  }

  return items;
};

// ============================================
// ENHANCED: FIND ITEMS AND QUANTITIES (MAIN FUNCTION) - WITH UPDATED CUSTOMER TYPE DETECTION
// ============================================

const findItemsAndQuantities = (text, customerType = "NAIVAS") => {
  console.log(`=== STARTING ITEM EXTRACTION FOR ${customerType} ===`);

  const cleanedText = cleanOCRText(text);
  const format = detectTextFormat(cleanedText, customerType);

  let items = [];

  // Use appropriate parser based on format and customer type
  if (customerType === "JAZARIBU") {
    items = parseJazaribuFormat(cleanedText);
  } else if (customerType === "CLEANSHELF") {
    switch (format) {
      case "CLEANSHELF_LOCAL_PO":
        items = parseCleanshelfLocalPO(cleanedText);
        break;
      case "CLEANSHELF_PENDING_ORDERS":
        items = parseCleanshelfPendingOrders(cleanedText);
        break;
      default:
        // Try both formats if auto-detection fails
        items = parseCleanshelfLocalPO(cleanedText);
        if (items.length === 0) {
          items = parseCleanshelfPendingOrders(cleanedText);
        }
    }
  } else {
    // NAIVAS parsing
    switch (format) {
      case "COPY_PASTE_TEXT": // NEW CASE for copy-paste format
        items = parseCopyPasteTextFormat(cleanedText);
        break;
      case "DETAILED_PO": // Detailed PO format
        items = parseDetailedPOFormat(cleanedText);
        break;
      case "YOUR_FORMAT": // Your specific format
      case "SIMPLE_TABULAR":
      case "TABULAR_WITH_HEADERS":
      case "STANDARD_PO":
      case "SIMPLE_LIST":
      case "EXCEL_COPY_PASTE":
      default:
        items = parseUniversalFormat(cleanedText);

        // If still no items, try the original generic parser
        if (items.length === 0) {
          console.log("Universal parser found no items, trying generic...");
          items = findItemsGeneric(cleanedText);
        }
    }

    // UPDATED N-CODE DETECTION (LAST RESORT) - Only if evidence exists
    const ultimateNCodes = ultimateNCodeDetection(cleanedText, items);

    // Add ultimate N-codes if not already found
    for (const nCodeItem of ultimateNCodes) {
      const alreadyExists = items.some(
        (item) => item.ocrItemCode === nCodeItem.ocrItemCode,
      );
      const hasReasonableQuantity =
        nCodeItem.quantity > 0 && nCodeItem.quantity <= 1000;

      if (!alreadyExists && hasReasonableQuantity) {
        items.push(nCodeItem);
        console.log(
          `Adding ultimate N-code: ${nCodeItem.ocrItemCode} x ${nCodeItem.quantity}`,
        );
      }
    }
  }

  // Remove duplicates (keep first occurrence)
  const uniqueItems = [];
  const seenCodes = new Set();

  for (const item of items) {
    if (!seenCodes.has(item.ocrItemCode)) {
      seenCodes.add(item.ocrItemCode);
      uniqueItems.push(item);
    }
  }

  // Sort by line number if available
  uniqueItems.sort((a, b) => {
    if (a.lineNumber && b.lineNumber) {
      return a.lineNumber - b.lineNumber;
    }
    return 0;
  });

  // Calculate totals and show results
  if (uniqueItems.length > 0) {
    const totalQuantity = uniqueItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    console.log(
      `✅ Found ${uniqueItems.length} unique items, Total quantity: ${totalQuantity}`,
    );

    console.log("📋 Item Details:");
    uniqueItems.forEach((item, index) => {
      const fgCode = item.actualItemCode;
      const productName = item.productName || "Unknown Product";
      console.log(
        `${index + 1}. ${item.ocrItemCode} → ${fgCode} → ${productName}: ${item.quantity} units (method: ${item.method})`,
      );
    });

    // Special summary for Naivas (N-codes)
    if (customerType === "NAIVAS") {
      const nCodeItems = uniqueItems.filter((item) =>
        item.ocrItemCode.startsWith("N"),
      );
      if (nCodeItems.length > 0) {
        console.log("🎯 N-code items successfully extracted:");
        nCodeItems.forEach((item) => {
          console.log(
            `   • ${item.ocrItemCode}: ${item.quantity} units (${item.productName})`,
          );
        });
      }
    }
  } else {
    console.log("❌ No items found in text");
    console.log("Debug sample:", cleanedText.substring(0, 500));
  }

  return uniqueItems;
};

// ============================================
// TESSERACT OCR
// ============================================

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

// ============================================
// PROCESS DROPPED FILE
// ============================================

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

// ============================================
// ENHANCED: PARSE PO TEXT (MAIN PARSING FUNCTION) WITH CUSTOMER TYPE DETECTION
// ============================================

const parsePOText = async (
  text,
  customerCode = null,
  customerType = "NAIVAS",
) => {
  console.log(`=== STARTING ENHANCED PO PARSING ===`);
  console.log("Input text sample:", text.substring(0, 300));
  console.log("Initial customer type:", customerType);
  console.log("Customer code:", customerCode);

  // DETECT CUSTOMER TYPE BASED ON CUSTOMER CODE AND TEXT
  // This is the key logic: check customer code against our lists
  const detectedCustomerType = detectCustomerTypeByCode(customerCode, text);

  // Override with detected type if different
  if (detectedCustomerType !== customerType) {
    console.log(
      `⚠️ Switching customer type from ${customerType} to ${detectedCustomerType} based on detection`,
    );
    customerType = detectedCustomerType;
  }

  console.log(`Final customer type: ${customerType}`);

  // Extract LPO number based on customer type
  const lpoNumber = extractLPONumber(text, customerType);

  // Find items and quantities based on customer type
  const foundItems = findItemsAndQuantities(text, customerType);

  // Get products for matching based on customer type
  const products = await getProductsByCustomer(customerType);

  // Map found items to actual products
  const items = [];
  const parsingWarnings = [];
  const parsingErrors = [];

  let totalValue = 0;

  for (const foundItem of foundItems) {
    const product = products.find(
      (p) => p.itemCode === foundItem.actualItemCode,
    );

    if (product) {
      const itemValue = foundItem.quantity * (product.itemPrice || 0);
      totalValue += itemValue;

      items.push({
        description: `${foundItem.productName || product.itemName || "Unknown Product"}`,
        product: product,
        quantity: foundItem.quantity,
        status: "matched",
        unitPrice: product.itemPrice || 0,
        netAmount: itemValue,
        fgCode: foundItem.actualItemCode,
        ocrDetails: {
          ocrItemCode: foundItem.ocrItemCode,
          foundQuantity: foundItem.foundQuantity,
          method: foundItem.method,
          lineNumber: foundItem.lineNumber,
          productName: foundItem.productName,
        },
      });

      console.log(
        `✅ Matched: ${foundItem.ocrItemCode} → ${foundItem.actualItemCode} → ${foundItem.productName || "Unknown"}: ${foundItem.quantity} x ${product.itemPrice} = ${itemValue}`,
      );
    } else {
      console.log(
        `❌ No product found for code: ${foundItem.actualItemCode} (from OCR: ${foundItem.ocrItemCode})`,
      );
      parsingErrors.push(
        `Item code ${foundItem.ocrItemCode} → ${foundItem.actualItemCode} not found in system`,
      );
    }
  }

  // Summary
  const summary = {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: totalValue,
    matchedItems: items.length,
    failedItems: parsingErrors.length,
    lpoNumber: lpoNumber,
    customerType: customerType,
  };

  console.log("=== PARSING SUMMARY ===");
  console.log(`Customer Type: ${customerType}`);
  console.log(`LPO: ${lpoNumber}`);
  console.log(`Customer: ${customerCode || "Not specified"}`);
  console.log(`Items: ${summary.totalItems} matched`);

  // Only show failed items if there are any
  if (summary.failedItems > 0) {
    console.log(`Failed items: ${summary.failedItems}`);
  }

  console.log(`Total Quantity: ${summary.totalQuantity}`);
  console.log(`Total Value: KES ${summary.totalAmount.toFixed(2)}`);

  if (items.length > 0) {
    console.log("Items found:");
    items.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} → ${item.fgCode}: ${item.quantity} units`,
      );
    });
  }

  return {
    customer: customerCode,
    items,
    lpoNumber: lpoNumber,
    customerType: customerType,
    detectedFormat: "ENHANCED_PARSING",
    parsingWarnings: [...parsingWarnings, ...parsingErrors],
    parsingErrors: parsingErrors,
    originalText: text.substring(0, 500),
    summary: summary,
  };
};

// ============================================
// PARSE PO FROM DROPPED FILE
// ============================================

const parsePOFromDroppedFile = async (
  file,
  customerCode = null,
  customerType = "NAIVAS",
) => {
  try {
    console.log("Processing Uploaded File");
    const extractedText = await processDroppedFile(file);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the file");
    }

    console.log("Extracted text length:", extractedText.length);
    console.log("First 300 chars:", extractedText.substring(0, 300));

    return await parsePOText(extractedText, customerCode, customerType);
  } catch (error) {
    console.error("File processing failed:", error);

    if (error.message.includes("OCR") || error.message.includes("Tesseract")) {
      throw new Error("Text recognition failed. Please try a clearer image.");
    } else {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }
};

// ============================================
// CREATE ORDER FROM PO DATA
// ============================================

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

  // FIXED DATE ISSUE: Get tomorrow's date correctly in GMT+3 timezone
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

  // Use customer-specific selling price list
  let sellingPriceList;
  switch (poData.customerType) {
    case "CLEANSHELF":
      sellingPriceList = "Supermarkets Price";
      break;
    case "JAZARIBU":
      sellingPriceList = "Supermarkets Price";
      break;
    default:
      sellingPriceList = DEFAULT_SETTINGS.SELLING_PRICE_LIST;
  }

  const orderPayload = {
    customer: poData.customer,
    orderType: DEFAULT_SETTINGS.ORDER_TYPE,
    sellingPriceList: sellingPriceList,
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
      customerType: poData.customerType,
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

// ============================================
// DRAG AND DROP SETUP
// ============================================

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

// ============================================
// TEST FUNCTIONS FOR ALL CUSTOMER TYPES
// ============================================

const testWithNCodes = async () => {
  // Test text with N-codes in various formats
  const testText = `P038303873 :  
M/539 - MINI  
BAKERIES (NBI)  

| Item number | Quantity |
|---|---|
| 1    | 13505757 | 30.00   |
| 2    | 13505758 | 15.00   |
| 3    | 13505844 | 48.00   |
| 4    | 13505845 | 12.00   |
| 5    | 13505786 | 30.00   |
| 6    | 13505790 | 10.00   |
| 7    | N051055  | 5.00    |
| 8    | N051056  | 8.00    `;

  console.log("=== TESTING N-CODES PARSER ===");
  const result = await parsePOText(testText, "M/539", "NAIVAS");

  // Show N-code specific results
  const nCodeItems = result.items.filter((item) =>
    item.ocrDetails?.ocrItemCode?.startsWith("N"),
  );
  console.log(`\n🎯 N-code items found: ${nCodeItems.length}`);
  nCodeItems.forEach((item) => {
    console.log(
      `   • ${item.ocrDetails.ocrItemCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithCopyPasteFormat = async () => {
  // Test text with the new copy-paste format
  const testText = `13504180 6161102320305 SUPA LOAF WHITE BARREL 800G PCS 20.00 117.00 2,340.00
13506130 6161102320435 SUPA WHITE TOAST 800G PCS 10.00 117.00 1,170.00
13504428 6161102320183 SUPA LOAF WHITE BREAD 800G PCS 15.00 117.00 1,755.00
13500140 6161102320060 SUPA WHITE BARREL BREAD 400G PCS 10.00 57.21 572.11
13500398 6164000136610 SUPA LOAF FAMILY 600GMS PCS 15.00 88.67 1,330.00
13505114 6161102320299 SUPA WHITE BARREL 600GM PCS 18.00 88.67 1,596.00
13505115 6161102320268 SUPA BROWN BARREL 600GM PCS 8.00 88.67 709.33
N051056 6161102320442 SUPA BUTTER TOAST BREAD 600G PCS 15.00 88.67 1,330.05
13504429 6161102320404 SUPA LOAF WHITE BREAD 400GM CT PCS 6.00 57.21 343.26
13505111 6161102320138 SUPA BUTTER TOAST LOAF 400GM PCS 8.00 57.21 457.69
N051055 6161102320459 SUPA BUTTER TOAST BREAD 1.5KG PCS 5.00 217.94 1,089.70
13500168 6161102320046 SUPA LOAF WHITE BREAD 1.5KG PCS 5.00 217.94 1,089.71
Sub total 13,782.85
VAT
Order total 13,782.85
Supplier:
MINI BAKERIES (NBI)
KEN
NAIVAS LTD
Purchase Order
Ship To:  RIRUTA
RIRUTA
RIRUTA
KEN
Purchase 
Order
*P038302575*
P`;

  console.log("=== TESTING COPY-PASTE FORMAT PARSER ===");
  const result = await parsePOText(testText, "MINI BAKERIES", "NAIVAS");

  console.log(`\n📋 Copy-paste format results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Total Value: ${result.summary.totalAmount}`);

  // Show all items
  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} → ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithCleanshelfFormat = async () => {
  // Test text with Cleanshelf Format 1
  const testText = `LOCAL PURCHASE ORDER
M044
1
NAIROBI
1
Acc Code
MINI BAKERIES (NAIROBI) LTD
Phone:
Location:
PoBox: VALID UPTO:
L. P. O. Date:
94843 L. P. O. No:
23-Jan-2026
VAT NO:
PIN NO: 
CLEAN SHELF SUPERMARKETS LIMITED
WENDANI
CLS 
01/30/2026  05:54:19PM
CODE DESCRIPTION Pieces Unit price Amount Pack
P051147119S
0125810H
P.O BOX 1208-00217, LIMURU
 351.00 117.000 400348 SUPALOAF WHITE 800GM 1 3
 2,128.80 88.700 400347 SUPALOAF WHITE 600GM 2 24
 435.80 217.900 400346 SUPALOAF SANDWICH 1.5KG 1 2
 2,128.80 88.700 400343 SUPALOAF BUTTER TOAST 600GM 2 24
 234.00 117.000 400339 SUPALOAF BARREL WHITE 800GM 0 2
 1,774.00 88.700 400338 SUPALOAF BARREL WHITE 600GM 2 20
 868.50 57.900 400337 SUPALOAF BARREL WHITE 400GM 1 15
 354.80 88.700 400336 SUPALOAF BARREL BROWN 600GM 0 4
 868.50 57.900 400334 SUPALOAF  WHITE 400GM 1 15
 532.20 88.700 400330 SUPA BUTTER TOAST BARREL 600GM 6 6
 579.00 57.900 400329 SUPA BUTTER TOAST WHITE 400GM 10 10`;

  console.log("=== TESTING CLEANSHELF PARSER ===");
  const result = await parsePOText(testText, "C00494", "NAIVAS");

  console.log(`\n📋 Cleanshelf results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  // Show all items
  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} → ${item.fgCode}: ${item.quantity} units`,
    );
  });

  return result;
};

const testWithJazaribuFormat = async () => {
  // Test text with Jazaribu format
  const testText = `6161102320404 JT01093 Supa Loaf White Bread 400Gm Ct 8 PIECES 55.00 440.00
6161102320138 JT01098 Supa Butter Toast Loaf 400Gm 6 PIECES 55.00 330.00
6161102320169 JT01090 Supa Loaf Family 600Gms 8 PIECES 82.00 656.00
6161102320442 JT01094 Supa Butter Toast Bread 600G 6 PIECES 82.00 492.00
6161102320183 JT01091 Supa Loaf White Bread 800Gm 6 PIECES 108.00 648.00
6161102320435 JT01097 Supa White B/Toast 800Gm 4 PIECES 108.00 432.00
6161102320060 JT01100 Supa White Sliced Barrel 400Gm 6 PIECES 55.00 330.00
6161102320305 JT01103 Supa White Sliced Barrel 800Gm 4 PIECES 108.00 432.00
6161102320299 JT01102 Supa White Sliced Barrel 600Gm 5 PIECES 82.00 410.00
Total KE 4,170.00
Terms and Conditions :
1. Attaching a copy of the purchase order is mandatory.
2. Oversupply will not be accepted.
3. A purchase order is valid for a strict duration of 14 days.
4. Deliveries must be made in complete packaging.
5. Deliveries from Monday to Friday must be completed by 4:00 PM.
6. No deliveries will be accepted on Saturdays after 12:00 PM.
MAURICE TARUS FREDRICK ODENY
Created By Approved By
Buy-from Vendor No. V0016
P000599905G VAT Registration No.
Order No.
VAT Registration No.
Email
Phone No.
Page 1
Kenya
PO-J001-000361
P052257611W
info@jaza.ke
0740002000
Nairobi, Nairobi, 72590-00200
Ol Donyo Sabuk Rd, Nairobi, Nairobi
Mesora
JAZARIBU RETAIL
P`;

  console.log("=== TESTING JAZARIBU PARSER ===");
  const result = await parsePOText(testText, "C07455", "NAIVAS");

  console.log(`\n📋 Jazaribu results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  // Show all items
  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} → ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

// ============================================
// DEBUG FUNCTION FOR N-CODES
// ============================================

const debugNCodeParsing = (text) => {
  console.log("=== N-CODE DEBUGGING ===");

  // Show mappings
  console.log("Mappings check:");
  console.log(
    "N051055 in ITEM_CODE_MAPPING:",
    "N051055" in ITEM_CODE_MAPPING,
    "->",
    ITEM_CODE_MAPPING["N051055"],
  );
  console.log(
    "N051056 in ITEM_CODE_MAPPING:",
    "N051056" in ITEM_CODE_MAPPING,
    "->",
    ITEM_CODE_MAPPING["N051056"],
  );

  // Clean text
  const cleaned = cleanOCRText(text);
  console.log("\nCleaned text (first 300 chars):", cleaned.substring(0, 300));

  // Search for N-code patterns
  const patterns = [
    "N051055",
    "NO51055",
    "N05105O",
    "051055",
    "N051056",
    "NO51056",
    "051056",
  ];

  console.log("\nSearching for patterns:");
  patterns.forEach((pattern) => {
    const regex = new RegExp(pattern, "gi");
    const matches = cleaned.match(regex);
    if (matches) {
      console.log(`✓ Pattern "${pattern}" found ${matches.length} times`);
    }
  });

  return {
    cleanedText: cleaned,
    mappings: {
      N051055: ITEM_CODE_MAPPING["N051055"],
      N051056: ITEM_CODE_MAPPING["N051056"],
    },
  };
};

// ============================================
// EXPORT
// ============================================

export default {
  // Product fetching
  getNaivasProducts,
  getProductsByCustomer,

  // Parsing functions
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: async (text, customerCode, customerType = "NAIVAS") =>
    parsePOText(text, customerCode, customerType),

  // Order creation
  createOrderFromPO,

  // File handling
  setupDragAndDrop,
  processDroppedFile,

  // OCR functions
  extractTextFromImage,
  extractTextFromPDF,
  extractTextWithOCRSpace,

  // Extraction functions
  extractLPONumber,
  findItemsAndQuantities,
  detectTextFormat,
  detectCustomerTypeByCode,
  cleanOCRText,

  // Parsers
  parseUniversalFormat,
  parseCopyPasteTextFormat,
  parseDetailedPOFormat,
  parseCleanshelfLocalPO,
  parseCleanshelfPendingOrders,
  parseJazaribuFormat,

  // N-code functions
  ultimateNCodeDetection,
  hasClearEvidenceOfNCodes,

  // Test functions
  testWithNCodes,
  testWithCopyPasteFormat,
  testWithCleanshelfFormat,
  testWithJazaribuFormat,
  debugNCodeParsing,

  // Mappings and config
  ITEM_CODE_MAPPING,
  ITEM_NAMES_MAPPING,
  CLEANSHELF_ITEM_CODE_MAPPING,
  JAZARIBU_ITEM_CODE_MAPPING,
  CLEANSHELF_CUSTOMER_CODES,
  JAZARIBU_CUSTOMER_CODES,
  CUSTOMER_CONFIG,
  getFGCode,
  getProductName,

  // Config getters
  getConfig: () => ({
    DEFAULT_SETTINGS,
    PERFORMANCE_SETTINGS,
    VALIDATION_SETTINGS,
  }),
};
