import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ---------- SUPER PROMPT ----------
const SYSTEM_PROMPT = `You are CT226, the automated order‑entry specialist for DDS (Distribution Management System).

=== PURPOSE ===
Your purpose is to eliminate manual data entry in DDS by accurately extracting purchase order information from supplier documents. Every order you process must be complete and error‑free, because downstream inventory, invoicing, and delivery depend on your output.

=== TASK ===
You are given two things:
1. The name of the customer who sent the purchase order (e.g., "Naivas", "Majid", etc.).
2. One or more images (or extracted text) of the purchase order document.

Your task is to read the document and extract:
- The LPO (Local Purchase Order) number.
- Every product line item, each consisting of an item code (or barcode) and its ordered quantity.

You will use the customer‑specific rules below to locate these values. Trust the customer name you are given; do not try to detect the customer from the document. If the document contains no items (e.g., it is blank or corrupted), return an empty items array.

=== OUTPUT FORMAT ===
Return ONLY a JSON object. Do not include any text, markdown fences, or commentary before or after the JSON. The object must have exactly this structure:

{
  "lpo": "EXTRACTED_LPO",
  "items": [
    { "code": "ITEM_CODE_OR_BARCODE", "quantity": NUMBER },
    ...
  ]
}

- If no LPO is found, set "lpo" to "UNKNOWN_LPO".
- Quantities must be integers. Round decimal quantities to the nearest whole number (e.g., 3.00 → 3, 8.00 → 8).
- Do not include header rows, footer rows, subtotals, tax lines, or any line that is not a product.
- If a code or quantity is unclear or missing, omit that item – never guess.

=== CUSTOMER‑SPECIFIC EXTRACTION RULES ===

1. Majid
   - LPO: Look for "ORDER :" followed by a number (e.g., "ORDER : 26004555").
   - Item Code: 13‑digit barcodes, usually under a "BAR CODE" column and often starting with 616. Ignore barcodes that end with 983 or 984.
   - Quantity: The column labeled "QTY UC". If that column is missing, look for a whole number that sits immediately before a price with three decimal digits (e.g., "15  57.900" → quantity 15).

2. Chandarana
   - LPO: Look for "Order No. :" or "Order No. & Date -" followed by a 12‑ or 13‑digit number (e.g., "202712009317").
   - Item Code: 13‑digit barcodes under the "Bar Code" column.
   - Quantity: The first decimal number after the barcode (the "Scan Qty" column).

3. Quickmart
   - LPO: "PURCHASE ORDER #" followed by a formatted number (e.g., "016-00057714").
   - Item Code: 13‑digit barcodes under the "Scan Code" column.
   - Quantity: The "Order Qty" column (a decimal like 3.00).

4. Khetia
   - LPO: "PURCHASE ORDER #" followed by a 7‑digit number (e.g., "2520950").
   - Item Code: 6‑digit codes in the "YOUR Code" column.
   - Quantity: The "Order Qty" column (a decimal like 12.00).

5. Jazaribu
   - LPO: "Order No." or a string starting with "PO‑J" (e.g., "PO‑J020‑000253").
   - Item Code: Codes starting with "JT" (e.g., "JT01098") under the "Code" or "Item Code" column.
   - Quantity: The "Quantity", "Order Qty", or "Pieces" column. Often a whole number.

6. Cleanshelf – two distinct sub‑formats that differ in the LPO. The document title often helps distinguish them: "Local Purchase Order" vs. "Pending Purchase Orders".

   Format A – Local Purchase Order
     - LPO: Look for "L. P. O. No:" or a line like "CLS - [number]". Keep the full "CLS - [number]" string exactly as it appears (e.g., "CLS - 91213").
     - Item Code: 6‑digit codes starting with "400" under the "CODE" column.
     - Quantity: The "Pieces" column, or the last integer in the line before a price with three decimal digits.

   Format B – Pending Purchase Orders
     - LPO: Look for "LPO No." (e.g., "111,638 LPO No."). Remove any commas from the number (e.g., "111,638" → "111638"). There is NO "CLS" prefix in this format.
     - Item Code: 6‑digit codes starting with "400" under the "Code" column.
     - Quantity: The "Orderd Qty." column (may also appear as "Ordered Qty.", "Order Qty."). It is a decimal like "8.00".

7. Naivas – multiple sub‑formats, but extraction rules are the same.
   - LPO: A string starting with "P" followed by 8–9 digits (e.g., "P038493878" or "*P038302575*"). If the LPO ends with a hyphen and a number (e.g., "P038449364-1"), remove that suffix; use only the base "P" + digits (e.g., "P038449364").
   - Item Code: 8‑digit codes starting with "135" or alpha‑numeric codes like "N051055". These appear in the "Item Code" column, or at the very beginning of a data row.
   - Quantity: The number immediately before or after "PCS" (e.g., "PCS 60.00" → 60). Also check the "Quantity" or "Unit" column.

=== FINAL REMINDER ===
You are CT226, the gatekeeper of order accuracy for DDS. Follow the rules for the given customer exactly. Do not output anything except the JSON object.`;

