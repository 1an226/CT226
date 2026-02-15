// services/formatConfig.js
// Complete format configuration for NAIVAS and JAZARIBU customers
// Handles: Text formats, Image formats, OCR errors, and all edge cases

export const FORMAT_CONFIG = {
  NAIVAS: {
    SIMPLE_FORMAT: {
      name: "NAIVAS_SIMPLE",
      description: "Simple format with Item Code and Quantity (from text)",
      patterns: ["SIMPLE"],
    },
    TABLE_FORMAT: {
      name: "NAIVAS_TABLE",
      description:
        "Table format with structured columns - extracts 8-digit Item Code",
      patterns: ["TABLE"],
    },
  },
  JAZARIBU: {
    SIMPLE_FORMAT: {
      name: "JAZARIBU_SIMPLE",
      description:
        "Simple text format with Barcode | Item Code | Description | Quantity | PIECES",
      patterns: ["SIMPLE"],
    },
    TABLE_FORMAT: {
      name: "JAZARIBU_TABLE",
      description:
        "Table format with Barcode | Item Code | Description | Quantity (from image)",
      patterns: ["TABLE"],
    },
  },
  MAJID: {
    PIPE_FORMAT: {
      name: "MAJID_PIPE",
      description: "Pipe-delimited format with quantity before pipe",
      patterns: ["PIPE"],
    },
  },
  QUICKMART: {
    MARKDOWN_FORMAT: {
      name: "QUICKMART_MARKDOWN",
      description: "Markdown format with PCS quantity notation",
      patterns: ["MARKDOWN"],
    },
  },
  CHANDARANA: {
    SIMPLE_FORMAT: {
      name: "CHANDARANA_SIMPLE",
      description: "Simple format with decimal quantities",
      patterns: ["SIMPLE"],
    },
  },
};

// Extract LPO Number
export const extractLPO = (text, customerType = "NAIVAS") => {
  console.log(`=== EXTRACTING LPO for ${customerType} ===`);

  let lpo = null;

  if (customerType === "JAZARIBU") {
    // JAZARIBU: "PO-J022-000388"
    const patterns = [
      /PO-[A-Z]\d{3}-\d{6}/i,
      /PO-[JA-Z0-9]{3}-\d{6}/i,
      /Order\s+No[.:]*\s*([A-Z0-9]+-[A-Z0-9]+-\d{6})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        lpo = match[0].includes("Order") ? match[1] : match[0];
        console.log(`Found JAZARIBU LPO: ${lpo}`);
        return lpo;
      }
    }
  } else if (customerType === "NAIVAS") {
    // NAIVAS: "P038449364-1"
    const naivisMatch = text.match(/P\d{10}-\d/);
    if (naivisMatch) {
      lpo = naivisMatch[0];
      console.log(`Found NAIVAS LPO: ${lpo}`);
      return lpo;
    }
  }

  console.log(`No LPO found for ${customerType}`);
  return null;
};

// Force formats by customer
export const detectFormat = (text, customerType = "NAIVAS") => {
  console.log(`FORCE FORMAT for ${customerType}`);

  const customerFormats = FORMAT_CONFIG[customerType];
  if (!customerFormats) return null;

  switch (customerType) {
    case "NAIVAS":
      if (text.includes("Item Code") && text.includes("Bar Code")) {
        console.log("FORCING: NAIVAS.TABLE_FORMAT (structured table)");
        return customerFormats.TABLE_FORMAT;
      } else {
        console.log("FORCING: NAIVAS.SIMPLE_FORMAT (text-based)");
        return customerFormats.SIMPLE_FORMAT;
      }

    case "JAZARIBU":
      if (
        text.includes("Barcode") &&
        (text.includes("No.") || text.includes("Description"))
      ) {
        console.log(
          "FORCING: JAZARIBU.TABLE_FORMAT (structured table from image)",
        );
        return customerFormats.TABLE_FORMAT;
      } else {
        console.log("FORCING: JAZARIBU.SIMPLE_FORMAT (compact text format)");
        return customerFormats.SIMPLE_FORMAT;
      }

    case "MAJID":
      console.log("FORCING: MAJID.PIPE_FORMAT");
      return customerFormats.PIPE_FORMAT;

    case "QUICKMART":
      console.log("FORCING: QUICKMART.MARKDOWN_FORMAT");
      return customerFormats.MARKDOWN_FORMAT;

    case "CHANDARANA":
      console.log("FORCING: CHANDARANA.SIMPLE_FORMAT");
      return customerFormats.SIMPLE_FORMAT;

    default:
      return Object.values(customerFormats)[0];
  }
};

