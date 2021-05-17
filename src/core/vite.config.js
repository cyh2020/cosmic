import {node} from '../../electron-vendors.config.json';
import {join, resolve} from 'path';
import { builtinModules } from 'module';
import {defineConfig} from 'vite';
import {loadAndSetEnv} from '../../scripts/loadAndSetEnv.mjs';

const PACKAGE_ROOT = resolve(__dirname, '../');

/**
 * Vite looks for `.env.[mode]` files only in `PACKAGE_ROOT` directory.
 * Therefore, you must manually load and set the environment variables from the root directory above
 */
loadAndSetEnv(process.env.MODE, process.cwd());

/**
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
      'base':  join(PACKAGE_ROOT, '/base'),
    },
  },
  build: {
    sourcemap: 'inline',
    target: `node${node}`,
    outDir: 'core/dist',
    assetsDir: '.',
    minify: process.env.MODE === 'development' ? false : 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        passes: 2,
      },
      safari10: false,
    },
    lib: {
      entry: 'core/src/index.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-updater',
        ...builtinModules,
      ],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    emptyOutDir: true,
  },
});
