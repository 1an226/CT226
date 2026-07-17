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
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
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

  console.log("Request model:", "meta/llama-3.2-11b-vision-instruct");
  console.log("System prompt included:", SYSTEM_PROMPT.substring(0, 100));
  const response = await fetch(NVIDIA_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  if (!response.ok) throw new Error(`AI API error ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;
  console.log("AI raw content:", content);
  let parsed;
  try {
    // Strategy 1: entire response is JSON
    parsed = JSON.parse(content);
  } catch (e1) {
    // Strategy 2: markdown fence
    const fence = content.match(/```(?:json)?s*([sS]*?)s*```/);
    if (fence) {
      try { parsed = JSON.parse(fence[1]); } catch (e2) {}
    }
    if (!parsed) {
      // Strategy 3: find outermost { ... }
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(content.substring(start, end + 1));
        } catch (e3) {}
      }
    }
    if (!parsed) {
      // Strategy 4: find array [ ... ]
      const arrStart = content.indexOf("[");
      const arrEnd = content.lastIndexOf("]");
      if (arrStart !== -1 && arrEnd > arrStart) {
        try {
          const items = JSON.parse(content.substring(arrStart, arrEnd + 1));
          if (Array.isArray(items)) parsed = { lpo: "UNKNOWN_LPO", items };
        } catch (e4) {}
      }
    }
    if (!parsed) throw new Error("No valid JSON found in AI response");
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

  console.log("Request model:", "meta/llama-3.2-11b-vision-instruct");
  console.log("System prompt included:", SYSTEM_PROMPT.substring(0, 100));
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