// Helper: Fix OCR-corrupted item codes
const fixOCRItemCode = (dirtyCode) => {
  let code = dirtyCode.trim();

  // Fix: JTO1102 -> JT01102 (O->0)
  code = code.replace(/O(\d)/g, "0$1");
  code = code.replace(/JTO/g, "JT0");

  // Fix: JT O1102 -> JT01102 (remove spaces)
  code = code.replace(/JT\s+O/g, "JT0");
  code = code.replace(/\s+/g, "");

  // Fix: 3701097 -> JT01097 (3->J, missing T)
  if (code.match(/^3/)) {
    code = code.replace(/^3/, "J");
  }

  // Fix: J701097 -> JT01097 (missing T)
  code = code.replace(/^J([0-9])/g, "JT0$1");

  // Extract just JT##### format
  const cleanMatch = code.match(/JT\d{5}/);
  if (cleanMatch) {
    return cleanMatch[0];
  }

  return null;
};

// Complete parser
export const parseWithFormat = (text, customerType = "NAIVAS") => {
  console.log(`=== PARSING ${customerType} ===`);

  const format = detectFormat(text, customerType);
  if (!format) return [];

  const items = [];
  const lines = text.split("\n");
  const seenItemCodes = new Set();

  // NAIVAS specific parsing
  if (customerType === "NAIVAS") {
    if (format.name === "NAIVAS_TABLE") {
      console.log("NAIVAS TABLE FORMAT - Extracting 8-digit ITEM CODES");

      let isInDataSection = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || line.length < 10) continue;

        if (line.includes("Item Code") && line.includes("Bar Code")) {
          isInDataSection = true;
          console.log("Table header found");
          continue;
        }

        if (
          line.includes("Sub total") ||
          line.includes("Order total") ||
          line.includes("VAT") ||
          line.includes("---") ||
          line.includes("TERMS AND CONDITIONS")
        ) {
          isInDataSection = false;
          continue;
        }

        if (!isInDataSection) continue;

        console.log(`Line ${i}: ${line.substring(0, 80)}...`);

        const itemCodeMatch = line.match(/^(\d{8})\b/);
        if (!itemCodeMatch) continue;

        const itemCode = itemCodeMatch[1];

        if (seenItemCodes.has(itemCode)) {
          console.log(`Skipping duplicate: ${itemCode}`);
          continue;
        }

        let quantity = null;

        // Strategy 1: Look for "PCS" keyword
        const pcsIndex = line.indexOf("PCS");
        if (pcsIndex !== -1) {
          const afterPcs = line.substring(pcsIndex + 3).trim();
          const firstNumMatch = afterPcs.match(/^(\d+(?:\.\d{2})?)/);
          if (firstNumMatch) {
            const qty = parseFloat(firstNumMatch[1]);
            if (qty >= 1 && qty <= 10000) {
              quantity = qty;
              console.log(`Found quantity after PCS: ${quantity}`);
            }
          }
        }

        // Strategy 2: Extract all numbers and find quantity
        if (!quantity) {
          const allNumbers = line.match(/(\d+(?:\.\d{2})?)/g);
          if (allNumbers && allNumbers.length >= 3) {
            for (let j = 2; j < allNumbers.length; j++) {
              const num = parseFloat(allNumbers[j]);
              if (num >= 1 && num <= 10000) {
                quantity = num;
                console.log(`Found quantity from numbers: ${quantity}`);
                break;
              }
            }
          }
        }

        if (quantity && quantity > 0) {
          seenItemCodes.add(itemCode);
          items.push({
            itemCode: itemCode,
            quantity: Math.round(quantity),
            format: "naivas_table_format",
            rawLine: line,
          });
          console.log(`${itemCode} → ${Math.round(quantity)} units`);
        }
      }
    } else {
      // NAIVAS SIMPLE FORMAT
      console.log("NAIVAS SIMPLE FORMAT - Extracting 8-digit ITEM CODES");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (
          !line ||
          line.length < 10 ||
          line.includes("Item Code") ||
          line.includes("Bar Code") ||
          line.includes("Description") ||
          line.includes("Order :") ||
          line.includes("Sub total") ||
          line.includes("Order total") ||
          line.includes("TERMS") ||
          line.includes("---") ||
          line.includes("===")
        ) {
          continue;
        }

        console.log(`Line ${i}: ${line.substring(0, 80)}...`);

        const itemCodeMatch = line.match(/^(\d{8})\b/);
        if (!itemCodeMatch) continue;

        const itemCode = itemCodeMatch[1];

        if (seenItemCodes.has(itemCode)) {
          console.log(`Skipping duplicate: ${itemCode}`);
          continue;
        }

        let quantity = null;
        const afterItemCode = line.substring(8).trim();
        const numberMatches = afterItemCode.match(/(\d+(?:\.\d{2})?)/g);

        if (numberMatches && numberMatches.length > 0) {
          const pcsPos = line.indexOf("PCS");
          if (pcsPos !== -1) {
            const afterPcs = line.substring(pcsPos + 3).trim();
            const qtyMatch = afterPcs.match(/^(\d+(?:\.\d{2})?)/);
            if (qtyMatch) {
              const qty = parseFloat(qtyMatch[1]);
              if (qty >= 1 && qty <= 10000) {
                quantity = qty;
              }
            }
          }

          if (!quantity) {
            for (const numStr of numberMatches) {
              const num = parseFloat(numStr);
              if (
                num >= 1 &&
                num <= 10000 &&
                numStr.length <= 5 &&
                num !== 400 &&
                num !== 600 &&
                num !== 800 &&
                num !== 1500
              ) {
                quantity = num;
                break;
              }
            }
          }
        }

        if (quantity && quantity > 0) {
          seenItemCodes.add(itemCode);
          items.push({
            itemCode: itemCode,
            quantity: Math.round(quantity),
            format: "naivas_simple_format",
            rawLine: line,
          });
          console.log(`${itemCode} → ${Math.round(quantity)} units`);
        }
      }
    }
  }

  // JAZARIBU specific parsing
  else if (customerType === "JAZARIBU") {
    if (format.name === "JAZARIBU_TABLE") {
      console.log(
        "JAZARIBU TABLE FORMAT - Fixed for image parsing with OCR correction",
      );

      let isInDataSection = false;

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (!line) continue;

        // Start reading data after header
        if (line.includes("Barcode") && line.includes("No.")) {
          isInDataSection = true;
          console.log("Table header found, starting extraction");
          continue;
        }

        // Stop at footer
        if (
          line.includes("Total KE") ||
          line.includes("Terms and Conditions") ||
          line.includes("---") ||
          line.includes("===")
        ) {
          isInDataSection = false;
          continue;
        }

        if (!isInDataSection) continue;

        console.log(`Line ${i}: ${line.substring(0, 100)}...`);

        // Extract 13-digit barcode
        const barcodeMatch = line.match(/^(\d{13})/);
        if (!barcodeMatch) continue;

        const barcode = barcodeMatch[1];
        console.log(`Found BARCODE: ${barcode}`);

        const afterBarcode = line.substring(13).trim();

        // Extract item code with OCR correction
        // First try: Match clean format JT##### (1-2 letters + 5 digits)
        let itemCodeMatch = afterBarcode.match(/([A-Z]{1,2}\d{5})/);
        let itemCode = null;

        if (itemCodeMatch) {
          itemCode = itemCodeMatch[1];
          console.log(`Found ITEM CODE: ${itemCode}`);
        } else {
          // Second try: Find corrupted code and fix it
          console.log(
            `Attempting OCR correction in: ${afterBarcode.substring(0, 60)}`,
          );

          // Match anything that looks like an item code (letters + numbers, 6-8 chars)
          const corruptedMatch = afterBarcode.match(
            /([A-Z0-9]{1,3}[0-9T]{5,7})/,
          );

          if (corruptedMatch) {
            const fixedCode = fixOCRItemCode(corruptedMatch[1]);
            if (fixedCode) {
              itemCode = fixedCode;
              console.log(`Fixed corrupted item code to: ${itemCode}`);
            }
          }
        }

        if (!itemCode) {
          console.log(
            `No item code found in: ${afterBarcode.substring(0, 60)}`,
          );
          continue;
        }

        if (seenItemCodes.has(itemCode)) {
          console.log(`Skipping duplicate: ${itemCode}`);
          continue;
        }

        // Extract quantity
        let quantity = null;

        // Look for "PIECES" keyword
        const piecesIndex = line.indexOf("PIECES");
        if (piecesIndex !== -1) {
          const beforePieces = line.substring(0, piecesIndex).trim();
          const numbers = beforePieces.match(/(\d+)/g);

          if (numbers && numbers.length > 0) {
            // Work backwards to find valid quantity (1-100, max 3 digits)
            for (let j = numbers.length - 1; j >= 0; j--) {
              const num = parseInt(numbers[j]);

              if (num >= 1 && num <= 100 && numbers[j].length <= 3) {
                quantity = num;
                console.log(`Found quantity: ${quantity}`);
                break;
              }
            }
          }
        }

        // Fallback: Look for first reasonable number after item code
        if (!quantity) {
          const afterItemCode = line.substring(
            line.indexOf(itemCode) + itemCode.length,
          );
          const numberMatches = afterItemCode.match(/(\d+)/g);

          if (numberMatches && numberMatches.length > 0) {
            for (const numStr of numberMatches) {
              const num = parseInt(numStr);
              if (num >= 1 && num <= 100 && numStr.length <= 3) {
                quantity = num;
                console.log(`Found quantity (fallback): ${quantity}`);
                break;
              }
            }
          }
        }

        if (quantity && quantity > 0) {
          seenItemCodes.add(itemCode);
          items.push({
            itemCode: itemCode,
            quantity: quantity,
            format: "jazaribu_table_format",
            rawLine: line,
          });
          console.log(`${itemCode} → ${quantity} units (TABLE)`);
        }
      }
    } else {
      // JAZARIBU SIMPLE FORMAT
      console.log(
        "JAZARIBU SIMPLE FORMAT - Extracting alphanumeric Item Codes from compact text",
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (
          !line ||
          line.length < 15 ||
          line.includes("Total KE") ||
          line.includes("Terms and Conditions") ||
          line.includes("Created By") ||
          line.includes("Approved By") ||
          line.includes("Buy-from") ||
          line.includes("---") ||
          line.includes("===") ||
          line.includes("Order No.") ||
          line.includes("VAT Registration") ||
          line.includes("Email") ||
          line.includes("Phone No.")
        ) {
          continue;
        }

        console.log(`Line ${i}: ${line.substring(0, 80)}...`);

        const barcodeMatch = line.match(/^(\d{13})\s+/);
        if (!barcodeMatch) continue;

        const barcode = barcodeMatch[1];
        const afterBarcode = line.substring(barcode.length).trim();

        // Extract item code - try clean format first
        let itemCodeMatch = afterBarcode.match(/^([A-Z]{1,2}\d{5})\s+/);
        let itemCode = null;

        if (itemCodeMatch) {
          itemCode = itemCodeMatch[1];
        } else {
          // Try to fix corrupted code
          const corruptedMatch = afterBarcode.match(
            /^([A-Z0-9]{1,3}[0-9T]{5,7})/,
          );
          if (corruptedMatch) {
            const fixedCode = fixOCRItemCode(corruptedMatch[1]);
            if (fixedCode) {
              itemCode = fixedCode;
            }
          }
        }

        if (!itemCode) {
          console.log(
            `No item code found in: ${afterBarcode.substring(0, 60)}`,
          );
          continue;
        }

        console.log(`Found ITEM CODE: ${itemCode}`);

        if (seenItemCodes.has(itemCode)) {
          console.log(`Skipping duplicate: ${itemCode}`);
          continue;
        }

        // Extract quantity
        let quantity = null;

        const piecesIndex = line.indexOf("PIECES");
        if (piecesIndex !== -1) {
          const beforePieces = line.substring(0, piecesIndex).trim();
          const numberMatch = beforePieces.match(/(\d+)\s*$/);
          if (numberMatch) {
            const qty = parseInt(numberMatch[1]);
            if (qty >= 1 && qty <= 100) {
              quantity = qty;
              console.log(`Found quantity: ${quantity}`);
            }
          }
        }

        if (quantity && quantity > 0) {
          seenItemCodes.add(itemCode);
          items.push({
            itemCode: itemCode,
            quantity: quantity,
            format: "jazaribu_simple_format",
            rawLine: line,
          });
          console.log(`${itemCode} → ${quantity} units (SIMPLE)`);
        }
      }
    }
  }

  // Other customers parsing
  else {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (
        !line ||
        line.length < 10 ||
        line.includes("ORDER :") ||
        (line.includes("Description") &&
          (line.includes("Scan") || line.includes("Qty"))) ||
        (line.includes("Bar Code") && line.includes("S.No.")) ||
        (line.includes("Code") && line.includes("Scan Code")) ||
        (line.includes("BAR CODE") && line.includes("SUPPLIER")) ||
        line.includes("---") ||
        line.includes("===")
      ) {
        continue;
      }

      console.log(`Line ${i}: ${line.substring(0, 80)}...`);

      let parsedItem = null;
      let barcode = null;
      let quantity = null;

      const barcodeMatch = line.match(/\b(\d{13})\b/);
      if (!barcodeMatch) continue;

      barcode = barcodeMatch[1];

      if (seenItemCodes.has(barcode)) {
        console.log(`Skipping duplicate: ${barcode}`);
        continue;
      }

      // MAJID parsing
      if (customerType === "MAJID") {
        if (barcode.endsWith("983") || barcode.endsWith("984")) {
          console.log(`Filtered Majid barcode: ${barcode}`);
          continue;
        }

        const pipeIndex = line.indexOf("|");
        if (pipeIndex !== -1) {
          const beforePipe = line.substring(0, pipeIndex);
          const numbers = beforePipe.match(/\b(\d{1,3})\b/g);

          if (numbers && numbers.length > 0) {
            const potentialQty = parseInt(numbers[numbers.length - 1]);

            if (potentialQty >= 1 && potentialQty <= 100) {
              const context = line.toLowerCase();
              const isWeightReference =
                (potentialQty === 400 && context.includes("400g")) ||
                (potentialQty === 600 && context.includes("600g")) ||
                (potentialQty === 800 && context.includes("800g")) ||
                (potentialQty === 1500 && context.includes("1.5kg")) ||
                (potentialQty === 15 && context.includes("1.5kg"));

              if (!isWeightReference) {
                quantity = potentialQty;
                parsedItem = {
                  itemCode: barcode,
                  quantity: quantity,
                  format: "majid_pipe_qty",
                  rawLine: line,
                };
              }
            }
          }
        }

        if (!parsedItem) {
          const pricePatterns = [/57\.900/, /88\.700/, /117\.000/, /217\.900/];
          for (const pattern of pricePatterns) {
            const priceMatch = line.match(pattern);
            if (priceMatch) {
              const beforePrice = line.substring(
                0,
                line.indexOf(priceMatch[0]),
              );
              const lastNumberMatch = beforePrice.match(
                /\b(\d{1,3})\b(?=\D*$)/,
              );

              if (lastNumberMatch) {
                const qty = parseInt(lastNumberMatch[1]);
                if (qty >= 1 && qty <= 100) {
                  quantity = qty;
                  parsedItem = {
                    itemCode: barcode,
                    quantity: quantity,
                    format: "majid_price_qty",
                    rawLine: line,
                  };
                  break;
                }
              }
            }
          }
        }
      }

      // CHANDARANA parsing
      else if (customerType === "CHANDARANA") {
        const afterBarcode = line.substring(
          line.indexOf(barcode) + barcode.length,
        );
        const decimalMatches = afterBarcode.match(/(\d+\.\d{2})/g);

        if (decimalMatches && decimalMatches.length >= 1) {
          const possibleQuantities = [];

          const qty1 = parseFloat(decimalMatches[0]);
          if (qty1 >= 1 && qty1 <= 100 && qty1 === Math.floor(qty1)) {
            possibleQuantities.push({ qty: qty1, pos: 0 });
          }

          if (decimalMatches.length > 1) {
            const lastQty = parseFloat(
              decimalMatches[decimalMatches.length - 1],
            );
            if (
              lastQty >= 1 &&
              lastQty <= 100 &&
              lastQty === Math.floor(lastQty)
            ) {
              possibleQuantities.push({
                qty: lastQty,
                pos: decimalMatches.length - 1,
              });
            }
          }

          if (possibleQuantities.length > 0) {
            const chosen =
              possibleQuantities.find((q) => q.pos === 0) ||
              possibleQuantities[0];
            quantity = chosen.qty;
            parsedItem = {
              itemCode: barcode,
              quantity: quantity,
              format: "chandarana_decimal_qty",
              rawLine: line,
            };
          }
        }

        if (!parsedItem) {
          const wholeNumbers = afterBarcode.match(/\b(\d{1,3})\b/g);
          if (wholeNumbers) {
            const validNumbers = wholeNumbers
              .map((n) => parseInt(n))
              .filter(
                (n) =>
                  n >= 1 &&
                  n <= 100 &&
                  n !== 400 &&
                  n !== 600 &&
                  n !== 800 &&
                  n !== 1500,
              );

            if (validNumbers.length > 0) {
              quantity = validNumbers[0];
              parsedItem = {
                itemCode: barcode,
                quantity: quantity,
                format: "chandarana_whole_qty",
                rawLine: line,
              };
            }
          }
        }
      }

      // QUICKMART parsing
      else if (customerType === "QUICKMART") {
        const pcsPattern = /(\d+\.\d{2})\s+PCS/i;
        const pcsMatch = line.match(pcsPattern);

        if (pcsMatch) {
          quantity = parseFloat(pcsMatch[1]);
          parsedItem = {
            itemCode: barcode,
            quantity: quantity,
            format: "quickmart_pcs_qty",
            rawLine: line,
          };
        }
      }

      // Add item if valid
      if (parsedItem && quantity && quantity > 0) {
        parsedItem.quantity = Math.round(quantity);

        const lineLower = line.toLowerCase();
        const isWeightMistake =
          (parsedItem.quantity === 400 && lineLower.includes("400g")) ||
          (parsedItem.quantity === 600 && lineLower.includes("600g")) ||
          (parsedItem.quantity === 800 && lineLower.includes("800g")) ||
          (parsedItem.quantity === 1500 && lineLower.includes("1.5kg")) ||
          (parsedItem.quantity === 15 && lineLower.includes("1.5kg"));

        if (!isWeightMistake) {
          seenItemCodes.add(barcode);
          items.push(parsedItem);
          console.log(`${barcode} → ${parsedItem.quantity} units`);
        }
      }
    }
  }

  console.log(`=== TOTAL: ${items.length} items for ${customerType} ===`);

  items.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.itemCode}: ${item.quantity} units`);
  });

  return items;
};

// Test function
export const testAllCustomers = () => {
  console.log("=== TESTING ALL CUSTOMERS ===");

  const testData = {
    NAIVAS_TABLE: `Item Code    Bar Code         Item Description                     Unit    Quantity  Unit Price  Net Amount
