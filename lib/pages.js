'use strict';

// Bölüm ve okul sayfaları: /erasmus/bolum/<ad> ve /erasmus/okul/<ad>. Her biri
// arama motorunda ayrı bir sonuç olsun diye kendi adresi, başlığı, açıklaması
// ve sunucuda yazılmış içeriği vardır. Tarayıcıdaki sayfa aynı seçimle açılır.
// Saf fonksiyonlar; veri /api/ieu-erasmus/data yanıtıyla aynı biçimdedir.

const { esc, fold, lvl, eur, km } = require('../static/lib/text');

const LEVELS = ['Lisans', 'Yüksek Lisans', 'Doktora'];
const BASE_HEADING = 'Erasmus+ öğrenim hareketliliği';
const BASE_LEDE = 'İzmir Ekonomi Üniversitesi (İEÜ) öğrencileri için Erasmus+ rehberi.';
const trSort = (a, b) => a.localeCompare(b, 'tr');
// '"Ovidius" University' gibi tırnakla başlayan adlar listenin başına kaçmasın.
const byName = (a, b) => trSort(a.name.replace(/^[^\p{L}\p{N}]+/u, ''), b.name.replace(/^[^\p{L}\p{N}]+/u, ''));
const chevron = '<svg class="i" aria-hidden="true"><use href="#erx-i-chevron-down"/></svg>';

// Adreste yalnızca a-z, 0-9 ve tire: "İşletme" -> "isletme", "Łódź" -> "lodz".
function slugify(value) {
	return fold(value)
		.replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/ø/g, 'o')
		.replace(/ł/g, 'l').replace(/đ/g, 'd')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// Meta etiketlerine giden düz metin: tırnak ve açılı ayraç olmaz.
const plain = value => String(value).replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim();
const levelWord = level => level.toLocaleLowerCase('tr');

// Aynı adı taşıyan iki okul olursa ikisi de Erasmus koduyla ayrılır; sıraya
// bağlı olmadığı için veri güncellenince adresler yer değiştirmez.
function uniqueSlugs(items, base, fallback) {
	const counts = new Map();
	items.forEach(it => counts.set(base(it), (counts.get(base(it)) || 0) + 1));
	return items.map(it => (counts.get(base(it)) > 1 ? `${base(it)}-${fallback(it)}` : base(it)));
}

// D: /api/ieu-erasmus/data yanıtı. Bütün sayfaların ortak dizini.
function buildSite(D) {
	const byKey = new Map();
	for (const s of D.schools) {
		for (const p of s.programs) {
			if (!p.dept) {
				continue;
			}
			const key = `${p.level}|${p.dept}`;
			if (!byKey.has(key)) {
				byKey.set(key, { level: p.level, dept: p.dept, faculty: p.faculty, schools: [] });
			}
			const entry = byKey.get(key);
			if (!entry.schools.includes(s)) {
				entry.schools.push(s);
			}
		}
	}
	const depts = Array.from(byKey.values()).sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || trSort(a.dept, b.dept));
	uniqueSlugs(depts, d => slugify(d.dept) + (d.level === 'Lisans' ? '' : `-${slugify(d.level)}`), d => slugify(d.faculty))
		.forEach((slug, i) => { depts[i].slug = slug; });
	for (const d of depts) {
		d.schools.sort(byName);
		d.countries = countryGroups(d.schools);
	}

	const schools = D.schools.slice().sort(byName);
	const schoolSlugs = new Map();
	uniqueSlugs(schools, s => slugify(s.name), s => slugify(s.code)).forEach((slug, i) => schoolSlugs.set(schools[i].id, slug));

	return {
		depts,
		schools,
		countries: countryGroups(schools),
		deptBySlug: new Map(depts.map(d => [d.slug, d])),
		deptByKey: byKey,
		schoolBySlug: new Map(schools.map(s => [schoolSlugs.get(s.id), s])),
		schoolSlug: id => schoolSlugs.get(id),
	};
}

// Ülkeler okul sayısına göre (sayfadaki tablo gibi), eşitse ada göre.
function countryGroups(schools) {
	const byCc = new Map();
	for (const s of schools) {
		if (!byCc.has(s.cc)) {
			byCc.set(s.cc, { cc: s.cc, country: s.country, grant: s.grant.monthly_eur, schools: [] });
		}
		byCc.get(s.cc).schools.push(s);
	}
	return Array.from(byCc.values()).sort((a, b) => b.schools.length - a.schools.length || trSort(a.country, b.country));
}

// Tarayıcıdaki sayfanın açılış seçimi; adresin #'inde kullanılan biçimle aynı.
function startParams({ level, dept, cc, school, step }) {
	const p = new URLSearchParams();
	p.set('mod', 'bolum');
	p.set('adim', String(step));
	p.set('seviye', level);
	p.set('bolum', dept);
	if (cc) {
		p.set('ulke', cc);
	}
	if (school) {
		p.set('okul', school);
	}
	return p.toString();
}

