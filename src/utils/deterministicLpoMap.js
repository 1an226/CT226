export const QUICKMART_PREFIX_MAP = {
  "001": "C02857",
  "005": "C02854",
  "009": "C04531",
  "010": "C02874",
  "014": "C02835",
  "015": "C02876",
  "016": "C02848",
  "017": "C02822",
  "018": "C04348",
  "020": "C02870",
  "021": "C02846",
  "022": "C02813",
  "024": "C02844",
  "025": "C02819",
  "026": "C02850",
  "027": "C02872",
  "032": "C02808",
  "034": "C02840",
  "035": "C02868",
  "036": "C02832",
  "038": "C02817",
  "039": "C04044",
  "041": "C04271",
  "047": "C04471",
  "052": "C05006",
  "059": "C05167",
  "060": "C05230",
  "061": "C05247",
  "063": "C05879",
  "065": "C06101",
  "068": "C07368",
  "069": "C07490",
  "074": "C08326",
};

export const CHANDARANA_PAIR_MAP = {
  "02": "C00361",
  "03": "C00376",
  "04": "C00367",
  "05": "C00359",
  "07": "C00374",
  "08": "C00380",
  "09": "C00363",
  "11": "C00392",
  "14": "C00384",
  "20": "C00382",
  "27": "C05067",
  "28": "C05135",
  "29": "C05163",
  "30": "C05550",
  "32": "C06326",
  "34": "C06896",
};

export const JAZARIBU_JCODE_MAP = {
  "J001": "C06351",
  "J002": "C06363",
  "J003": "C06531",
  "J004": "C06547",
  "J005": "C06570",
  "J006": "C06627",
  "J007": "C06667",
  "J008": "C06702",
  "J012": "C07071",
  "J019": "C07257",
  "J022": "C07449",
  "J023": "C07455",
  "J024": "C08113",
  "J025": "C08114",
  "J026": "C08210",
  "J027": "C08211",
  "J028": "C08209",
  "J030": "C08353",
};

export function resolveCustomerCodeFromLpo(lpo, customerType) {
  if (!lpo || lpo === "UNKNOWN_LPO") return null;

  if (customerType === "QUICKMART") {
    const m = lpo.match(/^(\d{3})-\d{8}$/);
    if (m) return QUICKMART_PREFIX_MAP[m[1]] || null;
    return null;
  }

  if (customerType === "CHANDARANA") {
    if (lpo.length < 4) return null;
    const pair = lpo.slice(2, 4);
    return CHANDARANA_PAIR_MAP[pair] || null;
  }

  if (customerType === "JAZARIBU") {
    const m = lpo.match(/^PO-(J\d{3})-\d{6}$/);
    if (m) return JAZARIBU_JCODE_MAP[m[1]] || null;
    return null;
  }

  return null;
}

// Majid digital TXT prefix -> Customer Code
// Currently known: KEJ -> Parklands
export const MAJID_DIGITAL_PREFIX_MAP = {
  "KEJ": "C07466",
};

export function resolveMajidDigitalCustomerCode(rawText) {
  if (!rawText) return null;
  const m = rawText.match(/^([A-Z]{3})\d{8}/);
  if (!m) return null;
  return MAJID_DIGITAL_PREFIX_MAP[m[1]] || null;
}