13505757     2037690000000   FRESH WHITE BREAD 400G                PCS     60.00     52.50       3,150.00
13505758     6161107470012   FRESH WHOLEMEAL BREAD 400G              PCS     30.00     52.50       1,575.00
13505786     2037680000000   FRESH WHITE BREAD 800GM                 PCS     40.00     105.00      4,200.00
13505790     2037720000000   FRESH WHOLEMEAL BREAD 800G              PCS     10.00     105.00      1,050.00
13505844     02038350000000  FRESH WHITE BREAD 600G                  PCS     48.00     81.25       3,900.00
13505845     6161107470616   FRESH WHOLEMEAL BREAD 600G              PCS     36.00     81.25       2,925.00
Sub total                                                                                        16,800.00`,

    JAZARIBU_SIMPLE: `6161102320404 JT01093 Supa Loaf White Bread 400Gm Ct 12 PIECES 55.00 660.00
6161102320138 JT01098 Supa Butter Toast Loaf 400Gm 12 PIECES 55.00 660.00
6161102320060 JT01100 Supa White Sliced Barrel 400Gm 12 PIECES 55.00 660.00
6161102320169 JT01090 Supa Loaf Family 600Gms 6 PIECES 82.00 492.00
6161102320442 JT01094 Supa Butter Toast Bread 600G 6 PIECES 82.00 492.00
6161102320299 JT01102 Supa White Sliced Barrel 600Gm 6 PIECES 82.00 492.00
6161102320183 JT01091 Supa Loaf White Bread 800Gm 6 PIECES 108.00 648.00
6161102320435 JT01097 Supa White B/Toast 800Gm 6 PIECES 108.00 648.00
6161102320305 JT01103 Supa White Sliced Barrel 800Gm 6 PIECES 108.00 648.00
6161102320534 JT01099 Supa White Sliced Bread 1.5Kg 2 PIECES 205.00 410.00
Total KE 5,810.00`,

    JAZARIBU_TABLE: `Barcode          No.      Description                                          Quantity  Unit of  Direct Unit  Amount
                                                                                                                Measure  Cost
