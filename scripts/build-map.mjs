// Avrupa haritasını bir kez üretir: static/europe-map.json
// Çalıştır: npm run build:map (yalnızca geliştirme sırasında; çıktı depoda durur).
//
// Ülke sınırları önceden SVG path'e çevrilir; plugin çalışırken d3'e ihtiyaç
// kalmaz. Okulların noktaları ise veriye göre değiştiği için sunucuda
// lib/projection.js ile aynı projeksiyon parametreleriyle hesaplanır.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { geoConicConformal, geoPath, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
const W = 1000;
const H = 760;
const PARALLELS = [38, 60];
const ROTATE = [-12, 0];

// Erasmus+ programına katılan ülkelerin ISO sayısal kodu -> iki harfli kod.
const ISO = {
	'040': 'AT', '056': 'BE', '100': 'BG', '191': 'HR', '196': 'CY', '203': 'CZ', '208': 'DK',
	'233': 'EE', '246': 'FI', '250': 'FR', '276': 'DE', '300': 'GR', '348': 'HU', '352': 'IS',
	'372': 'IE', '380': 'IT', '428': 'LV', '438': 'LI', '440': 'LT', '442': 'LU', '470': 'MT',
	'528': 'NL', '807': 'MK', '578': 'NO', '616': 'PL', '620': 'PT', '642': 'RO', '688': 'RS',
	'703': 'SK', '705': 'SI', '724': 'ES', '752': 'SE', '792': 'TR',
};

async function world() {
	const cache = path.join(ROOT, 'preview', '.cache', 'countries-50m.json');
	try {
		return JSON.parse(await readFile(cache, 'utf8'));
	} catch {
		const res = await fetch(WORLD_URL);
		if (!res.ok) {
			throw new Error(`${WORLD_URL} -> ${res.status}`);
		}
		const text = await res.text();
		await mkdir(path.dirname(cache), { recursive: true });
		await writeFile(cache, text);
		return JSON.parse(text);
	}
}

const topo = await world();
// Polygon yerine nokta ızgarası: d3-geo'da polygon yönü ters olursa kutunun dışını sığdırır.
const grid = [];
for (let lon = -11.5; lon <= 34; lon += 4.55) {
	for (const lat of [35, 50, 64.5]) {
		grid.push([lon, lat]);
	}
}
const projection = geoConicConformal().parallels(PARALLELS).rotate(ROTATE)
	.fitExtent([[12, 12], [W - 12, H - 12]], { type: 'MultiPoint', coordinates: grid })
	.clipExtent([[0, 0], [W, H]]);
const draw = geoPath(projection).digits(1);

const countries = [];
for (const f of feature(topo, topo.objects.countries).features) {
	const [[x0, y0], [x1, y1]] = geoBounds(f);
	if (x1 < -30 || x0 > 50 || y1 < 30 || y0 > 72) {
		continue;
	}
	const d = draw(f);
	if (d) {
		countries.push({ code: ISO[f.id] || '', d });
	}
}

const round = v => Math.round(v * 10) / 10;
const map = {
	w: W,
	h: H,
	projection: { parallels: PARALLELS, rotate: ROTATE, scale: projection.scale(), translate: projection.translate() },
	izmir: projection([27.1287, 38.4192]).map(round),
	countries,
};
await writeFile(path.join(ROOT, 'static', 'europe-map.json'), JSON.stringify(map));

// Test fikstürü: lib/projection.js d3 ile aynı sonucu vermeli.
const samples = [[27.1287, 38.4192], [13.405, 52.52], [-9.1393, 38.7223], [24.9384, 60.1699], [-8.4756, 51.8985], [23.7275, 37.9838], [55.45, -20.88]];
await writeFile(
	path.join(ROOT, 'test', 'fixtures', 'projection.json'),
	JSON.stringify({ projection: map.projection, samples: samples.map(p => ({ lonlat: p, xy: projection(p) })) }, null, 1),
);
console.log(`europe-map.json: ${countries.length} ülke, ${(JSON.stringify(map).length / 1024).toFixed(0)} KB`);
