// src/utils/StandardModel.js

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

const STANDARD_MODEL = {
  ...ITEM_MAP,
  ...CLEANSHELF_MAP,
  ...JAZARIBU_MAP,
  ...KHETIA_MAP,
  ...MAJID_MAP,
  ...CHANDARANA_MAP,
  ...QUICKMART_MAP,
};

export const getFGCode = (rawCode) => {
  return STANDARD_MODEL[rawCode] || null;
};

export const getAllFGCODES = () => Object.values(STANDARD_MODEL);
