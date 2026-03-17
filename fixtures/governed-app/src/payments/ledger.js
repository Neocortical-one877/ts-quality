function reservePaymentId(orderId) {
  return `pay-${orderId}`;
}

function recordPayment(orderId, amountCents, seenIds = new Set()) {
  const id = reservePaymentId(orderId);
  if (seenIds.has(id)) {
    return { status: 'duplicate', id };
  }
  seenIds.add(id);
  return { status: 'recorded', id, amountCents };
}

module.exports = {
  reservePaymentId,
  recordPayment
};
