import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";

// Configuration from environment variables
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

const parseJazaribuItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_JAZARIBU_ITEM_CODE_MAPPING ||
    "JT01093:FG027,JT01098:FG015,JT01090:FG030,JT01094:FG017,JT01091:FG031,JT01097:FG018,JT01100:FG006,JT01103:FG008,JT01102:FG007,JT01099:FG026";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const parseKhetiaItemCodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_KHETIA_ITEM_CODE_MAPPING ||
    "790601:FG021,416868:FG015,412818:FG017,416872:FG018,414800:FG007,414810:FG008,415591:FG027,415592:FG030,410955:FG031,419349:FG006,413981:FG003,415596:FG026,410643:FG013";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const parseMajidBarcodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_MAJID_BARCODE_MAPPING ||
    "6161102320404:FG027,6161102320305:FG008,6164000136610:FG030,6161102320183:FG031,6161102320534:FG026,6161102320138:FG015,6161102320299:FG007,6161102320268:FG003,6161102320442:FG017,6161102320435:FG018,6161102320459:FG013";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const parseChandaranaBarcodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_CHANDARANA_BARCODE_MAPPING ||
    "6161102320459:FG013,6161102320046:FG026,6161102320138:FG015,6161102320404:FG027,6161102320299:FG007,6161102320442:FG017,6161102320183:FG031,6161102320435:FG018,6161102320169:FG030,6161102321074:FG021,6161102320268:FG003,6161102320060:FG006,6161102320305:FG008";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const parseQuickmartBarcodeMapping = () => {
  const mappingStr =
    import.meta.env.VITE_QUICKMART_BARCODE_MAPPING ||
    "6161102320459:FG013,6161102320183:FG031,6161102320169:FG030,6161102320305:FG008,6161102320442:FG017,6161102320435:FG018,6161102320268:FG003,6161102320138:FG015,6161102320060:FG006,6161102320299:FG007,6161102320046:FG026,6161102320404:FG027";

  const mapping = {};
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const ITEM_CODE_MAPPING = parseItemCodeMapping();
const ITEM_NAMES_MAPPING = parseItemNamesMapping();
const CLEANSHELF_ITEM_CODE_MAPPING = parseCleanshelfItemCodeMapping();
const JAZARIBU_ITEM_CODE_MAPPING = parseJazaribuItemCodeMapping();
const KHETIA_ITEM_CODE_MAPPING = parseKhetiaItemCodeMapping();
const MAJID_BARCODE_MAPPING = parseMajidBarcodeMapping();
const CHANDARANA_BARCODE_MAPPING = parseChandaranaBarcodeMapping();
const QUICKMART_BARCODE_MAPPING = parseQuickmartBarcodeMapping();

const getFGCode = (itemCode, customerType = "NAIVAS") => {
  if (customerType === "CLEANSHELF") {
    return CLEANSHELF_ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "JAZARIBU") {
    return JAZARIBU_ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "KHETIA") {
    return KHETIA_ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "MAJID") {
    return MAJID_BARCODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "CHANDARANA") {
    return CHANDARANA_BARCODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  if (customerType === "QUICKMART") {
    return QUICKMART_BARCODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
  }
  return ITEM_CODE_MAPPING[itemCode] || `UNKNOWN_${itemCode}`;
};

const getProductName = (itemCode, customerType = "NAIVAS") => {
  if (customerType === "CLEANSHELF") {
    return `Cleanshelf Product ${itemCode}`;
  }
  if (customerType === "JAZARIBU") {
    return `Jazaribu Product ${itemCode}`;
  }
  if (customerType === "KHETIA") {
    return `Khetia Product ${itemCode}`;
  }
  if (customerType === "MAJID") {
    return `Majid Product ${itemCode}`;
  }
  if (customerType === "CHANDARANA") {
    return `Chandarana Product ${itemCode}`;
  }
  if (customerType === "QUICKMART") {
    return `Quickmart Product ${itemCode}`;
  }
  return ITEM_NAMES_MAPPING[itemCode] || `Product ${itemCode}`;
};

// FIX: Use YOUR private API key for better speed
const OCR_SPACE_API_KEY = "K81157854088957"; // Your private key
const OCR_SPACE_URL =
  import.meta.env.VITE_OCR_SPACE_URL || "https://api.ocr.space/parse/image";

const DEFAULT_SETTINGS = {
  WAREHOUSE: import.meta.env.VITE_DEFAULT_WAREHOUSE || "Dandora",
  SELLING_PRICE_LIST:
    import.meta.env.VITE_DEFAULT_SELLING_PRICE_LIST || "Supermarkets Price",
  ORDER_TYPE: import.meta.env.VITE_DEFAULT_ORDER_TYPE || "Route",
  REMARKS: import.meta.env.VITE_DEFAULT_REMARKS || "CT226",
  IS_TOP_UP: import.meta.env.VITE_DEFAULT_IS_TOP_UP === "true",
};

const CUSTOMER_PRICE_LISTS = {
  NAIVAS: import.meta.env.VITE_NAIVAS_PRICE_LIST || "Naivas Special Price",
  CLEANSHELF:
    import.meta.env.VITE_CLEANSHELF_PRICE_LIST || "Supermarkets Price",
  JAZARIBU: import.meta.env.VITE_JAZARIBU_PRICE_LIST || "Depot Price",
  KHETIA: import.meta.env.VITE_KHETIA_PRICE_LIST || "Depot Price",
  MAJID: import.meta.env.VITE_MAJID_PRICE_LIST || "Supermarkets Price",
  CHANDARANA:
    import.meta.env.VITE_CHANDARANA_PRICE_LIST || "Supermarkets Price",
  QUICKMART: import.meta.env.VITE_QUICKMART_PRICE_LIST || "Supermarkets Price",
};

const PERFORMANCE_SETTINGS = {
  PDFJS_VERSION: import.meta.env.VITE_PDFJS_VERSION || "3.11.174",
  PRODUCT_CACHE_DURATION:
    parseInt(import.meta.env.VITE_PRODUCT_CACHE_DURATION) || 5 * 60 * 1000,
  MIN_TEXT_LENGTH: parseInt(import.meta.env.VITE_MIN_TEXT_LENGTH) || 50,
};

const VALIDATION_SETTINGS = {
  MIN_QUANTITY: parseInt(import.meta.env.VITE_MIN_QUANTITY) || 1,
  MAX_QUANTITY: parseInt(import.meta.env.VITE_MAX_QUANTITY) || 10000,
  MIN_ITEM_COUNT: parseInt(import.meta.env.VITE_MIN_ITEM_COUNT) || 1,
};

// FIX: Optimized OCR settings for speed
const getOCRSpaceConfig = () => ({
  language: import.meta.env.VITE_OCR_SPACE_LANGUAGE || "eng",
  isTable: true, // Keep true for better table parsing
  OCREngine: "2", // Engine 2 is faster and better for structured data
  isOverlayRequired: false,
  isCreateSearchablePdf: false,
  detectOrientation: false, // Disable for speed
  scale: true,
  filetype: "PNG",
});

const getTesseractConfig = () => ({
  tessedit_char_whitelist:
    "0123456789PabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -/,.",
  preserve_interword_spaces: "1",
  tessedit_pageseg_mode: "6",
  textord_tablefind_recognize_tables: "1",
});

const CLEANSHELF_CUSTOMER_CODES = [
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
  "C00501",
  "C00497",
  "C00495",
  "C04411",
  "C00502",
  "C05747",
];

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

const KHETIA_CUSTOMER_CODES = [
  "C04051",
  "C04059",
  "C04066",
  "C04062",
  "C04078",
  "C06059",
  "C04068",
  "C04428",
  "C04876",
  "C04878",
  "C04877",
  "C04874",
  "C04800",
  "C04061",
  "C04073",
  "C04873",
  "C04872",
  "C04316",
  "C07440",
  "C04053",
  "C04057",
  "C05534",
  "C04065",
  "C04072",
];

const MAJID_CUSTOMER_CODES = [
  "C01996",
  "C01998",
  "C02000",
  "C02005",
  "C02008",
  "C02004",
  "C02002",
  "C01994",
  "C04299",
  "C04347",
  "C04444",
  "C04753",
  "C05301",
  "C05392",
  "C05455",
  "C06008",
  "C06256",
  "C06529",
  "C06765",
  "C06866",
  "C07008",
  "C07070",
  "C07441",
  "C07466",
  "C07530",
  "C07551",
  "C04754",
  "C06538",
  "C06900",
];

const CHANDARANA_CUSTOMER_CODES = [
  "C00370",
  "C00379",
  "C04955",
  "C00372",
  "C05665",
  "C00387",
  "C00366",
  "C06326",
  "C00388",
  "C00382",
  "C05550",
  "C00380",
  "C00384",
  "C00361",
  "C06896",
  "C05067",
  "C00367",
  "C00376",
  "C05135",
  "C05163",
  "C00374",
  "C00392",
  "C00363",
  "C00359",
];

const QUICKMART_CUSTOMER_CODES = [
  "C03970",
  "C02842",
  "C02838",
  "C02833",
  "C04394",
  "C04124",
  "C02859",
  "C04464",
  "C05101",
  "C05098",
  "C05151",
  "C07565",
  "C05123",
  "C05062",
  "C06692",
  "C07490",
  "C02808",
  "C02810",
  "C07368",
  "C02813",
  "C02814",
  "C02817",
  "C02819",
  "C02821",
  "C02822",
  "C02824",
  "C02826",
  "C05247",
  "C04531",
  "C05879",
  "C02832",
  "C02835",
  "C02840",
  "C05230",
  "C04471",
  "C02844",
  "C06101",
  "C04348",
  "C02846",
  "C02848",
  "C02850",
  "C02852",
  "C02854",
  "C02857",
  "C05167",
  "C05746",
  "C02868",
  "C02870",
  "C02872",
  "C02874",
  "C02876",
  "C04044",
  "C04271",
  "C05006",
  "C04391",
  "C04490",
  "C06409",
  "C02828",
  "C07540",
  "C02861",
  "C04823",
];

const extractKhetiaLPONumber = (text) => {
  console.log("Extracting Khetia LPO number...");

  const pattern = /\b(\d{7})\b/;
  const match = text.match(pattern);

  if (match) {
    if (text.includes("KHETIA") || text.includes("M/609")) {
      console.log(`Khetia LPO found: ${match[1]}`);
      return match[1];
    }
  }

  console.log("No Khetia LPO found in text");
  return "UNKNOWN_LPO";
};

const extractMajidLPONumber = (text) => {
  console.log("Extracting Majid LPO number...");

  const pattern = /26\d{6}/;
  const match = text.match(pattern);

  if (match) {
    const orderPattern = /ORDER\s*:\s*(26\d{6})/i;
    const orderMatch = text.match(orderPattern);

    if (orderMatch) {
      console.log(`Majid LPO found: ${orderMatch[1]}`);
      return orderMatch[1];
    }

    console.log(`Majid LPO found: ${match[0]}`);
    return match[0];
  }

  console.log("No Majid LPO found in text");
  return "UNKNOWN_LPO";
};

// FIX: Updated Chandarana LPO extraction
const extractChandaranaLPONumber = (text) => {
  console.log("Extracting Chandarana LPO number...");

  // Look for 20xxxxxxxxxxx pattern (13 digits starting with 20)
  const pattern = /20\d{11}/;
  const match = text.match(pattern);

  if (match) {
    const orderPattern = /Order\s*No\.\s*:\s*&?\s*Date\s*-\s*(20\d{11})/i;
    const orderMatch = text.match(orderPattern);

    if (orderMatch) {
      console.log(`Chandarana LPO found: ${orderMatch[1]}`);
      return orderMatch[1];
    }

    console.log(`Chandarana LPO found: ${match[0]}`);
    return match[0];
  }

  console.log("No Chandarana LPO found in text");
  return "UNKNOWN_LPO";
};

const extractQuickmartLPONumber = (text) => {
  console.log("Extracting Quickmart LPO number...");

  const pattern = /\d{3}-\d{8}/;
  const match = text.match(pattern);

  if (match) {
    if (text.includes("QUICK MART") || text.includes("052-00059738")) {
      console.log(`Quickmart LPO found: ${match[0]}`);
      return match[0];
    }
  }

  const noDashPattern = /\b\d{11}\b/;
  const noDashMatch = text.match(noDashPattern);

  if (noDashMatch && text.includes("QUICK MART")) {
    console.log(`Quickmart LPO found: ${noDashMatch[0]}`);
    return noDashMatch[0];
  }

  console.log("No Quickmart LPO found in text");
  return "UNKNOWN_LPO";
};

const CUSTOMER_CONFIG = {
  NAIVAS: {
    name: "Naivas",
    priceList: CUSTOMER_PRICE_LISTS.NAIVAS,
    itemCodePattern: /(135\d{5}|N\d{6})/,
    lpoPattern: /P\d{9}(?:-\d+)?/,
    codeMappings: ITEM_CODE_MAPPING,
    nameMappings: ITEM_NAMES_MAPPING,
  },
  CLEANSHELF: {
    name: "Cleanshelf",
    priceList: CUSTOMER_PRICE_LISTS.CLEANSHELF,
    itemCodePattern: /4003\d{2}/,
    lpoPattern: /\b\d{5,6}\b/,
    codeMappings: CLEANSHELF_ITEM_CODE_MAPPING,
    nameMappings: {},
  },
  JAZARIBU: {
    name: "Jazaribu",
    priceList: CUSTOMER_PRICE_LISTS.JAZARIBU,
    itemCodePattern: /JT\d{5}/,
    lpoPattern: /PO-J\d{3}-\d{6}/,
    codeMappings: JAZARIBU_ITEM_CODE_MAPPING,
    nameMappings: {},
  },
  KHETIA: {
    name: "Khetia",
    priceList: CUSTOMER_PRICE_LISTS.KHETIA,
    itemCodePattern: /\b\d{6}\b/,
    lpoPattern: /\b\d{7}\b/,
    codeMappings: KHETIA_ITEM_CODE_MAPPING,
    nameMappings: {},
    extractLPO: extractKhetiaLPONumber,
  },
  MAJID: {
    name: "Majid",
    priceList: CUSTOMER_PRICE_LISTS.MAJID,
    itemCodePattern: /\b\d{13}\b/,
    lpoPattern: /26\d{6}/,
    codeMappings: MAJID_BARCODE_MAPPING,
    nameMappings: {},
    extractLPO: extractMajidLPONumber,
  },
  CHANDARANA: {
    name: "Chandarana",
    priceList: CUSTOMER_PRICE_LISTS.CHANDARANA,
    itemCodePattern: /\b\d{13}\b/,
    lpoPattern: /20\d{11}/,
    codeMappings: CHANDARANA_BARCODE_MAPPING,
    nameMappings: {},
    extractLPO: extractChandaranaLPONumber,
  },
  QUICKMART: {
    name: "Quickmart",
    priceList: CUSTOMER_PRICE_LISTS.QUICKMART,
    itemCodePattern: /\b\d{13}\b/,
    lpoPattern: /\d{3}-\d{8}/,
    codeMappings: QUICKMART_BARCODE_MAPPING,
    nameMappings: {},
    extractLPO: extractQuickmartLPONumber,
  },
};

let cachedProducts = {
  NAIVAS: null,
  CLEANSHELF: null,
  JAZARIBU: null,
  KHETIA: null,
  MAJID: null,
  CHANDARANA: null,
  QUICKMART: null,
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

const getNaivasProducts = () => getProductsByCustomer("NAIVAS");

const extractTextFromPDF = async (pdfFile) => {
  try {
    console.log("Extracting text from PDF using PDF.js...");

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await pdfFile.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    console.log(`PDF loaded: ${pdf.numPages} pages`);

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items.map((item) => item.str).join(" ");

      fullText += pageText + "\n\n";

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

// FIX: Optimized OCR function with your private key
const extractTextWithOCRSpace = async (imageFile) => {
  try {
    console.log("Using OCR.Space API with private key...");

    // Use file upload instead of base64 for better performance
    const formData = new FormData();
    formData.append("file", imageFile);
    
    const ocrConfig = getOCRSpaceConfig();
    
    formData.append("language", ocrConfig.language);
    formData.append("isTable", ocrConfig.isTable ? "true" : "false");
    formData.append("OCREngine", ocrConfig.OCREngine);
    formData.append("scale", "true");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "false");
    formData.append("isCreateSearchablePdf", "false");

    // Set timeout for faster failover
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds

    console.time("OCR_Space_API_Call");
    
    const response = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: {
        apikey: OCR_SPACE_API_KEY,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.timeEnd("OCR_Space_API_Call");

    if (!response.ok) {
      throw new Error(`OCR.Space API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(
        "OCR processing failed: " + (result.ErrorMessage || "Unknown error"),
      );
    }

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
    
    if (error.name === 'AbortError') {
      throw new Error("OCR.Space timeout - took too long to respond");
    }
    
    throw error;
  }
};

const cleanOCRText = (text) => {
  console.log("Cleaning OCR text...");
  console.log("Original text sample:", text.substring(0, 200));

  let cleaned = text;

  cleaned = cleaned.replace(/NO51055/g, "N051055");
  cleaned = cleaned.replace(/NO51056/g, "N051056");
  cleaned = cleaned.replace(/N05105O/g, "N051055");
  cleaned = cleaned.replace(/N05105o/g, "N051055");
  cleaned = cleaned.replace(/[HM]051055/g, "N051055");
  cleaned = cleaned.replace(/[HM]051056/g, "N051056");
  cleaned = cleaned.replace(/IN051055/g, "N051055");
  cleaned = cleaned.replace(/IN051056/g, "N051056");
  cleaned = cleaned.replace(/N\s+051055/g, "N051055");
  cleaned = cleaned.replace(/N\s+051056/g, "N051056");
  cleaned = cleaned.replace(/\b051055\b/g, "N051055");
  cleaned = cleaned.replace(/\b051056\b/g, "N051056");
  cleaned = cleaned.replace(/n051055/g, "N051055");
  cleaned = cleaned.replace(/n051056/g, "N051056");
  cleaned = cleaned.replace(/N-051055/g, "N051055");
  cleaned = cleaned.replace(/N-051056/g, "N051056");
  cleaned = cleaned.replace(/N\.051055/g, "N051055");
  cleaned = cleaned.replace(/N\.051056/g, "N051056");
  cleaned = cleaned.replace(/N 051055/g, "N051055");
  cleaned = cleaned.replace(/N 051056/g, "N051056");

  const isKhetiaText = /KHETIA DRAPERS LTD|790601|416868|412818|416872/i.test(
    cleaned,
  );

  const isQuickmartText = /QUICK MART|052-00059738|700183|700001|700009/i.test(
    cleaned,
  );

  const isMajidText = /ORDER\s*:\s*26\d{6}|MAJID|616110232/i.test(cleaned);

  const isChandaranaText = /CHANDARANA|20\d{11}|616110232/i.test(cleaned);

  const isJazaribuText = /JAZARIBU|JT\d{5}|PO-J\d{3}-\d{6}/i.test(text);

  const isCleanshelfText =
    /(CLEAN\s*SHELF|FRESHMARKET|LOCAL PURCHASE ORDER|4003\d{2})/i.test(text);

  if (isKhetiaText) {
    console.log("Detected Khetia text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".")
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2");

    console.log("Khetia cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  if (isQuickmartText) {
    console.log("Detected Quickmart text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".")
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2");

    console.log("Quickmart cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  if (isMajidText) {
    console.log("Detected Majid text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".");

    console.log("Majid cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  if (isChandaranaText) {
    console.log("Detected Chandarana text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".");

    console.log("Chandarana cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  if (isJazaribuText) {
    console.log("Detected Jazaribu text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".")
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2")
      .replace(/(\d+\.\d{3})(4003\d{2})/g, "$1 $2");

    console.log("Jazaribu cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  if (isCleanshelfText) {
    console.log("Detected Cleanshelf text, preserving newlines...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".")
      .replace(/(\d+\.\d{2})(\d+\.\d{3})/g, "$1 $2")
      .replace(/(\d+\.\d{3})(4003\d{2})/g, "$1 $2");

    console.log("Cleanshelf cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  }

  const isCopyPasteFormat = /135\d{5}\s+\d{13}\s+(?:SUPA|FRESH)/i.test(text);

  if (isCopyPasteFormat) {
    console.log("Detected copy-paste format, using special cleaning...");

    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(/\n\s*\n/g, "\n");

    cleaned = cleaned.replace(/(135\d{5})(\d{13})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d{13})/g, "$1 $2");

    cleaned = cleaned
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".");

    console.log("Copy-paste cleaned text sample:", cleaned.substring(0, 200));
    return cleaned;
  } else {
    cleaned = cleaned
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n");

    cleaned = cleaned.replace(/(135\d{5})(\d{13})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d{13})/g, "$1 $2");

    cleaned = cleaned.replace(/(\d+\.\d{2})(\d+\.\d{2,3})(\d{6})/g, "$1 $2 $3");
    cleaned = cleaned.replace(/(\d+\.\d{2})(\d+\.\d{2,3})(\d+)/g, "$1 $2 $3");

    cleaned = cleaned.replace(/(135\d{5})(\d+\.\d{2})/g, "$1 $2");
    cleaned = cleaned.replace(/(N\d{6})(\d+\.\d{2})/g, "$1 $2");

    cleaned = cleaned
      .replace(/[|]/g, " ")
      .replace(/[`'"]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/\s*\.\s*/g, ".");

    console.log(
      "Original format cleaned text sample:",
      cleaned.substring(0, 200),
    );
  }

  return cleaned;
};

const detectCustomerTypeByCode = (customerCode = null, text = "") => {
  console.log("Checking customer type by code");
  console.log("Customer code provided:", customerCode);

  if (!customerCode) {
    console.log("No customer code provided, checking text indicators...");

    if (/KHETIA DRAPERS LTD|790601|416868|412818|416872/i.test(text)) {
      console.log("Detected Khetia from text indicators");
      return "KHETIA";
    }

    if (/QUICK MART|052-00059738|700183|700001|700009/i.test(text)) {
      console.log("Detected Quickmart from text indicators");
      return "QUICKMART";
    }

    if (/ORDER\s*:\s*26\d{6}|MAJID/i.test(text)) {
      console.log("Detected Majid from text indicators");
      return "MAJID";
    }

    if (/CHANDARANA|20\d{11}/i.test(text)) {
      console.log("Detected Chandarana from text indicators");
      return "CHANDARANA";
    }

    if (/JAZARIBU|JT\d{5}|PO-J\d{3}-\d{6}/i.test(text)) {
      console.log("Detected Jazaribu from text indicators");
      return "JAZARIBU";
    }

    if (
      /(CLEAN\s*SHELF|FRESHMARKET|LOCAL PURCHASE ORDER|4003\d{2})/i.test(text)
    ) {
      console.log("Detected Cleanshelf from text indicators");
      return "CLEANSHELF";
    }

    console.log("No specific indicators found, defaulting to NAIVAS");
    return "NAIVAS";
  }

  if (CLEANSHELF_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Cleanshelf list`);
    return "CLEANSHELF";
  }

  if (JAZARIBU_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Jazaribu list`);
    return "JAZARIBU";
  }

  if (KHETIA_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Khetia list`);
    return "KHETIA";
  }

  if (MAJID_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Majid list`);
    return "MAJID";
  }

  if (CHANDARANA_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Chandarana list`);
    return "CHANDARANA";
  }

  if (QUICKMART_CUSTOMER_CODES.includes(customerCode)) {
    console.log(`Customer code ${customerCode} is in Quickmart list`);
    return "QUICKMART";
  }

  console.log(
    `Customer code ${customerCode} is not in any special lists, defaulting to NAIVAS`,
  );
  return "NAIVAS";
};

const detectTextFormat = (text, customerType = "NAIVAS") => {
  const cleaned = text.toLowerCase();

  console.log("Text for format detection:", cleaned.substring(0, 200));

  if (customerType === "KHETIA") {
    if (
      cleaned.includes("khetia drapers ltd") ||
      cleaned.includes("790601") ||
      cleaned.includes("416868") ||
      cleaned.includes("412818")
    ) {
      console.log("Detected Khetia copy-paste format");
      return "KHETIA_COPY_PASTE";
    }
  }

  if (customerType === "QUICKMART") {
    if (
      cleaned.includes("quick mart") ||
      cleaned.includes("052-00059738") ||
      cleaned.includes("700183") ||
      cleaned.includes("700001")
    ) {
      console.log("Detected Quickmart copy-paste format");
      return "QUICKMART_COPY_PASTE";
    }
  }

  if (customerType === "MAJID") {
    if (
      cleaned.includes("order : 26") ||
      cleaned.includes("order: 26") ||
      /26\d{6}/.test(cleaned)
    ) {
      console.log("Detected Majid screenshot format");
      return "MAJID_SCREENSHOT";
    }
  }

  if (customerType === "CHANDARANA") {
    if (
      cleaned.includes("chandarana") ||
      /20\d{11}/.test(cleaned) ||
      cleaned.includes("order : 20")
    ) {
      console.log("Detected Chandarana screenshot format");
      return "CHANDARANA_SCREENSHOT";
    }
  }

  if (customerType === "JAZARIBU") {
    if (
      cleaned.includes("jazaribu") ||
      cleaned.includes("jt0") ||
      cleaned.includes("po-j") ||
      cleaned.includes("supa loaf white bread") ||
      cleaned.includes("supa butter toast loaf")
    ) {
      console.log("Detected Jazaribu standard format");
      return "JAZARIBU_STANDARD";
    }
  }

  if (customerType === "CLEANSHELF") {
    if (
      cleaned.includes("local purchase order") ||
      cleaned.includes("code description pieces unit price amount pack")
    ) {
      console.log("Detected Cleanshelf LOCAL PURCHASE ORDER");
      return "CLEANSHELF_LOCAL_PO";
    }

    if (
      cleaned.includes("pending purchase orders") ||
      cleaned.includes("outstanding qty") ||
      cleaned.includes("orderd qty") ||
      cleaned.includes("orderd qty.f") ||
      (cleaned.includes("4003") && cleaned.includes("supa"))
    ) {
      console.log("Detected Cleanshelf PENDING_ORDERS");
      return "CLEANSHELF_PENDING_ORDERS";
    }

    if (
      cleaned.includes("clean shelf") &&
      cleaned.includes("freshmarket") &&
      cleaned.includes("pending purchase orders") &&
      cleaned.includes("4003")
    ) {
      console.log("Detected Cleanshelf COPY_PASTE_TEXT");
      return "CLEANSHELF_COPY_PASTE_TEXT";
    }
  }

  if (customerType === "NAIVAS") {
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
      console.log("Detected copy-paste text format");
      return "COPY_PASTE_TEXT";
    }

    const hasDetailedPOFormat =
      cleaned.includes("p.o. date:") &&
      cleaned.includes("ship to:") &&
      cleaned.includes("sub total") &&
      (cleaned.includes("purchase order") || cleaned.includes("purchaseorder"));

    if (hasDetailedPOFormat) {
      console.log("Detected detailed PO with descriptions");
      return "DETAILED_PO";
    }

    if (
      /p\d{9}.*mini.*bakeries.*nbi/i.test(cleaned) &&
      /item.*number.*quantity/i.test(cleaned)
    ) {
      console.log("Detected specific format");
      return "SPECIFIC_FORMAT";
    }

    if (cleaned.includes("item number") && cleaned.includes("quantity")) {
      console.log("Detected simple tabular");
      return "SIMPLE_TABULAR";
    }

    if (
      cleaned.includes("line number") &&
      cleaned.includes("item number") &&
      cleaned.includes("quantity")
    ) {
      console.log("Detected tabular with headers");
      return "TABULAR_WITH_HEADERS";
    }

    if (
      cleaned.includes("item code") &&
      cleaned.includes("quantity") &&
      cleaned.includes("unit price")
    ) {
      console.log("Detected standard PO");
      return "STANDARD_PO";
    }

    const itemCodePattern = /(135\d{5}|N\d{6})\D+?(\d+(?:\.\d{2})?)/g;
    const matches = text.match(itemCodePattern);
    if (matches && matches.length >= 2) {
      console.log("Detected simple list with", matches.length, "items");
      return "SIMPLE_LIST";
    }

    const csvPattern = /\d+\t+(135\d{5}|N\d{6})\t+\d+(?:\.\d{2})?\t+/;
    if (csvPattern.test(text)) {
      console.log("Detected Excel/CSV copy-paste");
      return "EXCEL_COPY_PASTE";
    }
  }

  console.log("Detected unknown format, using robust parsing");
  return "UNKNOWN";
};

// FIX 3: Khetia - Fixed quantity parsing to get actual order quantity
const parseKhetiaFormat = (text) => {
  console.log("Parsing Khetia format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  const seenCodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (
      !line ||
      line.includes("KHETIA DRAPERS LTD") ||
      line.includes("M/609") ||
      line.includes("MINI BAKERIES") ||
      line.includes("P.O.BOX") ||
      line.includes("Supaloaf Complex") ||
      line.includes("Kangundo Road") ||
      line.includes("operations@minibake.com") ||
      line.includes("Bernice") ||
      line.includes("KES - Kenyan") ||
      line.includes("Shillings") ||
      line.includes("KHETIA'S KAHAWA SUPERMARKET") ||
      line.includes("0731-999903") ||
      line.includes("WEKALAMOYO") ||
      line.length < 10
    ) {
      continue;
    }

    console.log("Processing Khetia line:", line);

    const itemCodeMatch = line.match(/\b(\d{6})\b/);
    if (!itemCodeMatch) {
      continue;
    }

    const itemCode = itemCodeMatch[1];

    if (seenCodes.has(itemCode)) {
      console.log(`Skipping duplicate Khetia code: ${itemCode}`);
      continue;
    }

    console.log(`Found Khetia item code: ${itemCode} in line: ${line}`);

    const parts = line.split(/\s+/);

    console.log(`Line parts (${parts.length}):`, parts);

    let quantity = null;
    
    // FIX: Get the actual order quantity (e.g., 12.00) not the pack size (1)
    // Look for the decimal number before the last "PCS"
    for (let j = parts.length - 2; j >= 0; j--) {
      if (parts[j] === "PCS" && j > 0 && /^\d+\.\d{2}$/.test(parts[j-1])) {
        quantity = parseFloat(parts[j-1]);
        console.log(`Found quantity for ${itemCode}: ${quantity} (actual order quantity)`);
        break;
      }
    }
    
    // Fallback: Look for any decimal number that could be quantity
    if (quantity === null) {
      for (let j = parts.length - 1; j >= 0; j--) {
        if (/^\d+\.\d{2}$/.test(parts[j])) {
          const potentialQty = parseFloat(parts[j]);
          // Check if it's a reasonable quantity (not a price)
          if (potentialQty >= 1 && potentialQty <= 1000) {
            quantity = potentialQty;
            console.log(`Found quantity for ${itemCode}: ${quantity} (fallback)`);
            break;
          }
        }
      }
    }

    let description = "";
    const codeIndex = parts.indexOf(itemCode);
    if (codeIndex !== -1 && codeIndex < parts.length - 3) {
      for (let j = codeIndex + 1; j < parts.length; j++) {
        if (/^\d+\.\d{2}$/.test(parts[j])) {
          break;
        }
        description += parts[j] + " ";
      }
      description = description.trim();
    }

    if (
      quantity !== null &&
      !isNaN(quantity) &&
      KHETIA_ITEM_CODE_MAPPING[itemCode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
    ) {
      seenCodes.add(itemCode);

      items.push({
        ocrItemCode: itemCode,
        actualItemCode: KHETIA_ITEM_CODE_MAPPING[itemCode],
        quantity: Math.round(quantity),
        foundQuantity: quantity,
        productName: description || `Khetia Product ${itemCode}`,
        method: "khetia_format",
        lineNumber: i + 1,
        rawLine: line.substring(0, 100),
      });
      console.log(
        `Khetia: ${itemCode} -> ${KHETIA_ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
      );
    } else {
      console.log(`Could not parse quantity for ${itemCode}:`, {
        quantityFound: quantity,
        hasMapping: KHETIA_ITEM_CODE_MAPPING[itemCode],
        linePreview: line.substring(0, 100),
      });
    }
  }

  console.log(`Total Khetia items parsed: ${items.length}`);
  return items;
};

const parseQuickmartFormat = (text) => {
  console.log("Parsing Quickmart format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  const seenBarcodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (
      !line ||
      line.includes("QUICK MART") ||
      line.includes("052-00059738") ||
      line.includes("M/028") ||
      line.includes("MINI BAKERIES") ||
      line.includes("NAIROBI LIMITED") ||
      line.includes("23/01/2026") ||
      line.includes("0 Days") ||
      line.includes("KES - Kenya Shilings") ||
      line.includes("by  on") ||
      line.length < 10
    ) {
      continue;
    }

    console.log("Processing Quickmart line:", line);

    const barcodeMatch = line.match(/\b(\d{13})\b/);
    if (!barcodeMatch) {
      continue;
    }

    const barcode = barcodeMatch[1];

    if (seenBarcodes.has(barcode)) {
      console.log(`Skipping duplicate Quickmart barcode: ${barcode}`);
      continue;
    }

    console.log(`Found Quickmart barcode: ${barcode} in line: ${line}`);

    const parts = line.split(/\s+/);

    let quantity = null;
    let barcodeIndex = parts.indexOf(barcode);

    if (barcodeIndex !== -1) {
      for (let j = barcodeIndex + 1; j < parts.length; j++) {
        const part = parts[j];
        if (/^\d+\.\d{2}$/.test(part)) {
          quantity = parseFloat(part);
          console.log(`Found quantity for ${barcode}: ${quantity}`);
          break;
        }
      }
    }

    if (quantity === null) {
      const pattern = new RegExp(
        `${barcode}\\s+.+?\\s+(\\d+\\.\\d{2})\\s+\\d+\\.\\d{2}\\s+PCS\\s+1\\s+PCS\\s+[\\d,]+\\.\\d{2}`,
      );
      const match = line.match(pattern);
      if (match) {
        quantity = parseFloat(match[1]);
        console.log(`Found quantity for ${barcode}: ${quantity}`);
      }
    }

    let description = "";
    if (barcodeIndex !== -1 && barcodeIndex < parts.length - 1) {
      for (let j = barcodeIndex + 1; j < parts.length; j++) {
        if (/^\d+\.\d{2}$/.test(parts[j])) {
          break;
        }
        description += parts[j] + " ";
      }
      description = description.trim();
    }

    if (
      quantity !== null &&
      !isNaN(quantity) &&
      QUICKMART_BARCODE_MAPPING[barcode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
    ) {
      seenBarcodes.add(barcode);

      items.push({
        ocrItemCode: barcode,
        actualItemCode: QUICKMART_BARCODE_MAPPING[barcode],
        quantity: Math.round(quantity),
        foundQuantity: quantity,
        productName: description || `Quickmart Product ${barcode}`,
        method: "quickmart_format",
        lineNumber: i + 1,
        rawLine: line.substring(0, 100),
      });
      console.log(
        `Quickmart: ${barcode} -> ${QUICKMART_BARCODE_MAPPING[barcode]} x ${quantity}`,
      );
    } else {
      console.log(`Could not parse quantity for ${barcode}:`, {
        quantityFound: quantity,
        hasMapping: QUICKMART_BARCODE_MAPPING[barcode],
        linePreview: line.substring(0, 100),
      });
    }
  }

  console.log(`Total Quickmart items parsed: ${items.length}`);

  if (items.length === 0) {
    console.log("Trying regex pattern matching for Quickmart...");

    const pattern =
      /\b\d{6}\s+(\d{13})\s+(.+?)\s+(\d+\.\d{2})\s+\d+\.\d{2}\s+PCS\s+1\s+PCS\s+[\d,]+\\.\d{2}/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const barcode = match[1];
      const description = match[2];
      const quantity = parseFloat(match[3]);

      if (
        QUICKMART_BARCODE_MAPPING[barcode] &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
      ) {
        if (!seenBarcodes.has(barcode)) {
          seenBarcodes.add(barcode);
          items.push({
            ocrItemCode: barcode,
            actualItemCode: QUICKMART_BARCODE_MAPPING[barcode],
            quantity: Math.round(quantity),
            foundQuantity: quantity,
            productName: description,
            method: "quickmart_regex",
            rawLine: match[0].substring(0, 100),
          });
          console.log(
            `Quickmart: ${barcode} -> ${QUICKMART_BARCODE_MAPPING[barcode]} x ${quantity}`,
          );
        }
      }
    }
  }

  return items;
};

// FIX 1: Majid - Fixed quantity parsing for merged header+data lines
const parseMajidFormat = (text) => {
  console.log("Parsing Majid format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  const seenBarcodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (
      !line ||
      line.includes("ORDER :") ||
      line.includes("MAJID") ||
      line.includes("SCREENSHOT") ||
      line.includes("QTY UC") ||
      line.length < 10
    ) {
      continue;
    }

    console.log("Processing Majid line:", line);

    // FIX: Handle the special case where header is merged with first data row
    const hasHeaderInLine = line.includes("BAR CODE") && line.includes("SUPPLIER REF");
    
    if (hasHeaderInLine) {
      console.log("Detected merged header+data line, extracting quantity...");
      
      // Example: "BAR CODE SUPPLIER REF EAM.ITEM DESCRITION OTY UC IP.PRI B.TAX  TOTAL B.6161102320404 000074580 009 SUPALOAE WHITE SLICED BREAD CT 400G 15  57.900 868.5"
      
      // Find barcode
      const barcodeMatch = line.match(/\b(\d{13})\b/);
      if (!barcodeMatch) continue;
      
      const barcode = barcodeMatch[1];
      
      if (seenBarcodes.has(barcode)) {
        console.log(`Skipping duplicate Majid barcode: ${barcode}`);
        continue;
      }
      
      console.log(`Found Majid barcode in merged line: ${barcode} in line: ${line}`);
      
      // Extract quantity - look for number after barcode and description
      // The pattern is: barcode supplier_ref fam description quantity price total
      const parts = line.split(/\s+/);
      let quantity = null;
      
      // Method 1: Look for a standalone number (not part of barcode or price)
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === barcode) {
          // Look forward for a standalone number that could be quantity
          for (let k = j + 1; k < parts.length; k++) {
            const num = parseInt(parts[k]);
            if (!isNaN(num) && num >= 1 && num <= 1000 && parts[k].length <= 4) {
              // Make sure it's not part of a barcode or price
              const isBarcode = /\d{13}/.test(parts[k]);
              const isPrice = /^\d+\.\d{3}$/.test(parts[k]);
              if (!isBarcode && !isPrice) {
                quantity = num;
                console.log(`Found quantity for ${barcode} in merged line: ${quantity}`);
                break;
              }
            }
          }
          break;
        }
      }
      
      // Method 2: Try regex pattern for the merged format
      if (quantity === null) {
        const pattern = new RegExp(`${barcode}\\s+\\d+\\s+\\d+\\s+.+?\\s+(\\d+)\\s+\\d+\\.\\d{3}`);
        const match = line.match(pattern);
        if (match) {
          quantity = parseInt(match[1]);
          console.log(`Found quantity for ${barcode} via regex: ${quantity}`);
        }
      }
      
      if (quantity !== null && !isNaN(quantity) && MAJID_BARCODE_MAPPING[barcode]) {
        seenBarcodes.add(barcode);
        items.push({
          ocrItemCode: barcode,
          actualItemCode: MAJID_BARCODE_MAPPING[barcode],
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: `Majid Product ${barcode}`,
          method: "majid_merged_header_format",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(`Majid: ${barcode} -> ${MAJID_BARCODE_MAPPING[barcode]} x ${quantity}`);
        continue;
      }
    }

    // Normal line parsing (non-merged lines)
    const barcodeMatch = line.match(/\b(\d{13})\b/);
    if (!barcodeMatch) {
      continue;
    }

    const barcode = barcodeMatch[1];

    if (seenBarcodes.has(barcode)) {
      console.log(`Skipping duplicate Majid barcode: ${barcode}`);
      continue;
    }

    console.log(`Found Majid barcode: ${barcode} in line: ${line}`);

    let quantity = null;

    // Look for quantity patterns
    const qtyPattern = /QTY\s*UC:\s*(\d+)/i;
    const qtyMatch = line.match(qtyPattern);

    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      console.log(`Found quantity from QTY UC column for ${barcode}: ${quantity}`);
    }

    if (quantity === null) {
      // Look for standalone numbers that could be quantities
      const numbers = line.match(/\b(\d+)\b/g);
      if (numbers) {
        for (const numStr of numbers) {
          if (numStr === barcode) continue;

          const num = parseInt(numStr, 10);
          if (num >= 1 && num <= 1000 && numStr.length <= 4) {
            const contextBefore = line.substring(0, line.indexOf(numStr));
            const contextAfter = line.substring(
              line.indexOf(numStr) + numStr.length,
            );

            // Check if this number is likely a quantity (not part of barcode, not a price)
            const isPrice = /^\d+\.\d{3}$/.test(numStr);
            const isInBarcode = line.includes(numStr + barcode) || line.includes(barcode + numStr);
            
            if (!isPrice && !isInBarcode) {
              quantity = num;
              console.log(`Found quantity for ${barcode}: ${quantity}`);
              break;
            }
          }
        }
      }
    }

    if (
      quantity !== null &&
      !isNaN(quantity) &&
      MAJID_BARCODE_MAPPING[barcode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
    ) {
      seenBarcodes.add(barcode);

      items.push({
        ocrItemCode: barcode,
        actualItemCode: MAJID_BARCODE_MAPPING[barcode],
        quantity: Math.round(quantity),
        foundQuantity: quantity,
        productName: `Majid Product ${barcode}`,
        method: "majid_format",
        lineNumber: i + 1,
        rawLine: line.substring(0, 100),
      });
      console.log(
        `Majid: ${barcode} -> ${MAJID_BARCODE_MAPPING[barcode]} x ${quantity}`,
      );
    } else {
      console.log(`Could not parse quantity for ${barcode}:`, {
        quantityFound: quantity,
        hasMapping: MAJID_BARCODE_MAPPING[barcode],
        linePreview: line.substring(0, 100),
      });
    }
  }

  console.log(`Total Majid items parsed: ${items.length}`);

  // Try regex pattern matching for tabular data
  if (items.length === 0) {
    console.log("Trying regex pattern matching for Majid...");

    // Pattern for lines with barcode and quantity
    const pattern = /\b(\d{13})\b.*?(\d+)\s+\d+\.\d{3}/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const barcode = match[1];
      const quantity = parseInt(match[2], 10);

      if (
        MAJID_BARCODE_MAPPING[barcode] &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
      ) {
        if (!seenBarcodes.has(barcode)) {
          seenBarcodes.add(barcode);
          items.push({
            ocrItemCode: barcode,
            actualItemCode: MAJID_BARCODE_MAPPING[barcode],
            quantity: Math.round(quantity),
            foundQuantity: quantity,
            productName: `Majid Product ${barcode}`,
            method: "majid_regex",
            rawLine: match[0].substring(0, 100),
          });
          console.log(
            `Majid: ${barcode} -> ${MAJID_BARCODE_MAPPING[barcode]} x ${quantity}`,
          );
        }
      }
    }
  }

  return items;
};

// FIX: Updated Chandarana parsing for table format
const parseChandaranaFormat = (text) => {
  console.log("Parsing Chandarana format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  const seenBarcodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip header lines and empty lines
    if (
      !line ||
      line.includes("CHANDARANA") ||
      line.includes("PURCHASE ORDER") ||
      line.includes("S.No. Bar Code") ||
      line.includes("Description") ||
      line.includes("Scan Qty") ||
      line.includes("Sub Total") ||
      line.includes("Purchase Order Net Value") ||
      line.includes("Signature") ||
      line.length < 10
    ) {
      continue;
    }

    console.log("Processing Chandarana line:", line);

    // Look for barcode pattern (13 digits)
    const barcodeMatch = line.match(/\b(\d{13})\b/);
    if (!barcodeMatch) {
      continue;
    }

    const barcode = barcodeMatch[1];

    if (seenBarcodes.has(barcode)) {
      console.log(`Skipping duplicate Chandarana barcode: ${barcode}`);
      continue;
    }

    console.log(`Found Chandarana barcode: ${barcode} in line: ${line}`);

    // Extract quantity - look for decimal numbers after barcode
    let quantity = null;
    
    // Method 1: Look for pattern like "4.00 0.00 1 4.00"
    const decimalPattern = /(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2})/;
    const decimalMatch = line.match(decimalPattern);
    
    if (decimalMatch) {
      // First decimal is Scan Qty (e.g., 4.00)
      quantity = parseFloat(decimalMatch[1]);
      console.log(`Found quantity for ${barcode}: ${quantity} (from Scan Qty)`);
    }
    
    // Method 2: Look for the first decimal number after barcode
    if (quantity === null) {
      const parts = line.split(/\s+/);
      const barcodeIndex = parts.indexOf(barcode);
      
      if (barcodeIndex !== -1) {
        for (let j = barcodeIndex + 1; j < parts.length; j++) {
          if (/^\d+\.\d{2}$/.test(parts[j])) {
            quantity = parseFloat(parts[j]);
            console.log(`Found quantity for ${barcode}: ${quantity} (first decimal after barcode)`);
            break;
          }
        }
      }
    }

    // Method 3: Try regex pattern for table format
    if (quantity === null) {
      const pattern = new RegExp(`${barcode}\\s+.+?\\s+(\\d+\\.\\d{2})\\s+\\d+\\.\\d{2}\\s+\\d+\\s+\\d+\\.\\d{2}`);
      const match = line.match(pattern);
      if (match) {
        quantity = parseFloat(match[1]);
        console.log(`Found quantity for ${barcode}: ${quantity} (table regex)`);
      }
    }

    if (
      quantity !== null &&
      !isNaN(quantity) &&
      CHANDARANA_BARCODE_MAPPING[barcode] &&
      quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
    ) {
      seenBarcodes.add(barcode);

      // Extract product description
      let productName = "";
      const parts = line.split(/\s+/);
      const barcodeIndex = parts.indexOf(barcode);
      if (barcodeIndex !== -1 && barcodeIndex < parts.length - 1) {
        // Get text between barcode and first decimal
        for (let j = barcodeIndex + 1; j < parts.length; j++) {
          if (/^\d+\.\d{2}$/.test(parts[j])) {
            break;
          }
          productName += parts[j] + " ";
        }
        productName = productName.trim();
      }

      items.push({
        ocrItemCode: barcode,
        actualItemCode: CHANDARANA_BARCODE_MAPPING[barcode],
        quantity: Math.round(quantity),
        foundQuantity: quantity,
        productName: productName || `Chandarana Product ${barcode}`,
        method: "chandarana_table_format",
        lineNumber: i + 1,
        rawLine: line.substring(0, 100),
      });
      console.log(
        `Chandarana: ${barcode} -> ${CHANDARANA_BARCODE_MAPPING[barcode]} x ${quantity}`,
      );
    } else {
      console.log(`Could not parse quantity for ${barcode}:`, {
        quantityFound: quantity,
        hasMapping: CHANDARANA_BARCODE_MAPPING[barcode],
        linePreview: line.substring(0, 100),
      });
    }
  }

  console.log(`Total Chandarana items parsed: ${items.length}`);

  // Try regex pattern matching for tabular data
  if (items.length === 0) {
    console.log("Trying regex pattern matching for Chandarana table format...");

    // Pattern for: number barcode description scan_qty foc_qty pack_size quantity
    const pattern = /\b(\d+)\s+(\d{13})\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+)\s+(\d+\.\d{2})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const barcode = match[2];
      const quantity = parseFloat(match[4]); // Scan Qty is the 4th group
      const description = match[3];

      if (
        CHANDARANA_BARCODE_MAPPING[barcode] &&
        quantity >= VALIDATION_SETTINGS.MIN_QUANTITY
      ) {
        if (!seenBarcodes.has(barcode)) {
          seenBarcodes.add(barcode);
          items.push({
            ocrItemCode: barcode,
            actualItemCode: CHANDARANA_BARCODE_MAPPING[barcode],
            quantity: Math.round(quantity),
            foundQuantity: quantity,
            productName: description,
            method: "chandarana_table_regex",
            rawLine: match[0].substring(0, 100),
          });
          console.log(
            `Chandarana: ${barcode} -> ${CHANDARANA_BARCODE_MAPPING[barcode]} x ${quantity}`,
          );
        }
      }
    }
  }

  return items;
};

