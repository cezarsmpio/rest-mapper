import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  treeshake: {
    moduleSideEffects: false,
  },
  target: 'es2022',
  outputOptions: {
    exports: 'named',
  },
  outExtensions: ({ format }) => ({
    js: format === 'cjs' ? '.cjs' : '.js',
  }),
  onSuccess: async () => {
    await writeFile(
      'dist/index.d.cts',
      "export * from './index.js';\nexport { default } from './index.js';\n",
    );
  },
});
