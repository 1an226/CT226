
// ─── FINAL BARCODE RESOLVER ─────────────────────────────────────────
// Deterministic, fast, uses all signals in one pass.
// Does not add sequential stages. Everything is computed synchronously.

const KNOWN_BARCODES = {
  MAJID: [
    "6161102320404","6161102320305","6164000136610","6161102320183",
    "6161102320534","6161102320138","6161102320299","6161102320268",
    "6161102320442","6161102320435","6161102320459","6161100480155",
    "6161100481961","6161102320411"
  ],
  CHANDARANA: [
    "6161102320459","6161102320046","6161102320138","6161102320404",
    "6161102320299","6161102320442","6161102320183","6161102320435",
    "6161102320169","6161102321074","6161102320268","6161102320060",
    "6161102320305","6161102320411"
  ],
  QUICKMART: [
    "6161102320459","6161102320183","6161102320169","6161102320305",
    "6161102320442","6161102320435","6161102320268","6161102320138",
    "6161102320060","6161102320299","6161102320046","6161102320404",
    "6161102320411"
  ]
};

const OCR_CORR = {
  MAJID: {
    "616400136610":"6164000136610",
    "6161102320205":"6161102320305",
    "6161105320444":"6161102320442",
    "6161102320453":"6161102320435",
    "6161102320456":"6161102320459",
    "6161102320458":"6161102320459"
  },
  CHANDARANA: {},
  QUICKMART: {
    "6161102320188":"6161102320138"
  }
};

function ean13Checksum(code) {
  if (code.length !== 13 || !/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(code[12], 10);
}

function levenshteinFast(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
}

function tokenize(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, ' ').split(/\s+/).filter(Boolean);
}

function nameScore(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;
  let score = 0;
  for (const t of ta) {
    if (tb.includes(t)) score += 2;
    else {
      // partial token match for size variants like 400G vs 400
      for (const u of tb) {
        if ((t.includes(u) || u.includes(t)) && Math.abs(t.length - u.length) <= 2) score += 1;
      }
    }
  }
  return score;
}

/**
 * Resolve a raw OCR code + description + price to an FG code.
 * Returns { fgCode, matchedCode, matched, confidence }
 * Runs in one synchronous pass; no async.
 */
export function resolveBarcode({ rawCode, description = '', unitPrice = null, customerType, products = [] }) {
  if (!rawCode || rawCode.startsWith('UNKNOWN_')) return null;

  let code = rawCode.trim().replace(/^U/, '');
  const list = KNOWN_BARCODES[customerType] || [];
  const corrections = OCR_CORR[customerType] || {};

  // 1. Exact match or OCR correction
  if (list.includes(code)) {
    return { fgCode: code, matchedCode: code, matched: true, confidence: 1 };
  }
  if (corrections[code]) {
    const corrected = corrections[code];
    if (list.includes(corrected)) {
      return { fgCode: corrected, matchedCode: corrected, matched: true, confidence: 0.98 };
    }
  }

  // 2. EAN-13 checksum single-digit substitution against known list
  if (code.length === 13 && /^\d{13}$/.test(code)) {
    for (const known of list) {
      if (levenshteinFast(code, known) === 1) {
        // Accept if edit distance 1 and known barcode is valid checksum
        if (ean13Checksum(known)) {
          return { fgCode: known, matchedCode: known, matched: true, confidence: 0.95 };
        }
      }
    }
  }

  // 3. Fuzzy match by last 4 digits (most stable in our data)
  const last4 = code.slice(-4);
  for (const known of list) {
    if (known.endsWith(last4)) {
      return { fgCode: known, matchedCode: known, matched: true, confidence: 0.9 };
    }
  }

  // 4. Description + price cross-validation using cached products
  if (description && products.length) {
    let best = null, bestScore = 0;
    for (const p of products) {
      const descScore = nameScore(description, p.itemName || '');
      let priceScore = 0;
      if (unitPrice != null && p.itemPrice != null) {
        const diff = Math.abs(parseFloat(unitPrice) - parseFloat(p.itemPrice));
        if (diff <= 2) priceScore = 3;
        else if (diff <= 5) priceScore = 1;
      }
      const total = descScore + priceScore;
      if (total > bestScore) {
        bestScore = total;
        best = p;
      }
    }
    if (best && bestScore >= 4) {
      // Return product.itemCode which is FG code
      return { fgCode: best.itemCode, matchedCode: code, matched: true, confidence: 0.85 };
    }
  }

  return null;
}
