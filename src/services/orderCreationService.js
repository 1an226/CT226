import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";
import { getFGCode as getFGCodeFromStandard } from "@utils/StandardModel.js";
import { STANDARD_MODEL } from "@utils/StandardModel.js";

// ─── Configuration ───────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  WAREHOUSE: import.meta.env.VITE_DEFAULT_WAREHOUSE || "Dandora",
  SELLING_PRICE_LIST: import.meta.env.VITE_DEFAULT_SELLING_PRICE_LIST || "Supermarkets Price",
  ORDER_TYPE: import.meta.env.VITE_DEFAULT_ORDER_TYPE || "Route",
  REMARKS: import.meta.env.VITE_DEFAULT_REMARKS || "CT226",
  IS_TOP_UP: import.meta.env.VITE_DEFAULT_IS_TOP_UP === "true",
};

const CUSTOMER_PRICE_LISTS = {
  NAIVAS: import.meta.env.VITE_NAIVAS_PRICE_LIST || "Naivas Special Price",
  CLEANSHELF: import.meta.env.VITE_CLEANSHELF_PRICE_LIST || "Supermarkets Price",
  JAZARIBU: import.meta.env.VITE_JAZARIBU_PRICE_LIST || "Depot Price",
  KHETIA: import.meta.env.VITE_KHETIA_PRICE_LIST || "Depot Price",
  MAJID: import.meta.env.VITE_MAJID_PRICE_LIST || "Supermarkets Price",
  CHANDARANA: import.meta.env.VITE_CHANDARANA_PRICE_LIST || "Supermarkets Price",
  QUICKMART: import.meta.env.VITE_QUICKMART_PRICE_LIST || "Supermarkets Price",
};

const PERFORMANCE_SETTINGS = {
  PRODUCT_CACHE_DURATION: parseInt(import.meta.env.VITE_PRODUCT_CACHE_DURATION) || 5 * 60 * 1000,
  MIN_TEXT_LENGTH: 50,
};

const VALIDATION_SETTINGS = {
  MIN_QUANTITY: parseInt(import.meta.env.VITE_MIN_QUANTITY) || 1,
  MAX_QUANTITY: parseInt(import.meta.env.VITE_MAX_QUANTITY) || 10000,
  MIN_ITEM_COUNT: parseInt(import.meta.env.VITE_MIN_ITEM_COUNT) || 1,
};

const VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl";

// ─── Customer code lists ─────────────────────────────────────────
const CLEANSHELF_CUSTOMER_CODES = ["C06223","C00498","C06885","C00505","C07481","C00494","C07212","C04494","C00500","C04838","C00492","C06602","C00507","C00501","C00497","C00495","C04411","C00502","C05747"];
const JAZARIBU_CUSTOMER_CODES = ["C07455","C07257","C06702","C06667","C06363","C07071","C06791","C07449","C06531","C06882","C06627","C07106","C06570","C06547","C07177","C06351","C07142","C07451","C07450","C07251","C06721"];
const KHETIA_CUSTOMER_CODES = ["C04051","C04059","C04066","C04062","C04078","C06059","C04068","C04428","C04876","C04878","C04877","C04874","C04800","C04061","C04073","C04873","C04872","C04316","C07440","C04053","C04057","C05534","C04065","C04072"];
const MAJID_CUSTOMER_CODES = ["C01996","C01998","C02000","C02005","C02008","C02004","C02002","C01994","C04299","C04347","C04444","C04753","C05301","C05392","C05455","C06008","C06256","C06529","C06765","C06866","C07008","C07070","C07441","C07466","C07530","C07551","C04754","C06538","C06900"];
const CHANDARANA_CUSTOMER_CODES = ["C00370","C00379","C04955","C00372","C05665","C00387","C00366","C06326","C00388","C00382","C05550","C00380","C00384","C00361","C06896","C05067","C00367","C00376","C05135","C05163","C00374","C00392","C00363","C00359"];
const QUICKMART_CUSTOMER_CODES = ["C03970","C02842","C02838","C02833","C04394","C04124","C02859","C04464","C05101","C05098","C05151","C07565","C05123","C05062","C06692","C07490","C02808","C02810","C07368","C02813","C02814","C02817","C02819","C02821","C02822","C02824","C02826","C05247","C04531","C05879","C02832","C02835","C02840","C05230","C04471","C02844","C06101","C04348","C02846","C02848","C02850","C02852","C02854","C02857","C05167","C05746","C02868","C02870","C02872","C02874","C02876","C04044","C04271","C05006","C04391","C04490","C06409","C02828","C07540","C02861","C04823"];

