import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sharedAlias = join(__dirname, '../shared/src/index.ts');
const collectorAlias = join(__dirname, '../collector/src/index.ts');

const browserAliases = {
  '@observatory/shared': sharedAlias,
  '@observatory/collector': collectorAlias,
};

await esbuild.build({
  entryPoints: [join(__dirname, 'src/content.ts')],
  bundle: true,
  outfile: join(__dirname, 'dist/content.js'),
  format: 'iife',
  platform: 'browser',
  alias: browserAliases,
});

await esbuild.build({
  entryPoints: [join(__dirname, 'src/background.ts')],
  bundle: true,
  outfile: join(__dirname, 'dist/background.js'),
  format: 'iife',
  platform: 'browser',
  alias: { '@observatory/shared': sharedAlias },
});

console.log('Extension build: dist/content.js, dist/background.js');
