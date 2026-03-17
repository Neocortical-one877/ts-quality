function getCustomerPii(customer) {
  return {
    id: customer.id,
    email: customer.email
  };
}

module.exports = {
  getCustomerPii
};
