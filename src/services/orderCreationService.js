import apiClient from "@services/api.js";
import lagrangianService from "@services/lagrangianService.js";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";
pdfjsLib.GlobalWorkerOptions.wasmUrl = "/pdfjs/";
import { getFGCode as getFGCodeFromStandard, STANDARD_MODEL } from "@utils/StandardModel.js";
import { supabase } from './supabaseClient';

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

const VISION_MODEL = "meta/llama-3.2-11b-vision-instruct";

// ─── NVIDIA API helper — routes through Lagrangian when active ──
const callNvidiaAPI = async (body, isVision = false) => {
  if (lagrangianService.isActive()) {
    const resp = await fetch('/api/lagrangian', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'proxy-nvidia',
        body: { endpoint: '/chat/completions', data: body }
      }),
    });
    if (!resp.ok) throw new Error('NVIDIA API error: ' + resp.status);
    return await resp.json();
  }

  const resp = await fetch('/nvidia-api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error('NVIDIA API error: ' + resp.status);
  return await resp.json();
};

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

// ─── SLM EXTRACTION (8B model fallback) ──────────────────────────
const extractViaSLM = async (text, customerType) => {
  const rules = {
    NAIVAS: "Customer: Naivas Ltd.\nColumns: Item Code (e.g., 13505757 or N051055), Bar Code, Description, Unit (PCS), Quantity, Unit Price, Net Amount.\nLPO: appears as 'P' followed by 8-9 digits (e.g., P038449364). It may have a trailing '-1', which must be stripped.\nExtract the Item Code (not the Bar Code). For quantity, use the number AFTER the word 'PCS'.\nReturn ONLY valid JSON.",
    KHETIA: "Customer: Khetia Drapers Ltd.\nColumns: YOUR Code (6-digit item code), Description, Order Qty (the REAL order quantity, always followed by 'PCS'), Packing (ignore, e.g., '1 PCS * 8 PAIR').\nLPO: a 7-digit number (e.g., 2520950) near 'PURCHASE ORDER #' or at the top.\nCRITICAL: The LPO is NEVER a 6-digit number. If you see a 6-digit number, that is an ITEM CODE, not the LPO. The LPO is a 7-digit number.\nExtract YOUR Code. For quantity, use the FIRST number that is immediately followed by 'PCS'. Ignore any numbers in the Packing column.\nReturn ONLY valid JSON.",
    JAZARIBU: "Customer: Jazaribu Retail.\nColumns: Barcode, No. (JT code, e.g., JT01098), Description, Quantity (the number right before 'PIECES'), Unit of Measure (PIECES), Cost, Amount.\nIMPORTANT: There are MULTIPLE items. Look at ALL lines that contain a JT code (like JT01098, JT01097, etc.). Extract EVERY JT code you find, along with its quantity.\nLPO: appears as 'PO-J' followed by 3-3-6 digits (e.g., PO-J020-000253). It may be on the line after 'Order No.'.\nExtract the JT code. For quantity, use ONLY the number that appears immediately before the word 'PIECES'. Do NOT use any number from the description (like 400Gm).\nReturn ONLY valid JSON with ALL items.",
    CLEANSHELF: "Customer: Cleanshelf Supermarkets.\nThere are two formats:\n1. Local Purchase Order:\n   - Text layout: Amount, Unit Price, Code (4003xxx), Description, Pack (ignore), Pieces (use).\n   - LPO: appears as 'CLS - ' followed by 5-6 digits (e.g., CLS - 91213).\n   - For each line with a 4003xxx code, ignore numbers before the code. After the code and description, there are two numbers: Pack (ignore) and Pieces (use). Use the Pieces number.\n2. Pending Purchase Order:\n   - Columns: numbers before the code (Outstanding, Orderd Qty., Received), then Code (4003xxx), Description.\n   - LPO: appears as a number with optional commas next to 'LPO No.' (e.g., 111,638 LPO No.). The number is usually BEFORE the words 'LPO No.'.\n   - For each line with a 4003xxx code, use the second of the three numbers before the code (Orderd Qty.).\nFor both formats, extract the Code and the correct quantity. LPO: if local, prepend 'CLS - '. For pending, remove commas from the LPO number.\nReturn ONLY valid JSON.",
    CHANDARANA: "Customer: Chandarana.\nColumns: Bar Code (13 digits), Description, Quantity (real order quantity). Ignore any 'Scan Qty' column.\nLPO: appears after 'Order No.'.\nExtract the Bar Code and the Quantity.\nReturn ONLY valid JSON.",
    MAJID: "Customer: Majid (Carrefour).\nColumns: BAR CODE (13 digits), QTY UC (the order quantity).\nLPO: appears after 'ORDER :'.\nExtract the BAR CODE and the QTY UC.\nReturn ONLY valid JSON.",
    QUICKMART: "Customer: Quickmart Ltd.\nColumns: Code (short number like 700103 – IGNORE this column), Scan Code (13-digit barcode – use THIS as the item code), Description, Packing (always '1 PCS' – ignore), Order Qty (the real order quantity, always followed by 'PCS' and after the description), Unit, Agreed Invoice Price, Total.\nExample: line \"700103 6161102320268 ... 4.00 PCS ...\" → code 6161102320268, quantity 4.\nLPO: appears after 'PURCHASE ORDER #' as a pattern like XXX-XXXXXXXX (e.g., 016-00057714).\nExtract the Scan Code (13-digit) for each item. Do NOT use the short Code column.\nFor quantity, use the Order Qty (the number immediately before 'PCS' that appears after the description, NOT the '1 PCS' packing column).\nReturn ONLY valid JSON.",
  };

  const systemPrompt = "You are CT226, a deterministic, physics-informed order-entry transducer.\nYou receive CLEAN, structured text from a digital purchase order.\nYour task: apply the physics gauge map below to extract the LPO and all items with their codes and quantities.\n\n=== PHYSICS GAUGE MAP (only for " + customerType + ") ===\n" + (rules[customerType] || "Extract the most likely item code and order quantity.") + "\n\n=== OUTPUT FORMAT ===\nYour ENTIRE response must be a single line of valid JSON. No markdown, no explanations.\n{\"lpo\":\"string\",\"items\":[{\"code\":\"string\",\"quantity\":integer}]}\nIf no LPO is found, use \"UNKNOWN_LPO\". The quantity must be an integer (round if necessary). Do NOT include any totals - we will calculate them.";

  const userPrompt = "Raw PDF text:\n" + text;

  const data = await callNvidiaAPI({
    model: "meta/llama-3.1-8b-instruct",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0,
    max_tokens: 1024,
  });

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

// ─── DETERMINISTIC REGEX EXTRACTION ──────────────────────────────
const normaliseText = (text) => {
  return text
    .toUpperCase()
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/O(?=\d)/g, "0")
    .replace(/[lI](?=\d)/g, "1")
    .replace(/U(?=\d{13})/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");
};

const extractNaivas = (text) => {
  const lpoMatch = text.match(/P\d{8,9}(?:-\d+)?/g);
  let lpo = "UNKNOWN_LPO";
  if (lpoMatch) {
    lpo = lpoMatch[0];
    if (lpo.endsWith("-1")) lpo = lpo.slice(0, -2);
  }

  const items = [];
  const lines = text.split("\n");
  const itemRegex = /^(135\d{5}|N\d{6})\s+[^\n]+?\s+PCS\s+(\d+)\.\d{2}/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(itemRegex);
    if (match) {
      items.push({ code: match[1], quantity: parseInt(match[2], 10) });
    }
  }

  return { lpo, items };
};