const parseJazaribuFormat = (text) => {
  console.log("Parsing Jazaribu format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  const seenCodes = new Set();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

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

    const jtMatch = line.match(/(JT\d{5})/i);
    if (jtMatch) {
      const jtCode = jtMatch[1].toUpperCase();

      if (seenCodes.has(jtCode)) {
        console.log(`Skipping duplicate JT code: ${jtCode}`);
        continue;
      }

      console.log(`Found JT code: ${jtCode} in line: ${line}`);

      const parts = line.split(/\s+/);
      console.log(`Line parts (${parts.length}):`, parts);

      let quantity = null;
      let productName = "";

      for (let j = 0; j < parts.length; j++) {
        if (parts[j].toUpperCase() === "PIECES" && j > 0) {
          const qtyStr = parts[j - 1];
          quantity = parseInt(qtyStr);

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

      if (!quantity) {
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          const num = parseInt(part);
          if (!isNaN(num) && num >= 1 && num <= 20) {
            if (part.length <= 2 && j > 1) {
              const nextPart = j + 1 < parts.length ? parts[j + 1] : "";
              const prevPart = j > 0 ? parts[j - 1] : "";

              if (
                nextPart.includes(".") ||
                nextPart.toUpperCase() === "PIECES"
              ) {
                quantity = num;

                const jtIndex = parts.indexOf(jtCode);
                if (jtIndex !== -1 && jtIndex < j) {
                  const nameParts = parts.slice(jtIndex + 1, j);
                  productName = nameParts.join(" ");
                }

                console.log(
                  `Found quantity for ${jtCode}: ${quantity}, Product: ${productName}`,
                );
                break;
              }
            }
          }
        }
      }

      if (!quantity) {
        const commonQuantities = ["4", "5", "6", "8"];
        for (const qty of commonQuantities) {
          if (line.includes(` ${qty} `) || line.endsWith(` ${qty}`)) {
            quantity = parseInt(qty);
            console.log(`Found quantity for ${jtCode}: ${quantity}`);
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
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: productName || `Jazaribu Product ${jtCode}`,
          method: "jazaribu_format",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(
          `Jazaribu: ${jtCode} -> ${JAZARIBU_ITEM_CODE_MAPPING[jtCode]} x ${quantity}`,
        );
      } else {
      console.log(`Could not parse quantity for ${jtCode}:`, {
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

// FIX: Updated Cleanshelf Local PO parsing for correct quantities
const parseCleanshelfLocalPO = (text) => {
  console.log("Parsing Cleanshelf LOCAL PURCHASE ORDER format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  let inItemsSection = false;
  let foundLPO = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      continue;
    }

    // Extract LPO number (e.g., 101293)
    if (line.includes("L. P. O. No:") || line.includes("L.P.O. No:")) {
      const lpoMatch = line.match(/(\d{5,6})/);
      if (lpoMatch) {
        foundLPO = lpoMatch[0];
        console.log(`Found Cleanshelf LPO: ${foundLPO}`);
      }
    }

    if (
      line.includes("CODE DESCRIPTION") ||
      line.includes("Unit price") ||
      line.includes("Amount Pack")
    ) {
      inItemsSection = true;
      console.log("Entered items section at line:", i + 1);
      continue;
    }

    if (
      line.includes("Delivery Instructions") ||
      line.includes("Prepared By") ||
      line.includes("Authorised By")
    ) {
      inItemsSection = false;
      continue;
    }

    if (!inItemsSection) {
      continue;
    }

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

    // Fix spacing issues for better parsing
    line = line.replace(/(\d+\.\d{3})(4003\d{2})/g, "$1 $2");

    const codeMatch = line.match(/(4003\d{2})/);
    if (!codeMatch) {
      continue;
    }

    const code = codeMatch[1];
    const parts = line.split(/\s+/);

    console.log(`Parsing code ${code}, parts:`, parts);

    // FIX: The quantity is the number BEFORE the price
    // Format: 400347 SUPALOAF WHITE 600GM 1 15 88.700 1,330.50
    // Code = 400347, Quantity = 15 (before 88.700)
    
    let quantity = null;
    
    // Find the price pattern (like 88.700, 117.000, 57.900)
    for (let j = 0; j < parts.length; j++) {
      if (/^\d+\.\d{3}$/.test(parts[j])) {
        // Found price, quantity should be before it
        if (j > 0) {
          const potentialQty = parseFloat(parts[j-1]);
          if (!isNaN(potentialQty) && potentialQty > 0 && potentialQty < 1000) {
            quantity = potentialQty;
            console.log(`Found quantity for ${code}: ${quantity} (before price ${parts[j]})`);
            break;
          }
        }
      }
    }

    // Alternative: Look for numbers that could be quantities
    if (quantity === null) {
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === code) {
          // Look forward from code for quantity
          for (let k = j + 1; k < parts.length; k++) {
            const num = parseFloat(parts[k]);
            if (!isNaN(num) && num >= 1 && num <= 1000 && !parts[k].includes('.')) {
              quantity = num;
              console.log(`Found quantity for ${code}: ${quantity} (numeric after code)`);
              break;
            }
          }
          break;
        }
      }
    }

    if (quantity && !isNaN(quantity) && quantity > 0) {
      let description = "";
      const codeIndex = parts.indexOf(code);
      if (codeIndex !== -1 && codeIndex < parts.length - 1) {
        // Get description between code and quantity/price
        const descriptionParts = [];
        for (let j = codeIndex + 1; j < parts.length; j++) {
          if (/^\d+\.?\d*$/.test(parts[j]) || parts[j] === code) {
            // Skip if it's a number or the code again
            continue;
          }
          if (/^\d+\.\d{3}$/.test(parts[j])) {
            // Stop at price
            break;
          }
          descriptionParts.push(parts[j]);
        }
        description = descriptionParts.join(" ").trim();
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
        lpoNumber: foundLPO,
      });
      console.log(
        `Cleanshelf Local PO: ${code} (${description}) x ${quantity}, LPO: ${foundLPO}`,
      );
    }
  }

  console.log(`Parsed ${items.length} items from Cleanshelf Local PO`);

  // If no items found with line parsing, try regex
  if (items.length === 0) {
    console.log("Trying regex pattern matching...");

    // Pattern: code description pack pieces unit_price amount
    const pattern = /(4003\d{2})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+\.\d{3})\s+([\d,]+\.\d{2})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const code = match[1];
      const quantity = parseFloat(match[4]); // pieces is the quantity
      const description = match[2];

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_local_po_regex",
          rawLine: match[0].substring(0, 100),
          lpoNumber: foundLPO,
        });
        console.log(
          `Cleanshelf Local PO: ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  return { items, lpoNumber: foundLPO };
};

const parseCleanshelfPendingOrders = (text) => {
  console.log("Parsing Cleanshelf PENDING ORDERS format...");
  const items = [];
  const lines = text.split("\n");

  let inItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      continue;
    }

    if (
      line.includes("Code Description") ||
      line.includes("Orderd Qty.") ||
      line.includes("Outstanding Qty.") ||
      line.includes("Orderd Qty.F")
    ) {
      inItemsSection = true;
      console.log("Entered items section at line:", i + 1);
      continue;
    }

    if (
      line.includes("********* End of Report ********") ||
      line.includes("FRESHMARKET") ||
      line.includes("* End of Report")
    ) {
      break;
    }

    if (!inItemsSection) {
      continue;
    }

    const screenshotPattern = /^(4003\d{2})\s+(.+?)\s+(\d+\.\d{2})$/;
    const screenshotMatch = line.match(screenshotPattern);

    if (screenshotMatch) {
      const code = screenshotMatch[1];
      const description = screenshotMatch[2];
      const quantity = parseFloat(screenshotMatch[3]);

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description || `Cleanshelf Product ${code}`,
          method: "cleanshelf_screenshot_format",
          lineNumber: i + 1,
          rawLine: line.substring(0, 100),
        });
        console.log(
          `Cleanshelf Screenshot: ${code} (${description}) x ${quantity}`,
        );
        continue;
      }
    }

    const codeMatch = line.match(/(4003\d{2})/);
    if (!codeMatch) {
      continue;
    }

    const code = codeMatch[1];
    const parts = line.split(/\s+/);

    if (parts.length >= 4) {
      let quantity = null;

      for (let j = 0; j < parts.length; j++) {
        if (
          /^\d+\.\d{2}$/.test(parts[j]) &&
          j + 2 < parts.length &&
          /^\d+\.\d{2}$/.test(parts[j + 1]) &&
          /^\d+\.\d{2}$/.test(parts[j + 2]) &&
          parts[j + 3] === code
        ) {
          quantity = parseFloat(parts[j]);
          break;
        }
      }

      if (!quantity || isNaN(quantity)) {
        for (let j = 0; j < parts.length; j++) {
          if (parts[j] === code && j < parts.length - 2) {
            for (let k = j + 1; k < parts.length; k++) {
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

      if (!quantity || isNaN(quantity)) {
        for (let j = 0; j < parts.length; j++) {
          if (parts[j] === code && j < parts.length - 1) {
            for (let k = j + 1; k < parts.length; k++) {
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
        const codeIndex = parts.indexOf(code);
        let description = "";
        if (codeIndex !== -1 && codeIndex < parts.length - 1) {
          for (let j = codeIndex + 1; j < parts.length; j++) {
            if (/^\d+\.\d{2}$/.test(parts[j])) {
              break;
            }
            description += parts[j] + " ";
          }
          description = description.trim();
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
          `Cleanshelf Pending: ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  console.log(`Parsed ${items.length} items from Cleanshelf Pending Orders`);

  if (items.length === 0) {
    console.log("Trying regex pattern matching...");

    const pattern1 = /(4003\d{2})\s+(.+?)\s+(\d+\.\d{2})/g;
    let match1;

    while ((match1 = pattern1.exec(text)) !== null) {
      const code = match1[1];
      const description = match1[2];
      const quantity = parseFloat(match1[3]);

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_pending_orders_regex1",
          rawLine: match1[0].substring(0, 100),
        });
        console.log(
          `Cleanshelf Pending: ${code} (${description}) x ${quantity}`,
        );
      }
    }

    const pattern2 =
      /(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(4003\d{2})\s+(.+)/g;
    let match2;

    while ((match2 = pattern2.exec(text)) !== null) {
      const code = match2[4];
      const quantity = parseFloat(match2[1]);
      const description = match2[5];

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_pending_orders_regex2",
          rawLine: match2[0].substring(0, 100),
        });
        console.log(
          `Cleanshelf Pending: ${code} (${description}) x ${quantity}`,
        );
      }
    }
  }

  return items;
};

