'use strict';

const nconf = require.main.require('nconf');
const winston = require.main.require('winston');
const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');
const routeHelpers = require.main.require('./src/routes/helpers');
const controllerHelpers = require.main.require('./src/controllers/helpers');

const { fetchMeta, fetchDataset } = require('./lib/fetch');
const { buildPayload } = require('./lib/view');
const { parseRecord, shouldCheck, isUpToDate } = require('./lib/store');
const seo = require('./lib/seo');
const pages = require('./lib/pages');
const faq = require('./static/lib/faq');
const MAP = require('./static/europe-map.json');
const { version: VERSION } = require('./package.json');

const plugin = module.exports;

const NAMESPACE = 'ieu-erasmus';
const CACHE_KEY = 'ieu-erasmus:cache';
const MEMO_MS = 60 * 1000;
const DEFAULTS = {
	dataUrl: 'https://erasmus-data.sinansener.com',
	refreshMinutes: 60,
	categoryId: '',
};

let memo = { at: 0, record: null };
let siteMemo = { key: '', site: null, faqHtml: '' };
let inflight = null;
let lastAttemptAt = 0;

// `parseInt(x, 10) || fallback` açıkça girilmiş değerleri yutabilir; sayı değilse varsayılan.
function toNumber(value, fallback) {
	const parsed = parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

plugin.getSettings = async function () {
	const saved = (await meta.settings.get(NAMESPACE)) || {};
	return {
		dataUrl: (saved.dataUrl || DEFAULTS.dataUrl).trim(),
		refreshMinutes: toNumber(saved.refreshMinutes, DEFAULTS.refreshMinutes),
		categoryId: /^\d+$/.test(String(saved.categoryId || '').trim()) ? String(saved.categoryId).trim() : '',
	};
};

async function loadRecord() {
	if (memo.record && Date.now() - memo.at < MEMO_MS) {
		return memo.record;
	}
	const record = parseRecord(await db.getObject(CACHE_KEY));
	memo = { at: Date.now(), record };
	return record;
}

async function saveRecord(fields) {
	await db.setObject(CACHE_KEY, fields);
	memo = { at: 0, record: null };
}

// Önce küçük meta.json'a bakılır; içerik özeti değişmediyse büyük dosyalar
// indirilmez. Hata olursa eski veri yayında kalır, hata ACP'de görünür.
// Aynı anda gelen istekler tek bir yenilemeyi paylaşır.
function refresh({ force = false } = {}) {
	if (inflight) {
		return inflight;
	}
	inflight = (async () => {
		const settings = await plugin.getSettings();
		const record = await loadRecord();
		const now = Date.now();
		if (!force && !shouldCheck({ record, nowMs: now, refreshMs: settings.refreshMinutes * 60 * 1000, lastAttemptAt })) {
			return record;
		}
		lastAttemptAt = now;
		try {
			const metaDoc = await fetchMeta(settings.dataUrl);
			if (isUpToDate(record, metaDoc.content_hash, VERSION)) {
				await saveRecord({ checkedAt: now, error: '' });
			} else {
				const { general, schools } = await fetchDataset(settings.dataUrl);
				const payload = buildPayload({ meta: metaDoc, general, schools, map: MAP, version: VERSION });
				await saveRecord({
					hash: metaDoc.content_hash,
					version: VERSION,
					json: JSON.stringify(payload),
					term: `${metaDoc.term.academic_year} ${metaDoc.term.term_tr}`,
					generatedAt: metaDoc.generated_at,
					schools: schools.length,
					checkedAt: now,
					fetchedAt: now,
					error: '',
				});
				winston.info(`[${NAMESPACE}] veri güncellendi: ${metaDoc.term.academic_year} ${metaDoc.term.term_tr}, ${schools.length} okul`);
			}
		} catch (err) {
			winston.warn(`[${NAMESPACE}] veri yenilenemedi: ${err.message}`);
			await saveRecord({ error: err.message, errorAt: now });
		}
		return loadRecord();
	})().finally(() => {
		inflight = null;
	});
	return inflight;
}

// Sunucuda yazılan içerik (SSS, bölüm ve okul sayfaları) için veri; yalnızca
// veri değişince yeniden hesaplanır.
async function loadSite({ fetchIfMissing = false } = {}) {
	let record = await loadRecord();
	if ((!record || !record.json) && fetchIfMissing) {
		record = await refresh({ force: true });
	}
	if (!record || !record.json) {
		return null;
	}
	const key = `${record.hash}-${record.version}`;
	if (siteMemo.key !== key) {
		const data = JSON.parse(record.json);
		siteMemo = { key, site: pages.buildSite(data), faqHtml: faq.render(data.general, '').html };
	}
	return siteMemo;
}

// kind: 'main' (/erasmus), 'dept' (/erasmus/bolum/:slug), 'school' (/erasmus/okul/:slug).
// Tarayıcıdaki sayfa hepsinde aynıdır; değişen başlık, açıklama, açılış seçimi
// ve sunucuda yazılan içeriktir.
function pageController(kind) {
	return async function (req, res, next) {
		const settings = await plugin.getSettings();
		const relativePath = nconf.get('relative_path');
		const loaded = await loadSite({ fetchIfMissing: kind !== 'main' });
		let item = null;
		if (kind !== 'main') {
			const bySlug = loaded && (kind === 'dept' ? loaded.site.deptBySlug : loaded.site.schoolBySlug);
			item = bySlug && bySlug.get(req.params.slug);
			if (!item) {
				return next();
			}
		}
		const view = loaded ?
			pages.page(loaded.site, kind, item, `${relativePath}/erasmus`) :
			{ path: `${relativePath}/erasmus`, heading: pages.BASE_HEADING, lede: pages.BASE_LEDE, start: '', html: '' };
		const title = view.title || seo.TITLE;
		// Forumun genel açıklaması yerine bu sayfanın başlığı ve açıklaması (Google sonucu).
		res.locals.metaTags = seo.metaTags({ title, description: view.description || seo.DESCRIPTION });
		res.locals.linkTags = seo.linkTags(nconf.get('url') + view.path.slice(relativePath.length));
		const crumbs = kind === 'main' ? [{ text: 'Erasmus+' }] : [{ text: 'Erasmus+', url: 'erasmus' }, { text: view.crumb }];
		res.render('ieu-erasmus', {
			title,
			breadcrumbs: controllerHelpers.buildBreadcrumbs(crumbs),
			dataUrl: `${relativePath}/api/ieu-erasmus/data`,
			categoryId: settings.categoryId,
			heading: view.heading,
			lede: view.lede,
			baseHeading: pages.BASE_HEADING,
			baseLede: pages.BASE_LEDE,
			start: view.start,
			faqHtml: loaded ? loaded.faqHtml : '',
			pagesHtml: view.html,
		});
	};
}

// Sayfanın verisi ayrı bir istekle gelir; ETag sayesinde tarayıcı veri
// değişmedikçe yeniden indirmez.
async function serveData(req, res) {
	let record = await loadRecord();
	if (!record || !record.json) {
		record = await refresh({ force: true });
	} else {
		refresh().catch(() => {});
	}
	if (!record || !record.json) {
		return res.status(503).json({ error: 'Veri henüz hazır değil' });
	}
	const etag = `"${record.hash}-${record.version}"`;
	res.set('ETag', etag);
	res.set('Cache-Control', 'public, max-age=300');
	if (req.headers['if-none-match'] === etag) {
		return res.status(304).end();
	}
	res.type('application/json').send(record.json);
}

async function renderAdmin(req, res) {
	const record = await loadRecord();
	const fmt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—');
	res.render('admin/plugins/ieu-erasmus', {
		title: 'Erasmus+',
		status: {
			term: (record && record.term) || '—',
			schools: (record && record.schools) || 0,
			generatedAt: (record && record.generatedAt) || '—',
			checkedAt: fmt(record && record.checkedAt),
			fetchedAt: fmt(record && record.fetchedAt),
			error: (record && record.error) || '',
		},
	});
}

plugin.init = async function ({ router }) {
	routeHelpers.setupPageRoute(router, '/erasmus', [], pageController('main'));
	routeHelpers.setupPageRoute(router, '/erasmus/bolum/:slug', [], pageController('dept'));
	routeHelpers.setupPageRoute(router, '/erasmus/okul/:slug', [], pageController('school'));
	router.get('/api/ieu-erasmus/data', (req, res, next) => serveData(req, res).catch(next));
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/ieu-erasmus', [], renderAdmin);
	// Sunucu açılırken önbelleği ısıt; sayfa ilk ziyarette beklemesin.
	refresh().catch(() => {});
};

plugin.addApiRoutes = async function ({ router, middleware, helpers }) {
	routeHelpers.setupApiRoute(router, 'post', '/ieu-erasmus/refresh', [middleware.ensureLoggedIn, middleware.admin.checkPrivileges], async (req, res) => {
		const record = await refresh({ force: true });
		helpers.formatApiResponse(200, res, { term: record && record.term, error: record && record.error });
	});
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({ route: '/plugins/ieu-erasmus', icon: 'fa-earth-europe', name: 'Erasmus+' });
	return header;
};

// ACP > Navigasyon'da "Erasmus+" seçilebilir olsun (forum yöneticisi menüye ekler).
plugin.addNavigation = async function (items) {
	items.push({
		route: '/erasmus',
		title: 'Erasmus+',
		enabled: false,
		iconClass: 'fa-earth-europe',
		textClass: '',
		text: 'Erasmus+',
	});
	return items;
};

// Sayfalar forumun sitemap.xml'ine eklenir; Google /erasmus'u, bölüm ve okul
// sayfalarını kendisi bulur.
plugin.addSitemapPage = async function (data) {
	const relativePath = nconf.get('relative_path');
	data.urls.push(seo.sitemapEntry(relativePath));
	const loaded = await loadSite().catch(() => null);
	if (loaded) {
		data.urls.push(...seo.sitemapEntries(relativePath, pages.sitemapPaths(loaded.site, '/erasmus')));
	}
	return data;
};

plugin.onSettingsSet = async function ({ plugin: id }) {
	if (id === NAMESPACE) {
		lastAttemptAt = 0;
		refresh({ force: true }).catch(() => {});
	}
};