// ---------- AI PARSING CORE ----------
const NVIDIA_PROXY_URL = "/api/nvidia-proxy";

async function parseWithVision(base64Image, customerType) {

  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${base64Image}` }
        }
      ]
    }
  ];
  console.log("Request model:", "meta/llama-3.2-11b-vision-instruct");
  console.log("System prompt included:", SYSTEM_PROMPT.substring(0, 100));
  const body = JSON.stringify({
    model: "meta/llama-3.2-11b-vision-instruct",
    messages,
    max_tokens: 1000,
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const response = await fetch(NVIDIA_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  if (!response.ok) {
    throw new Error(`AI API error ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  console.log("AI raw content:", content);
  let cleanJson = content;
  const mdMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    cleanJson = mdMatch[1];
    console.log("Extracted from markdown fence");
  } else {
    cleanJson = content
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();
  }
  console.log("Cleaned JSON string:", cleanJson);
  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error("JSON parse failed, trying to salvage...");
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      parsed = JSON.parse(cleanJson);
    } else {
      throw err;
    }
  }
  return parsed;
}

// ---------- FILE TO BASE64 ----------
async function fileToBase64(file) {
  if (file.type.startsWith("image/")) {
    return [await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })];
  }

  if (file.type === "application/pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      pages.push(canvas.toDataURL("image/png").split(",")[1]);
    }
    return pages;
  }

  throw new Error("Unsupported file type");
}

// ---------- FG CODE MAPPING ----------
const getFGCode = (code, customerType) => {
  // re-use the mapping logic from the old service
  // (we will import or copy it; for now assume it's available)
  const mapping = ITEM_CODE_MAPPINGS[customerType] || ITEM_CODE_MAPPINGS.NAIVAS;
  return mapping[code] || `UNKNOWN_${code}`;
};

const ITEM_CODE_MAPPINGS = {
  NAIVAS: {
    "13505757":"FG867","13505844":"FG860","13505845":"FG864","13505786":"FG861",
    "13505758":"FG869","13505790":"FG863","13505957":"FG960","13505115":"FG003",
    "13500140":"FG006","13505114":"FG007","13504180":"FG008","N051055":"FG013",
    "13505111":"FG015","N051056":"FG017","13506130":"FG018","13500168":"FG026",
    "13500398":"FG030","13504428":"FG031","13504429":"FG027"
  },
  CLEANSHELF: {
    "400348":"FG031","400347":"FG030","400344":"FG018","400343":"FG017",
    "400339":"FG008","400338":"FG007","400337":"FG006","400336":"FG003",
    "400334":"FG027","400330":"FG021","400329":"FG015","400346":"FG026"
  },
  JAZARIBU: {
    "JT01093":"FG027","JT01098":"FG015","JT01090":"FG030","JT01094":"FG017",
    "JT01091":"FG031","JT01097":"FG018","JT01100":"FG006","JT01103":"FG008",
    "JT01102":"FG007","JT01099":"FG026"
  },
  KHETIA: {
    "790601":"FG021","416868":"FG015","412818":"FG017","416872":"FG018",
    "414800":"FG007","414810":"FG008","415591":"FG027","415592":"FG030",
    "410955":"FG031","419349":"FG006","413981":"FG003","415596":"FG026","410643":"FG013"
  },
  MAJID: {
    "6161102320404":"FG027","6161102320305":"FG008","6164000136610":"FG030",
    "6161102320183":"FG031","6161102320534":"FG026","6161102320138":"FG015",
    "6161102320299":"FG007","6161102320268":"FG003","6161102320442":"FG017",
    "6161102320435":"FG018","6161102320459":"FG013"
  },
  CHANDARANA: {
    "6161102320459":"FG013","6161102320046":"FG026","6161102320138":"FG015",
    "6161102320404":"FG027","6161102320299":"FG007","6161102320442":"FG017",
    "6161102320183":"FG031","6161102320435":"FG018","6161102320169":"FG030",
    "6161102321074":"FG021","6161102320268":"FG003","6161102320060":"FG006",
    "6161102320305":"FG008"
  },
  QUICKMART: {
    "6161102320459":"FG013","6161102320183":"FG031","6161102320169":"FG030",
    "6161102320305":"FG008","6161102320442":"FG017","6161102320435":"FG018",
    "6161102320268":"FG003","6161102320138":"FG015","6161102320060":"FG006",
    "6161102320299":"FG007","6161102320046":"FG026","6161102320404":"FG027"
  }
};

function mapItemsToFG(items, customerType) {
  return items.map(item => ({
    ocrItemCode: item.code,
    actualItemCode: getFGCode(item.code, customerType),
    quantity: item.quantity,
    description: `Product ${item.code}`,
    method: "ai-parsed"
  }));
}