const parseCleanshelfCopyPasteText = (text) => {
  console.log("Parsing Cleanshelf Copy-Paste Text Format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  let mainLPONumber = null;
  let inItemsSection = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      continue;
    }

    const lpoMatch = line.match(/(\d{5,6})/);
    if (
      lpoMatch &&
      (line.includes("L.P.O. No:") || line.includes("L. P. O. No:"))
    ) {
      mainLPONumber = lpoMatch[0];
      console.log(`Found main LPO number: ${mainLPONumber}`);
      continue;
    }

    if (
      line.includes("Code") &&
      line.includes("Description") &&
      (line.includes("Orderd Qty") ||
        line.includes("Ordered Qty") ||
        line.includes("Qty"))
    ) {
      inItemsSection = true;
      console.log("Entered items section at line:", i + 1);
      continue;
    }

    if (
      line.includes("*********") ||
      line.includes("End of Report") ||
      line.includes("FRESHMARKET") ||
      (line.includes("CLEAN SHELF") &&
        i > 0 &&
        !line.includes("SUPERMARKETS")) ||
      line.includes("* End of Report")
    ) {
      inItemsSection = false;
      break;
    }

    if (!inItemsSection) {
      continue;
    }

    if (
      line.includes("Pending Purchase Orders") ||
      line.includes("CLEAN SHELF SUPERMARKETS") ||
      line.includes("P.O. BOX") ||
      line.includes("LIMURU") ||
      line.includes("M044") ||
      line.includes("MO44") ||
      line.includes("MINI BAKERIES") ||
      line.length < 5
    ) {
      continue;
    }

    const screenshotPattern = /^(4003\d{2})\s+(.+?)\s+(\d+\.\d{2})$/;
    const screenshotMatch = line.match(screenshotPattern);

    if (screenshotMatch) {
      const code = screenshotMatch[1];
      const description = screenshotMatch[2];
      const quantity = parseFloat(screenshotMatch[3]);

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description || `Cleanshelf Product ${code}`,
          method: "cleanshelf_screenshot_copy_paste",
          lineNumber: i + 1,
          mainLPONumber: mainLPONumber,
        });
        console.log(
          `Cleanshelf Screenshot: ${code} (${description}) x ${quantity}`,
        );
        continue;
      }
    }

    const codeMatch = line.match(/(4003\d{2})/);
    if (codeMatch) {
      const code = codeMatch[1];
      let quantity = null;
      let description = "";

      const parts = line.split(/\s+/);

      if (parts.length >= 2) {
        for (let j = parts.length - 1; j >= 0; j--) {
          const potentialQty = parseFloat(parts[j]);
          if (!isNaN(potentialQty) && potentialQty > 0 && potentialQty < 1000) {
            const isQuantity = true;

            for (let k = j - 1; k >= 0; k--) {
              if (parts[k] === code) {
                quantity = potentialQty;

                const codeIndex = k;
                if (codeIndex !== -1 && codeIndex < j) {
                  for (let l = codeIndex + 1; l < j; l++) {
                    if (
                      !/^\d+\.\d{2,3}$/.test(parts[l]) &&
                      !/^\d+$/.test(parts[l])
                    ) {
                      description += parts[l] + " ";
                    }
                  }
                  description = description.trim();
                }
                break;
              }
            }
            if (quantity !== null) break;
          }
        }
      }

      if (quantity === null) {
        const qtyMatch = line.match(/(\d+\.\d{2})/);
        if (qtyMatch) {
          quantity = parseFloat(qtyMatch[1]);

          const codeIndex = line.indexOf(code);
          const qtyIndex = line.indexOf(qtyMatch[1]);
          if (codeIndex !== -1 && qtyIndex > codeIndex) {
            description = line
              .substring(codeIndex + code.length, qtyIndex)
              .trim();
          }
        }
      }

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description || `Cleanshelf Product ${code}`,
          method: "cleanshelf_copy_paste_fallback",
          lineNumber: i + 1,
          mainLPONumber: mainLPONumber,
        });
        console.log(`Cleanshelf: ${code} x ${quantity}`);
      }
    }
  }

  console.log(`Parsed ${items.length} items from Cleanshelf Copy-Paste Text`);

  if (items.length === 0) {
    console.log("Trying regex pattern matching for Cleanshelf copy-paste...");

    const pattern = /(4003\d{2})\s+(.+?)\s+(\d+\.\d{2})/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const code = match[1];
      const description = match[2];
      const quantity = parseFloat(match[3]);

      if (quantity && !isNaN(quantity) && quantity > 0) {
        items.push({
          ocrItemCode: code,
          actualItemCode: CLEANSHELF_ITEM_CODE_MAPPING[code] || code,
          quantity: Math.round(quantity),
          foundQuantity: quantity,
          productName: description,
          method: "cleanshelf_copy_paste_regex",
          rawLine: match[0].substring(0, 100),
        });
        console.log(`Cleanshelf: ${code} (${description}) x ${quantity}`);
      }
    }
  }

  return { items, mainLPONumber };
};

