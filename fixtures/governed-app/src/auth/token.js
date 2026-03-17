function isRefreshExpired(expiresAtMs, nowMs = Date.now()) {
  return nowMs >= expiresAtMs;
}

function canUseRefreshToken(token, nowMs = Date.now()) {
  return Boolean(
    token &&
    token.status === 'active' &&
    !isRefreshExpired(token.expiresAtMs, nowMs)
  );
}

function issueAccessDecision(token, nowMs = Date.now()) {
  if (!token) {
    return 'deny';
  }
  return canUseRefreshToken(token, nowMs) ? 'allow' : 'deny';
}

module.exports = {
  isRefreshExpired,
  canUseRefreshToken,
  issueAccessDecision
};
