# Attestation format

Attestations are signed JSON claims.

```json
{
  "version": "1",
  "kind": "attestation",
  "issuer": "ci.verify",
  "subjectType": "json-artifact",
  "subjectDigest": "sha256:...",
  "claims": ["ci.tests.passed"],
  "issuedAt": "2026-03-17T00:00:00.000Z",
  "payload": { "subjectFile": ".ts-quality/runs/<run-id>/verdict.json" },
  "signature": {
    "algorithm": "ed25519",
    "keyId": "ci.verify",
    "value": "base64-signature"
  }
}
```

Use `ts-quality attest sign` to create them and `ts-quality attest verify` to validate them against trusted public keys.