// FIX 2: Cleanshelf - Fixed LPO extraction to handle commas
const extractLPONumber = (text, customerType = "NAIVAS") => {
  console.log(`Extracting LPO number for ${customerType}...`);

  const cleaned = cleanOCRText(text);

  console.log("Looking for LPO in text sample:", cleaned.substring(0, 200));

  const config = CUSTOMER_CONFIG[customerType];
  if (config && config.extractLPO) {
    const lpo = config.extractLPO(text);
    if (lpo && lpo !== "UNKNOWN_LPO") {
      return lpo;
    }
  }

  switch (customerType) {
    case "JAZARIBU":
      const jazaribuPattern = /PO-J\d{3}-\d{6}/i;
      const jazaribuMatch = cleaned.match(jazaribuPattern);
      if (jazaribuMatch) {
        console.log(`Jazaribu LPO found: ${jazaribuMatch[0]}`);
        return jazaribuMatch[0];
      }

      const orderNoPattern = /Order No\.\s*(PO-J\d{3}-\d{6})/i;
      const orderNoMatch = cleaned.match(orderNoPattern);
      if (orderNoMatch) {
        console.log(`Jazaribu LPO found: ${orderNoMatch[1]}`);
        return orderNoMatch[1];
      }
      break;

    case "CLEANSHELF":
      // FIX: Handle LPO numbers with commas (e.g., 111,793) and without commas
      // Pattern 1: Look for "LPO No." or "L. P. O. No:" with optional commas in number
      const cleanshelfPattern1 = /L\.?\s*P\.?\s*O\.?\s*No\.?\s*:?\s*([\d,]+)/i;
      const cleanshelfMatch1 = text.match(cleanshelfPattern1);
      
      if (cleanshelfMatch1) {
        // Remove commas from the LPO number
        const lpoNumber = cleanshelfMatch1[1].replace(/,/g, '');
        console.log(`Cleanshelf LPO found (with commas handled): ${lpoNumber}`);
        return lpoNumber;
      }
      
      // Pattern 2: Look for "LPO" followed by number with commas
      const cleanshelfPattern2 = /LPO\s*No\.?\s*:?\s*([\d,]+)/i;
      const cleanshelfMatch2 = text.match(cleanshelfPattern2);
      
      if (cleanshelfMatch2) {
        const lpoNumber = cleanshelfMatch2[1].replace(/,/g, '');
        console.log(`Cleanshelf LPO found: ${lpoNumber}`);
        return lpoNumber;
      }
      
      // Pattern 3: Look for standalone 5-6 digit numbers with optional commas
      if (text.includes("CLEAN SHELF") || text.includes("CLEANSHELF") || text.includes("FRESHMARKET")) {
        // Look for patterns like "111,793" or "111793" in Cleanshelf context
        const standalonePattern = /\b(\d{1,3}(?:,\d{3})*\d{0,3})\b/;
        const standaloneMatch = text.match(standalonePattern);
        
        if (standaloneMatch) {
          // Check if this number appears near "LPO" or in a Cleanshelf context
          const matchIndex = text.indexOf(standaloneMatch[1]);
          const context = text.substring(Math.max(0, matchIndex - 30), Math.min(text.length, matchIndex + 30));
          
          if (context.includes("LPO") || context.includes("No.") || 
              (standaloneMatch[1].length >= 5 && standaloneMatch[1].length <= 7)) {
            const lpoNumber = standaloneMatch[1].replace(/,/g, '');
            console.log(`Possible Cleanshelf LPO: ${lpoNumber}`);
            return lpoNumber;
          }
        }
      }
      break;

    case "KHETIA":
      return extractKhetiaLPONumber(text);

    case "MAJID":
      return extractMajidLPONumber(text);

    case "CHANDARANA":
      return extractChandaranaLPONumber(text);

    case "QUICKMART":
      return extractQuickmartLPONumber(text);

    default: // NAIVAS
      const patterns = [
        /\*?P\d{9}-\d+\*?/,
        /\*?P\d{9}\*?/,
        /P\.?O\.?\s*[:#]?\s*0*(\d{6,9})/i,
        /Purchase\s*Order\s*[:\s]*\*?(P\d{9}(?:-\d+)?)\*?/i,
        /LPO\s*[:\s]*\*?(P\d{9}(?:-\d+)?)\*?/i,
        /\b(P\d{8,10}(?:-\d+)?)\b/,
        /\b(\d{9})\b/,
        /^P\d{9}\s*:/,
        /P\d{9}/,
        /P0\d{8}/,
      ];

      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
          console.log("Pattern matched:", pattern, "Result:", match);
          let lpo = match[1] || match[0];

          lpo = lpo
            .replace(/\*/g, "")
            .replace(/[^\dP\-]/g, "")
            .replace(/^:/, "")
            .replace(/:$/, "");

          console.log("Cleaned LPO:", lpo);

          if (/^\d{9}$/.test(lpo)) {
            lpo = "P" + lpo;
            console.log("Added P prefix:", lpo);
          } else if (/^P\d{6,}(?:-\d+)?$/.test(lpo)) {
            if (lpo.includes("-")) {
              const [prefix, suffix] = lpo.split("-");
              const digits = prefix.substring(1);
              if (digits.length < 9) {
                lpo = "P" + digits.padStart(9, "0") + "-" + suffix;
                console.log("Padded with zeros:", lpo);
              }
            } else {
              const digits = lpo.substring(1);
              if (digits.length < 9) {
                lpo = "P" + digits.padStart(9, "0");
                console.log("Padded with zeros:", lpo);
              }
            }
          }

          if (/^P\d{9}(?:-\d+)?$/.test(lpo)) {
            console.log(`Valid LPO found: ${lpo}`);
            return lpo;
          }
        }
      }
  }

  console.log("No valid LPO found in text");
  return "UNKNOWN_LPO";
};