const extractJazaribu = (text) => {
  const lpoMatch = text.match(/PO-J\d{3}-\d{6}/i);
  const lpo = lpoMatch ? lpoMatch[0] : "UNKNOWN_LPO";

  const items = [];
  const lines = text.split("\n");
  const itemRegex = /^(\d{13})\s+(JT\d{5})\s+(.+?)\s+(\d+)\s+PIECES/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(itemRegex);
    if (match) {
      items.push({ code: match[2], quantity: parseInt(match[4], 10) });
    }
  }

  return { lpo, items };
};

const extractCleanshelfLocal = (text) => {
  const lpoMatch = text.match(/(\d+)\s*L\.\s*P\.\s*O\.\s*No:/i);
  let lpo = "UNKNOWN_LPO";
  if (lpoMatch) {
    lpo = `CLS - ${lpoMatch[1]}`;
  }

  const items = [];
  const itemRegex = /(4003\d{2})\s+(.+?)\s+(\d+)\s+(\d+)\s*$/gm;

  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({ code: match[1], quantity: parseInt(match[4], 10) });
  }

  return { lpo, items };
};

const extractCleanshelfPending = (text) => {
  const lpoMatch = text.match(/([\d,]+)\s*LPO\s*No\.?/i);
  let lpo = "UNKNOWN_LPO";
  if (lpoMatch) {
    lpo = lpoMatch[1].replace(/,/g, "");
  }

  const items = [];
  const itemRegex = /(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(4003\d{2})/g;

  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({
      code: match[4],
      quantity: Math.round(parseFloat(match[2]))
    });
  }

  return { lpo, items };
};

