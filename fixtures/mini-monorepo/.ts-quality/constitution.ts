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
