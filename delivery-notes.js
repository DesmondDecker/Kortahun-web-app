exports.handler = async (event) => {
  // Fix 11: Added null guard on queryStringParameters.billId
  const billId = event.queryStringParameters?.billId;

  if (!billId) {
    return { statusCode: 400, body: JSON.stringify({ error: "billId is required" }) };
  }

  // ... rest of logic for generating notes
  return { statusCode: 200, body: JSON.stringify({ message: "Note generated", billId }) };
};