const ITEM_NAMES_MAPPING = (() => {
  const mappingStr = import.meta.env.VITE_ITEM_NAMES_MAPPING || "";
  const mapping = {};
  mappingStr.split(",").forEach(pair => {
    const [key, value] = pair.split(":");
    if (key && value) mapping[key.trim()] = value.trim();
  });
  return mapping;
})();

let cachedProducts = {};

// ─── Helpers ─────────────────────────────────────────────────────
const getFGCode = (itemCode) => getFGCodeFromStandard(itemCode) || "UNKNOWN_" + itemCode;
const getProductName = (itemCode, customerType = "NAIVAS") => {
  const special = {
    CLEANSHELF: "Cleanshelf Product " + itemCode,
    JAZARIBU: "Jazaribu Product " + itemCode,
    KHETIA: "Khetia Product " + itemCode,
    MAJID: "Majid Product " + itemCode,
    CHANDARANA: "Chandarana Product " + itemCode,
    QUICKMART: "Quickmart Product " + itemCode,
  };
  return special[customerType] || ITEM_NAMES_MAPPING[itemCode] || "Product " + itemCode;
};

const detectCustomerTypeByCode = (customerCode = null, text = "") => {
  if (!customerCode) {
    if (/KHETIA/i.test(text)) return "KHETIA";
    if (/QUICK MART/i.test(text)) return "QUICKMART";
    if (/MAJID/i.test(text)) return "MAJID";
    if (/CHANDARANA/i.test(text)) return "CHANDARANA";
    if (/JAZARIBU/i.test(text)) return "JAZARIBU";
    if (/(CLEAN\s*SHELF|4003\d{2})/i.test(text)) return "CLEANSHELF";
    return "NAIVAS";
  }
  if (CLEANSHELF_CUSTOMER_CODES.includes(customerCode)) return "CLEANSHELF";
  if (JAZARIBU_CUSTOMER_CODES.includes(customerCode)) return "JAZARIBU";
  if (KHETIA_CUSTOMER_CODES.includes(customerCode)) return "KHETIA";
  if (MAJID_CUSTOMER_CODES.includes(customerCode)) return "MAJID";
  if (CHANDARANA_CUSTOMER_CODES.includes(customerCode)) return "CHANDARANA";
  if (QUICKMART_CUSTOMER_CODES.includes(customerCode)) return "QUICKMART";
  return "NAIVAS";
};

// ─── NATIVE PDF TEXT EXTRACTION (for digital PDFs) ────────────────
const extractTextFromPdf = async (arrayBuffer) => {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items;
    if (items.length === 0) continue;
    const lines = [];
    let currentLine = [items[0]];
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const curr = items[i];
      if (Math.abs(curr.transform[5] - prev.transform[5]) < 5) {
        currentLine.push(curr);
      } else {
        lines.push(currentLine.map(item => item.str).join(" "));
        currentLine = [curr];
      }
    }
    lines.push(currentLine.map(item => item.str).join(" "));
    fullText += lines.join("\n") + "\n";
  }
  return fullText.trim();
};

