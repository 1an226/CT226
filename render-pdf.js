import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs"\;
import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node render-pdf.js <path-to-pdf>");
  process.exit(1);
}

const data = new Uint8Array(readFileSync(filePath));
const loadingTask = pdfjsLib.getDocument({ data });
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.5 });
const canvas = new (await import("canvas").then(m => m.Canvas))(viewport.width, viewport.height);
const ctx = canvas.getContext("2d");
await page.render({ canvasContext: ctx, viewport }).promise;

const base64 = canvas.toDataURL("image/jpeg", 0.8);
console.log(base64);
