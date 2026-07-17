import apiClient from "@services/api.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ---------- FG CODE MAPPINGS (from legacy) ----------
const parseItemCodeMapping = () => { /* ... same as original ... */ };
// (Include the full mapping functions from the legacy file – 
//  we can copy them from orderCreationService.js if needed)
// For brevity, I'm omitting the full mapping text, but it should be included.
// In practice, you can copy the entire mapping block from the original file.
// Let's assume we have the mappings and getFGCode/getProductName.
// For now, we'll just import the old service's mappings.

// ---------- SUPER PROMPT ----------
const SYSTEM_PROMPT = `You are CT226...`; // (the full prompt we already have)

// ---------- AI PARSING CORE ----------
const NVIDIA_PROXY_URL = "/api/nvidia-proxy";

async function parseWithVision(base64Image, customerType) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
      ]
    }
  ];

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

  if (!response.ok) throw new Error(`AI API error ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;

  // Smart JSON extraction
  let cleanJson = content;
  let parsed;
  try {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = content.substring(firstBrace, lastBrace + 1);
      parsed = JSON.parse(cleanJson);
    } else {
      throw new Error("No JSON object found");
    }
  } catch (err) {
    const mdMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (mdMatch) {
      cleanJson = mdMatch[1];
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
function mapItemsToFG(items, customerType) {
  return items.map(item => ({
    ocrItemCode: item.code,
    actualItemCode: getFGCode(item.code, customerType),
    quantity: item.quantity,
    description: `Product ${item.code}`,
    method: "ai-parsed"
  }));
}

// ---------- MAIN ENTRY POINT (file upload) ----------
export async function parseOrderFromFile(file, customerType = "NAIVAS") {
  const base64Images = await fileToBase64(file);
  const allItems = [];
  let lpo = "UNKNOWN_LPO";

  for (const base64 of base64Images) {
    const result = await parseWithVision(base64, customerType);
    if (result.items && result.items.length > 0) {
      allItems.push(...result.items);
    }
    if (result.lpo && result.lpo !== "UNKNOWN_LPO") {
      lpo = result.lpo;
    }
  }

  const mappedItems = mapItemsToFG(allItems, customerType);
  return { lpo, items: mappedItems };
}

// ---------- TEXT‑BASED AI PARSER ----------
export async function parseTextOrder(text, customerCode, customerType = "NAIVAS") {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Customer type: ${customerType}\n\n${text}` }
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
  const cleanJson = content.replace(/^```json\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleanJson);
  const mappedItems = mapItemsToFG(parsed.items || [], customerType);
  return { lpo: parsed.lpo || "UNKNOWN_LPO", items: mappedItems, customerType, customer: customerCode };
}

// ---------- PRODUCT FETCHING ----------
let cachedProducts = {};

async function getProductsByCustomer(customerType = "NAIVAS") {
  const priceList = CUSTOMER_PRICE_LISTS[customerType] || CUSTOMER_PRICE_LISTS.NAIVAS;
  if (cachedProducts[customerType]) {
    return cachedProducts[customerType];
  }

  const response = await apiClient.get(`/item/listByPrice/${encodeURIComponent(priceList)}`);
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
  if (matchedItems.length === 0) throw new Error("No matched items found");

  const products = await getProductsByCustomer(poData.customerType || "NAIVAS");
  const orderItems = matchedItems.map(item => {
    const product = products.find(p => p.itemCode === item.actualItemCode);
    const unitPrice = product?.itemPrice || 0;
    return { item: product || { itemCode: item.actualItemCode }, quantity: item.quantity, amount: item.quantity * unitPrice };
  });

  const totalAmount = orderItems.reduce((sum, i) => sum + i.amount, 0);
  const dueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T00:00:00.000Z";
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
    matchedItems: matchedItems.length,
    timestamp: new Date().toISOString(),
  };
}
