import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";
import { getFGCode as getFGCodeFromStandard } from "@utils/StandardModel.js";

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

// ─── Customer code lists (for entanglement & price list selection) ──
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

// ─── Core physics functions ──────────────────────────────────────

const getFGCode = (itemCode) => getFGCodeFromStandard(itemCode) || `UNKNOWN_${itemCode}`;

const getProductName = (itemCode, customerType = "NAIVAS") => {
  const special = {
    CLEANSHELF: `Cleanshelf Product ${itemCode}`,
    JAZARIBU: `Jazaribu Product ${itemCode}`,
    KHETIA: `Khetia Product ${itemCode}`,
    MAJID: `Majid Product ${itemCode}`,
    CHANDARANA: `Chandarana Product ${itemCode}`,
    QUICKMART: `Quickmart Product ${itemCode}`,
  };
  return special[customerType] || ITEM_NAMES_MAPPING[itemCode] || `Product ${itemCode}`;
};

const detectCustomerTypeByCode = (customerCode = null, text = "") => {
  if (!customerCode) {
    // fallback to text indicators (kept for backward compatibility)
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
  return "NAIVAS"; // default
};

const auditAndValidate = (aiOutput, customerType) => {
  return { status: "valid", errors: [], warnings: [], confidence: aiOutput.confidence || 0.0 };
};

// ─── AI Transducer ──────────────────────────────────────────────

const findItemsAndQuantities = async (text, customerType = "NAIVAS") => {
  const systemPrompt = `You are CT226, a deterministic, physics-informed order-entry transducer for DDS.
You receive clean, structured text from a pixel-based OCR sensor.
Your task: map the text into the invariant JSON of the CT226 universe.
You are given a Customer Name. Trust it. Do not infer the customer.

=== LAWS OF EXTRACTION (PHYSICS GAUGE MAP) ===
Extract LPO and items strictly per this map.
Majid      : LPO="ORDER :", Code="BAR CODE", Qty="QTY UC"
Chandarana : LPO="Order No. :", Code="Bar Code", Qty="Scan Qty"
Quickmart  : LPO="PURCHASE ORDER #", Code="Scan Code", Qty="Order Qty"
Khetia     : LPO="PURCHASE ORDER #", Code="YOUR Code", Qty="Order Qty"
Jazaribu   : LPO="Order No." or "PO‑J", Code="No." (JT), Qty="Quantity"
Cleanshelf Pending : LPO="LPO No." (remove commas), Code="Code", Qty="Orderd Qty."
Cleanshelf Local   : LPO="L. P. O. No:" (keep CLS -), Code="CODE", Qty="Pieces"
Naivas     : LPO="P" + 8–9 digits (strip "-1" suffix), Code="Item Code", Qty="Quantity"

=== OUTPUT FORMAT ===
Return ONLY a JSON object. No markdown, no extra fields.
{"lpo":"string","confidence":0.0-1.0,"items":[{"code":"string","quantity":integer}]}
If no LPO: use "UNKNOWN_LPO" and 0.0. Round decimals. Never guess.
If blank: {"lpo":"VACUUM_STATE","confidence":0.0,"items":[]}.`;

  const userPrompt = `Customer: ${customerType}\n${text}`;
  const resp = await fetch("/nvidia-api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nvidia/nemotron-mini-4b-instruct",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0,
      max_tokens: 1024,
    }),
  });
  if (!resp.ok) throw new Error(`AI Transducer API error: ${resp.status}`);
  const data = await resp.json();
  const content = data.choices[0].message.content;
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) parsed = JSON.parse(fence[1]);
    if (!parsed) throw new Error("Invalid JSON from Transducer");
  }
  const items = (parsed.items || []).map(item => ({
    ocrItemCode: item.code,
    actualItemCode: getFGCode(item.code, customerType),
    quantity: Math.round(item.quantity) || 0,
    foundQuantity: item.quantity || 0,
    productName: `Product ${item.code}`,
    method: "ai-transducer",
  }));
  console.log(">>> AI TRANSDUCER OUTPUT (raw JSON):", parsed);
  console.log(`AI Transducer extracted ${items.length} items.`);
  return { lpo: parsed.lpo || "UNKNOWN_LPO", confidence: parsed.confidence || 0.0, items };
};

