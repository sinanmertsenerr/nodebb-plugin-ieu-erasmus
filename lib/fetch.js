'use strict';

// Veri seti (erasmus-data.sinansener.com) ağdan gelen güvenilmez bir kaynaktır.
// Dizi olduğunu doğrulamak yetmez; sayfanın doğrudan okuduğu her alan
// denetlenir. Tek bir bozuk alan bütün yanıtı geçersiz kılar: bayat veriyle
// devam etmek, bozuk veriyi önbelleğe yazıp sayfayı patlatmaktan iyidir.

const isObject = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isString = v => typeof v === 'string' && v.length > 0;
const isNumber = v => typeof v === 'number' && Number.isFinite(v);
const isStringArray = v => Array.isArray(v) && v.every(x => typeof x === 'string');

function isMeta(body) {
	return isObject(body) &&
		isString(body.generated_at) &&
		isString(body.content_hash) &&
		isObject(body.term) &&
		isString(body.term.academic_year) &&
		isString(body.term.term_tr);
}

function isGeneral(body) {
	if (!isObject(body) || !isObject(body.announcement) || !isObject(body.links) || !isObject(body.sources)) {
		return false;
	}
	const a = body.announcement;
	return Array.isArray(a.calendar) && a.calendar.length > 0 &&
		a.calendar.every(c => isObject(c) && isString(c.label) && isString(c.value)) &&
		isObject(a.min_gpa) && isNumber(a.min_gpa.lisans) && isNumber(a.min_gpa.lisansustu) &&
		Array.isArray(a.scoring) && a.scoring.every(s => isObject(s) && isString(s.criterion) && isString(s.points)) &&
		Array.isArray(a.monthly_grant) && a.monthly_grant.length > 0 &&
		a.monthly_grant.every(g => isObject(g) && isString(g.group) && isStringArray(g.countries) && isNumber(g.eur)) &&
		Array.isArray(a.travel_grant) && a.travel_grant.length > 0 &&
		a.travel_grant.every(b => isObject(b) && isNumber(b.min_km) && (b.max_km === null || isNumber(b.max_km)) &&
			isNumber(b.standard_eur) && isNumber(b.green_eur)) &&
		isNumber(a.fewer_opportunities_monthly_eur) &&
		isObject(a.faculty_grant_quota) && isNumber(a.faculty_grant_quota_total) &&
		isObject(a.rules) &&
		Array.isArray(body.faq_ieu) && body.faq_ieu.every(f => isObject(f) && isString(f.q) && typeof f.a === 'string') &&
		isString(body.links.turnaportal);
}

function isProgram(p) {
	return isObject(p) &&
		typeof p.host_department === 'string' &&
		isString(p.ieu_department_tr) &&
		isString(p.level_tr) &&
		isStringArray(p.languages_tr) &&
		(p.notes_en === undefined || typeof p.notes_en === 'string');
}

// Okulun kendi ücret bölümüne giden bağlantı isteğe bağlıdır; varsa https olmalı.
function isFeePage(f) {
	return f === undefined || f === null ||
		(isObject(f) && isString(f.url) && /^https:\/\//.test(f.url) &&
			(f.scope === 'exchange' || f.scope === 'all') && isString(f.checked));
}

function isSchool(s) {
	return isObject(s) &&
		isFeePage(s.fee_page) &&
		isString(s.id) && isString(s.name) && isString(s.erasmus_code) &&
		isString(s.country_en) && isString(s.country_tr) && isString(s.city) &&
		Array.isArray(s.coords) && s.coords.length === 2 && s.coords.every(isNumber) &&
		isNumber(s.distance_km_from_izmir) &&
		isObject(s.grant) && isString(s.grant.group) && isNumber(s.grant.monthly_eur) &&
		isObject(s.travel_grant) && isNumber(s.travel_grant.standard_eur) && isNumber(s.travel_grant.green_eur) &&
		isStringArray(s.websites) &&
		Array.isArray(s.programs) && s.programs.length > 0 && s.programs.every(isProgram);
}

function isSchools(body) {
	return Array.isArray(body) && body.length > 0 && body.every(isSchool);
}

async function fetchJson(url, { timeoutMs = 20000, fetchImpl } = {}) {
	const doFetch = fetchImpl || globalThis.fetch;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await doFetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
		if (!res.ok) {
			throw new Error(`${url} -> HTTP ${res.status}`);
		}
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}

function joinUrl(base, file) {
	return `${String(base).replace(/\/+$/, '')}/${file}`;
}

async function fetchMeta(baseUrl, opts) {
	const meta = await fetchJson(joinUrl(baseUrl, 'meta.json'), opts);
	if (!isMeta(meta)) {
		throw new Error('meta.json biçimi geçersiz');
	}
	return meta;
}

async function fetchDataset(baseUrl, opts) {
	const [general, schools] = await Promise.all([
		fetchJson(joinUrl(baseUrl, 'general.json'), opts),
		fetchJson(joinUrl(baseUrl, 'schools.json'), opts),
	]);
	if (!isGeneral(general)) {
		throw new Error('general.json biçimi geçersiz');
	}
	if (!isSchools(schools)) {
		throw new Error('schools.json biçimi geçersiz');
	}
	return { general, schools };
}

module.exports = { fetchJson, fetchMeta, fetchDataset, isMeta, isGeneral, isSchools, joinUrl };
