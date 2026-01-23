/**
 * Currency formatting utilities
 */

export const formatCurrency = (value, currency = "Ksh") => {
  if (value === null || value === undefined || value === "") {
    return `${currency} 0.00`;
  }

  let numericValue = 0;

  try {
    if (typeof value === "string") {
      // Remove any currency symbols and non-numeric characters except decimal point
      const cleaned = value.replace(/[^\d.-]/g, "");
      numericValue = parseFloat(cleaned) || 0;
    } else if (typeof value === "number") {
      numericValue = value;
    }
  } catch (error) {
    numericValue = 0;
  }

  return `${currency} ${numericValue.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString, format = "medium") => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  const formats = {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    medium: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
    dateOnly: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    timeOnly: {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  };

  const options = formats[format] || formats.medium;
  return date.toLocaleDateString("en-KE", options);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  let formatted = phone.toString().trim();

  // Remove all non-numeric characters
  formatted = formatted.replace(/\D/g, "");

  // Convert 254XXXXXXXXX to 0XXXXXXXXX
  if (formatted.startsWith("254") && formatted.length === 12) {
    formatted = "0" + formatted.substring(3);
  }

  // Format as 0XXX XXX XXX for display
  if (formatted.length === 10 && formatted.startsWith("0")) {
    return formatted.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  }

  return formatted;
};

export const extractCustomerCode = (customerName) => {
  if (!customerName) return "N/A";

  const patterns = [
    /\[(.*?)\]/, // [CODE]
    /\((.*?)\)/, // (CODE)
    /#(\w+)/, // #CODE
    /CODE:\s*(\w+)/i, // CODE: XYZ
    /CUST[\s\-]?(\w+)/i, // CUST-123 or CUST123
  ];

  for (const pattern of patterns) {
    const match = customerName.match(pattern);
    if (match) return match[1];
  }

  // Look for patterns like AB123, XYZ456
  const words = customerName.split(/\s+/);
  for (const word of words) {
    if (/^[A-Z]{2,}\d+$/.test(word) || /^CUST\d+$/i.test(word)) {
      return word;
    }
  }

  return "N/A";
};

export const normalizeOrderData = (order) => {
  return {
    id: order.id || order.orderId || order.orderNo || Date.now(),
    orderNo: order.orderNo || order.orderNumber || order.orderId || "",
    orderNumber: order.orderNumber || order.orderNo || order.orderId || "",
    customerCode:
      order.customerCode || extractCustomerCode(order.customerName) || "N/A",
    customerName: order.customerName || order.customer?.name || "Unknown",
    customerId: order.customerId || order.customer?.id,
    total: order.total || order.totalValue || order.amount || 0,
    totalValue: formatCurrency(order.totalValue || order.total || order.amount || 0),
    tax: order.tax || order.vat || 0,
    discount: order.discount || 0,
    netTotal: order.netTotal || (order.total || 0) - (order.discount || 0),
    orderDate: order.orderDate || order.createdDate || order.date || new Date().toISOString(),
    deliveryDate: order.deliveryDate || order.expectedDelivery,
    orderStatus: order.orderStatus || order.status || "Pending",
    status: order.status || order.orderStatus || "Pending",
    customerRoute: order.customerRoute || order.route || "",
    lpo: order.lpo || order.lpoNumber || "",
    sellingPriceList: order.sellingPriceList || order.priceList || "Standard",
    branch: order.branch || "",
    notes: order.notes || order.comments || "",
    items: order.items || order.orderItems || [],
    formattedDate: formatDate(order.orderDate || order.createdDate || order.date),
    _raw: order,
  };
};

export const getStatusColor = (status) => {
  const statusLower = (status || "").toLowerCase();
  
  if (statusLower.includes("pending")) return "#ff9900"; // Orange
  if (statusLower.includes("confirmed")) return "#00aaff"; // Blue
  if (statusLower.includes("processing")) return "#9966ff"; // Purple
  if (statusLower.includes("journey") || statusLower.includes("transit")) return "#00aaff"; // Light Blue
  if (statusLower.includes("delivered") || statusLower.includes("completed")) return "#00ff00"; // Green
  if (statusLower.includes("cancelled") || statusLower.includes("rejected")) return "#ff3333"; // Red
  
  return "#666666"; // Gray
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

export const calculatePercentage = (part, total) => {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
};

export const generateOrderStats = (orders) => {
  const total = orders.length;
  const totalValue = orders.reduce((sum, order) => {
    const value = parseFloat(order.totalValue?.replace(/[^\d.-]/g, "") || 0);
    return sum + value;
  }, 0);

  const statusCounts = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    inJourney: 0,
    delivered: 0,
    cancelled: 0,
  };

  orders.forEach((order) => {
    const status = (order.status || "").toLowerCase();
    if (status.includes("pending")) statusCounts.pending++;
    else if (status.includes("confirmed")) statusCounts.confirmed++;
    else if (status.includes("processing")) statusCounts.processing++;
    else if (status.includes("journey") || status.includes("transit")) statusCounts.inJourney++;
    else if (status.includes("delivered") || status.includes("completed")) statusCounts.delivered++;
    else if (status.includes("cancelled") || status.includes("rejected")) statusCounts.cancelled++;
  });

  const averageOrderValue = total > 0 ? totalValue / total : 0;

  return {
    total,
    totalValue,
    averageOrderValue,
    statusCounts,
    pendingPercentage: calculatePercentage(statusCounts.pending, total),
    deliveredPercentage: calculatePercentage(statusCounts.delivered, total),
  };
};