const extractKhetia = (text) => {
  const lpoMatch = text.match(/\b(\d{7})\b/);
  const lpo = lpoMatch ? lpoMatch[1] : "UNKNOWN_LPO";

  const items = [];
  const lines = text.split("\n");
  const itemRegex = /^(\d{6})\s+(.+?)\s+(\d+)\.\d{2}\s+PCS/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(itemRegex);
    if (match) {
      items.push({ code: match[1], quantity: parseInt(match[3], 10) });
    }
  }

  return { lpo, items };
};

const extractQuickmart = (text) => {
  const outletMatch = text.match(/QUICK\s*MART\s+([A-Z\s]+?)\s*BRANCH/i);
  const outlet = outletMatch ? outletMatch[1].trim() : "UNKNOWN_OUTLET";

  const lpoMatch = text.match(/PURCHASE\s*ORDER\s*#\s*(\d{3}-\d{8})/i);
  const lpo = lpoMatch ? lpoMatch[1] : "UNKNOWN_LPO";

  const items = [];
  const lines = text.split("\n");
  const lineRegex = /(\d{13})\s+(.+?)\s+1\s+PCS\s+(\d+(?:\.\d+)?)\s+PCS/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(lineRegex);
    if (match) {
      items.push({
        code: match[1],
        description: match[2] || '',
        quantity: Math.round(parseFloat(match[3]))
      });
    }
  }

  return { outlet, lpo, items };
};

const extractChandarana = (text) => {
  const outletMatch = text.match(/Delivery\s*To\s*[-–]\s*([^\n]+)/i);
  const outlet = outletMatch ? outletMatch[1].trim() : "UNKNOWN_OUTLET";

  const lpoMatch = text.match(/Order\s*No\.\s*&\s*Date\s*-\s*(\d{13,14})/i);
  const lpo = lpoMatch ? lpoMatch[1] : "UNKNOWN_LPO";

  const items = [];
  const lines = text.split("\n");
  const lineRegex = /^(\d+)\s+(\d{13})\s+.*?\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(lineRegex);
    if (match) {
      items.push({
        code: match[2],
        quantity: Math.round(parseFloat(match[6]))
      });
    }
  }

  return { outlet, lpo, items };
};

const extractMajid = (text) => {
  const outletMatch = text.match(/DELIVERED\s*TO\s*:\s*([^\n]+)/i);
  const outlet = outletMatch ? outletMatch[1].trim() : "UNKNOWN_OUTLET";

  let lpoMatch = text.match(/ORDER\s*:\s*(\d+)/i);
  if (!lpoMatch) {
    lpoMatch = text.match(/ORDER\s*\n\s*(\d{8})/i);
  }
  if (!lpoMatch) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'ORDER') {
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const candidate = lines[j].replace(/[^0-9]/g, '');
          if (/^\d{8}$/.test(candidate)) {
            lpoMatch = [null, candidate];
            break;
          }
        }
        if (lpoMatch) break;
      }
    }
  }
    let lpo = lpoMatch ? lpoMatch[1] : "UNKNOWN_LPO";

  // Fallback: pick first standalone 8-digit number starting with 26.
  if (lpo === "UNKNOWN_LPO") {
    const allLines = text.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of allLines) {
      const digits = line.replace(/[^0-9]/g, '');
      if (/^26\d{6}$/.test(digits) && !/DATE|DELIVERY|DEADLINE|TRN|PIN/i.test(line)) {
        lpo = digits;
        break;
      }
    }
  }  const items = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Pipe layout: barcode | ref | fam | description | qty | price...
  const pipeLayoutRegex = /^\|?\s*U?(\d{12,14})\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*[^|]+\|\s*(\d{1,2})\s*\|/;
  for (const line of lines) {
    const m = line.match(pipeLayoutRegex);
    if (m) {
      items.push({ code: m[1], quantity: parseInt(m[2], 10) });
    }
  }
  if (items.length > 0) {
    return { outlet, lpo, items };
  }

  // Vertical layout: barcode on its own line, followed by ref, fam, description, quantity
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const barcodeMatch = line.match(/^U?(\d{12,14})$/);
    if (!barcodeMatch) continue;

    const code = barcodeMatch[1];
    let description = null;
    let quantity = null;

    for (let j = i + 1; j < lines.length && j < i + 15; j++) {
      const cur = lines[j];

      if (/^U?\d{13}$/.test(cur)) break;

      if (!description && /[A-Z]/.test(cur) && !/^\d+(\.\d+)?$/.test(cur)) {
        description = cur;

        for (let k = j + 1; k < lines.length && k < j + 6; k++) {
          const numLine = lines[k];
          if (/^\d{1,2}$/.test(numLine)) {
            quantity = parseInt(numLine, 10);
            break;
          }
          if (/^U?\d{13}$/.test(numLine)) break;
        }

        break;
      }
    }

    if (quantity !== null) {
      items.push({ code, quantity });
    }
  }

  if (items.length > 0) {
    return { outlet, lpo, items };
  }

  // Compact / pipe layout fallback
  const pipeRegex = /^U?(\d{13})\s+\d+\s+\d+\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|/;
  const simpleRegex = /^U?(\d{12,14})\s+\d+\s+\d+\s+(.+?)\s+(\d+)\s+[\d.]+/;

  for (const rawLine of lines) {
    let match = rawLine.match(pipeRegex);
    if (!match) match = rawLine.match(simpleRegex);
    if (match) {
      items.push({
        code: match[1],
        quantity: parseInt(match[3], 10)
      });
    }
  }

  return { outlet, lpo, items };
};

