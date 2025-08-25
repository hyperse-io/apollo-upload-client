import { defineConfig } from 'tsup';

export default defineConfig(() => ({
  dts: true,
  entry: ['src/index.ts', 'src/extractFiles/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  tsconfig: './tsconfig.build.json',
  format: ['esm'],
}));
