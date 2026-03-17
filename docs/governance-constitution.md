# Governance and constitution

A constitution defines what the system must remain true to while it evolves.

Supported rule kinds:

- `boundary` — forbid specific module/import crossings
- `risk` — stricter CRAP, mutation, or merge-confidence budgets for sensitive domains
- `approval` — require human approvers with named roles
- `rollback` — require attested evidence before risky migrations
- `ownership` — reserve paths for named owners

Example:

```ts
export default [
  {
    kind: 'boundary',
    id: 'api-cannot-import-identity',
    from: ['packages/api/**'],
    to: ['packages/identity/**'],
    mode: 'forbid',
    message: 'API code may not import identity state directly.'
  }
];
```

`ts-quality govern` renders constitutional findings. `ts-quality plan` turns those findings into concrete next steps with tradeoffs.