const extractMajidDigital = (text) => {
  const lpoMatch = text.match(/[A-Z]+(\d{8})/);
  const lpo = lpoMatch ? lpoMatch[1] : "UNKNOWN_LPO";

  const items = [];
  const barcodeRegex = /(616\d{10})/g;
  let match;

  while ((match = barcodeRegex.exec(text)) !== null) {
    const barcode = match[1];

    const afterStart = match.index + barcode.length;
    const after = text.slice(afterStart, afterStart + 40);
    const qtyMatch = after.match(/^01021009001000000(\d{2})/);

    if (qtyMatch) {
      items.push({
        code: barcode,
        quantity: parseInt(qtyMatch[1], 10)
      });
    }
  }

  return { outlet: "", lpo, items };
};

const extractViaRegex = (rawText, customerType) => {
  const text = normaliseText(rawText);
  let result = null;

  switch (customerType) {
    case "NAIVAS":
      result = extractNaivas(text);
      break;
    case "JAZARIBU":
      result = extractJazaribu(text);
      break;
    case "CLEANSHELF":
      if (/CLS\s*-\s*\d+/i.test(text)) {
        result = extractCleanshelfLocal(text);
      } else if (/LPO\s*No\.?/i.test(text)) {
        result = extractCleanshelfPending(text);
      }
      break;
    case "KHETIA":
      result = extractKhetia(text);
      break;
    case "MAJID":
      if (/[A-Z]+\d{8}/.test(text) && !/DELIVERED\s*TO/i.test(text)) {
        result = extractMajidDigital(text);
      } else {
        result = extractMajid(text);
      }
      break;
    case "CHANDARANA":
      result = extractChandarana(text);
      break;
    case "QUICKMART":
      result = extractQuickmart(text);
      break;
    default:
      result = null;
  }

  if (result && (result.items.length === 0 || result.lpo === "UNKNOWN_LPO")) {
    return null;
  }

  return result;
};

// ─── SCANNED PDF PIPELINE (NVIDIA Vision OCR primary) ─────────────
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
  const prompt = 'This image contains a purchase order. Extract and output EVERY line of text exactly as it appears, preserving columns, spaces, line breaks, and ALL numbers. Do NOT summarize, skip, truncate, or omit any line, even if it looks like a date, phone, TRN, PIN, or ORDER number. Output ONLY the raw text from the image, starting from the first line to the last line.';

  if (customerType === 'MAJID') {
    console.log('[INFO] Using server‑side PDF renderer for Majid');
    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.time('Server PDF Render');
    const resp = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3001' : '') + '/api/majid-render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
    const ocrData = await callNvidiaAPI({
      model: VISION_MODEL,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      temperature: 0,
      max_tokens: 4096,
    }, true);
    const ocrText = ocrData.choices[0].message.content;
    console.timeEnd('Vision OCR');
    console.log('[VISION OCR TEXT]', ocrText);

    if (ocrText.length < PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
      throw new Error('OCR text is too short, likely a blank or unreadable image.');
    }

    const regexResult = extractViaRegex(ocrText, customerType);
    if (regexResult) return regexResult;

    console.time('8B Extraction');
    const result = await extractViaSLM(ocrText, customerType);
    console.timeEnd('8B Extraction');
    return result;
  }

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
  const data = await callNvidiaAPI({
    model: VISION_MODEL,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    temperature: 0,
    max_tokens: 4096,
  }, true);
  const ocrText = data.choices[0].message.content;
  console.timeEnd('Vision OCR');
  console.log('[VISION OCR TEXT]', ocrText);

  if (ocrText.length < PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
    throw new Error('OCR text is too short, likely a blank or unreadable image.');
  }

  const regexResult = extractViaRegex(ocrText, customerType);
  if (regexResult) return regexResult;

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

  const arrayBuffer = await file.arrayBuffer();
  const text = await extractTextFromPdf(arrayBuffer);
  console.log("[PDF TEXT]", text);
  if (text.length > PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH) {
    console.log("[INFO] Using deterministic regex extraction for " + customerType);
    const regexResult = extractViaRegex(text, customerType);
    if (regexResult) {
      return regexResult;
    } else {
      console.log("[WARN] Regex extraction failed, falling back to LLM");
      return await extractViaSLM(text, customerType);
    }
  } else {
    throw new Error("This PDF appears to be a scanned document and is not yet supported for this customer.");
  }
};