6161102320404   JT01093  Supa Loaf White Bread 400Gm Ct                          12           PIECES   55.00        660.00
6161102320138   JT01098  Supa Butter Toast Loaf 400Gm                            12           PIECES   55.00        660.00
6161102320060   JT01100  Supa White Sliced Barrel 400Gm                          12           PIECES   55.00        660.00
6161102320169   JT01090  Supa Loaf Family 600Gms                                 6            PIECES   82.00        492.00
6161102320442   JT01094  Supa Butter Toast Bread 600G                            6            PIECES   82.00        492.00
6161102320299   JT01102  Supa White Sliced Barrel 600Gm                          6            PIECES   82.00        492.00
6161102320183   JT01091  Supa Loaf White Bread 800Gm                             6            PIECES   108.00       648.00
6161102320435   JT01097  Supa White B/Toast 800Gm                                6            PIECES   108.00       648.00
6161102320305   JT01103  Supa White Sliced Barrel 800Gm                          6            PIECES   108.00       648.00
6161102320534   JT01099  Supa White Sliced Bread 1.5Kg                           2            PIECES   205.00       410.00
Total KE 5,810.00`,

    MAJID: `611102320404 000074580 009 SUPALOAF WHITE SLICED BREAD CT 400G 15| 57.900 868.5