const hasClearEvidenceOfNCodes = (cleanedText) => {
  console.log("Checking for N-code evidence");

  const n055Patterns = [
    /N051055/i,
    /NO51055/i,
    /N05105O/i,
    /N05105o/i,
    /051055/i,
    /BUTTER TOAST BREAD 1\.5KG/i,
    /SUPA BUTTER TOAST BREAD 1\.5KG/i,
  ];

  const n056Patterns = [
    /N051056/i,
    /NO51056/i,
    /051056/i,
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

const ultimateNCodeDetection = (text, items) => {
  console.log("Ultimate N-code detection");

  const nCodeEvidence = hasClearEvidenceOfNCodes(text);

  const last3DigitsMap = {
    "055": "N051055",
    "056": "N051056",
  };

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

  for (const [last3Digits, nCode] of Object.entries(last3DigitsMap)) {
    if (items.some((item) => item.ocrItemCode === nCode)) {
      continue;
    }

    const hasEvidence =
      (nCode === "N051055" && nCodeEvidence.hasN055Evidence) ||
      (nCode === "N051056" && nCodeEvidence.hasN056Evidence);

    if (!hasEvidence) {
      console.log(`No evidence for ${nCode}, skipping...`);
      continue;
    }

    console.log(`Searching for ${nCode} by last 3 digits "${last3Digits}"...`);

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

        for (const match of matches) {
          const matchIndex = text.indexOf(match);
          const searchStart = Math.max(0, matchIndex - 30);
          const searchEnd = Math.min(
            text.length,
            matchIndex + match.length + 30,
          );
          const context = text.substring(searchStart, searchEnd);

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
              console.log(`Found ${nCode} by last 3 digits: ${quantity} units`);
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

  for (const [productName, nCode] of Object.entries(productNameMap)) {
    if (items.some((item) => item.ocrItemCode === nCode)) {
      continue;
    }

    const hasEvidence =
      (nCode === "N051055" && nCodeEvidence.hasN055Evidence) ||
      (nCode === "N051056" && nCodeEvidence.hasN056Evidence);

    if (!hasEvidence) {
      continue;
    }

    if (text.includes(productName)) {
      console.log(`Found product name "${productName}" for ${nCode}`);

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(productName)) {
          const line = lines[i];

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
              console.log(`Found ${nCode} by product name: ${quantity} units`);
              break;
            }
          }
        }
      }
    }
  }

  return foundNCodes;
};

