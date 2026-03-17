# Autonomous change example

1. Run `ts-quality check` to create a signed evidence bundle.
2. Sign the verdict with `ts-quality attest sign`.
3. Ask `ts-quality authorize --agent release-bot` for a legitimacy decision.
4. Record any human override in `.ts-quality/overrides.json`.
