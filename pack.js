import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import Zip from 'adm-zip';

const packFolder = 'package';
const distFolder = 'dist';

try {
  const manifestFile = resolve(path.dirname(fileURLToPath(import.meta.url)),
                               distFolder, 'manifest.json');
  const { name, version } = JSON.parse(readFileSync(manifestFile, 'utf8'));

  if (!existsSync(packFolder)) {
    mkdirSync(packFolder);
  }

  const zipper = new Zip();
  zipper.addLocalFolder(distFolder);

  const packageFile = `${packFolder}/${name}-v${version}.zip`;
  zipper.writeZip(packageFile);

  console.log(`Package created: ${packageFile}`);
} catch (error) {
  console.error(`Error: ${error}`);
}
