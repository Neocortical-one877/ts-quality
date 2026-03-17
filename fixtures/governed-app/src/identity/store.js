function customerIdentity(customer) {
  return {
    id: customer.id,
    email: customer.email
  };
}

module.exports = {
  customerIdentity
};