// ─── SLM EXTRACTION (8B model for all customers) ────────────────
const extractViaSLM = async (text, customerType) => {
  const rules = {
    NAIVAS: "Customer: Naivas Ltd.\nColumns: Item Code (e.g., 13505757 or N051055), Bar Code, Description, Unit (PCS), Quantity, Unit Price, Net Amount.\nLPO: appears as 'P' followed by 8-9 digits (e.g., P038449364). It may have a trailing '-1', which must be stripped.\nExtract the Item Code (not the Bar Code). For quantity, use the number AFTER the word 'PCS'.\nReturn ONLY valid JSON.",

    KHETIA: "Customer: Khetia Drapers Ltd.\nColumns: YOUR Code (6-digit item code), Description, Order Qty (the REAL order quantity, always followed by 'PCS'), Packing (ignore, e.g., '1 PCS * 8 PAIR').\nLPO: a 7-digit number (e.g., 2520950) near 'PURCHASE ORDER #' or at the top.\nExtract YOUR Code. For quantity, use the FIRST number that is immediately followed by 'PCS'. Ignore any numbers in the Packing column.\nReturn ONLY valid JSON.",

    JAZARIBU: "Customer: Jazaribu Retail.\nColumns: Barcode, No. (JT code, e.g., JT01098), Description, Quantity (the number right before 'PIECES'), Unit of Measure (PIECES), Cost, Amount.\nIMPORTANT: There are MULTIPLE items. Look at ALL lines that contain a JT code (like JT01098, JT01097, etc.). Extract EVERY JT code you find, along with its quantity.\nLPO: appears as 'PO-J' followed by 3-3-6 digits (e.g., PO-J020-000253). It may be on the line after 'Order No.'.\nExtract the JT code. For quantity, use ONLY the number that appears immediately before the word 'PIECES'. Do NOT use any number from the description (like 400Gm).\nReturn ONLY valid JSON with ALL items.",

    CLEANSHELF: "Customer: Cleanshelf Supermarkets.\nThere are two formats:\n1. Local Purchase Order:\n   - Text layout: Amount, Unit Price, Code (4003xxx), Description, Pack (ignore), Pieces (use).\n   - LPO: appears as 'CLS - ' followed by 5-6 digits (e.g., CLS - 91213).\n   - For each line with a 4003xxx code, ignore numbers before the code. After the code and description, there are two numbers: Pack (ignore) and Pieces (use). Use the Pieces number.\n2. Pending Purchase Order:\n   - Columns: numbers before the code (Outstanding, Orderd Qty., Received), then Code (4003xxx), Description.\n   - LPO: appears as a number with optional commas next to 'LPO No.' (e.g., 111,638 LPO No.). The number is usually BEFORE the words 'LPO No.'.\n   - For each line with a 4003xxx code, use the second of the three numbers before the code (Orderd Qty.).\nFor both formats, extract the Code and the correct quantity. LPO: if local, prepend 'CLS - '. For pending, remove commas from the LPO number.\nReturn ONLY valid JSON.",

    CHANDARANA: "Customer: Chandarana.\nColumns: Bar Code (13 digits), Description, Quantity (real order quantity). Ignore any 'Scan Qty' column.\nLPO: appears after 'Order No.'.\nExtract the Bar Code and the Quantity.\nReturn ONLY valid JSON.",

    MAJID: "Customer: Majid (Carrefour).\nColumns: BAR CODE (13 digits), QTY UC (the order quantity).\nLPO: appears after 'ORDER :'.\nExtract the BAR CODE and the QTY UC.\nReturn ONLY valid JSON.",

    QUICKMART: "Customer: Quickmart Ltd.\nColumns: Code (short number like 700103 – IGNORE this column), Scan Code (13-digit barcode – use THIS as the item code), Description, Packing (always '1 PCS' – ignore), Order Qty (the real order quantity, always followed by 'PCS' and after the description), Unit, Agreed Invoice Price, Total.\nExample: line \"700103 6161102320268 ... 4.00 PCS ...\" → code 6161102320268, quantity 4.\nLPO: appears after 'PURCHASE ORDER #' as a pattern like XXX-XXXXXXXX (e.g., 016-00057714).\nExtract the Scan Code (13-digit) for each item. Do NOT use the short Code column.\nFor quantity, use the Order Qty (the number immediately before 'PCS' that appears after the description, NOT the '1 PCS' packing column).\nReturn ONLY valid JSON.",
  };

  const systemPrompt = "You are CT226, a deterministic, physics-informed order-entry transducer.\nYou receive CLEAN, structured text from a digital purchase order.\nYour task: apply the physics gauge map below to extract the LPO and all items with their codes and quantities.\n\n=== PHYSICS GAUGE MAP (only for " + customerType + ") ===\n" + (rules[customerType] || "Extract the most likely item code and order quantity.") + "\n\n=== OUTPUT FORMAT ===\nYour ENTIRE response must be a single line of valid JSON. No markdown, no explanations.\n{\"lpo\":\"string\",\"items\":[{\"code\":\"string\",\"quantity\":integer}]}\nIf no LPO is found, use \"UNKNOWN_LPO\". The quantity must be an integer (round if necessary). Do NOT include any totals - we will calculate them.";

  const userPrompt = "Raw PDF text:\n" + text;

  const resp = await fetch("/nvidia-api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta/llama-3.1-8b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 1024,
    }),
  });
  if (!resp.ok) throw new Error("SLM API error: " + resp.status);

  const data = await resp.json();
  const content = data.choices[0].message.content;
  console.log("[LLAMA-8B OUTPUT]", content);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
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
    if (!parsed) throw new Error("Invalid JSON from SLM");
  }

  return {
    lpo: parsed.lpo || "UNKNOWN_LPO",
    items: (parsed.items || []).map(i => ({
      code: i.code,
      quantity: Math.round(i.quantity) || 0
    }))
  };
};

