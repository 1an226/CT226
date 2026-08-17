const parseMapping = (mappingStr) => {
  const mapping = {};
  if (!mappingStr) return mapping;
  mappingStr.split(",").forEach((pair) => {
    const [key, value] = pair.split(":");
    if (key && value) {
      mapping[key.trim()] = value.trim();
    }
  });
  return mapping;
};

const ITEM_MAP = parseMapping(import.meta.env.VITE_ITEM_CODE_MAPPING);
const CLEANSHELF_MAP = parseMapping(import.meta.env.VITE_CLEANSHELF_ITEM_CODE_MAPPING);
const JAZARIBU_MAP = parseMapping(import.meta.env.VITE_JAZARIBU_ITEM_CODE_MAPPING);
const KHETIA_MAP = parseMapping(import.meta.env.VITE_KHETIA_ITEM_CODE_MAPPING);
const MAJID_MAP = parseMapping(import.meta.env.VITE_MAJID_BARCODE_MAPPING);
const CHANDARANA_MAP = parseMapping(import.meta.env.VITE_CHANDARANA_BARCODE_MAPPING);
const QUICKMART_MAP = parseMapping(import.meta.env.VITE_QUICKMART_BARCODE_MAPPING);

// Hardcoded fallback for Jazaribu JT codes (env may not load on Vercel)
const JAZARIBU_FALLBACK = {
  JT01090: "FG030",
  JT01094: "FG017",
  JT01097: "FG018",
  JT01099: "FG026",
  JT01093: "FG027",
  JT01098: "FG015",
  JT01091: "FG031",
  JT01100: "FG006",
  JT01102: "FG007",
  JT01103: "FG008",
};

const STANDARD_MODEL = {
  ...ITEM_MAP,
  ...CLEANSHELF_MAP,
  ...JAZARIBU_MAP,
  ...JAZARIBU_FALLBACK,
  ...KHETIA_MAP,
  ...MAJID_MAP,
  ...CHANDARANA_MAP,
  ...QUICKMART_MAP,
};

// FIX: the old implementation did `rawCode.replace(/^[^0-9]+/, '')` —
// stripping every leading non-digit character before ever attempting a
// lookup. That's correct for pure junk (a stray "-" or "*" ahead of a
// numeric barcode) but it also strips the "N" off "N051055"/"N051056"
// and the "JT" off every single Jazaribu code, since those prefixes are
// letters and this regex doesn't distinguish "junk" from "part of the
// real code". Every JT-prefixed lookup and both N-prefixed Naivas SKUs
// were silently missing and falling through to "UNKNOWN_...".
//
// Codes reaching this function come from the SLM's structured JSON
// extraction, not raw OCR text — so they should already be clean. The
// fix tries the exact code first (this covers every valid format:
// numeric barcodes, N051055/N051056, JT01098, 4003xx, etc.), and only
// falls back to stripping non-alphanumeric junk — never letters — if
// the exact match misses.
export const getFGCode = (rawCode) => {
  if (!rawCode) return null;
  const trimmed = String(rawCode).trim();

  if (STANDARD_MODEL[trimmed]) return STANDARD_MODEL[trimmed];

  // Fallback only: strip leading non-alphanumeric junk (dashes,
  // asterisks, stray punctuation) — never strip leading letters, since
  // those are part of the real code for N- and JT-prefixed SKUs.
  const sanitized = trimmed.replace(/^[^A-Za-z0-9]+/, '');
  if (sanitized !== trimmed && STANDARD_MODEL[sanitized]) {
    return STANDARD_MODEL[sanitized];
  }

  window.__CT226_CODE_MISS__ = { raw: rawCode, tried: [trimmed, sanitized] };
  return null;
};

export const getAllFGCODES = () => Object.values(STANDARD_MODEL);

export { STANDARD_MODEL };