// Okul sayfası hangi bölümle açılsın: önce lisans, sonra alfabetik ilk bölüm.
function defaultProgram(s) {
	const withDept = s.programs.filter(p => p.dept);
	return withDept.slice().sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || trSort(a.dept, b.dept))[0];
}

// ['A', 'B', 'C', 'D'], 2, 'ülke' -> "A, B ve 2 ülke daha"
function listSentence(items, max, noun) {
	const shown = items.slice(0, max);
	const rest = items.length - shown.length;
	if (rest > 0) {
		return `${shown.join(', ')} ve ${rest} ${noun} daha`;
	}
	return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} ve ${shown[shown.length - 1]}` : shown.join('');
}

function paths(base, site) {
	return {
		dept: d => `${base}/bolum/${d.slug}`,
		school: s => `${base}/okul/${site.schoolSlug(s.id)}`,
		// Bölüm sayfasından okula geçince aynı bölümle açılsın.
		schoolIn: (s, d) => `${base}/okul/${site.schoolSlug(s.id)}#${startParams({ level: d.level, dept: d.dept, cc: s.cc, school: s.id, step: 3 })}`,
	};
}

// Her sayfanın altındaki dizin: bütün bölüm ve okul sayfalarına bağlantı.
function indexHtml(site, base) {
	const to = paths(base, site);
	const levelBlocks = LEVELS.map((level) => {
		const list = site.depts.filter(d => d.level === level);
		if (!list.length) {
			return '';
		}
		return `<details class="erx-qa erx-qa--inline">
			<summary>${esc(lvl(level))} bölümleri (${list.length}) ${chevron}</summary>
			<ul class="erx-pages__links">${list.map(d => `<li><a href="${esc(to.dept(d))}">${esc(d.dept)}</a> <span class="erx-muted">${d.schools.length} okul</span></li>`).join('')}</ul>
		</details>`;
	}).join('');
	const schoolBlock = `<details class="erx-qa erx-qa--inline">
		<summary>Okullar, ülkelere göre (${site.schools.length}) ${chevron}</summary>
		<div class="erx-pages__countries">${site.countries.map(c => `<div>
			<h4>${esc(c.country)}</h4>
			<ul class="erx-pages__links">${c.schools.map(s => `<li><a href="${esc(to.school(s))}">${esc(s.name)}</a></li>`).join('')}</ul>
		</div>`).join('')}</div>
	</details>`;
	return `<nav class="erx-pages" aria-labelledby="erx-pages-index">
		<h2 id="erx-pages-index">Bölüm ve okul sayfaları</h2>
		${levelBlocks}${schoolBlock}
	</nav>`;
}

function deptHtml(site, d, base) {
	const to = paths(base, site);
	const title = d.level === 'Lisans' ? d.dept : `${d.dept} (${lvl(d.level)})`;
	return `<section class="erx-pages" data-landing aria-labelledby="erx-pages-dept">
		<h2 id="erx-pages-dept">${esc(title)}: ${d.countries.length} ülkede ${d.schools.length} anlaşmalı okul</h2>
		<p class="erx-muted">İzmir Ekonomi Üniversitesi ${esc(d.faculty ? `${d.faculty}, ` : '')}${esc(d.dept)} ${esc(levelWord(d.level))} öğrencilerinin Erasmus+ öğrenim hareketliliği anlaşmaları. Okulun adına tıklayınca eğitim dili, hibe ve ücret bilgisi açılır.</p>
		<div class="erx-pages__countries">${d.countries.map(c => `<div>
			<h3>${esc(c.country)} <span class="erx-muted">${c.schools.length} okul, aylık ${esc(eur(c.grant))} hibe</span></h3>
			<ul class="erx-pages__links">${c.schools.map(s => `<li><a href="${esc(to.schoolIn(s, d))}">${esc(s.name)}</a> <span class="erx-muted">${esc(s.city)}</span></li>`).join('')}</ul>
		</div>`).join('')}</div>
	</section>`;
}

