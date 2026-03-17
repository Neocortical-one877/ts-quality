declare const Buffer: any;
type Buffer = any;
declare const process: any;
declare const console: any;
declare const __dirname: string;
declare const __filename: string;
declare const setTimeout: (...args: any[]) => any;
declare const clearTimeout: (...args: any[]) => any;
declare module 'assert/strict' { const x: any; export = x; }
declare module 'child_process' { export const spawnSync: any; }
declare module 'crypto' { export const createHash: any; export const createSign: any; export const createVerify: any; export const createPrivateKey: any; export const createPublicKey: any; export const generateKeyPairSync: any; export const randomUUID: any; export const sign: any; export const verify: any; }
declare module 'fs' { const x: any; export = x; }
declare module 'fs/promises' { const x: any; export = x; }
declare module 'module' { export const createRequire: any; }
declare module 'node:test' { const x: any; export = x; }
declare module 'os' { const x: any; export = x; }
declare module 'path' { const x: any; export = x; }
declare module 'typescript' { const x: any; export = x; }
declare module 'url' { export const fileURLToPath: any; export const pathToFileURL: any; }
declare module 'vm' { const x: any; export = x; }
