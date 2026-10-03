import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-gd.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'gd/gd.php'), 'utf8');
const selected = new Set([
  'gd_info', 'imagecreate', 'imagecreatetruecolor', 'imagecreatefromstring',
  'imagecreatefrompng', 'imagecreatefromjpeg', 'imagecreatefromgif', 'imagecreatefromwebp',
  'imagecreatefrombmp', 'imagecreatefromtga', 'imagecreatefromavif',
  'imagepng', 'imagejpeg', 'imagewebp', 'imagebmp', 'imageavif',
  'imagesx', 'imagesy', 'imagecopyresampled', 'imagecolorallocate',
  'imagecolorallocatealpha', 'imagealphablending', 'imagesavealpha', 'imagedestroy',
  'imagecolorat', 'imagecolortransparent', 'imagecopy', 'imagecopyresized',
  'imagescale', 'imagecrop', 'imagerotate', 'imageflip',
  'imagefilledrectangle', 'imagerectangle', 'imageline', 'imagesetpixel', 'imagefill',
  'imagegif', 'imagewbmp', 'imagegd', 'imagegd2', 'imagefilter',
  'imagettftext', 'imagettfbbox', 'imagefttext', 'imageftbbox',
  'imagepolygon', 'imageopenpolygon', 'imagefilledpolygon',
  'imageellipse', 'imagearc', 'imagefilledellipse', 'imagefilledarc',
  'imageinterlace', 'imagetypes', 'imageloadfont',
  'imagefontwidth', 'imagefontheight', 'imagestring', 'imagestringup',
  'imagesetstyle', 'imageistruecolor', 'imagetruecolortopalette', 'imagepalettetotruecolor',
  'imagecolormatch', 'imagesetthickness', 'imagelayereffect',
  'imagecolorresolvealpha', 'imagecolorclosestalpha', 'imagecolorexactalpha',
  'imagesettile', 'imagesetbrush', 'imagecreatefromxbm', 'imagecreatefromxpm',
  'imagecreatefromwbmp', 'imagecreatefromgd', 'imagecreatefromgd2', 'imagecreatefromgd2part',
  'imagexbm', 'imagepalettecopy', 'imagecolorclosest', 'imagecolorclosesthwb',
  'imagecolordeallocate', 'imagecolorresolve', 'imagecolorexact', 'imagecolorset',
  'imagecolorsforindex', 'imagegammacorrect', 'imagedashedline', 'imagefilltoborder',
  'imagecolorstotal', 'imagechar', 'imagecharup', 'imagecopymerge', 'imagecopymergegray',
  'imagesetclip', 'imagegetclip', 'imageconvolution', 'imageantialias',
  'imagecropauto', 'imageaffine', 'imageaffinematrixget', 'imageaffinematrixconcat',
  'imagegetinterpolation', 'imagesetinterpolation', 'imageresolution',
  'image2wbmp', 'jpeg2wbmp', 'png2wbmp',
]);
const names = [...new Set([...upstream.matchAll(/^function\s+([a-z_][a-z\d_]*)\s*\(/gm)].map((match) => match[1]))]
  .filter((name) => selected.has(name));
if (names.length !== selected.size) throw new Error('Unexpected GD function catalog; review upstream before syncing');
const allConstantNames = [...new Set([...upstream.matchAll(/^define\((['"])([A-Za-z_][A-Za-z0-9_]*)\1,/gm)]
  .map((match) => match[2]))].sort();
if (allConstantNames.length !== 89 || !allConstantNames.includes('GD_VERSION')
  || !allConstantNames.includes('PNG_ALL_FILTERS') || !allConstantNames.includes('IMG_WEBP_LOSSLESS')) {
  throw new Error('Unexpected GD constant catalog; review upstream before syncing');
}
const constantNames = [
  'IMG_GIF', 'IMG_JPG', 'IMG_JPEG', 'IMG_PNG', 'IMG_WEBP', 'IMG_BMP', 'IMG_TGA', 'IMG_AVIF',
  'IMG_GD2_RAW', 'IMG_GD2_COMPRESSED', 'IMG_FILTER_NEGATE', 'IMG_FILTER_GRAYSCALE',
  'IMG_FILTER_BRIGHTNESS', 'IMG_FILTER_CONTRAST', 'IMG_FILTER_COLORIZE', 'IMG_FILTER_GAUSSIAN_BLUR',
  'IMG_CROP_DEFAULT', 'IMG_CROP_TRANSPARENT', 'IMG_CROP_BLACK', 'IMG_CROP_WHITE',
  'IMG_CROP_SIDES', 'IMG_CROP_THRESHOLD', 'IMG_FLIP_HORIZONTAL', 'IMG_FLIP_VERTICAL',
  'IMG_FLIP_BOTH', 'IMG_BILINEAR_FIXED', 'IMG_ARC_PIE', 'IMG_ARC_CHORD',
  'IMG_FILTER_EDGEDETECT', 'IMG_FILTER_SELECTIVE_BLUR', 'IMG_FILTER_EMBOSS',
  'IMG_FILTER_MEAN_REMOVAL', 'IMG_FILTER_SMOOTH', 'IMG_FILTER_PIXELATE', 'IMG_FILTER_SCATTER',
  'IMG_EFFECT_REPLACE', 'IMG_EFFECT_ALPHABLEND', 'IMG_EFFECT_NORMAL',
  'IMG_EFFECT_OVERLAY', 'IMG_EFFECT_MULTIPLY',
  'IMG_COLOR_TILED', 'IMG_COLOR_STYLED', 'IMG_COLOR_BRUSHED',
  'IMG_COLOR_STYLEDBRUSHED', 'IMG_COLOR_TRANSPARENT',
  'IMG_AFFINE_TRANSLATE', 'IMG_AFFINE_SCALE', 'IMG_AFFINE_ROTATE',
  'IMG_AFFINE_SHEAR_HORIZONTAL', 'IMG_AFFINE_SHEAR_VERTICAL',
];
const constants = Object.fromEntries(constantNames.map((name) => {
  const matches = [...upstream.matchAll(new RegExp(`^define\\(['"]${name}['"],\\s*(-?\\d+)\\);`, 'gm'))];
  if (matches.length !== 1) throw new Error(`Unexpected GD constant ${name}; review upstream before syncing`);
  return [name, Number(matches[0][1])];
}));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, gd/gd.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures and availability are audited separately.
export const GD_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;
export const GD_CONSTANT_NAMES = ${JSON.stringify(allConstantNames, null, 2)} as const;
export const GD_SELECTED_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/gd-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`GD: ${names.length} selected functions, ${allConstantNames.length} constant names, ${constantNames.length} fallback values from ${revision}\n`);
