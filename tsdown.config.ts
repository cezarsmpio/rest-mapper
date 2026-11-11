import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';
import { defineConfig } from 'tsdown';

const bundles = [
  { file: 'dist/index.js', module: true },
  { file: 'dist/index.cjs', module: false },
];

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
    await Promise.all(
      bundles.map(async ({ file, module }) => {
        const result = await minify(await readFile(file, 'utf8'), {
          module,
          toplevel: true,
          compress: true,
          mangle: true,
          ecma: 2022,
        });

        if (!result.code) throw new Error(`Terser produced no output for ${file}`);
        await writeFile(file, result.code);
      }),
    );

    await writeFile(
      'dist/index.d.cts',
      "export * from './index.js';\nexport { default } from './index.js';\n",
    );
  },
});