// ─── SCANNED PDF PIPELINE (vision OCR + 8B extraction) ─────────
const preprocessCropForVision = (cropCanvas) => {
  const ctx = cropCanvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] === 0) {
      data[i] = 255;
      data[i+1] = 255;
      data[i+2] = 255;
      data[i+3] = 255;
      continue;
    }
    const gray = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
    const binary = gray > 128 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = binary;
  }
  ctx.putImageData(imageData, 0, 0);
  return cropCanvas;
};

const extractFromScannedPDF = async (file, customerType) => {
  const prompt = 'This image contains a purchase order. Copy ALL the text from the image exactly as it appears, preserving columns, spaces, and line breaks. Do not add any extra words, explanations, or formatting. Output ONLY the raw text.';

  // ── Majid: server‑side PDF → PNG (bypasses browser canvas) ──
  if (customerType === 'MAJID') {
    console.log('[INFO] Using server‑side PDF renderer for Majid');

    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.time('Server PDF Render');
    const resp = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3001' : '') + '/api/majid-render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64 }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error('Majid render API error: ' + (err.error || resp.status));
    }
    const { image } = await resp.json();
    console.timeEnd('Server PDF Render');

    const dataUrl = 'data:image/png;base64,' + image;

    console.time('Vision OCR');
    const ocrResp = await fetch('/nvidia-api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 2048,
      }),
    });
    if (!ocrResp.ok) throw new Error('Vision OCR error: ' + ocrResp.status);
    const ocrData = await ocrResp.json();
    const ocrText = ocrData.choices[0].message.content;
    console.timeEnd('Vision OCR');
    console.log('[VISION OCR TEXT]', ocrText);

    if (ocrText.length < PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
      throw new Error('OCR text is too short, likely a blank or unreadable image.');
    }

    console.time('8B Extraction');
    const result = await extractViaSLM(ocrText, customerType);
    console.timeEnd('8B Extraction');
    return result;
  }

  // ── Browser pipeline for Chandarana & Quickmart ──
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 3.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  console.time('PDF Render');
  await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
  console.timeEnd('PDF Render');

  console.time('Binarisation');
  preprocessCropForVision(canvas);
  console.timeEnd('Binarisation');

  const dataUrl = canvas.toDataURL('image/png');

  console.time('Vision OCR');
  const resp = await fetch('/nvidia-api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 2048,
    }),
  });
  if (!resp.ok) throw new Error('Vision OCR error: ' + resp.status);
  const data = await resp.json();
  const ocrText = data.choices[0].message.content;
  console.timeEnd('Vision OCR');
  console.log('[VISION OCR TEXT]', ocrText);

  if (ocrText.length < PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
    throw new Error('OCR text is too short, likely a blank or unreadable image.');
  }

  console.time('8B Extraction');
  const result = await extractViaSLM(ocrText, customerType);
  console.timeEnd('8B Extraction');
  return result;
};

// ─── Updated extractFromFile (handles both digital and scanned) ──
const extractFromFile = async (file, customerType) => {
  if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are supported.");
  }

  const VISION_CUSTOMERS = ["MAJID", "CHANDARANA", "QUICKMART"];
  if (VISION_CUSTOMERS.includes(customerType)) {
    console.log("[INFO] Using vision OCR pipeline for scanned PDF (customer: " + customerType + ")");
    return await extractFromScannedPDF(file, customerType);
  }

  // Digital PDF path (original, untouched)
  const arrayBuffer = await file.arrayBuffer();
  const text = await extractTextFromPdf(arrayBuffer);
  console.log("[PDF TEXT]", text);
  if (text.length > PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
    console.log("[INFO] Using digital PDF path with Llama-3.1-8B (NVIDIA)");
    return await extractViaSLM(text, customerType);
  } else {
    throw new Error("This PDF appears to be a scanned document and is not yet supported for this customer.");
  }
};

