import { GD_CONSTANT_NAMES, GD_FUNCTIONS, GD_SELECTED_CONSTANTS } from './gd-catalog.js';
import { GD_PHP7_PARAMETER_NAMES } from './gd-php7-parameters.js';
import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

export interface GdRuntimeFacts { constants: Record<string, number | string> }

export const GD_KNOWN_CONSTANT_NAMES: readonly string[] = GD_CONSTANT_NAMES;
const GD_CONSTANT_NAME_SET = new Set<string>(GD_CONSTANT_NAMES);

export function normalizeGdRuntimeFacts(value: unknown): GdRuntimeFacts | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'constants')
    || !candidate.constants || typeof candidate.constants !== 'object' || Array.isArray(candidate.constants)) return undefined;
  const entries = Object.entries(candidate.constants);
  if (entries.length > 120 || entries.some(([name, item]) => !/^(?:GD|IMG|PNG)_[A-Z0-9_]{1,80}$/.test(name)
    || !(typeof item === 'number' && Number.isSafeInteger(item)
      || typeof item === 'string' && item.length <= 128 && /^[\x20-\x7e]*$/.test(item)))) return undefined;
  return { constants: Object.fromEntries(entries.filter(([name]) => GD_CONSTANT_NAME_SET.has(name))
    .sort(([a], [b]) => a.localeCompare(b))) };
}

export function compactGdRuntimeFacts(value: GdRuntimeFacts): [number, number | string][] {
  return GD_CONSTANT_NAMES.flatMap((name, index) => {
    const constant = value.constants[name];
    return constant === undefined ? [] : [[index, constant]];
  });
}

export function expandGdRuntimeFacts(value: unknown): GdRuntimeFacts | undefined {
  if (!Array.isArray(value) || value.length > GD_CONSTANT_NAMES.length
    || value.some((entry) => !Array.isArray(entry) || entry.length !== 2
      || !Number.isSafeInteger(entry[0]) || entry[0] < 0 || entry[0] >= GD_CONSTANT_NAMES.length)) return undefined;
  return normalizeGdRuntimeFacts({ constants: Object.fromEntries(value.map((entry) => [GD_CONSTANT_NAMES[entry[0]], entry[1]])) });
}