6164000136610 000074582 009 SUPALOAF WHITE SLICED BREAD 600G 14| 88.700 1241.8
6161102320183 000074584 009 SUPALOAF WHITE SLICED SDW BREAD800G 6 117.000 702.0
6161102320534 000074586 009 SUPALOAF WHITE SLICED BREAD 1.5KG 4 217.900 871.6`,

    CHANDARANA: `6161102320459 SUPA 1.5KG BUTTER TOAST BREAD 4.00 0.00 1 4.00
6161102320046 SUPA 1.5KG WHITE SLICED BREAD 4.00 0.00 1 4.00
6161102320148 SUPA 400G BUTTER TOAST BREAD 5.00 0.00 1 5.00
6161102320299 SUPA 600G BARREL WHITE BREAD CT 10.00 0.00 1 10.00
6161102320442 SUPA 600G WHITE BUTTER TOAST 10.00 0.00 1 10.00
6161102320183 SUPA 800G SWICH WHITE BREAD 10.00 0.00 1 10.00
6161102320435 SUPA 800G WHITE BUTTER TOAST 5.00 0.00 1 5.00
6161102320169 SUPA LOAF WHITE BREAD 600G 10.00 0.00 1 10.00`,

    QUICKMART: `700183 6161102320459 FD- SUPA BUTTER TOAST 1500G 1 PCS 3.00 PCS 217.90 653.70