// ─── PUBLIC API (unchanged) ─────────────────────────────────────
const parsePOFromDroppedFile = async (file, customerCode = null, customerType = "NAIVAS") => {
  const detected = detectCustomerTypeByCode(customerCode, customerType);
  if (detected !== customerType) customerType = detected;
  const aiOutput = await extractFromFile(file, customerType);
  return parsePOTextFromParsedJSON(aiOutput, customerCode, customerType);
};

const parsePOTextFromParsedJSON = async (parsedAI, customerCode, customerType) => {
  let lpoNumber = parsedAI.lpo || "UNKNOWN_LPO";
  if (customerType === "CLEANSHELF" && lpoNumber.includes(",")) lpoNumber = lpoNumber.replace(/,/g, "");
  if (customerType === "NAIVAS" && lpoNumber.endsWith("-1")) lpoNumber = lpoNumber.slice(0, -2);

  const items = (parsedAI.items || []).map(item => ({
    ocrItemCode: item.code,
    actualItemCode: getFGCode(item.code, customerType),
    quantity: Math.round(item.quantity) || 0,
    foundQuantity: item.quantity || 0,
    productName: getProductName(item.code, customerType),
    method: "slm",
  }));

  console.log("[INFO] Extracted " + items.length + " items.");

  const products = await getProductsByCustomer(customerType);
  const resultItems = [];
  let totalValue = 0;
  for (const found of items) {
    const product = products.find(p => p.itemCode === found.actualItemCode);
    if (product) {
      const itemValue = found.quantity * (product.itemPrice || 0);
      totalValue += itemValue;
      resultItems.push({
        description: found.productName || product.itemName || "Unknown Product",
        product,
        quantity: found.quantity,
        status: "matched",
        unitPrice: product.itemPrice || 0,
        netAmount: itemValue,
        fgCode: found.actualItemCode,
        ocrDetails: { ocrItemCode: found.ocrItemCode, foundQuantity: found.foundQuantity, method: found.method },
      });
    } else {
      console.log("[WARN] No product found for FG code: " + found.actualItemCode);
    }
  }

  return {
    customer: customerCode,
    items: resultItems,
    lpoNumber,
    customerType,
    detectedFormat: "PHYSICS_PIPELINE",
    parsingErrors: [],
    summary: { totalItems: resultItems.length, totalQuantity: resultItems.reduce((s,i)=>s+i.quantity,0), totalAmount: totalValue, matchedItems: resultItems.length },
  };
};

// ─── MANUAL TEXT INPUT (unchanged) ───────────────────────────────
const findItemsAndQuantities = async (text, customerType = "NAIVAS") => {
  const systemPrompt = "You are CT226, a deterministic order-entry transducer.\n=== LAWS OF EXTRACTION (PHYSICS GAUGE MAP) ===\nExtract LPO and items strictly per this map.\nMajid      : LPO=\"ORDER :\", Code=\"BAR CODE\", Qty=\"QTY UC\"\nChandarana : LPO=\"Order No. :\", Code=\"Bar Code\", Qty=\"Quantity\" (not Scan Qty)\nQuickmart  : LPO=\"PURCHASE ORDER #\", Code=\"Scan Code\", Qty=\"Order Qty\"\nKhetia     : LPO=\"PURCHASE ORDER #\", Code=\"YOUR Code\", Qty=\"Order Qty\"\nJazaribu   : LPO=\"Order No.\" or \"PO-J\", Code=\"No.\" (JT), Qty=\"Quantity\"\nCleanshelf Pending : LPO=\"LPO No.\" (remove commas), Code=\"Code\", Qty=\"Orderd Qty.\"\nCleanshelf Local   : LPO=\"L. P. O. No:\" (keep CLS -), Code=\"CODE\", Qty=\"Pieces\"\nNaivas     : LPO=\"P\" + 8-9 digits (strip \"-1\" suffix), Code=\"Item Code\", Qty=\"Quantity\"\n\n=== OUTPUT FORMAT ===\nReturn ONLY JSON: {\"lpo\":\"string\",\"confidence\":0.0-1.0,\"items\":[{\"code\":\"string\",\"quantity\":integer}]}";

  const userPrompt = "Customer: " + customerType + "\n" + text;
  const resp = await fetch("/nvidia-api/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta/llama-3.1-8b-instruct",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0, max_tokens: 1024,
    }),
  });
  if (!resp.ok) throw new Error("AI Transducer API error: " + resp.status);
  const data = await resp.json();
  const content = data.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) try { parsed = JSON.parse(fence[1]); } catch (e2) {}
    if (!parsed) {
      const start = content.indexOf("{"), end = content.lastIndexOf("}");
      if (start !== -1 && end > start) try { parsed = JSON.parse(content.substring(start, end + 1)); } catch (e3) {}
    }
    if (!parsed) throw new Error("Invalid JSON from Transducer");
  }
  return { lpo: parsed.lpo || "UNKNOWN_LPO", confidence: parsed.confidence || 0.0, items: (parsed.items || []).map(i => ({ code: i.code, quantity: Math.round(i.quantity) })) };
};