export function auditedGdStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const imageParameter = php80 ? 'GdImage $image' : '$image';
  const result = (type: string): string => php80 ? `: ${type}` : '';
  const declaration = (name: string, parameters: string, type: string): string => {
    const legacyNames = php80 ? undefined : GD_PHP7_PARAMETER_NAMES[name];
    const parts = parameters ? parameters.split(', ') : [];
    if (legacyNames && legacyNames.length !== parts.length)
      throw new Error(`Invalid PHP 7 GD signature for ${name}: ${parts.length} parameters, ${legacyNames.length} names`);
    const signature = legacyNames
      ? parts.map((parameter, index) => parameter.replace(/\$[A-Za-z_]\w*/, `$${legacyNames[index]}`)).join(', ')
      : parameters;
    return `${php80 ? '' : `/** @return ${type.replaceAll('GdImage', 'resource')} */ `}function ${name}(${signature})${result(type)} {}`;
  };
  const load = (name: string, parameter = 'string $filename'): string =>
    declaration(name, parameter, 'GdImage|false');
  const output = (name: string, parameters: string): string =>
    declaration(name, `${imageParameter}, $file = null${parameters}`, 'bool');
  const drawn = (name: string, parameters: string): string =>
    declaration(name, `${imageParameter}, ${parameters}`, target >= 85 ? 'true' : 'bool');
  const font = target >= 81 ? 'GdFont|int $font' : 'int $font';
  const polygon = (name: string): string => declaration(name,
    `${imageParameter}, array $points, int $${php80 ? 'num_points_or_color' : 'num_points'}, ${php80 ? '?int $color = null' : 'int $color'}`, 'bool');
  const textBounds = (name: string, options: boolean): string => declaration(name,
    `float $size, float $angle, string $font_filename, string $string${options ? ', array $options = []' : ''}`, 'array|false');
  const textDraw = (name: string, options: boolean): string => declaration(name,
    `${imageParameter}, float $size, float $angle, int $x, int $y, int $color, string $font_filename, string $text${options ? ', array $options = []' : ''}`, 'array|false');
  const declarations: Record<(typeof GD_FUNCTIONS)[number], string> = {
    gd_info: declaration('gd_info', '', 'array'),
    imagecreate: load('imagecreate', 'int $width, int $height'),
    imagecreatetruecolor: load('imagecreatetruecolor', 'int $width, int $height'),
    imagecreatefromstring: load('imagecreatefromstring', 'string $data'),
    imagecreatefrompng: load('imagecreatefrompng'),
    imagecreatefromjpeg: load('imagecreatefromjpeg'),
    imagecreatefromgif: load('imagecreatefromgif'),
    imagecreatefromwebp: load('imagecreatefromwebp'),
    imagecreatefrombmp: load('imagecreatefrombmp'),
    imagecreatefromtga: load('imagecreatefromtga'),
    imagecreatefromavif: load('imagecreatefromavif'),
    imagepng: output('imagepng', ', int $quality = -1, int $filters = -1'),
    imagejpeg: output('imagejpeg', ', int $quality = -1'),
    imagewebp: output('imagewebp', ', int $quality = -1'),
    imagebmp: output('imagebmp', ', bool $compressed = true'),
    imageavif: output('imageavif', ', int $quality = -1, int $speed = -1'),
    imagesx: declaration('imagesx', imageParameter, 'int'),
    imagesy: declaration('imagesy', imageParameter, 'int'),
    imagecopyresampled: declaration('imagecopyresampled', `${php80 ? 'GdImage ' : ''}$dst_image, ${php80 ? 'GdImage ' : ''}$src_image, int $dst_x, int $dst_y, int $src_x, int $src_y, int $dst_width, int $dst_height, int $src_width, int $src_height`, target >= 85 ? 'true' : 'bool'),
    imagecolorallocate: declaration('imagecolorallocate', `${imageParameter}, int $red, int $green, int $blue`, 'int|false'),
    imagecolorallocatealpha: declaration('imagecolorallocatealpha', `${imageParameter}, int $red, int $green, int $blue, int $alpha`, 'int|false'),
    imagealphablending: declaration('imagealphablending', `${imageParameter}, bool $enable`, target >= 85 ? 'true' : 'bool'),
    imagesavealpha: declaration('imagesavealpha', `${imageParameter}, bool $enable`, target >= 85 ? 'true' : 'bool'),
    imagedestroy: `${target >= 85 ? '/** @deprecated PHP 8.5 */ ' : ''}${declaration('imagedestroy', imageParameter, target >= 85 ? 'true' : 'bool')}`,
    imagecolorat: declaration('imagecolorat', `${imageParameter}, int $x, int $y`, 'int|false'),
    imagecolortransparent: declaration('imagecolortransparent', `${imageParameter}, ?int $color = null`, 'int'),
    imagecopy: declaration('imagecopy', `${php80 ? 'GdImage ' : ''}$dst_image, ${php80 ? 'GdImage ' : ''}$src_image, int $dst_x, int $dst_y, int $src_x, int $src_y, int $src_width, int $src_height`, target >= 85 ? 'true' : 'bool'),
    imagecopyresized: declaration('imagecopyresized', `${php80 ? 'GdImage ' : ''}$dst_image, ${php80 ? 'GdImage ' : ''}$src_image, int $dst_x, int $dst_y, int $src_x, int $src_y, int $dst_width, int $dst_height, int $src_width, int $src_height`, target >= 85 ? 'true' : 'bool'),
    imagescale: declaration('imagescale', `${imageParameter}, int $width, int $height = -1, int $mode = IMG_BILINEAR_FIXED`, 'GdImage|false'),
    imagecrop: declaration('imagecrop', `${imageParameter}, array $rectangle`, 'GdImage|false'),
    imagerotate: declaration('imagerotate', `${imageParameter}, float $angle, int $background_color${target < 83 ? `, ${php80 ? 'bool' : 'int'} $ignore_transparent = ${php80 ? 'false' : '0'}` : ''}`, 'GdImage|false'),
    imageflip: drawn('imageflip', 'int $mode'),
    imagefilledrectangle: drawn('imagefilledrectangle', 'int $x1, int $y1, int $x2, int $y2, int $color'),
    imagerectangle: drawn('imagerectangle', 'int $x1, int $y1, int $x2, int $y2, int $color'),
    imageline: drawn('imageline', 'int $x1, int $y1, int $x2, int $y2, int $color'),
    imagesetpixel: drawn('imagesetpixel', 'int $x, int $y, int $color'),
    imagefill: drawn('imagefill', 'int $x, int $y, int $color'),
    imagegif: output('imagegif', ''),
    imagewbmp: output('imagewbmp', ', ?int $foreground_color = null'),
    imagegd: declaration('imagegd', `${imageParameter}, ${php80 ? '?string ' : ''}$file = null`, 'bool'),
    imagegd2: declaration('imagegd2', `${imageParameter}, ${php80 ? '?string ' : ''}$file = null, int $chunk_size = 128, int $mode = IMG_GD2_RAW`, 'bool'),
    imagefilter: declaration('imagefilter', `${imageParameter}, int $filter${php80 ? ', ...$args' : ', $arg1 = null, $arg2 = null, $arg3 = null, $arg4 = null'}`, 'bool'),
    imagettftext: textDraw('imagettftext', php80),
    imagettfbbox: textBounds('imagettfbbox', php80),
    imagefttext: textDraw('imagefttext', true),
    imageftbbox: textBounds('imageftbbox', true),
    imagepolygon: polygon('imagepolygon'),
    imageopenpolygon: polygon('imageopenpolygon'),
    imagefilledpolygon: polygon('imagefilledpolygon'),
    imageellipse: drawn('imageellipse', 'int $center_x, int $center_y, int $width, int $height, int $color'),
    imagearc: drawn('imagearc', 'int $center_x, int $center_y, int $width, int $height, int $start_angle, int $end_angle, int $color'),
    imagefilledellipse: drawn('imagefilledellipse', 'int $center_x, int $center_y, int $width, int $height, int $color'),
    imagefilledarc: drawn('imagefilledarc', 'int $center_x, int $center_y, int $width, int $height, int $start_angle, int $end_angle, int $color, int $style'),
    imageinterlace: declaration('imageinterlace', `${imageParameter}, ?bool $enable = null`, 'bool'),
    imagetypes: declaration('imagetypes', '', 'int'),
    imageloadfont: declaration('imageloadfont', 'string $filename', target >= 81 ? 'GdFont|false' : 'int|false'),
    imagefontwidth: declaration('imagefontwidth', font, 'int'),
    imagefontheight: declaration('imagefontheight', font, 'int'),
    imagestring: drawn('imagestring', `${font}, int $x, int $y, string $string, int $color`),
    imagestringup: drawn('imagestringup', `${font}, int $x, int $y, string $string, int $color`),
    imagesetstyle: declaration('imagesetstyle', `${imageParameter}, array $style`, 'bool'),
    imageistruecolor: declaration('imageistruecolor', imageParameter, 'bool'),
    imagetruecolortopalette: declaration('imagetruecolortopalette', `${imageParameter}, bool $dither, int $num_colors`, 'bool'),
    imagepalettetotruecolor: declaration('imagepalettetotruecolor', imageParameter, 'bool'),
    imagecolormatch: declaration('imagecolormatch', `${php80 ? 'GdImage ' : ''}$image1, ${php80 ? 'GdImage ' : ''}$image2`, target >= 85 ? 'true' : 'bool'),
    imagesetthickness: drawn('imagesetthickness', 'int $thickness'),
    imagelayereffect: drawn('imagelayereffect', 'int $effect'),
    imagecolorresolvealpha: declaration('imagecolorresolvealpha', `${imageParameter}, int $red, int $green, int $blue, int $alpha`, 'int'),
    imagecolorclosestalpha: declaration('imagecolorclosestalpha', `${imageParameter}, int $red, int $green, int $blue, int $alpha`, 'int'),
    imagecolorexactalpha: declaration('imagecolorexactalpha', `${imageParameter}, int $red, int $green, int $blue, int $alpha`, 'int'),
    imagesettile: declaration('imagesettile', `${imageParameter}, ${php80 ? 'GdImage ' : ''}$tile`, target >= 85 ? 'true' : 'bool'),
    imagesetbrush: declaration('imagesetbrush', `${imageParameter}, ${php80 ? 'GdImage ' : ''}$brush`, target >= 85 ? 'true' : 'bool'),
    imagecreatefromxbm: load('imagecreatefromxbm'),
    imagecreatefromxpm: load('imagecreatefromxpm'),
    imagecreatefromwbmp: load('imagecreatefromwbmp'),
    imagecreatefromgd: load('imagecreatefromgd'),
    imagecreatefromgd2: load('imagecreatefromgd2'),
    imagecreatefromgd2part: load('imagecreatefromgd2part', 'string $filename, int $x, int $y, int $width, int $height'),
    imagexbm: declaration('imagexbm', `${imageParameter}, ${php80 ? '?string ' : ''}$filename, ?int $foreground_color = null`, 'bool'),
    imagepalettecopy: declaration('imagepalettecopy', `${php80 ? 'GdImage ' : ''}$dst, ${php80 ? 'GdImage ' : ''}$src`, 'void'),
    imagecolorclosest: declaration('imagecolorclosest', `${imageParameter}, int $red, int $green, int $blue`, 'int'),
    imagecolorclosesthwb: declaration('imagecolorclosesthwb', `${imageParameter}, int $red, int $green, int $blue`, 'int'),
    imagecolordeallocate: declaration('imagecolordeallocate', `${imageParameter}, int $color`, target >= 85 ? 'true' : 'bool'),
    imagecolorresolve: declaration('imagecolorresolve', `${imageParameter}, int $red, int $green, int $blue`, 'int'),
    imagecolorexact: declaration('imagecolorexact', `${imageParameter}, int $red, int $green, int $blue`, 'int'),
    imagecolorset: declaration('imagecolorset', `${imageParameter}, int $color, int $red, int $green, int $blue, int $alpha = 0`, target >= 82 ? 'false|null' : 'bool|null'),
    imagecolorsforindex: declaration('imagecolorsforindex', `${imageParameter}, int $color`, 'array'),
    imagegammacorrect: declaration('imagegammacorrect', `${imageParameter}, float $input_gamma, float $output_gamma`, target >= 85 ? 'true' : 'bool'),
    imagedashedline: drawn('imagedashedline', 'int $x1, int $y1, int $x2, int $y2, int $color'),
    imagefilltoborder: drawn('imagefilltoborder', 'int $x, int $y, int $border_color, int $color'),
    imagecolorstotal: declaration('imagecolorstotal', imageParameter, 'int'),
    imagechar: drawn('imagechar', `${font}, int $x, int $y, string $char, int $color`),
    imagecharup: drawn('imagecharup', `${font}, int $x, int $y, string $char, int $color`),
    imagecopymerge: declaration('imagecopymerge', `${php80 ? 'GdImage ' : ''}$dst_image, ${php80 ? 'GdImage ' : ''}$src_image, int $dst_x, int $dst_y, int $src_x, int $src_y, int $src_width, int $src_height, int $pct`, target >= 85 ? 'true' : 'bool'),
    imagecopymergegray: declaration('imagecopymergegray', `${php80 ? 'GdImage ' : ''}$dst_image, ${php80 ? 'GdImage ' : ''}$src_image, int $dst_x, int $dst_y, int $src_x, int $src_y, int $src_width, int $src_height, int $pct`, target >= 85 ? 'true' : 'bool'),
    imagesetclip: drawn('imagesetclip', 'int $x1, int $y1, int $x2, int $y2'),
    imagegetclip: declaration('imagegetclip', imageParameter, 'array'),
    imageconvolution: declaration('imageconvolution', `${imageParameter}, array $matrix, float $divisor, float $offset`, 'bool'),
    imageantialias: drawn('imageantialias', 'bool $enable'),
    imagecropauto: declaration('imagecropauto', `${imageParameter}, int $mode = IMG_CROP_DEFAULT, float $threshold = 0.5, int $color = -1`, 'GdImage|false'),
    imageaffine: declaration('imageaffine', `${imageParameter}, array $affine, ?array $clip = null`, 'GdImage|false'),
    imageaffinematrixget: declaration('imageaffinematrixget', `int $type, $options${php80 ? '' : ' = null'}`, 'array|false'),
    imageaffinematrixconcat: declaration('imageaffinematrixconcat', 'array $matrix1, array $matrix2', 'array|false'),
    imagegetinterpolation: declaration('imagegetinterpolation', imageParameter, 'int'),
    imagesetinterpolation: declaration('imagesetinterpolation', `${imageParameter}, int $method = IMG_BILINEAR_FIXED`, 'bool'),
    imageresolution: declaration('imageresolution', `${imageParameter}, ?int $resolution_x = null, ?int $resolution_y = null`, target >= 85 ? 'array|true' : 'array|bool'),
    image2wbmp: `${target >= 73 ? '/** @deprecated PHP 7.3\n * @return bool */' : '/** @return bool */'} function image2wbmp($im, string $filename = null, int $${target >= 74 ? 'foreground' : 'threshold'} = null) {}`,
    jpeg2wbmp: '/** @deprecated PHP 7.2\n * @return bool */ function jpeg2wbmp(string $f_org, string $f_dest, int $d_height, int $d_width, int $d_threshold) {}',
    png2wbmp: '/** @deprecated PHP 7.2\n * @return bool */ function png2wbmp(string $f_org, string $f_dest, int $d_height, int $d_width, int $d_threshold) {}',
  };
  const minimum: Readonly<Record<string, number>> = {
    imagecreatefromtga: 74,
    imagecreatefromavif: 81,
    imageavif: 81,
    imagegetinterpolation: 80,
  };
  const unavailable = new Set<string>(options.unavailableFunctions ?? []);
  const removed = new Set(['image2wbmp', 'jpeg2wbmp', 'png2wbmp']);
  const runtime = normalizeGdRuntimeFacts(options.gdRuntime);
  const constants = Object.entries(runtime?.constants ?? GD_SELECTED_CONSTANTS)
    .filter(([name]) => runtime || target >= (name === 'IMG_AVIF' ? 81 : name === 'IMG_TGA' || name === 'IMG_FILTER_SCATTER' ? 74 : 72))
    .map(([name, value]) => `const ${name} = ${JSON.stringify(value)};`).join('\n');
  const imageClass = php80 ? 'final class GdImage { private function __construct() {} }\n' : '';
  const fontClass = target >= 81 ? 'final class GdFont { private function __construct() {} }\n' : '';
  return `${imageClass}${fontClass}${constants}\n${GD_FUNCTIONS.filter((name) => target >= (minimum[name] ?? 72) && !(target >= 80 && removed.has(name)) && !unavailable.has(name))
    .map((name) => declarations[name]).join('\n')}\n`;
}
