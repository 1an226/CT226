// test-ocr.js (run with: node test-ocr.js)
async function testOCR() {
  // Mock the service functions
  const extractLPONumber = (text) => {
    const match = text.match(/P\d{9,}/);
    return match ? match[0] : null;
  };

  const screenshot1 = `
Purchase Order
*P038185600*
13505757 60.00
13505844 60.00
13505845 24.00
`;

  const screenshot2 = `
P038138830 : M/539
13505757 60.0000
13505844 60.0000
13505786 50.0000
`;

  console.log("Test 1 LPO:", extractLPONumber(screenshot1));
  console.log("Test 2 LPO:", extractLPONumber(screenshot2));
}

testOCR();