const parsePOText = async (text, customerCode = null, customerType = "NAIVAS") => {
  const detected = detectCustomerTypeByCode(customerCode, text);
  if (detected !== customerType) customerType = detected;
  const aiOutput = await findItemsAndQuantities(text, customerType);
  return parsePOTextFromParsedJSON(aiOutput, customerCode, customerType);
};

// ─── PRODUCT FETCHING & ORDER CREATION ──────────────────────────
const getProductsByCustomer = async (customerType = "NAIVAS") => {
  const priceList = CUSTOMER_PRICE_LISTS[customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST;
  if (cachedProducts[customerType]) return cachedProducts[customerType];
  const resp = await apiClient.get("/item/listByPrice/" + encodeURIComponent(priceList));
  const products = resp.data && resp.data.payload ? resp.data.payload : (resp.data || []);
  cachedProducts[customerType] = products;
  setTimeout(() => { cachedProducts[customerType] = null; }, PERFORMANCE_SETTINGS.PRODUCT_CACHE_DURATION);
  return products;
};

const createOrderFromPO = async (poData, warehouse = DEFAULT_SETTINGS.WAREHOUSE) => {
  const matched = poData.items.filter(i => i.status === "matched");
  if (matched.length < VALIDATION_SETTINGS.MIN_ITEM_COUNT) throw new Error("No matched items found");
  const orderItems = matched.map(item => ({ item: item.product, quantity: item.quantity, amount: item.netAmount || item.product.itemPrice * item.quantity }));
  const totalAmount = orderItems.reduce((s,i)=>s+i.amount,0);
  const due = new Date(Date.now() + 24*60*60*1000);
  const dueDate = due.getFullYear() + "-" + String(due.getMonth()+1).padStart(2,'0') + "-" + String(due.getDate()).padStart(2,'0') + "T00:00:00.000Z";
  const payload = {
    customer: poData.customer, orderType: DEFAULT_SETTINGS.ORDER_TYPE,
    sellingPriceList: CUSTOMER_PRICE_LISTS[poData.customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST,
    dueDate, isTopUp: DEFAULT_SETTINGS.IS_TOP_UP, warehouse, remarks: DEFAULT_SETTINGS.REMARKS,
    lpo: poData.lpoNumber !== "UNKNOWN_LPO" ? poData.lpoNumber : null, items: orderItems,
  };
  const resp = await apiClient.post("/orders/create", payload);
  return { success: true, orderNumber: resp.data && resp.data.payload ? resp.data.payload : "Unknown", totalAmount, totalQuantity: orderItems.reduce((s,i)=>s+i.quantity,0) };
};

const setupDragAndDrop = (element, callback) => {
  if (!element) return;
  ["dragenter","dragover","dragleave","drop"].forEach(ev => { element.addEventListener(ev, e => e.preventDefault()); document.addEventListener(ev, e => e.preventDefault()); });
  element.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file && /\.(png|jpg|jpeg|webp|txt|pdf)$/i.test(file.name)) callback(file);
    else alert("Please drop a PDF, image, or text file.");
  });
};

// ─── Exports ────────────────────────────────────────────────────
export default {
  getProductsByCustomer, parsePOText, parsePOFromDroppedFile, parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: parsePOText, createOrderFromPO, setupDragAndDrop,
  processDroppedFile: parsePOFromDroppedFile, findItemsAndQuantities, getFGCode, getProductName,
  getConfig: () => ({ DEFAULT_SETTINGS, PERFORMANCE_SETTINGS, VALIDATION_SETTINGS, CUSTOMER_PRICE_LISTS }),
};