// ─── PUBLIC API ─────────────────────────────────────────────────
const parsePOFromDroppedFile = async (file, customerCode = null, customerType = "NAIVAS", preExtractedText = null) => {
  const detected = detectCustomerTypeByCode(customerCode, customerType);
  if (detected !== customerType) customerType = detected;
  let aiOutput;
  if (preExtractedText && preExtractedText.length >= PERFORMANCE_SETTINGS.MIN_TEXT_LENGTH && !["MAJID","CHANDARANA","QUICKMART"].includes(detected)) {
    console.log("[INFO] Using pre-extracted text with regex for " + detected);
    aiOutput = extractViaRegex(preExtractedText, detected);
    if (!aiOutput) {
      console.log("[WARN] Regex failed on pre-extracted text, falling back to AI");
      aiOutput = await extractViaSLM(preExtractedText, detected);
    }
  } else {
    aiOutput = await extractFromFile(file, detected);
  }
  return parsePOTextFromParsedJSON(aiOutput, customerCode, customerType);
};


// Known barcode whitelists for scanned customers (used for closed-set correction)
const MAJID_BARCODES = [
  "6161102320404","6161102320305","6164000136610","6161102320183",
  "6161102320534","6161102320138","6161102320299","6161102320268",
  "6161102320442","6161102320435","6161102320459","6161100480155",
  "6161100481961","6161102320411"
];
const CHANDARANA_BARCODES = [
  "6161102320459","6161102320046","6161102320138","6161102320404",
  "6161102320299","6161102320442","6161102320183","6161102320435",
  "6161102320169","6161102321074","6161102320268","6161102320060",
  "6161102320305","6161102320411"
];
const QUICKMART_BARCODES = [
  "6161102320459","6161102320183","6161102320169","6161102320305",
  "6161102320442","6161102320435","6161102320268","6161102320138",
  "6161102320060","6161102320299","6161102320046","6161102320404",
  "6161102320411"
];


const OCR_CORRECTIONS = {
  MAJID: {
    "616400136610": "6164000136610",
    "6161102320205": "6161102320305",
  },
  QUICKMART: {
    "6161102320188": "6161102320138",
  },
  CHANDARANA: {},
};

const OCR_NAME_CORRECTIONS = {
  QUICKMART: [
    { pattern: /6161102320183/i, namePattern: /BUTTER\s*TOAST\s*400/i, replace: "6161102320138" },
  ],
};

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i-1][j] + 1,
        dp[i][j-1] + 1,
        dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function correctBarcode(rawCode, customerType, description = '') {
  if (!rawCode || rawCode.startsWith("UNKNOWN")) return rawCode;
  const correctionMap = OCR_CORRECTIONS[customerType] || {};
  if (correctionMap[rawCode]) return correctionMap[rawCode];

  // Name-based corrections
  const nameCorrections = OCR_NAME_CORRECTIONS[customerType] || [];
  for (const rule of nameCorrections) {
    if (rule.pattern.test(rawCode) && rule.namePattern.test(description)) {
      return rule.replace;
    }
  }

  const list = customerType === "MAJID" ? MAJID_BARCODES :
    customerType === "CHANDARANA" ? CHANDARANA_BARCODES :
    customerType === "QUICKMART" ? QUICKMART_BARCODES : null;
  if (!list) return rawCode;
  if (list.includes(rawCode)) return rawCode;
  let best = null, bestDist = 3;
  for (const valid of list) {
    const dist = levenshtein(rawCode, valid);
    if (dist < bestDist) {
      bestDist = dist;
      best = valid;
    }
  }
  return best || rawCode;
}

