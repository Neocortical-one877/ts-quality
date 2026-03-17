const { getCustomerPii } = require('../../identity/src/store');

function consumerEmail(customer) {
  return getCustomerPii(customer).email;
}

module.exports = {
  consumerEmail
};
