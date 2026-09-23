'use strict';

// Veri setini sayfanın kullandığı sade biçime çevirir: yalnızca ekranda
// gereken alanlar, tekrar eden notlar tek kopya, okulların harita noktaları
// hesaplanmış hâlde. Tarayıcıya giden JSON küçük kalır.

const { createProjection } = require('./projection');

// Anlaşma listesindeki İngilizce ülke adı -> iki harfli kod (harita ve rozetler için).
const COUNTRY_CODES = {
	'AUSTRIA': 'AT', 'BELGIUM': 'BE', 'BULGARIA': 'BG', 'CROATIA': 'HR', 'CYPRUS': 'CY',
	'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ', 'DENMARK': 'DK', 'ESTONIA': 'EE', 'FINLAND': 'FI',
	'FRANCE': 'FR', 'GERMANY': 'DE', 'GREECE': 'GR', 'HUNGARY': 'HU', 'ICELAND': 'IS',
	'IRELAND': 'IE', 'ITALY': 'IT', 'LATVIA': 'LV', 'LIECHTENSTEIN': 'LI', 'LITHUANIA': 'LT',
	'LUXEMBOURG': 'LU', 'MALTA': 'MT', 'THE NETHERLANDS': 'NL', 'NETHERLANDS': 'NL',
	'MACEDONIA': 'MK', 'NORTH MACEDONIA': 'MK', 'NORWAY': 'NO', 'POLAND': 'PL', 'PORTUGAL': 'PT',
	'ROMANIA': 'RO', 'SERBIA': 'RS', 'SLOVAKIA': 'SK', 'SLOVENIA': 'SI', 'SPAIN': 'ES', 'SWEDEN': 'SE',
};

function countryCode(countryEn) {
	return COUNTRY_CODES[String(countryEn).trim().toUpperCase()] || '';
}

// Yalnızca kesin kırık bağlantı (404/410 ya da sunucu hatası) "açılmıyor" sayılır.
// Zaman aşımı (0) ve 403 çoğu zaman okulun yurt dışı sunucuları engellemesinden
// gelir; öğrencinin tarayıcısından açılır.
function isLinkOk(status) {
	const code = typeof status === 'number' ? status : 0;
	return !(code === 404 || code === 410 || (code >= 500 && code < 600));
}

function buildPayload({ meta, general, schools, map, version }) {
	const project = createProjection(map.projection);
	const inside = ([x, y]) => x >= 0 && x <= map.w && y >= 0 && y <= map.h;

	const notes = [];
	const noteIndex = new Map();
	const noteId = (text) => {
		const t = typeof text === 'string' ? text.trim() : '';
		if (!t) {
			return -1;
		}
		if (!noteIndex.has(t)) {
			noteIndex.set(t, notes.length);
			notes.push(t);
		}
		return noteIndex.get(t);
	};

	const points = {};
	const slimSchools = schools.map((s) => {
		const [lat, lon] = s.coords;
		const xy = project([lon, lat]).map(v => Math.round(v * 10) / 10);
		points[s.id] = inside(xy) ? xy : null;
		const status = s.link_status || {};
		return {
			id: s.id,
			name: s.name,
			code: s.erasmus_code,
			cc: countryCode(s.country_en),
			country: s.country_tr,
			city: s.city,
			km: s.distance_km_from_izmir,
			grant: { group: s.grant.group, monthly_eur: s.grant.monthly_eur },
			travel: { standard_eur: s.travel_grant.standard_eur, green_eur: s.travel_grant.green_eur },
			outermost: Boolean(s.outermost_region),
			feePage: s.fee_page ? {
				url: s.fee_page.url,
				scope: s.fee_page.scope,
				format: s.fee_page.format || 'html',
				lang: s.fee_page.lang || '',
				checked: s.fee_page.checked,
			} : null,
			web: s.websites.map(url => ({ url, ok: isLinkOk(status[url]) })),
			programs: s.programs.map(p => ({
				host: p.host_department,
				dept: p.ieu_department_tr,
				faculty: p.ieu_faculty || '',
				quotaUnit: p.grant_quota_unit || '',
				level: p.level_tr,
				langs: p.languages_tr,
				note: noteId(p.notes_en),
			})),
		};
	});

	const a = general.announcement;
	return {
		version: version || '',
		meta: { generatedAt: meta.generated_at, contentHash: meta.content_hash, term: meta.term },
		general: {
			calendar: a.calendar,
			minGpa: a.min_gpa,
			scoring: a.scoring,
			monthlyGrant: a.monthly_grant,
			travelGrant: a.travel_grant,
			fewerOpportunitiesEur: a.fewer_opportunities_monthly_eur,
			facultyQuota: a.faculty_grant_quota,
			facultyQuotaTotal: a.faculty_grant_quota_total,
			rules: a.rules,
			faq: general.faq_ieu,
			links: general.links,
			sources: general.sources,
		},
		notes,
		schools: slimSchools,
		map: { w: map.w, h: map.h, izmir: map.izmir, countries: map.countries, points },
	};
}

module.exports = { buildPayload, countryCode };