function schoolHtml(site, s, base) {
	const to = paths(base, site);
	const programs = s.programs.slice().sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || trSort(a.dept || '', b.dept || ''));
	const deptCell = (p) => {
		const d = p.dept && site.deptByKey.get(`${p.level}|${p.dept}`);
		return d ? `<a href="${esc(to.dept(d))}">${esc(p.dept)}</a>` : esc(p.dept || '—');
	};
	const travel = s.travel && s.travel.standard_eur != null
		? `${eur(s.travel.standard_eur)}${s.travel.green_eur != null ? `, yeşil seyahatle ${eur(s.travel.green_eur)}` : ''}`
		: '';
	const facts = [
		['Şehir', `${s.city}, ${s.country}`],
		['İzmir\'e uzaklık', km(s.km)],
		['Aylık hibe', eur(s.grant.monthly_eur)],
		['Seyahat desteği', travel],
		['Erasmus kodu', s.code],
	].filter(([, v]) => v);
	return `<section class="erx-pages" data-landing aria-labelledby="erx-pages-school">
		<h2 id="erx-pages-school">${esc(s.name)}: İEÜ ile Erasmus+ anlaşması</h2>
		<dl class="erx-pages__facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
		${s.outermost ? '<p class="erx-warn"><strong>Avrupa kıtası dışında.</strong>Bu okul AB\'nin en dış bölgelerinden birinde; hibe kuralları farklı olabilir.</p>' : ''}
		<h3>Anlaşmalı İEÜ bölümleri</h3>
		<div class="erx-pages__table"><table class="erx-mini-table">
			<thead><tr><th>İEÜ bölümü</th><th>Okuldaki bölüm</th><th>Seviye</th><th>Dil</th></tr></thead>
			<tbody>${programs.map(p => `<tr><td>${deptCell(p)}</td><td>${esc(p.host)}</td><td>${esc(lvl(p.level))}</td><td>${esc(p.langs.join(', '))}</td></tr>`).join('')}</tbody>
		</table></div>
		<p><strong>Öğrenim ücreti ödemezsin.</strong> ${esc(s.name)} Erasmus+ öğrencisinden öğrenim, kayıt, sınav, laboratuvar ve kütüphane ücreti alamaz. İEÜ'ye bu dönemin ücretini her zamanki gibi ödersin.</p>
		<p class="erx-src">Kaynak: İEÜ Erasmus+ anlaşma listesi ve başvuru ilanı.</p>
	</section>`;
}

// Bir sayfanın bütün parçaları. kind: 'main' | 'dept' | 'school'.
function page(site, kind, item, base) {
	const index = indexHtml(site, base);
	if (kind === 'dept') {
		const d = item;
		const suffix = d.level === 'Lisans' ? '' : ` (${lvl(d.level)})`;
		const top = d.countries.map(c => c.country);
		return {
			path: `${base}/bolum/${d.slug}`,
			title: plain(`İEÜ ${d.dept}${d.level === 'Lisans' ? '' : ` (${d.level})`} Erasmus+ Anlaşmalı Okulları`),
			description: plain(`İzmir Ekonomi Üniversitesi (İEÜ) ${d.dept} ${levelWord(d.level)} öğrencileri için Erasmus+ anlaşmaları: ${d.countries.length} ülkede ${d.schools.length} okul (${listSentence(top, 4, 'ülke')}). Eğitim dili, aylık hibe ve okul listesi.`),
			heading: `${d.dept} Erasmus+ anlaşmaları${suffix}`,
			lede: `İzmir Ekonomi Üniversitesi (İEÜ) ${d.dept} ${levelWord(d.level)} öğrencileri için anlaşmalı okullar, ülkeler ve hibe.`,
			crumb: `${d.dept}${suffix}`,
			start: startParams({ level: d.level, dept: d.dept, step: 2 }),
			html: deptHtml(site, d, base) + index,
		};
	}
	if (kind === 'school') {
		const s = item;
		const p = defaultProgram(s);
		const depts = Array.from(new Set(s.programs.map(x => x.dept).filter(Boolean))).sort(trSort);
		const langs = Array.from(new Set(s.programs.flatMap(x => x.langs)));
		return {
			path: `${base}/okul/${site.schoolSlug(s.id)}`,
			title: plain(`${s.name} Erasmus+ Anlaşması – İEÜ`),
			description: plain(`${s.name} (${s.city}, ${s.country}) ile İzmir Ekonomi Üniversitesi (İEÜ) Erasmus+ anlaşması. Anlaşmalı bölümler: ${listSentence(depts, 3, 'bölüm')}. Eğitim dili: ${langs.join(', ')}. Aylık ${eur(s.grant.monthly_eur)} hibe, İzmir'e ${km(s.km)}.`),
			heading: `${s.name} Erasmus+ anlaşması`,
			lede: `${s.city}, ${s.country}. İzmir Ekonomi Üniversitesi (İEÜ) öğrencileri için bölümler, eğitim dili, hibe ve ücret bilgisi.`,
			crumb: s.name,
			start: p ? startParams({ level: p.level, dept: p.dept, cc: s.cc, school: s.id, step: 3 }) : '',
			html: schoolHtml(site, s, base) + index,
		};
	}
	return {
		path: base,
		heading: BASE_HEADING,
		lede: BASE_LEDE,
		start: '',
		html: index,
	};
}

// forumun sitemap.xml'i için bütün adresler (/erasmus hariç).
function sitemapPaths(site, base) {
	return [
		...site.depts.map(d => `${base}/bolum/${d.slug}`),
		...site.schools.map(s => `${base}/okul/${site.schoolSlug(s.id)}`),
	];
}

module.exports = { BASE_HEADING, BASE_LEDE, slugify, buildSite, page, sitemapPaths, startParams };
