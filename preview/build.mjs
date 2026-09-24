// Tek dosyalık önizleme: plugin'in kendi şablonu, CSS'i ve JS'i + canlı veri,
// forumu taklit eden bir kabuk içinde. Forum kurulumu olmadan sayfayı görmek
// ve README görselleri için kullanılır.
//
// Çalıştır: npm run preview
//   DATA_URL=https://erasmus-data.sinansener.com (varsayılan)
//   OUT=/yol/dosya.html (isteğe bağlı ek kopya)
//   PAGE=bolum/isletme veya PAGE=okul/aalen-university (bölüm/okul sayfası; varsayılan /erasmus)
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { sprite, faSvg } from '../scripts/build-icons.mjs';

const require = createRequire(import.meta.url);
const { buildPayload } = require('../lib/view.js');
const { fetchMeta, fetchDataset } = require('../lib/fetch.js');
const pages = require('../lib/pages.js');
const faq = require('../static/lib/faq.js');
const { esc } = require('../static/lib/text.js');

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const CACHE = path.join(ROOT, 'preview', '.cache');
const DATA_URL = process.env.DATA_URL || 'https://erasmus-data.sinansener.com';
const SHELL_ICONS = [
	'tags', 'house', 'list', 'user-group', 'inbox', 'clock', 'user', 'circle-info', 'gift', 'calendar-days',
	'earth-europe', 'file-lines', 'table-cells', 'mobile-screen', 'calculator', 'mug-hot', 'angles-left',
	'magnifying-glass', 'bell', 'comments', 'pen-to-square', 'sun', 'moon', 'chevron-right',
];

const read = p => readFile(path.join(ROOT, p), 'utf8');

async function cached(name, url, binary) {
	const file = path.join(CACHE, name);
	try {
		return await readFile(file, binary ? undefined : 'utf8');
	} catch {
		const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36' } });
		if (!res.ok) {
			throw new Error(`${url} -> ${res.status}`);
		}
		const buf = Buffer.from(await res.arrayBuffer());
		await mkdir(CACHE, { recursive: true });
		await writeFile(file, buf);
		return binary ? buf : buf.toString('utf8');
	}
}

// Forum Inter kullanıyor; önizleme dosyası tek başına açılsın diye font gömülür.
async function fontFaces() {
	const css = await cached('inter.css', 'https://fonts.googleapis.com/css2?family=Inter:wght@400..800&display=swap');
	let out = '';
	for (const [, subset, body] of css.matchAll(/\/\* (latin-ext|latin) \*\/\s*@font-face\s*{([^}]*)}/g)) {
		const url = body.match(/url\(([^)]+)\)/)[1];
		const range = body.match(/unicode-range:\s*([^;]+);/)[1];
		const buf = await cached(`inter-${subset}.woff2`, url, true);
		out += `@font-face{font-family:'Inter';font-style:normal;font-weight:400 800;font-display:swap;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');unicode-range:${range};}\n`;
	}
	return out;
}

async function main() {
	await Promise.all(SHELL_ICONS.map(faSvg));
	const meta = await fetchMeta(DATA_URL);
	const { general, schools } = await fetchDataset(DATA_URL);
	const map = JSON.parse(await read('static/europe-map.json'));
	const { version } = JSON.parse(await read('package.json'));
	const data = buildPayload({ meta, general, schools, map, version });

	const [shell, shellCss, pageCss, tpl, icons, textJs, faqJs, pageJs, fonts, shellSprite] = await Promise.all([
		read('preview/shell.html'), read('preview/shell.css'), read('static/css/erasmus.css'),
		read('templates/ieu-erasmus.tpl'), read('templates/partials/ieu-erasmus/icons.tpl'),
		read('static/lib/text.js'), read('static/lib/faq.js'), read('static/lib/erasmus.js'), fontFaces(), sprite(SHELL_ICONS, 'i-'),
	]);

	// Sunucunun yazdığı içerik (library.js'deki gibi): SSS, bölüm/okul özeti, dizin.
	const site = pages.buildSite(data);
	const [kind, slug] = (process.env.PAGE || '').split('/');
	const item = kind === 'bolum' ? site.deptBySlug.get(slug) : kind === 'okul' ? site.schoolBySlug.get(slug) : null;
	if (process.env.PAGE && !item) {
		throw new Error(`PAGE bulunamadı: ${process.env.PAGE}`);
	}
	const view = pages.page(site, item ? (kind === 'bolum' ? 'dept' : 'school') : 'main', item, '/erasmus');

	// Benchpress şablonundaki forum parçaları önizlemede kabuk tarafından sağlanır.
	const page = tpl
		.replace('<!-- IMPORT partials/breadcrumbs.tpl -->', '')
		.replace('<!-- IMPORT partials/ieu-erasmus/icons.tpl -->', () => icons)
		.replace('{dataUrl}', '')
		.replace('{categoryId}', '1')
		.replace('{start}', () => esc(view.start))
		.replace('{heading}', () => esc(view.heading))
		.replace('{lede}', () => esc(view.lede))
		.replace('{baseHeading}', () => esc(pages.BASE_HEADING))
		.replace('{baseLede}', () => esc(pages.BASE_LEDE))
		.replace('{{faqHtml}}', () => faq.render(data.general, '').html)
		.replace('{{pagesHtml}}', () => view.html);

	// NodeBB'nin AMD yükleyicisini taklit eden küçük bir define() ve açılış.
	const boot = `
(function () {
	var modules = {};
	window.define = function (name, deps, factory) {
		modules[name] = factory.apply(null, deps.map(function (d) { return modules[d]; }));
	};
	window.define.amd = true;
${textJs}
${faqJs}
${pageJs}
	var root = document.querySelector('[data-erx-root]');
	var data = JSON.parse(document.getElementById('erx-data').textContent);
	modules['forum/ieu-erasmus'].mount(root, data, { cid: '1', relativePath: '', loggedIn: false, preview: true });
	document.querySelector('[data-theme-toggle]').addEventListener('click', function () {
		var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = next;
		try { localStorage.setItem('erx-theme', next); } catch (e) {}
		document.dispatchEvent(new Event('erx:theme'));
	});
})();`;

	const html = shell
		.replace('/*__FONTS__*/', () => fonts)
		.replace('/*__CSS__*/', () => `${shellCss}\n${pageCss}`)
		.replace('<!--__SPRITE__-->', () => shellSprite)
		.replace('<!--PAGE-->', () => page)
		.replace('__DATA__', () => JSON.stringify(data).replace(/</g, '\\u003c'))
		.replace('/*__JS__*/', () => boot);

	const out = path.join(ROOT, 'preview', 'dist', 'erasmus-plugin-tasarim.html');
	await mkdir(path.dirname(out), { recursive: true });
	await writeFile(out, html);
	if (process.env.OUT) {
		await copyFile(out, process.env.OUT);
	}
	console.log(`önizleme: ${(html.length / 1024).toFixed(0)} KB, ${data.schools.length} okul, dönem ${meta.term.academic_year} ${meta.term.term_tr}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