// ---------- MAIN ENTRY POINT ----------
export async function parseOrderFromFile(file, customerType = "NAIVAS") {
  const base64Images = await fileToBase64(file);
  const allItems = [];

  for (const base64 of base64Images) {
    const result = await parseWithVision(base64, customerType);
    if (result.items && result.items.length > 0) {
      allItems.push(...result.items);
    }
    // If multiple pages, LPO from first page takes precedence
    if (result.lpo && result.lpo !== "UNKNOWN_LPO") {
      var lpo = result.lpo;
    }
  }

  const mappedItems = mapItemsToFG(allItems, customerType);
  return { lpo: lpo || "UNKNOWN_LPO", items: mappedItems };
}
// ---------- CONFIGURATION (kept from legacy) ----------
const CUSTOMER_PRICE_LISTS = {
  NAIVAS: import.meta.env.VITE_NAIVAS_PRICE_LIST || "Naivas Special Price",
  CLEANSHELF: import.meta.env.VITE_CLEANSHELF_PRICE_LIST || "Supermarkets Price",
  JAZARIBU: import.meta.env.VITE_JAZARIBU_PRICE_LIST || "Depot Price",
  KHETIA: import.meta.env.VITE_KHETIA_PRICE_LIST || "Depot Price",
  MAJID: import.meta.env.VITE_MAJID_PRICE_LIST || "Supermarkets Price",
  CHANDARANA: import.meta.env.VITE_CHANDARANA_PRICE_LIST || "Supermarkets Price",
  QUICKMART: import.meta.env.VITE_QUICKMART_PRICE_LIST || "Supermarkets Price",
};

const DEFAULT_SETTINGS = {
  WAREHOUSE: import.meta.env.VITE_DEFAULT_WAREHOUSE || "Dandora",
  SELLING_PRICE_LIST: import.meta.env.VITE_DEFAULT_SELLING_PRICE_LIST || "Supermarkets Price",
  ORDER_TYPE: import.meta.env.VITE_DEFAULT_ORDER_TYPE || "Route",
  REMARKS: import.meta.env.VITE_DEFAULT_REMARKS || "CT226",
  IS_TOP_UP: import.meta.env.VITE_DEFAULT_IS_TOP_UP === "true",
};

// ---------- PRODUCT FETCHING ----------
let cachedProducts = {};

async function getProductsByCustomer(customerType = "NAIVAS") {
  const priceList = CUSTOMER_PRICE_LISTS[customerType] || CUSTOMER_PRICE_LISTS.NAIVAS;
  if (cachedProducts[customerType]) {
    return cachedProducts[customerType];
  }

  const response = await apiClient.get(
    `/item/listByPrice/${encodeURIComponent(priceList)}`
  );
  let products = [];
  if (response.data?.payload && Array.isArray(response.data.payload)) {
    products = response.data.payload;
  } else if (Array.isArray(response.data)) {
    products = response.data;
  }

  cachedProducts[customerType] = products;
  setTimeout(() => { cachedProducts[customerType] = null; }, 5 * 60 * 1000);
  return products;
}

// ---------- ORDER CREATION ----------
export async function createOrderFromPO(poData, warehouse = DEFAULT_SETTINGS.WAREHOUSE) {
  const matchedItems = poData.items.filter(item => item.method === "ai-parsed");

  if (matchedItems.length === 0) {
    throw new Error("No matched items found for order creation");
  }

  const products = await getProductsByCustomer(poData.customerType || "NAIVAS");
  const orderItems = matchedItems.map(item => {
    const product = products.find(p => p.itemCode === item.actualItemCode);
    const unitPrice = product?.itemPrice || 0;
    const amount = item.quantity * unitPrice;
    return {
      item: product || { itemCode: item.actualItemCode },
      quantity: item.quantity,
      amount
    };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.amount, 0);
  const totalQuantity = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T00:00:00.000Z`;

  const sellingPriceList = CUSTOMER_PRICE_LISTS[poData.customerType] || DEFAULT_SETTINGS.SELLING_PRICE_LIST;

  const orderPayload = {
    customer: poData.customer,
    orderType: DEFAULT_SETTINGS.ORDER_TYPE,
    sellingPriceList,
    dueDate,
    isTopUp: DEFAULT_SETTINGS.IS_TOP_UP,
    warehouse,
    remarks: DEFAULT_SETTINGS.REMARKS,
    lpo: poData.lpo && poData.lpo !== "UNKNOWN_LPO" ? poData.lpo : null,
    items: orderItems,
  };

  const response = await apiClient.post("/orders/create", orderPayload);
  return {
    success: true,
    orderNumber: response.data?.payload || "Unknown",
    totalAmount,
    totalQuantity,
    matchedItems: matchedItems.length,
    customerType: poData.customerType,
    priceListUsed: sellingPriceList,
    timestamp: new Date().toISOString(),
  };
}

// ---------- TEXT‑BASED AI PARSER (fallback) ----------
export async function parseTextOrder(text, customerCode, customerType = "NAIVAS") {
  // Convert text into a minimal image‑like format? No – we send text directly
  // to the model as a user message (not vision)
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${base64Image}` }
        }
      ]
    }
  ];

  const response = await fetch(NVIDIA_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta/llama-3.2-3b-instruct",
      messages,
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) throw new Error(`AI API error ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;
  const cleanJson = content.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleanJson);
  const mappedItems = mapItemsToFG(parsed.items || [], customerType);
  return { lpo: parsed.lpo || "UNKNOWN_LPO", items: mappedItems, customerType, customer: customerCode };
}