// ─── Pixel pipeline (PDF/Image → Canvas → OCR) ────────────────

const extractTextWithNvidiaOCR = async (base64Image) => {
  console.log(">>> Sending image to nemotron-ocr-v2");
  const resp = await fetch("/nvidia-cv/nvidia/nemotron-ocr-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ input: [{ type: "image_url", url: base64Image }] }),
  });
  if (!resp.ok) {
    throw new Error(`OCR API error: ${resp.status}`);
  }
  const data = await resp.json();
  console.log(">>> OCR completed, text detections count:", data.data[0].text_detections.length);
  const ocrText = data.data[0].text_detections.map(t => t.text_prediction.text).join("\n");
  console.log(">>> FULL OCR OUTPUT (text):", ocrText);
  return ocrText;
};

const processDroppedFile = async (file) => {
  console.log("Processing dropped file:", file.name, file.type);

  // PDF → canvas → OCR
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    console.log(">>> PDF block entered (pixel pipeline)");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      fullText += await extractTextWithNvidiaOCR(base64) + "\n";
    }
    return fullText.trim();
  }

  // Image → OCR directly
  if (file.type.startsWith("image/")) {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    return await extractTextWithNvidiaOCR(base64);
  }

  // Plain text fallback
  if (file.type === "text/plain") {
    return await file.text();
  }

  throw new Error("Unsupported file type");
};

// ─── Order creation ─────────────────────────────────────────────

