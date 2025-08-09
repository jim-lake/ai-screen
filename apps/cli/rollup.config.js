import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

// Read package.json to get dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Get all dependencies to mark as external (don't bundle them)
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  // Node.js built-in modules
  'fs',
  'path',
  'os',
  'child_process',
  'events',
  'stream',
  'util',
  'crypto',
  'http',
  'https',
  'url',
  'querystring',
  'readline',
  'tty',
  'net',
  'dgram',
  'dns',
  'cluster',
  'worker_threads',
  'perf_hooks',
  'inspector',
  'async_hooks',
  'buffer',
  'string_decoder',
  'timers',
  'console',
  'process',
  'v8',
  'vm',
  'zlib',
  'assert',
  'constants',
  'module',
  'repl',
  'domain',
  'punycode',
];

const isExternal = (id) => {
  // Mark all node_modules and Node.js built-ins as external
  return (
    external.some((dep) => id === dep || id.startsWith(dep + '/')) ||
    id.startsWith('node:')
  );
};

const isExternalForCli = (id) => {
  // For cli.js, also treat local index module as external
  return isExternal(id) || id === './index';
};

// Simple plugin to ensure .js extension in import paths
const addJsExtension = () => ({
  name: 'add-js-extension',
  generateBundle(options, bundle) {
    Object.values(bundle).forEach((chunk) => {
      if (chunk.type === 'chunk') {
        chunk.code = chunk.code.replace(
          /from ['"]\.\/index['"]/g,
          "from './index.js'"
        );
      }
    });
  },
});

export default [
  {
    input: 'src/cli.ts',
    output: { file: 'dist/cli.js', format: 'es', sourcemap: true, preserveModules: true, },
    external: () => true,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        rootDir: './src',
        exclude: ['tests/**/*', 'node_modules/**/*'],
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.js', format: 'es', sourcemap: true },
    external: isExternal,
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        rootDir: './src',
        exclude: ['tests/**/*', 'node_modules/**/*'],
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    external: isExternal,
    plugins: [dts()],
  },
];