const parsePOTextFromParsedJSON = async (parsedAI, customerCode, customerType) => {
  let lpoNumber = parsedAI.lpo || "UNKNOWN_LPO";
  if (customerType === "CLEANSHELF" && lpoNumber.includes(",")) lpoNumber = lpoNumber.replace(/,/g, "");
  if (customerType === "NAIVAS" && lpoNumber.endsWith("-1")) lpoNumber = lpoNumber.slice(0, -2);

  const items = (parsedAI.items || []).map(item => {
    const description = item.description || '';
    const correctedCode = correctBarcode(item.code, customerType, description);
    const fgCode = getFGCode(correctedCode, customerType);
    return {
      ocrItemCode: item.code,
      correctedCode,
      description,
      actualItemCode: fgCode,
      quantity: Math.round(item.quantity) || 0,
      foundQuantity: item.quantity || 0,
      productName: getProductName(correctedCode, customerType),
      method: "regex",
    };
  });

  // Enhanced logging: outlet (if available), LPO, and each item mapping
  if (parsedAI.outlet) {
    console.log(`[OUTLET] ${parsedAI.outlet}`);
  }
  console.log(`[LPO] ${lpoNumber}`);

  for (const found of items) {
    console.log(`[ITEM] ${found.ocrItemCode} -> ${found.actualItemCode} = ${found.quantity}`);
  }

  // Remove duplicates by actualItemCode (keep first)
  const seen = new Set();
  const uniqueItems = items.filter(item => {
    if (seen.has(item.actualItemCode)) return false;
    seen.add(item.actualItemCode);
    return true;
  });

  // Keep only items with known FG code (not UNKNOWN_)
  const knownItems = uniqueItems.filter(item => !item.actualItemCode.startsWith("UNKNOWN_"));

  console.log("[INFO] Extracted " + items.length + " items; " + knownItems.length + " known items after correction.");

  const products = await getProductsByCustomer(customerType);
  const resultItems = [];
  let totalValue = 0;
  for (const found of knownItems) {
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

// ─── MANUAL TEXT INPUT (regex for digital-capable customers) ─────
const findItemsAndQuantities = async (text, customerType = "NAIVAS") => {
  if (["NAIVAS", "JAZARIBU", "CLEANSHELF", "KHETIA", "MAJID", "CHANDARANA", "QUICKMART"].includes(customerType)) {
    const regexResult = extractViaRegex(text, customerType);
    if (regexResult) {
      return regexResult;
    }
  }

  const systemPrompt = "You are CT226, a deterministic order-entry transducer.\n=== LAWS OF EXTRACTION (PHYSICS GAUGE MAP) ===\nExtract LPO and items strictly per this map.\nMajid      : LPO=\"ORDER :\", Code=\"BAR CODE\", Qty=\"QTY UC\"\nChandarana : LPO=\"Order No. :\", Code=\"Bar Code\", Qty=\"Quantity\" (not Scan Qty)\nQuickmart  : LPO=\"PURCHASE ORDER #\", Code=\"Scan Code\", Qty=\"Order Qty\"\nKhetia     : LPO=\"PURCHASE ORDER #\", Code=\"YOUR Code\", Qty=\"Order Qty\"\nJazaribu   : LPO=\"Order No.\" or \"PO-J\", Code=\"No.\" (JT), Qty=\"Quantity\"\nCleanshelf Pending : LPO=\"LPO No.\" (remove commas), Code=\"Code\", Qty=\"Orderd Qty.\"\nCleanshelf Local   : LPO=\"L. P. O. No:\" (keep CLS -), Code=\"CODE\", Qty=\"Pieces\"\nNaivas     : LPO=\"P\" + 8-9 digits (strip \"-1\" suffix), Code=\"Item Code\", Qty=\"Quantity\"\n\n=== OUTPUT FORMAT ===\nReturn ONLY JSON: {\"lpo\":\"string\",\"confidence\":0.0-1.0,\"items\":[{\"code\":\"string\",\"quantity\":integer}]}";

  const userPrompt = "Customer: " + customerType + "\n" + text;
  const data = await callNvidiaAPI({
    model: "meta/llama-3.1-8b-instruct",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    temperature: 0, max_tokens: 1024,
  });
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

// ─── PRODUCT FETCHING ─────────────────────────────────────────
const getProductsByCustomer = async (customerType = "NAIVAS") => {
  const priceList = CUSTOMER_PRICE_LISTS[customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST;
  if (cachedProducts[customerType]) return cachedProducts[customerType];
  const resp = await apiClient.get("/item/listByPrice/" + encodeURIComponent(priceList));
  const products = resp.data && resp.data.payload ? resp.data.payload : (resp.data || []);
  cachedProducts[customerType] = products;
  setTimeout(() => { cachedProducts[customerType] = null; }, PERFORMANCE_SETTINGS.PRODUCT_CACHE_DURATION);
  return products;
};

// ─── Audit notification bus ──────────────────────────────────────
const AUDIT_LOG_MAX = 50;
let auditLog = [];
let auditListeners = [];

export const onOrderAudit = (callback) => {
  auditListeners.push(callback);
  return () => {
    auditListeners = auditListeners.filter(fn => fn !== callback);
  };
};

export const getAuditLog = () => auditLog;


async function insertOrderNotification(userId, message, soNumber = null, customerName = '') {
  if (!supabase || !userId) return;
  const { error } = await supabase.from('order_notifications').insert({
    user_id: userId,
    message,
    so_number: soNumber,
    customer_name: customerName,
  });
  if (error) console.warn('Failed to insert order notification:', error.message);
}

function getNotificationUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem('dds_user') || '{}');
    return user?.id ? String(user.id) : null;
  } catch { return null; }
}

const notifyAudit = (success, message) => {
  const event = { success, message, timestamp: Date.now() };

  auditLog = [...auditLog, event].slice(-AUDIT_LOG_MAX);
  auditListeners.forEach(fn => {
    try {
      fn(event);
    } catch (e) {
      console.error('Audit listener threw:', e);
    }
  });

  if (success) console.log(message);
  else console.error(message);
};

// ─── Order submission guard + synchronous audit ──────────────────
const ORDER_SUBMIT_COOLDOWN_MS = 60 * 1000;
const inFlightOrders = new Map();
const recentlySubmitted = new Map();

const buildOrderDedupeKey = (poData, branch) =>
  [poData.customer, poData.lpoNumber, branch].join('::');

const createOrderFromPO = async (poData, customerBranch, warehouse = DEFAULT_SETTINGS.WAREHOUSE) => {
  if (!customerBranch) {
    throw new Error(
      "createOrderFromPO: customerBranch is required. Refusing to submit " +
      "an order without an explicit branch rather than trusting session state."
    );
  }

  const dedupeKey = buildOrderDedupeKey(poData, customerBranch);

  if (inFlightOrders.has(dedupeKey)) {
    console.warn("[GUARD] Duplicate submit blocked — already in flight:", dedupeKey);
    return inFlightOrders.get(dedupeKey);
  }

  const recent = recentlySubmitted.get(dedupeKey);
  if (recent && (Date.now() - recent.timestamp) < ORDER_SUBMIT_COOLDOWN_MS) {
    const secondsAgo = Math.round((Date.now() - recent.timestamp) / 1000);
    console.warn(`[GUARD] Duplicate submit blocked — same LPO/customer/branch submitted ${secondsAgo}s ago`);
    return recent.result;
  }

  const submitPromise = (async () => {
    const matched = poData.items.filter(i => i.status === "matched");
    if (matched.length < VALIDATION_SETTINGS.MIN_ITEM_COUNT) throw new Error("No matched items found");

    const orderItems = matched.map(item => ({
      item: item.product,
      quantity: item.quantity,
      amount: item.netAmount || item.product.itemPrice * item.quantity,
    }));

    const totalAmount = orderItems.reduce((s, i) => s + i.amount, 0);
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueDate = due.getFullYear() + "-" + String(due.getMonth() + 1).padStart(2, '0') + "-" + String(due.getDate()).padStart(2, '0') + "T00:00:00.000Z";

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

    const { default: authService } = await import("@services/authService");
    const resp = await authService.ensureBranchContext(customerBranch, () =>
      apiClient.post("/orders/create", payload)
    );

    const orderNumber = resp.data && resp.data.payload ? resp.data.payload : "Unknown";
    if (orderNumber === "Unknown") {
      throw new Error("Order creation returned no order number");
    }

    const detailResp = await apiClient.get("/orders/detail/" + orderNumber);
    const detail = detailResp.data?.payload || detailResp.data;
    if (!detail) {
      throw new Error("Audit failed: could not retrieve order detail for " + orderNumber);
    }

    const mismatches = [];

    if (detail.branch !== customerBranch) {
      mismatches.push(`branch ${detail.branch} != ${customerBranch}`);
    }
    if (detail.customerCode !== poData.customer) {
      mismatches.push(`customer ${detail.customerCode} != ${poData.customer}`);
    }

    const expectedLpo = poData.lpoNumber !== "UNKNOWN_LPO" ? poData.lpoNumber : null;
    if ((detail.lpo || null) !== expectedLpo) {
      mismatches.push(`LPO ${detail.lpo} != ${expectedLpo}`);
    }

    const actualItems = detail.orderItems || [];
    if (actualItems.length !== orderItems.length) {
      mismatches.push(`item count ${actualItems.length} != ${orderItems.length}`);
    } else {
      const expectedMap = new Map();
      for (const item of orderItems) {
        expectedMap.set(item.item.itemCode, (expectedMap.get(item.item.itemCode) || 0) + item.quantity);
      }
      const actualMap = new Map();
      for (const di of actualItems) {
        actualMap.set(di.itemCode, (actualMap.get(di.itemCode) || 0) + di.quantity);
      }
      for (const [code, qty] of expectedMap) {
        if (actualMap.get(code) !== qty) {
          mismatches.push(`item ${code} qty ${actualMap.get(code)} != ${qty}`);
        }
      }
    }

    const status = (detail.orderStatus || '').toLowerCase();
    const allowedStatuses = ['pending', 'to deliver and tobill', 'to deliver and to bill'];
    if (!allowedStatuses.some(s => status.includes(s))) {
      mismatches.push(`unexpected status ${detail.orderStatus}`);
    }

    if (mismatches.length > 0) {
      try {
        await apiClient.post("/orders/close/" + orderNumber, {
          overrideWarning: true,
          status: "Cancel",
        });
      } catch (cancelError) {
        console.error("Failed to cancel order after audit failure:", cancelError.message);
      }

      const msg = `Audit failed for ${poData.customer} ${poData.lpoNumber}: ${mismatches.join('; ')}. Order ${orderNumber} cancelled.`;
      notifyAudit(false, msg);

      const customerName = poData.customerName || poData.customerInfo?.name || poData.customer;
      const userId = getNotificationUserId();
      await insertOrderNotification(
        userId,
        `Audit failed: Order ${orderNumber} cancelled. Customer: ${customerName}. Reason: ${mismatches.join('; ')}`,
        orderNumber,
        customerName
      );

      return {
        success: false,
        error: msg,
        audit: 'failed',
        orderNumber,
        totalAmount,
        totalQuantity: orderItems.reduce((s, i) => s + i.quantity, 0),
      };
    }

    const successMsg = `Audit passed for ${poData.customer} ${poData.lpoNumber}. Order ${orderNumber} verified.`;
    notifyAudit(true, successMsg);

    const customerName = poData.customerName || poData.customerInfo?.name || poData.customer;
    const userId = getNotificationUserId();
    await insertOrderNotification(
      userId,
      `Order ${orderNumber} created and verified. Customer: ${customerName}`,
      orderNumber,
      customerName
    );

    return {
      success: true,
      orderNumber,
      totalAmount,
      totalQuantity: orderItems.reduce((s, i) => s + i.quantity, 0),
      audit: 'passed',
    };
  })();

  inFlightOrders.set(dedupeKey, submitPromise);

  try {
    const result = await submitPromise;
    recentlySubmitted.set(dedupeKey, { timestamp: Date.now(), result });
    return result;
  } finally {
    inFlightOrders.delete(dedupeKey);
  }
};

const setupDragAndDrop = (element, callback) => {
  if (!element) return;
  ["dragenter","dragover","dragleave","drop"].forEach(ev => {
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
export const getVisionOcrText = async (file) => {
  if (file.name.toUpperCase().includes('FAX')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const resp = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3001' : '') + '/api/majid-render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pdfBase64 }),
    });
    if (!resp.ok) throw new Error('Majid render API error: ' + resp.status);
    const { image } = await resp.json();
    const dataUrl = 'data:image/png;base64,' + image;

    const prompt = 'Copy ALL text from this purchase order image exactly as it appears. Preserve columns, spaces, and line breaks. Output ONLY the raw text. No explanations.';
    const ocrData = await callNvidiaAPI({
      model: VISION_MODEL,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      temperature: 0,
      max_tokens: 4096,
    }, true);
    return ocrData.choices[0].message.content;
  }

  const prompt = 'Copy ALL text from this purchase order image exactly as it appears. Preserve columns, spaces, and line breaks. Output ONLY the raw text. No explanations.';

  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 3.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i+3] === 0) { data[i]=255; data[i+1]=255; data[i+2]=255; data[i+3]=255; continue; }
    const gray = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2];
    const binary = gray > 128 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = binary;
  }
  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');

  const result = await callNvidiaAPI({
    model: VISION_MODEL,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
    temperature: 0,
    max_tokens: 4096,
  }, true);
  return result.choices[0].message.content;
};

export default {
  getVisionOcrText,
  extractTextFromPdf,
  getProductsByCustomer,
  parsePOText,
  parsePOFromDroppedFile,
  parsePOFromImage: parsePOFromDroppedFile,
  parseManualTextInput: parsePOText,
  createOrderFromPO,
  setupDragAndDrop,
  processDroppedFile: parsePOFromDroppedFile,
  findItemsAndQuantities,
  getFGCode,
  getProductName,
  onOrderAudit,
  getAuditLog,
  getConfig: () => ({ DEFAULT_SETTINGS, PERFORMANCE_SETTINGS, VALIDATION_SETTINGS, CUSTOMER_PRICE_LISTS }),
};
