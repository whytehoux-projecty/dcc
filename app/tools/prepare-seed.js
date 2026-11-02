// Grades the licensed source photographs into the house look and writes responsive AVIF/WebP/JPEG
// variants plus seed/media.json. Run once: `npm run seed` (needs seed/raw/*.jpg).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = path.join(here, '../seed/raw');
const out = path.join(here, '../seed/media');
fs.mkdirSync(out, { recursive: true });

// id, source, grade, focal point, descriptive text, credit
const PLATES = [
  ['pit-terraces',   'mine5', 'duo', '50% 45%', 'Aerial view of terraced open-pit workings around a pale frozen lake', 'Chenyue Huang'],
  ['quarry-haul',    'mine1', 'duo', '50% 50%', 'Aerial view of haul roads cut through a pale quarry floor', 'Ivan Bandura'],
  ['strata-cut',     'mine4', 'duo', '50% 50%', 'Aerial view of a deep strata cut through open country', 'Damo Li'],
  ['container-ship', 'ship1', 'duo', '50% 50%', 'Container vessel seen from above, crossing open water', 'Venti Views'],
  ['quay-cranes',    'port1', 'duo', '50% 40%', 'Quay cranes working a container vessel at berth, seen from above', 'Daniel Miksha'],
  ['wake',           'ship3', 'duo', '50% 45%', 'A laden container vessel leaving a long wake across calm water', 'Haydn'],
  ['amethyst',       'gem5',  'nat', '50% 50%', 'A single rough amethyst crystal on a dark navy ground', 'Olivier Leysen'],
  ['emerald-rough',  'gem4',  'nat', '50% 40%', 'A rough emerald crystal lit against a dark ground', 'Mr. Pugo'],
  ['rough-parcel',   'gem3',  'nat', '50% 50%', 'A parcel of rough stones laid out on black', 'Brian Wangenheim'],
  ['shore-tanks',    'tank2', 'duo', '50% 50%', 'Floating-roof storage tanks at a shore terminal, seen from above', 'jimmy desplanques'],
  ['tank-farm',      'tank3', 'duo', '50% 50%', 'A tank farm on a coastline beneath heavy cloud', 'Erik Mclean'],
  ['refinery-dusk',  'ref1',  'duo', '50% 55%', 'Refinery stacks and flare lit against a dusk sky', 'Maksym Kaharlytskyi'],
  ['assay-rack',     'lab3',  'duo', '50% 50%', 'Sealed sample tubes racked for assay', 'Nathan Rimoux'],
  ['dossier-stacks', 'doc1',  'duo', '50% 45%', 'Stacked bound files in an archive office', 'Wesley Tingey'],
  ['seal-and-stamp', 'doc2',  'duo', '60% 50%', 'A wooden hand stamp resting on an open legal file', 'Markus Spiske'],
  ['road-to-origin', 'land1', 'duo', '50% 60%', 'A straight dirt road running toward distant hills', 'NIR HIMI'],
  ['apron-night',    'air2',  'duo', '50% 45%', 'A freighter on the apron at night under floodlights', 'Dima Pechurin'],
];
const tsv = Object.fromEntries(fs.readFileSync(path.join(here, '../seed/credits.tsv'), 'utf8').trim().split('\n').map(l => { const [k, pid, uid, name, user] = l.split('\t'); return [k, { pid, uid, name, user }]; }));

const NAVY = [10, 22, 40], MID = [96, 112, 128], BONE = [238, 232, 219];
const ramp = (t) => {
  const lerp = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
  return t < 0.5 ? lerp(NAVY, MID, t / 0.5) : lerp(MID, BONE, (t - 0.5) / 0.5);
};
const LUT = Array.from({ length: 256 }, (_, i) => ramp(i / 255).map(Math.round));

async function grade(src, mode) {
  const base = sharp(src).rotate().resize({ width: 2000, withoutEnlargement: true });
  if (mode === 'nat') {
    return base.modulate({ saturation: 0.92, brightness: 0.98 }).toBuffer();
  }
  const { data, info } = await base.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const g = await base.clone().greyscale().normalise({ lower: 2, upper: 99 }).raw().toBuffer();
  const px = Buffer.alloc(data.length);
  for (let i = 0, j = 0; i < g.length; i++, j += 3) {
    const [r, gg, b] = LUT[g[i]];
    // 80% duotone, 20% of the photograph's own colour so skies and water keep depth.
    px[j] = r * 0.82 + data[j] * 0.18; px[j + 1] = gg * 0.82 + data[j + 1] * 0.18; px[j + 2] = b * 0.82 + data[j + 2] * 0.18;
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

const manifest = [];
for (const [id, key, mode, focal, alt, credit] of PLATES) {
  const buf = await grade(path.join(raw, key + '.jpg'), mode);
  const meta = await sharp(buf).metadata();
  const widths = [640, 1200, 1920].filter(w => w <= meta.width + 1);
  if (!widths.length) widths.push(meta.width);
  for (const w of widths) {
    const p = () => sharp(buf).resize({ width: w, withoutEnlargement: true });
    await p().avif({ quality: 52, effort: 4 }).toFile(path.join(out, `${id}-${w}.avif`));
    await p().webp({ quality: 74 }).toFile(path.join(out, `${id}-${w}.webp`));
    await p().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(out, `${id}-${w}.jpg`));
  }
  const c = tsv[key];
  manifest.push({ id, title: id.replace(/-/g, ' '), alt, focal, width: meta.width, height: meta.height, widths, credit, creditUrl: `https://unsplash.com/photos/${c.uid}`, source: 'Unsplash', seed: true });
  console.log(id, widths.join('/'));
}
fs.writeFileSync(path.join(here, '../seed/media.json'), JSON.stringify(manifest, null, 2));