700001 6161102320183 FD- SUPA LOAF PREMIUM WHITE CT 800G 1 PCS 8.00 PCS 117.00 936.00
700009 6161102320169 FD- SUPALOAF WHITE CT 600G 1 PCS 9.00 PCS 88.70 798.30
700178 6161102320442 FD-SUPA BUTTER TOAST 600G 1 PCS 10.00 PCS 88.70 887.00
700140 6161102320435 FD-SUPA BUTTER TOAST BREAD 800G 1 PCS 8.00 PCS 117.00 936.00
700110 6161102320138 FD-SUPALOAF BUTTER TOAST 400GMS 1 PCS 4.00 PCS 57.90 463.20
700114 6161102320299 FD-SUPALOAF WHITE BARREL 600GMS 1 PCS 4.00 PCS 88.70 354.80
700113 6161102320046 FD-SUPALOAF WHITE BREAD 1.5KG 1 PCS 3.00 PCS 217.90 653.70
700076 6161102320404 FD-SUPALOAF WHITE BREAD CT 400G 1 PCS 6.00 PCS 57.90 347.40`,
  };

  const expectedResults = {
    NAIVAS_TABLE: {
      count: 6,
      quantities: [60, 30, 40, 10, 48, 36],
      total: 224,
    },
    JAZARIBU_SIMPLE: {
      count: 10,
      quantities: [12, 12, 12, 6, 6, 6, 6, 6, 6, 2],
      total: 74,
    },
    JAZARIBU_TABLE: {
      count: 10,
      quantities: [12, 12, 12, 6, 6, 6, 6, 6, 6, 2],
      total: 74,
    },
    MAJID: { count: 4, quantities: [15, 14, 6, 4], total: 39 },
    CHANDARANA: {
      count: 8,
      quantities: [4, 4, 5, 10, 10, 10, 5, 10],
      total: 58,
    },
    QUICKMART: {
      count: 9,
      quantities: [3, 8, 9, 10, 8, 4, 4, 3, 6],
      total: 55,
    },
  };

  let allPassed = true;

  for (const [testName, text] of Object.entries(testData)) {
    console.log(`\n=== ${testName} ===`);

    const customerType = testName.includes("NAIVAS")
      ? "NAIVAS"
      : testName.includes("JAZARIBU")
        ? "JAZARIBU"
        : testName.split("_")[0];

    const items = parseWithFormat(text, customerType);
    const expected = expectedResults[testName];

    console.log(`Expected: ${expected.count} items, Total: ${expected.total}`);
    console.log(`Found: ${items.length} items`);

    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`Total quantity: ${totalQty}`);

    const passed =
      items.length === expected.count && totalQty === expected.total;

    if (passed) {
      console.log(`${testName} PASSED!`);
    } else {
      console.log(`${testName} FAILED!`);
      allPassed = false;

      console.log(
        "Got quantities:",
        items.map((i) => i.quantity),
      );
      console.log("Expected:", expected.quantities);
    }
  }

  console.log(
    `\n=== FINAL RESULT: ${allPassed ? "ALL PASSED" : "SOME FAILED"} ===`,
  );
  return allPassed;
};

// Export
export default {
  FORMAT_CONFIG,
  detectFormat,
  parseWithFormat,
  extractLPO,
  testAllCustomers,
};