const parseCopyPasteTextFormat = (text) => {
  console.log("Parsing Copy-Paste Text Format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Total lines to parse:", lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

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

    const itemCodeMatch = line.match(/^(135\d{5}|N\d{6})/);
    if (itemCodeMatch) {
      const itemCode = itemCodeMatch[1];
      console.log(
        `Found item code: ${itemCode} in line: ${line.substring(0, 80)}...`,
      );

      const parts = line.split(/\s+/);
      console.log(`Line parts (${parts.length}):`, parts);

      let quantity = null;
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === "PCS" && j + 1 < parts.length) {
          const qtyStr = parts[j + 1];
          quantity = parseFloat(qtyStr);
          console.log(`Found quantity after PCS: ${quantity}`);
          break;
        }
      }

      if (quantity === null && parts.length >= 6) {
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

        if (decimalNumbers.length >= 3) {
          quantity = decimalNumbers[decimalNumbers.length - 3].value;
          console.log(
            `Using quantity from position ${decimalNumbers.length - 3}: ${quantity}`,
          );
        } else if (decimalNumbers.length > 0) {
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
            `Added: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
          );
        }
      } else {
        console.log(`Could not parse quantity for ${itemCode}:`, {
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

const parseDetailedPOFormat = (text) => {
  console.log("Parsing Detailed PO Format...");
  const items = [];
  const lines = text.split("\n");

  console.log("Looking for item patterns in detailed format...");

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

  if (items.length === 0) {
    console.log("Trying line-by-line parsing for detailed format...");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

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

      const itemCodeMatch = line.match(/(135\d{5}|N\d{6})/);
      if (itemCodeMatch) {
        const itemCode = itemCodeMatch[1];

        const quantityMatch = line.match(/PCS\s+(\d+(?:\.\d{2})?)/);
        if (!quantityMatch) {
          const numbers = line.match(
            /(\d+(?:\.\d{2})?)\s+(\d+(?:\.\d{2})?)\s+([\d,]+\d{2})/,
          );
          if (numbers) {
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
                `Detailed line: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
              );
            }
          }
        }
      }
    }
  }

  return items;
};

