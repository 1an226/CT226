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
console.log('JAZARIBU_MAP:', JAZARIBU_MAP);
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
  ...JAZARIBU_FALLBACK,
  ...ITEM_MAP,
  ...CLEANSHELF_MAP,
  ...JAZARIBU_MAP,
  ...KHETIA_MAP,
  ...MAJID_MAP,
  ...CHANDARANA_MAP,
  ...QUICKMART_MAP,
};

export const getFGCode = (rawCode) => {
  const cleanCode = rawCode.replace(/^[^0-9]+/, '');
  return STANDARD_MODEL[cleanCode] || null;
};

export const getAllFGCODES = () => Object.values(STANDARD_MODEL);
export { STANDARD_MODEL };
