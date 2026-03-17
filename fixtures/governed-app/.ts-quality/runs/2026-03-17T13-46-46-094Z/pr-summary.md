# ts-quality summary

- Merge confidence: **6/100**
- Outcome: **fail**
- Highest-risk changed hotspot: `src/auth/token.js` function:canUseRefreshToken with CRAP 3
- Surviving mutants: **3**
- Invariant at risk: **auth.refresh.validity**
- Best next action: Add or tighten an assertion covering src/auth/token.js around the surviving mutant.

## Blocking findings
- Merge confidence 6 below minimum 65
- Mutation score 0.25 is below budget 0.75
- Surviving mutant in src/auth/token.js
- Surviving mutant in src/auth/token.js
- Surviving mutant in src/auth/token.js
- Invariant auth.refresh.validity is at-risk
- Auth code requires stronger evidence because it decides authorization.
- Auth code requires stronger evidence because it decides authorization.
