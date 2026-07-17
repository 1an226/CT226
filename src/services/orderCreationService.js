import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

// OCR API configuration from environment variables
const OCR_SPACE_API_KEY = import.meta.env.VITE_OCR_SPACE_API_KEY;
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

// OCR settings optimized for speed
const getOCRSpaceConfig = () => ({
  language: import.meta.env.VITE_OCR_SPACE_LANGUAGE || "eng",
  isTable: true,
  OCREngine: "2",
  isOverlayRequired: false,
  isCreateSearchablePdf: false,
  detectOrientation: false,
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

// Updated Quickmart LPO extraction - pattern 0xx-xxxxxxxx
const extractQuickmartLPONumber = (text) => {
  console.log("Extracting Quickmart LPO number...");

  // Pattern 0xx-xxxxxxxx (e.g., 035-00012579)
  const pattern = /0\d{2}-\d{8}/;
  const match = text.match(pattern);

  if (match) {
    console.log(`Quickmart LPO found: ${match[0]}`);
    return match[0];
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

// ---------- AI PARSER ----------
const findItemsAndQuantities = async (text, customerType = "NAIVAS") => {
  try {
    console.log(`AI extraction for ${customerType}...`);
    const response = await fetch("/nvidia-api/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_NVIDIA_API_KEY}`,
        "X-NVCF-ORG": import.meta.env.VITE_NVIDIA_ORG
      },
      body: JSON.stringify({
        model: "meta/llama-3.2-3b-instruct",
        messages: [
          {
            role: "system",
            content: `You are CT226, the automated order‑entry specialist for DDS.
Return ONLY a JSON object with 'lpo' (string or null) and 'items' (array of { 'code': string, 'quantity': number }). Do not include any other text.

Customer rules:
- Naivas: LPO starts with P + 8‑9 digits. Item codes: 8‑digit starting 135 or N‑codes like N051055. Quantity: number before/after "PCS".
- Majid: LPO "ORDER :" + number. Item codes: 13‑digit barcodes. Quantity: "QTY UC" column.
- Chandarana: LPO "Order No. :" + 12‑13 digits. Item codes: 13‑digit barcodes. Quantity: first decimal after barcode.
- Quickmart: LPO "PURCHASE ORDER #" + number. Item codes: 13‑digit barcodes. Quantity: "Order Qty" column.
- Khetia: LPO "PURCHASE ORDER #" + 7‑digit number. Item codes: 6‑digit. Quantity: "Order Qty" column.
- Jazaribu: LPO "Order No." or "PO‑J" + number. Item codes: JT + 5 digits. Quantity: "Quantity"/"Pieces" column.
- Cleanshelf: Local PO: LPO "CLS - [number]". Pending: LPO number after "LPO No." (remove commas). Item codes: 6‑digit starting 400.`
          },
          { role: "user", content: `Customer: ${customerType}\n\n${text}` }
        ],
        max_tokens: 1000,
        temperature: 0,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`AI API error ${response.status}`);
    const data = await response.json();
    const content = data.choices[0].message.content;

    // Robust JSON extraction
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e1) {
      const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fence) {
        try { parsed = JSON.parse(fence[1]); } catch (e2) {}
      }
      if (!parsed) {
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start !== -1 && end > start) {
          try { parsed = JSON.parse(content.substring(start, end + 1)); } catch (e3) {}
        }
      }
      if (!parsed) throw new Error("No valid JSON found");
    }

    const items = (parsed.items || []).map(item => ({
      ocrItemCode: item.code,
      actualItemCode: getFGCode(item.code, customerType),
      quantity: parseInt(item.quantity) || 0,
      foundQuantity: parseInt(item.quantity) || 0,
      productName: `Product ${item.code}`,
      method: "ai-parsed",
    }));

    console.log(`AI extracted ${items.length} items`);
    return items;
  } catch (error) {
    console.warn("AI parsing failed:", error.message);
    return [];
  }
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


export default {
  getProductsByCustomer,
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  createOrderFromPO,
  getFGCode,
  getProductName,
};