const parseUniversalFormat = (text) => {
  console.log("Using universal parser with N-code priority...");
  const items = [];

  console.log("Direct N-code extraction");

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
        console.log(`Found N051055: ${quantity} units`);
        foundN055 = true;
        break;
      }
    }
    if (foundN055) break;
  }

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
        console.log(`Found N051056: ${quantity} units`);
        foundN056 = true;
        break;
      }
    }
    if (foundN056) break;
  }

  console.log("General pattern matching");

  const generalPatterns = [
    /(\d+)\s+(135\d{5}|N\d{6})\s+(\d+(?:\.\d{2,4})?)/g,
    /(135\d{5}|N\d{6})\s+(\d+(?:\.\d{2,4})?)/g,
    /(135\d{5})(\d+\.\d{2,4})/g,
    /(N\d{6})(\d+\.\d{2,4})/g,
    /\|\s*(135\d{5}|N\d{6})\s*\|\s*(\d+(?:\.\d{2,4})?)/g,
    /(135\d{5}|N\d{6})\s+\d+\s+.+?\s+PCS\s+(\d+(?:\.\d{2,4})?)/g,
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
              `Universal: ${itemCode} -> ${ITEM_CODE_MAPPING[itemCode]} x ${quantity}`,
            );
          }
        }
      }
    } catch (error) {
      console.log(`Error with pattern ${pattern}:`, error);
    }
  }

  if (items.length === 0) {
    console.log("Fallback extraction");
    items.push(...findItemsGeneric(text));
  }

  return items;
};