const getProductsByCustomer = async (customerType = "NAIVAS") => {
  const priceList = CUSTOMER_PRICE_LISTS[customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST;
  console.log("[DEBUG] getProductsByCustomer - priceList:", priceList);
  if (cachedProducts[customerType]) {
    console.log("[DEBUG] getProductsByCustomer - using cache, count:", cachedProducts[customerType].length);
    return cachedProducts[customerType];
  }
  const resp = await apiClient.get(`/item/listByPrice/${encodeURIComponent(priceList)}`);
  console.log("[DEBUG] getProductsByCustomer - raw response status:", resp.status);
  console.log("[DEBUG] getProductsByCustomer - payload type:", typeof resp.data?.payload);
  console.log("[DEBUG] getProductsByCustomer - payload length:", resp.data?.payload?.length);
  const products = resp.data?.payload || resp.data || [];
  console.log("[DEBUG] getProductsByCustomer - products length after extraction:", products.length);
  cachedProducts[customerType] = products;
  setTimeout(() => { cachedProducts[customerType] = null; }, PERFORMANCE_SETTINGS.PRODUCT_CACHE_DURATION);
  return products;
};

const parsePOText = async (text, customerCode = null, customerType = "NAIVAS") => {
  const detected = detectCustomerTypeByCode(customerCode, text);
  if (detected !== customerType) customerType = detected;

  // Classical Filter (OCR entropy reduction)
  let ocrLines = text;
  try {
    const json = JSON.parse(text);
    if (json.data?.[0]?.text_detections) {
      ocrLines = json.data[0].text_detections
        .filter(item => item.text_prediction.confidence > 0.80)
        .map(item => item.text_prediction.text)
        .join("\n")
        .substring(0, 2800);
    }
  } catch (e) { /* fallback to plain text */ }

  const aiOutput = await findItemsAndQuantities(ocrLines, customerType);
  const audit = auditAndValidate(aiOutput, customerType);
  console.log("[DEBUG] parsePOText: audit status =", audit.status);
  const lpoNumber = aiOutput.lpo || "UNKNOWN_LPO";

  if (audit.status === "flagged") {
    return { status: "flagged", physicsErrors: audit.errors, physicsWarnings: audit.warnings, lpo: aiOutput.lpo, items: aiOutput.items, confidence: audit.confidence };
  }
  if (audit.status === "vacuum") {
    return { status: "vacuum", lpo: "UNKNOWN_LPO", items: [] };
  }

  // audit.status === "valid"
  console.log(`[DEBUG] parsePOText: fetching products for ${customerType} with price list ${CUSTOMER_PRICE_LISTS[customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST}`);
  console.log("[DEBUG] parsePOText: about to fetch products");
  const products = await getProductsByCustomer(customerType);
  console.log(`[DEBUG] parsePOText: products fetched = ${products.length}`);
  const items = [];
  let totalValue = 0;
  for (const found of aiOutput.items) {
    const product = products.find(p => p.itemCode === found.actualItemCode);
    if (product) {
      const itemValue = found.quantity * (product.itemPrice || 0);
      totalValue += itemValue;
      items.push({
        description: found.productName || product.itemName || "Unknown Product",
        product,
        quantity: found.quantity,
        status: "matched",
        unitPrice: product.itemPrice || 0,
        netAmount: itemValue,
        fgCode: found.actualItemCode,
        ocrDetails: {
          ocrItemCode: found.ocrItemCode,
          foundQuantity: found.foundQuantity,
          method: found.method,
          lineNumber: found.lineNumber,
          productName: found.productName,
        },
      });
    } else {
      console.log(`No product found for FG code: ${found.actualItemCode}`);
    }
  }

  return {
    customer: customerCode,
    items,
    lpoNumber,
    customerType,
    detectedFormat: "PHYSICS_PIPELINE",
    parsingErrors: [],
    summary: { totalItems: items.length, totalQuantity: items.reduce((s, i) => s + i.quantity, 0), totalAmount: totalValue, matchedItems: items.length },
  };
};

const parsePOFromDroppedFile = async (file, customerCode = null, customerType = "NAIVAS") => {
  const text = await processDroppedFile(file);
  if (!text?.trim()) throw new Error("No text extracted from file");
  return parsePOText(text, customerCode, customerType);
};

const createOrderFromPO = async (poData, warehouse = DEFAULT_SETTINGS.WAREHOUSE) => {
  const matched = poData.items.filter(i => i.status === "matched");
  if (matched.length < VALIDATION_SETTINGS.MIN_ITEM_COUNT) throw new Error("No matched items found");

  const orderItems = matched.map(item => ({
    item: item.product,
    quantity: item.quantity,
    amount: item.netAmount || item.product.itemPrice * item.quantity,
  }));

  const totalAmount = orderItems.reduce((s, i) => s + i.amount, 0);
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dueDate = `${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}T00:00:00.000Z`;

  const payload = {
    customer: poData.customer,
    orderType: DEFAULT_SETTINGS.ORDER_TYPE,
    sellingPriceList: CUSTOMER_PRICE_LISTS[poData.customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST,
    dueDate,
    isTopUp: DEFAULT_SETTINGS.IS_TOP_UP,
    warehouse,
    remarks: DEFAULT_SETTINGS.REMARKS,
    lpo: poData.lpoNumber !== "UNKNOWN_LPO" ? poData.lpoNumber : null,
    items: orderItems,
  };

  const resp = await apiClient.post("/orders/create", payload);
  return { success: true, orderNumber: resp.data?.payload || "Unknown", totalAmount, totalQuantity: orderItems.reduce((s, i) => s + i.quantity, 0) };
};

const setupDragAndDrop = (element, callback) => {
  if (!element) return;
  ["dragenter", "dragover", "dragleave", "drop"].forEach(ev => {
    element.addEventListener(ev, e => e.preventDefault());
    document.addEventListener(ev, e => e.preventDefault());
  });
  element.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    if (file && /\.(png|jpg|jpeg|webp|txt|pdf)$/i.test(file.name)) callback(file);
    else alert("Please drop a PDF, image, or text file.");
  });
};

// ─── Exports ────────────────────────────────────────────────────

export default {
  getProductsByCustomer,
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: parsePOText,
  createOrderFromPO,
  setupDragAndDrop,
  processDroppedFile,
  findItemsAndQuantities,
  getFGCode,
  getProductName,
  getConfig: () => ({ DEFAULT_SETTINGS, PERFORMANCE_SETTINGS, VALIDATION_SETTINGS, CUSTOMER_PRICE_LISTS }),
};