const findItemsGeneric = (text) => {
  console.log("Using generic parsing...");
  const items = [];

  const cleanText = text.replace(/\t/g, " ").replace(/\s+/g, " ");

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

const findItemsAndQuantities = (text, customerType = "NAIVAS") => {
  console.log(`Starting item extraction for ${customerType}`);

  const cleanedText = cleanOCRText(text);
  const format = detectTextFormat(cleanedText, customerType);

  let items = [];

  switch (customerType) {
    case "JAZARIBU":
      items = parseJazaribuFormat(cleanedText);
      break;

    case "CLEANSHELF":
      switch (format) {
        case "CLEANSHELF_LOCAL_PO":
          const localPOResult = parseCleanshelfLocalPO(cleanedText);
          items = localPOResult.items;
          break;
        case "CLEANSHELF_PENDING_ORDERS":
          items = parseCleanshelfPendingOrders(cleanedText);
          break;
        case "CLEANSHELF_COPY_PASTE_TEXT":
          const result = parseCleanshelfCopyPasteText(cleanedText);
          items = result.items;
          break;
        default:
          const defaultLocalPOResult = parseCleanshelfLocalPO(cleanedText);
          items = defaultLocalPOResult.items;
          if (items.length === 0) {
            items = parseCleanshelfPendingOrders(cleanedText);
          }
          if (items.length === 0) {
            const fallbackResult = parseCleanshelfCopyPasteText(cleanedText);
            items = fallbackResult.items;
          }
      }
      break;

    case "KHETIA":
      items = parseKhetiaFormat(cleanedText);
      break;

    case "MAJID":
      items = parseMajidFormat(cleanedText);
      break;

    case "CHANDARANA":
      items = parseChandaranaFormat(cleanedText);
      break;

    case "QUICKMART":
      items = parseQuickmartFormat(cleanedText);
      break;

    default: // NAIVAS
      switch (format) {
        case "COPY_PASTE_TEXT":
          items = parseCopyPasteTextFormat(cleanedText);
          break;
        case "DETAILED_PO":
          items = parseDetailedPOFormat(cleanedText);
          break;
        case "SPECIFIC_FORMAT":
        case "SIMPLE_TABULAR":
        case "TABULAR_WITH_HEADERS":
        case "STANDARD_PO":
        case "SIMPLE_LIST":
        case "EXCEL_COPY_PASTE":
        default:
          items = parseUniversalFormat(cleanedText);

          if (items.length === 0) {
            console.log("Universal parser found no items, trying generic...");
            items = findItemsGeneric(cleanedText);
          }
      }

      const ultimateNCodes = ultimateNCodeDetection(cleanedText, items);

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

  const uniqueItems = [];
  const seenCodes = new Set();

  for (const item of items) {
    if (!seenCodes.has(item.ocrItemCode)) {
      seenCodes.add(item.ocrItemCode);
      uniqueItems.push(item);
    }
  }

  uniqueItems.sort((a, b) => {
    if (a.lineNumber && b.lineNumber) {
      return a.lineNumber - b.lineNumber;
    }
    return 0;
  });

  if (uniqueItems.length > 0) {
    const totalQuantity = uniqueItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    console.log(
      `Found ${uniqueItems.length} unique items, Total quantity: ${totalQuantity}`,
    );

    console.log("Item Details:");
    uniqueItems.forEach((item, index) => {
      const fgCode = item.actualItemCode;
      const productName = item.productName || "Unknown Product";
      console.log(
        `${index + 1}. ${item.ocrItemCode} -> ${fgCode} -> ${productName}: ${item.quantity} units`,
      );
    });

    if (customerType === "NAIVAS") {
      const nCodeItems = uniqueItems.filter((item) =>
        item.ocrItemCode.startsWith("N"),
      );
      if (nCodeItems.length > 0) {
        console.log("N-code items successfully extracted:");
        nCodeItems.forEach((item) => {
          console.log(
            `${item.ocrItemCode}: ${item.quantity} units (${item.productName})`,
          );
        });
      }
    }
  } else {
    console.log("No items found in text");
    console.log("Debug sample:", cleanedText.substring(0, 500));
  }

  return uniqueItems;
};

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

const processDroppedFile = async (file) => {
  console.log("Processing dropped file:", file.name, file.type);

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

  if (file.type === "text/plain") {
    return await file.text();
  }

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

  try {
    return await file.text();
  } catch (error) {
    throw new Error(
      "Could not read file. Please use PDF, image or text files.",
    );
  }
};

const parsePOText = async (
  text,
  customerCode = null,
  customerType = "NAIVAS",
) => {
  console.log("Starting PO parsing");
  console.log("Input text sample:", text.substring(0, 300));
  console.log("Initial customer type:", customerType);
  console.log("Customer code:", customerCode);

  const detectedCustomerType = detectCustomerTypeByCode(customerCode, text);

  if (detectedCustomerType !== customerType) {
    console.log(
      `Switching customer type from ${customerType} to ${detectedCustomerType} based on detection`,
    );
    customerType = detectedCustomerType;
  }

  console.log(`Final customer type: ${customerType}`);

  const lpoNumber = extractLPONumber(text, customerType);

  const foundItems = findItemsAndQuantities(text, customerType);

  const products = await getProductsByCustomer(customerType);

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
        `Matched: ${foundItem.ocrItemCode} -> ${foundItem.actualItemCode} -> ${foundItem.productName || "Unknown"}: ${foundItem.quantity} x ${product.itemPrice} = ${itemValue}`,
      );
    } else {
      console.log(
        `No product found for code: ${foundItem.actualItemCode} (from OCR: ${foundItem.ocrItemCode})`,
      );
      parsingErrors.push(
        `Item code ${foundItem.ocrItemCode} -> ${foundItem.actualItemCode} not found in system`,
      );
    }
  }

  const summary = {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: totalValue,
    matchedItems: items.length,
    failedItems: parsingErrors.length,
    lpoNumber: lpoNumber,
    customerType: customerType,
  };

  console.log("Parsing summary");
  console.log(`Customer Type: ${customerType}`);
  console.log(`LPO: ${lpoNumber}`);
  console.log(`Customer: ${customerCode || "Not specified"}`);
  console.log(`Items: ${summary.totalItems} matched`);

  if (summary.failedItems > 0) {
    console.log(`Failed items: ${summary.failedItems}`);
  }

  console.log(`Total Quantity: ${summary.totalQuantity}`);
  console.log(`Total Value: KES ${summary.totalAmount.toFixed(2)}`);

  if (items.length > 0) {
    console.log("Items found:");
    items.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units`,
      );
    });
  }

  return {
    customer: customerCode,
    items,
    lpoNumber: lpoNumber,
    customerType: customerType,
    detectedFormat: "STANDARD_PARSING",
    parsingWarnings: [...parsingWarnings, ...parsingErrors],
    parsingErrors: parsingErrors,
    originalText: text.substring(0, 500),
    summary: summary,
  };
};

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

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  const dueDate = `${year}-${month}-${day}T00:00:00.000Z`;

  console.log("Today's date:", now.toISOString().split("T")[0]);
  console.log("Tomorrow's due date:", dueDate);

  const lpoNumber =
    poData.lpoNumber && poData.lpoNumber !== "UNKNOWN_LPO"
      ? poData.lpoNumber
      : null;

  let sellingPriceList;
  switch (poData.customerType) {
    case "NAIVAS":
      sellingPriceList = CUSTOMER_PRICE_LISTS.NAIVAS || "Naivas Special Price";
      break;
    case "CLEANSHELF":
      sellingPriceList =
        CUSTOMER_PRICE_LISTS.CLEANSHELF || "Supermarkets Price";
      break;
    case "JAZARIBU":
      sellingPriceList = CUSTOMER_PRICE_LISTS.JAZARIBU || "Depot Price";
      break;
    case "KHETIA":
      sellingPriceList = CUSTOMER_PRICE_LISTS.KHETIA || "Depot Price";
      break;
    case "MAJID":
      sellingPriceList = CUSTOMER_PRICE_LISTS.MAJID || "Supermarkets Price";
      break;
    case "CHANDARANA":
      sellingPriceList =
        CUSTOMER_PRICE_LISTS.CHANDARANA || "Supermarkets Price";
      break;
    case "QUICKMART":
      sellingPriceList = CUSTOMER_PRICE_LISTS.QUICKMART || "Supermarkets Price";
      break;
    default:
      sellingPriceList = DEFAULT_SETTINGS.SELLING_PRICE_LIST;
  }

  console.log(
    `Using price list for ${poData.customerType}: ${sellingPriceList}`,
  );

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
      priceListUsed: sellingPriceList,
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
      priceListAttempted: sellingPriceList,
    };
  }
};

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

const testWithKhetiaFormat = async () => {
  const testText = `KHETIA DRAPERS LTD.
2520970 
0 Days
19/01/2026 16:36:45 M/609 - MINI BAKERIES NBI LTD
P.O.BOX 17592-00500, Supaloaf Complex,
Kangundo Road.
020-783374 / 054-31271
operations@minibake.com
Bernice-0740198754
KES - Kenyan
Shillings
KHETIA'S KAHAWA SUPERMARKET
0731-999903 / by WEKALAMOYO on 19/01/2026
17:14:10
790601 BREAD BARREL WHITE BUTTERTOAST 600G 4.00 PCS 1 PCS
416868 BREAD BUTTER TOAST WHITE 400G 4.00 PCS 1 PCS
412818 BREAD BUTTER TOAST WHITE 600G 4.00 PCS 1 PCS
416872 BREAD BUTTER TOAST WHITE 800G 3.00 PCS 1 PCS
414800 BREAD SUPA JUBILEE BARREL WHITE 600G 4.00 PCS 1 PCS
414810 BREAD SUPA JUBILEE BARREL WHITE 800G 4.00 PCS 1 PCS
415591 BREAD SUPA LOAF 400G WHITE 4.00 PCS 1 PCS
415592 BREAD SUPA LOAF 600G WHITE 4.00 PCS 1 PCS * 8 PAIR
410955 BREAD SUPA LOAF 800G WHITE 4.00 PCS 1 PCS * 8 UNIT
419349 BREAD SUPA LOAF BARREL WHITE 400G 4.00 PCS`;

  console.log("Testing Khetia parser");
  const result = await parsePOText(testText, "C04051", "KHETIA");

  console.log(`Khetia results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithQuickmartFormat = async () => {
  const testText = `QUICK MART WESTLANDS
052-00059738 
M/028 - MINI BAKERIES NAIROBI LIMITED
 / 
 / 
23/01/2026  15:47:05
0 Days
KES - Kenya Shilings
by  on 
700183 6161102320459 FD- SUPA BUTTER TOAST 1500G 3.00 217.90 PCS 1 PCS 653.70
700001 6161102320183 FD- SUPA LOAF PREMIUM WHITE CT 800G 10.00 117.00 PCS 1 PCS 1,170.00
700009 6161102320169 FD- SUPALOAF WHITE CT 600G 10.00 88.70 PCS 1 PCS 887.00
700330 6161102320305 FD-SUPA BARREL 800G WHITE 6.00 117.00 PCS 1 PCS 702.00
700178 6161102320442 FD-SUPA BUTTER TOAST 600G 10.00 88.70 PCS 1 PCS 887.00
700140 6161102320435 FD-SUPA BUTTER TOAST BREAD 800G 7.00 117.00 PCS 1 PCS 819.00
700103 6161102320268 FD-SUPALOAF BROWN BARREL 600GMS 3.00 88.70 PCS 1 PCS 266.10
700110 6161102320138 FD-SUPALOAF BUTTER TOAST 400GMS 10.00 57.90 PCS 1 PCS 579.00
700106 6161102320060 FD-SUPALOAF WHITE BARREL 400G 6.00 57.90 PCS 1 PCS 347.40
700104 6161102320299 FD-SUPALOAF WHITE BARREL 600GMS 4.00 88.70 PCS 1 PCS 354.80
700113 6161102320046 FD-SUPALOAF WHITE BREAD 1.5KG 3.00 217.90 PCS 1 PCS 653.70
700076 6161102320404 FD-SUPALOAF WHITE BREAD CT 400G 15.00 57.90 PCS 1 PCS 868.50
Approx. Gross Weight 0.00 Total 87.00 Unit`;

  console.log("Testing Quickmart parser");
  const result = await parsePOText(testText, "C03970", "QUICKMART");

  console.log(`Quickmart results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithMajidFormat = async () => {
  const testText = `ORDER : 26451278
MAJID SUPERMARKET
ITEM LIST:
6161102320404 - SUPALOAF WHITE BREAD CT 400G
QTY UC: 15
6161102320305 - SUPA BARREL 800G WHITE
QTY UC: 6
6164000136610 - SUPALOAF FAMILY 600G
QTY UC: 10
6161102320183 - SUPA LOAF PREMIUM WHITE CT 800G
QTY UC: 10
6161102320534 - SUPA LOAF WHITE BREAD 1.5KG
QTY UC: 3
6161102320138 - SUPALOAF BUTTER TOAST 400G
QTY UC: 10`;

  console.log("Testing Majid parser");
  const result = await parsePOText(testText, "C01996", "MAJID");

  console.log(`Majid results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units`,
    );
  });

  return result;
};

const testWithChandaranaFormat = async () => {
  const testText = `CHANDARANA SUPERMARKET LTD-THE WESTEND

Corner of Got Huma Road And Achieng Oneko Road,  
Achieng' Oneko Rd,  
Kisumu  
Kenya  

Ph. : 0702957480  
P.O.Box 14078-00800 Nairobi / Pin No P000601772P  

# PURCHASE ORDER

**Vendor**: SM0202 - MINI BAKERIES NBI LTD  
**Address**: PO BOX 17592 00500  
NAIROBI  
Ph. : 073199915  

**Order No.**: & Date - 2018120005543 27-Jan-2026  
**Type**: - Outright - Standard  

**PO Valid For 6 Days.**

**Email**: operations@minibake.com  
**PIN NO**: P000599905G  

**Delivery To**: - THE WESTEND  
- Corner of Got Huma Road And  
- Achieng Oneko Road,  
- Achieng' Oneko Rd,  
- Kisumu  
- Kenya  

Dear Sir/Madam,  
Please supply the following item/s as per terms and conditions mentioned below -

| S.No. Bar Code | Description    | Scan Qty | FOC Qty | Pack Size | Quantity |
|---|---|---|---|---|---|
| 1    | 6161102320459    | SUPA 1.5KG BUTTER TOAST BREAD | 4.00    | 0.00 1    | 4.00    |
| 2    | 6161100481039    | SUPA 300G MUFFINS CHOCOCHIP   | 5.00    | 0.00 1    | 5.00    |
| 3    | 6161100481022    | SUPA 300G MUFFINS FRUIT    | 5.00    | 0.00 1    | 5.00    |
| 4    | 6161100481015    | SUPA 300G MUFFINS MARBLE    | 5.00    | 0.00 1    | 5.00    |
| 5    | 6161100481008    | SUPA 300G MUFFINS VANILLA    | 5.00    | 0.00 1    | 5.00    |
| 6    | 6161100480407    | SUPA 350G MEDIUM SCONES    | 10.00    | 0.00 1    | 10.00    |
| 7    | 6161102320404    | SUPA 400G WHITE SLICED BREAD CT | 15.00    | 0.00 1    | 15.00    |
| 8    | 6161100480124    | SUPA 500G LARGE SCONES    | 5.00    | 0.00 1    | 5.00    |
| 9    | 6161102320183    | SUPA 800G SWICH WHITE BREAD    | 20.00    | 0.00 1    | 20.00    |
| 10    | 6161102320169    | SUPA LOAF WHITE BREAD 600G    | 10.00    | 0.00 1    | 10.00    |

**Sub Total**: 84.00 0.00 84.00  

**Purchase Order Net Value**: 8,417.10  

**Payment Terms**: From Statement 60 Credit Days  

**For CHANDARANA SUPERMARKET LTD-THE WESTEND**

**Signature**: Y.C.S.T.E.R.  
**Name**: P. MANGER NIMO MOLI`;

  console.log("Testing Chandarana parser");
  const result = await parsePOText(testText, "C00370", "CHANDARANA");

  console.log(`Chandarana results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units`,
    );
  });

  return result;
};

const testWithNCodes = async () => {
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

  console.log("Testing N-codes parser");
  const result = await parsePOText(testText, "M/539", "NAIVAS");

  const nCodeItems = result.items.filter((item) =>
    item.ocrDetails?.ocrItemCode?.startsWith("N"),
  );
  console.log(`N-code items found: ${nCodeItems.length}`);
  nCodeItems.forEach((item) => {
    console.log(
      `${item.ocrDetails.ocrItemCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithCopyPasteFormat = async () => {
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

  console.log("Testing copy-paste format parser");
  const result = await parsePOText(testText, "MINI BAKERIES", "NAIVAS");

  console.log(`Copy-paste format results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Total Value: ${result.summary.totalAmount}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithCleanshelfFormat = async () => {
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
91213 L. P. O. No:
10-Jan-2026
VAT NO:
PIN NO: 
CLEAN SHELF SUPERMARKETS LIMITED
LIMURU
CLS 
17/01/2026  11:56:26
CODE DESCRIPTION Pieces Unit price Amount Pack
P051147119S
0125810H
P.O. BOX 1208-00217,LIMURU
 936.00 117.000 400348 SUPALOAF WHITE 800GM 1 8
 532.20 88.700 400347 SUPALOAF WHITE 600GM 1 6
 435.80 217.900 400346 SUPALOAF SANDWICH 1.5KG 1 2
 936.00 117.000 400344 SUPALOAF BUTTER TOAST 800GM 1 8
 709.60 88.700 400343 SUPALOAF BUTTER TOAST 600GM 1 8
 1,170.00 117.000 400339 SUPALOAF BARREL WHITE 800GM 2 10
 709.60 88.700 400338 SUPALOAF BARREL WHITE 600GM 1 8
 463.20 57.900 400337 SUPALOAF BARREL WHITE 400GM 1 8
 347.40 57.900 400334 SUPALOAF  WHITE 400GM 0 6
 463.20 57.900 400329 SUPA BUTTER TOAST WHITE 400GM`;

  console.log("Testing Cleanshelf parser");
  const result = await parsePOText(testText, "C00494", "CLEANSHELF");

  console.log(`Cleanshelf results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units`,
    );
  });

  return result;
};

const testWithJazaribuFormat = async () => {
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

  console.log("Testing Jazaribu parser");
  const result = await parsePOText(testText, "C07455", "JAZARIBU");

  console.log(`Jazaribu results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const testWithCleanshelfCopyPasteFormat = async () => {
  const testText = `CLEAN SHELF SUPERMARKETS LIMITED
P.O. BOX 1208-00217,LIMURU
FRESHMARKET
Pending Purchase Orders
Code
Description
Orderd Qty. Received Qty. Outstanding Qty.
M044 - MINI BAKERIES (NAIROBI
111,793
LPO No.
400329
400334
400337
400338
400339
400343
400347
400348
SUPA BUTTER TOAST WHITE 400GM
SUPALOAF  WHITE 400GM
SUPALOAF BARREL WHITE 400GM
SUPALOAF BARREL WHITE 600GM
SUPALOAF BARREL WHITE 800GM
SUPALOAF BUTTER TOAST 600GM
SUPALOAF WHITE 600GM
SUPALOAF WHITE 800GM
 8.00
 15.00
 6.00
 5.00
 7.00
 10.00
 15.00
 15.00
 0.00
 0.00
 0.00
 0.00
 0.00
 0.00
 0.00
 0.00
 8.00
 15.00
 6.00
 5.00
 7.00
 10.00
 15.00
 15.00`;

  console.log("Testing Cleanshelf copy-paste format parser");
  const result = await parsePOText(testText, "C00494", "CLEANSHELF");

  console.log(`Cleanshelf Copy-Paste Format results:`);
  console.log(`LPO Number: ${result.lpoNumber}`);
  console.log(`Total Items: ${result.summary.totalItems}`);
  console.log(`Total Quantity: ${result.summary.totalQuantity}`);
  console.log(`Customer Type: ${result.customerType}`);

  result.items.forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.ocrDetails?.ocrItemCode || "Unknown"} -> ${item.fgCode}: ${item.quantity} units (${item.description})`,
    );
  });

  return result;
};

const debugNCodeParsing = (text) => {
  console.log("N-code debugging");

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

  const cleaned = cleanOCRText(text);
  console.log("\nCleaned text (first 300 chars):", cleaned.substring(0, 300));

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
      console.log(`Pattern "${pattern}" found ${matches.length} times`);
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

export default {
  getNaivasProducts,
  getProductsByCustomer,
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: async (text, customerCode, customerType = "NAIVAS") =>
    parsePOText(text, customerCode, customerType),
  createOrderFromPO,
  setupDragAndDrop,
  processDroppedFile,
  extractTextFromImage,
  extractTextFromPDF,
  extractTextWithOCRSpace,
  extractLPONumber,
  findItemsAndQuantities,
  detectTextFormat,
  detectCustomerTypeByCode,
  cleanOCRText,
  parseUniversalFormat,
  parseCopyPasteTextFormat,
  parseDetailedPOFormat,
  parseCleanshelfLocalPO,
  parseCleanshelfPendingOrders,
  parseCleanshelfCopyPasteText,
  parseJazaribuFormat,
  parseKhetiaFormat,
  parseQuickmartFormat,
  parseMajidFormat,
  parseChandaranaFormat,
  ultimateNCodeDetection,
  hasClearEvidenceOfNCodes,
  testWithNCodes,
  testWithCopyPasteFormat,
  testWithCleanshelfFormat,
  testWithJazaribuFormat,
  testWithCleanshelfCopyPasteFormat,
  testWithKhetiaFormat,
  testWithQuickmartFormat,
  testWithMajidFormat,
  testWithChandaranaFormat,
  debugNCodeParsing,
  ITEM_CODE_MAPPING,
  ITEM_NAMES_MAPPING,
  CLEANSHELF_ITEM_CODE_MAPPING,
  JAZARIBU_ITEM_CODE_MAPPING,
  CLEANSHELF_CUSTOMER_CODES,
  JAZARIBU_CUSTOMER_CODES,
  KHETIA_ITEM_CODE_MAPPING,
  MAJID_BARCODE_MAPPING,
  CHANDARANA_BARCODE_MAPPING,
  QUICKMART_BARCODE_MAPPING,
  KHETIA_CUSTOMER_CODES,
  MAJID_CUSTOMER_CODES,
  CHANDARANA_CUSTOMER_CODES,
  QUICKMART_CUSTOMER_CODES,
  CUSTOMER_CONFIG,
  CUSTOMER_PRICE_LISTS,
  getFGCode,
  getProductName,
  getConfig: () => ({
    DEFAULT_SETTINGS,
    PERFORMANCE_SETTINGS,
    VALIDATION_SETTINGS,
    CUSTOMER_PRICE_LISTS,
  }),
};