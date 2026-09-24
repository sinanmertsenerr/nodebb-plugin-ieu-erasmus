'use strict';

/* global app, config */

// forum.ieu.app /erasmus sayfası. Veri /api/ieu-erasmus/data'dan gelir (sunucu
// erasmus-data.sinansener.com'dan çekip önbellekler). Görünüm ve akış,
// onaylanan tasarım taslağıyla birebir aynıdır; Türkçe metin yardımcıları
// ieu-erasmus/text modülündedir.

define('forum/ieu-erasmus', ['ieu-erasmus/text', 'ieu-erasmus/faq'], function (text, faq) {
	const Page = {};
	let cleanups = [];

	function teardown() {
		cleanups.forEach(fn => fn());
		cleanups = [];
	}

	Page.init = function () {
		const root = document.querySelector('[data-erx-root]');
		if (root) {
			load(root);
		}
	};

	async function load(root) {
		root.dataset.state = 'loading';
		try {
			const res = await fetch(root.dataset.api, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const data = await res.json();
			Page.mount(root, data, {
				cid: root.dataset.cid || '',
				relativePath: (window.config && config.relative_path) || '',
				loggedIn: Boolean(window.app && app.user && app.user.uid > 0),
			});
		} catch (err) {
			root.dataset.state = 'error';
			const box = root.querySelector('[data-status]');
			box.className = 'erx-notice erx-notice--warning';
			box.innerHTML = '<strong>Erasmus+ verileri şu an yüklenemedi.</strong>Birazdan tekrar dene. <button type="button" class="erx-link-btn" data-retry>Tekrar dene</button>';
			box.querySelector('[data-retry]').addEventListener('click', () => load(root), { once: true });
		}
	}

	// root: sayfanın kök öğesi, D: /api/ieu-erasmus/data yanıtı,
	// env: { cid, relativePath, loggedIn, preview }.
	Page.mount = function (root, D, env) {
		teardown();
		const { esc, fold, highlight, locative, dative, fix, lvl, groupLabel, uniq, eur, km, bandLabel, parseTrDates } = text;
		const { CHARTER_URL } = faq;
		const listen = (target, type, fn) => {
			target.addEventListener(type, fn);
			cleanups.push(() => target.removeEventListener(type, fn));
		};

		// Forumun açık/koyu teması: sayfa zemininin parlaklığına bakılır.
		let themeFadeTimer = 0;
		function detectTheme() {
			let node = root;
			let bg = '';
			while (node && node.nodeType === 1) {
				const c = getComputedStyle(node).backgroundColor;
				if (c && c !== 'transparent' && !/^rgba\(\d+, \d+, \d+, 0\)$/.test(c)) {
					bg = c;
					break;
				}
				node = node.parentElement;
			}
			const rgb = (bg.match(/\d+(\.\d+)?/g) || ['255', '255', '255']).slice(0, 3).map(Number);
			const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
			const next = lum < 0.5 ? 'dark' : 'light';
			if (root.dataset.theme === next) {
				return;
			}
			// İlk boyamada geçiş yok; sonraki değişimlerde renkler yumuşakça döner.
			if (root.dataset.theme) {
				root.classList.add('erx--theme-fade');
				clearTimeout(themeFadeTimer);
				themeFadeTimer = setTimeout(() => root.classList.remove('erx--theme-fade'), 450);
			}
			root.dataset.theme = next;
		}

		function forumSearchUrl(s) {
			if (env.preview) {
				return '#';
			}
			return `${env.relativePath}/search?term=${encodeURIComponent(s.name)}&in=titles&categories[]=${encodeURIComponent(env.cid)}&searchChildren=true&sortBy=timestamp&sortDirection=desc`;
		}

		function openNewTopic(s) {
			if (env.preview) {
				toast('Önizlemede çalışmaz; forumda konu yazma penceresi açılır.');
				return;
			}
			if (!env.loggedIn) {
				window.location.href = `${env.relativePath}/login`;
				return;
			}
			if (window.app && typeof app.newTopic === 'function') {
				app.newTopic({ cid: env.cid, title: `[${s.name}] `, body: '' });
			}
		}

		detectTheme();
		// Zemin renginde geçiş (transition) olabilir; birkaç kez daha bakılır.
		const onSkin = () => {
			detectTheme();
			[60, 400, 900].forEach(ms => setTimeout(detectTheme, ms));
		};
		// Forumun güneş/ay düğmesi <html data-theme="..."> değiştirir, sayfa yenilenmez.
		const themeWatch = new MutationObserver(onSkin);
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-bs-theme', 'class'] });
		themeWatch.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-bs-theme'] });
		cleanups.push(() => {
			themeWatch.disconnect();
			clearTimeout(themeFadeTimer);
			root.classList.remove('erx--theme-fade');
		});
		if (window.jQuery) {
			const $w = window.jQuery(window);
			$w.on('action:skin.change', onSkin);
			$w.one('action:ajaxify.start', teardown);
			cleanups.push(() => $w.off('action:skin.change', onSkin));
		}

		const G = D.general;
		const SCHOOLS = new Map(D.schools.map(s => [s.id, s]));
		const LEVELS = ['Lisans', 'Yüksek Lisans', 'Doktora'];
		const FACULTY_ORDER = [
			'İşletme Fakültesi', 'Mühendislik Fakültesi', 'Güzel Sanatlar ve Tasarım Fakültesi', 'İletişim Fakültesi',
			'Fen Edebiyat Fakültesi', 'Hukuk Fakültesi', 'Sağlık Bilimleri Fakültesi', 'Tıp Fakültesi',
			'Uygulamalı Yönetim Bilimleri Yüksekokulu',
		];
		const SVGNS = 'http://www.w3.org/2000/svg';
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

		// Sorgular sayfanın kök öğesiyle sınırlı: forumun geri kalanına dokunulmaz.
		const $ = (sel, scope) => (scope || root).querySelector(sel);
		const $$ = (sel, scope) => Array.from((scope || root).querySelectorAll(sel));

		const state = {
			mode: 'faq',
			step: 1,
			level: 'Lisans',
			dept: null,
			cc: null,
			school: null,
			sort: { key: 'count', dir: 'desc' },
		};

		const icon = name => `<svg class="i" aria-hidden="true"><use href="#erx-i-${name}"/></svg>`;

		// Dar ekranda adımlar alt alta dizilir; kaydırma forumun yapışkan üst
		// çubuğunun (Harmony mobil menüsü, PWA başlığı) altında durmalı. Çubuğun
		// yüksekliği temaya göre değiştiği için ekranın en üstündeki sabit öğe ölçülür.
		const compact = () => window.matchMedia('(max-width: 1099px)').matches;
		function stickyOffset() {
			let bottom = 0;
			for (const x of [8, window.innerWidth / 2, window.innerWidth - 8]) {
				for (let node = document.elementFromPoint(x, 2); node && node !== document.body; node = node.parentElement) {
					const pos = window.getComputedStyle(node).position;
					if (pos === 'fixed' || pos === 'sticky') {
						const r = node.getBoundingClientRect();
						if (r.top <= 2 && r.height < window.innerHeight / 3) {
							bottom = Math.max(bottom, r.bottom);
						}
						break;
					}
				}
			}
			return bottom;
		}
		function scrollToEl(target, opts) {
			const o = opts || {};
			const offset = stickyOffset() + 12;
			const top = target.getBoundingClientRect().top;
			if (o.ifNeeded && top >= offset - 4 && top <= window.innerHeight * 0.45) {
				return;
			}
			target.style.scrollMarginTop = offset + 'px';
			target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
		}

		function anim(el, frames, opts) {
			// Gizli (ekranda çizilmeyen) öğede başlayan animasyon takılı kalıp öğeyi
			// ilk karesinde (ör. scale(0)) bırakabiliyor; gizliyse hiç başlatılmaz.
			if (reduceMotion || !el || !el.animate || !el.getClientRects().length) {
				return null;
			}
			return el.animate(frames, Object.assign({ easing: EASE, fill: 'backwards' }, opts));
		}

		function toast(message) {
			const t = $('[data-toast]');
			t.textContent = message;
			t.hidden = false;
			anim(t, [{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 160 });
			clearTimeout(toast.timer);
			toast.timer = setTimeout(() => { t.hidden = true; }, 2400);
		}

		// Bir bloğu gizleyip diğerini gösterir; yön verilirse yatay kayar.
		// Çıkış kısa (160ms), giriş uzun (320ms): kullanıcı beklemeden yeni içeriği görür.
		function swap(from, to, dir, done) {
			const show = () => {
				if (from && from !== to) {
					from.hidden = true;
				}
				to.hidden = false;
				if (done) {
					done();
				}
				const dx = dir ? 28 * dir : 0;
				anim(to, [{ opacity: 0, transform: `translate(${dx}px, ${dir ? 0 : 8}px)` }, { opacity: 1, transform: 'none' }], { duration: 320 });
			};
			if (!from || from === to || from.hidden || reduceMotion) {
				show();
				return;
			}
			const dx = dir ? -20 * dir : 0;
			const out = from.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${dx}px, 0)` }], { duration: 160, easing: EASE });
			out.onfinish = show;
		}

		// Adım değişirken yeni panel imlecin altına gelir; çift tıklamanın ikinci
		// tıkı yanlışlıkla yeni paneldeki bir satırı seçmesin diye kısa bir kilit.
		let lockUntil = 0;
		const locked = () => performance.now() < lockUntil;
		const lock = () => { lockUntil = performance.now() + 450; };

		// ------------------------------------------------------------ veri dizini

		const deptIndex = new Map();
		for (const s of D.schools) {
			for (const p of s.programs) {
				if (!p.dept) {
					continue;
				}
				const key = p.level + '|' + p.dept;
				if (!deptIndex.has(key)) {
					deptIndex.set(key, { level: p.level, dept: p.dept, faculty: p.faculty, schools: new Set(), countries: new Set() });
				}
				const e = deptIndex.get(key);
				e.schools.add(s.id);
				e.countries.add(s.cc);
			}
		}

		const deptEntry = () => deptIndex.get(state.level + '|' + state.dept);
		const programsFor = school => school.programs.filter(p => p.dept === state.dept && p.level === state.level);

		function countryRows() {
			const entry = deptEntry();
			const byCc = new Map();
			for (const id of entry.schools) {
				const s = SCHOOLS.get(id);
				if (!byCc.has(s.cc)) {
					byCc.set(s.cc, { cc: s.cc, country: s.country, grant: s.grant.monthly_eur, ids: [], km: Infinity });
				}
				const row = byCc.get(s.cc);
				row.ids.push(id);
				if (s.km < row.km && !s.outermost) {
					row.km = s.km;
				}
			}
			const rows = Array.from(byCc.values());
			const { key, dir } = state.sort;
			const sign = dir === 'asc' ? 1 : -1;
			const val = r => (key === 'count' ? r.ids.length : key === 'country' ? r.country : r[key]);
			rows.sort((a, b) => {
				const va = val(a);
				const vb = val(b);
				if (typeof va === 'string') {
					return sign * va.localeCompare(vb, 'tr');
				}
				return sign * (va - vb) || a.country.localeCompare(b.country, 'tr');
			});
			return rows;
		}

		const currentCountry = () => state.cc && countryRows().find(r => r.cc === state.cc);

		function schoolsInCountry() {
			const row = currentCountry();
			return row ? row.ids.map(id => SCHOOLS.get(id)).sort((a, b) => a.km - b.km) : [];
		}

		// ------------------------------------------------------------ başlık, durum

		const dayMonth = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
		const termLabel = () => `${D.meta.term.academic_year.replace('-', '–')} ${D.meta.term.term_tr}`;

		function renderHead() {
			const countries = new Set(D.schools.map(s => s.cc)).size;
			// Tarih bölünmesin (dar ekranda "23 / Eylül 2026" diye kırılıyordu).
			const updated = new Date(D.meta.generatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/ /g, '\u00a0');
			$('[data-meta]').textContent = `${termLabel()} · ${D.schools.length} okul · ${countries} ülke · Güncelleme: ${updated}`;

			const cal = Object.fromEntries(G.calendar.map(c => [c.label, parseTrDates(c.value)]));
			const apply = cal['Başvuru süresi'] || [];
			const result = (cal['Başvuru Sonuçlarının İlan Edilmesi'] || [])[0];
			const objection = cal['İtiraz ve iptal süreci'] || [];
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			let title;
			let body = '';
			let tone = '';
			if (apply[0] && today < apply[0]) {
				title = `Başvurular ${locative(dayMonth(apply[0]))} açılıyor.`;
				body = `Başvuru TURNAPortal üzerinden, e-Devlet ile yapılır. Son gün ${dayMonth(apply[1] || apply[0])}.`;
			} else if (apply[1] && today <= apply[1]) {
				title = `Başvurular açık, son gün ${dayMonth(apply[1])} saat 16:59.`;
				body = 'Başvuru TURNAPortal üzerinden, e-Devlet ile yapılır.';
				tone = 'warning';
			} else if (result && today < result) {
				title = `Başvurular ${locative(dayMonth(apply[1]))} kapandı. Sonuçlar ${locative(dayMonth(result))} açıklanacak.`;
				body = objection[1] ? `Sonuçlara itiraz ${dative(dayMonth(objection[1]))} kadar yapılabilir.` : '';
			} else if (objection[1] && today <= objection[1]) {
				title = 'Sonuçlar açıklandı.';
				body = `İtiraz ve iptal süresi ${locative(dayMonth(objection[1]))} bitiyor.`;
			} else {
				title = 'Bu dönemin başvuru süreci bitti.';
				body = 'Sonraki dönemin ilanı yayımlanınca bu sayfa kendiliğinden güncellenir.';
				tone = 'muted';
			}
			const box = $('[data-status]');
			box.className = 'erx-notice' + (tone ? ' erx-notice--' + tone : '');
			box.innerHTML = `<strong>${esc(title)}</strong>${esc(body)}`;
		}

		// ------------------------------------------------------------ sekmeler

		function moveInk() {
			const tab = $(`.erx-tabs [data-mode="${state.mode}"]`);
			const ink = $('.erx-tabs__ink');
			ink.style.width = tab.offsetWidth + 'px';
			ink.style.transform = `translateX(${tab.offsetLeft}px)`;
		}

		// Bütün seçimleri ve aramaları temizler, 1. adıma döner.
		function resetWizard(opts) {
			const o = opts || {};
			state.level = 'Lisans';
			state.dept = null;
			state.cc = null;
			state.school = null;
			state.sort = { key: 'count', dir: 'desc' };
			$('[data-dept-search]').value = '';
			$('[data-unis-search]').value = '';
			renderLevels();
			renderDepts();
			map.routes.textContent = '';
			map.dots.textContent = '';
			if (o.instant || state.step === 1) {
				state.step = 1;
				$$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== '1'; });
				renderStepper();
				writeHash();
				if (!o.instant) {
					enterAgain($('[data-panel="1"]'));
				}
				return;
			}
			showStep(1, -1);
		}

		function enterAgain(el) {
			anim(el, [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
		}

		function setMode(mode, opts) {
			const o = opts || {};
			if (mode === state.mode && !o.force) {
				return;
			}
			const from = $(`[data-view="${state.mode}"]`);
			// Genel sorulara geçince seçimler sıfırlanır; geri gelen temiz başlar.
			if (!o.force && state.mode === 'find' && mode === 'faq') {
				resetWizard({ instant: true });
			}
			state.mode = mode;
			$$('.erx-tabs [role="tab"]').forEach((t) => {
				const on = t.dataset.mode === mode;
				t.setAttribute('aria-selected', String(on));
				t.tabIndex = on ? 0 : -1;
			});
			moveInk();
			const to = $(`[data-view="${mode}"]`);
			swap(o.force ? null : from, to, 0, () => {
				if (mode === 'find') {
					showStep(state.step, 0, { instant: true });
				}
			});
			if (o.force) {
				$$('[data-view]').forEach((v) => { v.hidden = v !== to; });
			} else {
				scrollToEl($('.erx-tabs'), { ifNeeded: true });
			}
			writeHash();
		}

		// ------------------------------------------------------------ adımlar

		function reachable(n) {
			return n === 1 || (n === 2 && Boolean(state.dept)) || (n === 3 && Boolean(state.cc));
		}

		function renderStepper() {
			const row = currentCountry();
			const values = {
				1: state.dept ? `${state.dept} · ${lvl(state.level)}` : 'Seçilmedi',
				2: row ? `${row.country} · ${row.ids.length} okul` : 'Seçilmedi',
				3: state.school ? SCHOOLS.get(state.school).name : 'Seçilmedi',
			};
			const has = { 1: Boolean(state.dept), 2: Boolean(state.cc), 3: Boolean(state.school) };
			$$('.erx-steps__btn').forEach((b) => {
				const n = Number(b.dataset.go);
				b.disabled = !reachable(n);
				if (n === state.step) {
					b.setAttribute('aria-current', 'step');
				} else {
					b.removeAttribute('aria-current');
				}
				b.dataset.state = has[n] && n !== state.step ? 'done' : '';
				$(`[data-val="${n}"]`).textContent = values[n];
			});
			$('.erx-steps__fill').style.transform = `scaleX(${(state.step - 1) / 2})`;
			$$('[data-reset]').forEach((r) => { r.hidden = !state.dept; });
		}

		function showStep(n, dir, opts) {
			const o = opts || {};
			const from = $(`[data-panel="${state.step}"]`);
			const to = $(`[data-panel="${n}"]`);
			state.step = n;
			if (!o.instant) {
				lock();
			}
			$('[data-tip]').hidden = true;
			hot(null);
			renderStepper();
			$$('[data-panel]').forEach((p) => {
				if (p !== to && (o.instant || p !== from)) {
					p.hidden = true;
				}
			});
			const after = () => {
				if (n === 2 || n === 3) {
					$(`[data-map-slot="${n}"]`).appendChild($('[data-map-figure]'));
					updateMap(Boolean(o.wave));
				}
				if (n === 3) {
					updateUnisFade();
					revealSelected();
					if (!o.instant) {
						animateTrip();
					}
				}
				if (!o.instant) {
					$('h2', to).focus({ preventScroll: true });
				}
			};
			swap(o.instant ? null : from, to, dir, after);
			if (!o.instant) {
				// Paneller aynı yerde durur; yeni panel görünmeden önce de konumu bellidir.
				if (compact()) {
					scrollToEl($('[data-stage]'));
				} else {
					scrollToEl($('.erx-steps'), { ifNeeded: true });
				}
			}
			writeHash();
		}

		function goStep(n, opts) {
			if (locked() || !reachable(n) || n === state.step) {
				return;
			}
			showStep(n, n > state.step ? 1 : -1, opts);
		}

		function writeHash() {
			const p = new URLSearchParams();
			if (state.mode === 'faq' && root.dataset.start) {
				p.set('mod', 'sss');
			}
			if (state.mode === 'find') {
				p.set('mod', 'bolum');
				p.set('adim', state.step);
				p.set('seviye', state.level);
				if (state.dept) {
					p.set('bolum', state.dept);
				}
				if (state.cc) {
					p.set('ulke', state.cc);
				}
				if (state.school) {
					p.set('okul', state.school);
				}
			}
			// Bölüm veya okul sayfası kendi seçimindeyken adres temiz kalır (/erasmus/bolum/isletme).
			const hash = p.toString() === root.dataset.start ? '' : p.toString();
			// NodeBB ajaxify geçmiş kaydındaki durumu korunur; yalnızca adresin #'i değişir.
			history.replaceState(history.state, '', location.pathname + location.search + (hash ? '#' + hash : ''));
			syncLanding();
		}

		// Bölüm veya okul sayfasında öğrenci başka bir seçime geçince başlık genel
		// başlığa döner, sayfanın altındaki o bölüme/okula ait özet gizlenir.
		const landing = new URLSearchParams(root.dataset.start || '');
		const headings = [$('[data-heading]'), $('[data-lede]')].filter(Boolean).map(node => ({ node, own: node.textContent }));
		function syncLanding() {
			if (!root.dataset.start) {
				return;
			}
			const on = state.mode === 'find' && (landing.has('okul') ?
				state.school === landing.get('okul') :
				state.dept === landing.get('bolum') && state.level === landing.get('seviye'));
			headings.forEach(({ node, own }) => { node.textContent = on ? own : node.dataset.base; });
			$$('[data-landing]').forEach((el) => { el.hidden = !on; });
		}

		// ------------------------------------------------------------ adım 1: bölüm

		function renderLevels() {
			const counts = Object.fromEntries(LEVELS.map(l => [l, 0]));
			for (const e of deptIndex.values()) {
				counts[e.level] += 1;
			}
			$('[data-levels]').innerHTML = LEVELS.filter(l => counts[l]).map(l =>
				`<button type="button" role="radio" aria-checked="${l === state.level}" data-level="${esc(l)}">${esc(lvl(l))}<small>${counts[l]}</small></button>`,
			).join('');
		}

		function renderDepts() {
			const q = $('[data-dept-search]').value.trim();
			const groups = new Map();
			for (const e of deptIndex.values()) {
				if (e.level !== state.level || (q && !fold(e.dept).includes(fold(q)))) {
					continue;
				}
				const fac = e.faculty || 'Diğer';
				if (!groups.has(fac)) {
					groups.set(fac, []);
				}
				groups.get(fac).push(e);
			}
			const order = [...FACULTY_ORDER, ...Array.from(groups.keys()).filter(f => !FACULTY_ORDER.includes(f))];
			const html = order.filter(f => groups.has(f)).map((fac) => {
				const items = groups.get(fac).sort((a, b) => b.schools.size - a.schools.size || a.dept.localeCompare(b.dept, 'tr'));
				return `<div class="erx-fac"><h3>${esc(fac)}</h3><ul>${items.map(e => `
					<li><button type="button" class="erx-dept${e.dept === state.dept && e.level === state.level ? ' is-picked' : ''}" data-dept="${esc(e.dept)}">
						<span class="erx-dept__name">${highlight(e.dept, q)}</span>
						<span class="erx-dept__meta"><span class="erx-pill"><b>${e.schools.size}</b> okul</span><span class="erx-pill"><b>${e.countries.size}</b> ülke</span></span>
						<span class="erx-dept__go" aria-hidden="true">${icon('chevron-right')}</span>
					</button></li>`).join('')}</ul></div>`;
			}).join('');
			$('[data-depts]').innerHTML = html || '<p class="erx-empty">Bu seviyede bu adla eşleşen bölüm yok. Başka bir seviye dene.</p>';
		}

		function selectDept(dept) {
			if (locked()) {
				return;
			}
			const changed = dept !== state.dept;
			state.dept = dept;
			if (changed) {
				state.cc = null;
				state.school = null;
				renderCountries();
			}
			renderDepts();
			showStep(2, 1, { wave: changed });
		}

		// ------------------------------------------------------------ adım 2: ülke

		function renderCountries() {
			const rows = countryRows();
			const max = Math.max(...rows.map(r => r.ids.length));
			$('[data-countries]').innerHTML = rows.map(r => `
				<tr class="erx-crow" data-cc="${esc(r.cc)}" aria-selected="${r.cc === state.cc}">
					<td><button type="button" class="erx-crow__btn"><span class="erx-cc">${esc(r.cc)}</span>${esc(r.country)}</button></td>
					<td class="num"><span><span class="erx-bar" style="width:${Math.max(6, Math.round(r.ids.length / max * 56))}px"></span>${r.ids.length}</span></td>
					<td class="num"><span>${eur(r.grant)}</span></td>
					<td class="num"><span>${Number.isFinite(r.km) ? km(r.km) : '—'}</span></td>
				</tr>`).join('');
			$$('[data-sort]').forEach((b) => {
				if (b.dataset.sort === state.sort.key) {
					b.setAttribute('aria-sort', state.sort.dir === 'asc' ? 'ascending' : 'descending');
				} else {
					b.removeAttribute('aria-sort');
				}
			});
			$$('.erx-bar').forEach((bar, i) => anim(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: 120 + i * 30 }));
			const entry = deptEntry();
			$('[data-p2-sub]').textContent = `${state.dept} (${lvl(state.level)}) için ${entry.countries.size} ülkede ${entry.schools.size} anlaşmalı okul var.`;
		}

		function selectCountry(cc) {
			if (locked()) {
				return;
			}
			if (cc !== state.cc) {
				state.cc = cc;
				state.school = null;
				$$('.erx-crow').forEach(tr => tr.setAttribute('aria-selected', String(tr.dataset.cc === cc)));
				renderUnis();
				selectSchool(schoolsInCountry()[0].id, { quiet: true });
			}
			showStep(3, 1);
		}

		// ------------------------------------------------------------ harita

		const map = { svg: null, paths: new Map(), dots: null, routes: null, view: [0, 0, D.map.w, D.map.h], raf: 0 };

		function el(name, attrs, parent) {
			const node = document.createElementNS(SVGNS, name);
			for (const [k, v] of Object.entries(attrs || {})) {
				node.setAttribute(k, v);
			}
			if (parent) {
				parent.appendChild(node);
			}
			return node;
		}

		function buildMap() {
			const svg = $('[data-map]');
			map.svg = svg;
			svg.setAttribute('viewBox', map.view.join(' '));
			const land = el('g', {}, svg);
			for (const c of D.map.countries) {
				const p = el('path', { d: c.d, class: 'land' + (c.code === 'TR' ? ' is-home' : '') }, land);
				if (c.code && c.code !== 'TR') {
					p.dataset.cc = c.code;
					map.paths.set(c.code, p);
				}
			}
			map.routes = el('g', {}, svg);
			map.dots = el('g', {}, svg);
			const [hx, hy] = D.map.izmir;
			const home = el('g', { class: 'erx-map__home' }, svg);
			el('circle', { cx: hx, cy: hy, r: 4 }, home);
			map.pulse = el('circle', { cx: hx, cy: hy, r: 4, class: 'pulse' }, home);
			map.homeLabel = el('text', { x: hx + 8, y: hy + 4, class: 'erx-map__label' }, home);
			map.homeLabel.textContent = 'İzmir';

			const tip = $('[data-tip]');
			svg.addEventListener('pointermove', (ev) => {
				const t = ev.target;
				let html = '';
				if (t.classList.contains('is-partner')) {
					const row = countryRows().find(r => r.cc === t.dataset.cc);
					html = `<strong>${esc(row.country)}</strong> · ${row.ids.length} okul · ${eur(row.grant)}/ay`;
					hot(t.dataset.cc);
				} else if (t.classList.contains('erx-map__dot')) {
					const s = SCHOOLS.get(t.dataset.id);
					html = `<strong>${esc(s.name)}</strong> · ${esc(s.city)}`;
					hotSchool(t.dataset.id);
				} else {
					hot(null);
					hotSchool(null);
				}
				tip.hidden = !html;
				if (html) {
					// Etiket çerçevenin içinde kalır: kenara yakınsa kaydırılır, üstte yer yoksa alta iner.
					const r = $('.erx-map__frame').getBoundingClientRect();
					tip.innerHTML = html;
					const w = tip.offsetWidth;
					const x = Math.min(Math.max(ev.clientX - r.left, w / 2 + 8), r.width - w / 2 - 8);
					const y = ev.clientY - r.top;
					tip.style.left = x + 'px';
					tip.style.top = y + 'px';
					tip.classList.toggle('is-below', y < tip.offsetHeight + 20);
				}
			});
			svg.addEventListener('pointerleave', () => {
				tip.hidden = true;
				hot(null);
				hotSchool(null);
			});
			svg.addEventListener('click', (ev) => {
				const t = ev.target;
				if (t.classList.contains('is-partner') && state.step === 2) {
					selectCountry(t.dataset.cc);
				} else if (t.classList.contains('erx-map__dot')) {
					selectSchool(t.dataset.id);
				}
			});
		}

		function hot(cc) {
			map.paths.forEach((p, code) => p.classList.toggle('is-hot', code === cc));
			$$('.erx-crow').forEach(tr => tr.classList.toggle('is-hot', tr.dataset.cc === cc));
		}

		function hotSchool(id) {
			$$('.erx-map__dot').forEach(d => d.classList.toggle('is-hot', d.dataset.id === id || d.dataset.id === state.school));
			$$('.erx-unis button').forEach(b => b.classList.toggle('is-hot', b.dataset.id === id));
		}

		const level = n => (n >= 5 ? 3 : n >= 2 ? 2 : 1);

		function updateMap(wave) {
			const rows = state.dept ? countryRows() : [];
			const byCc = new Map(rows.map(r => [r.cc, r]));
			const [hx, hy] = D.map.izmir;
			const inStep3 = state.step === 3 && state.cc;
			map.paths.forEach((p, cc) => {
				const row = byCc.get(cc);
				p.classList.toggle('is-partner', Boolean(row) && state.step === 2);
				p.classList.toggle('is-dim', Boolean(inStep3) && cc !== state.cc);
				// 3. adımda yalnızca seçili ülke renkli kalır; rota diğer ülkelerin
				// kırmızısına karışıp kesik görünmesin.
				if (row && (!inStep3 || cc === state.cc)) {
					p.dataset.lvl = level(row.ids.length);
				} else {
					delete p.dataset.lvl;
				}
				// Ülkeler İzmir'den dışa doğru dalga halinde yanar: gecikme uzaklıkla orantılı.
				if (wave && row) {
					const b = p.getBBox();
					const dist = Math.hypot(b.x + b.width / 2 - hx, b.y + b.height / 2 - hy);
					anim(p, [{ opacity: 0.1 }, { opacity: 1 }], { duration: 300, delay: Math.min(520, dist * 0.6) });
				}
			});
			map.dots.textContent = '';
			map.routes.textContent = '';
			if (inStep3) {
				for (const s of schoolsInCountry()) {
					const pt = D.map.points[s.id];
					if (pt) {
						const dot = el('circle', { cx: pt[0], cy: pt[1], r: 4, class: 'erx-map__dot' + (s.id === state.school ? ' is-hot' : '') }, map.dots);
						dot.dataset.id = s.id;
					}
				}
				zoomTo(unionBox(map.paths.get(state.cc).getBBox(), D.map.izmir));
				if (state.school) {
					drawRoute(state.school, true);
				}
			} else {
				zoomTo([0, 0, D.map.w, D.map.h]);
			}
			$('[data-map-cap]').textContent = inStep3
				? `İzmir'den ${locative(currentCountry().country)}ki okullara giden rota. Bir noktaya basarak okulu seçebilirsin.`
				: `${state.dept} (${lvl(state.level)}) için anlaşmalı ülkeler renkli; renk koyulaştıkça okul sayısı artıyor.`;
			if (wave) {
				anim(map.pulse, [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(4)', opacity: 0 }], { duration: 900, fill: 'none' });
			}
		}

		function unionBox(b, pt) {
			let x0 = Math.min(b.x, pt[0]);
			let y0 = Math.min(b.y, pt[1]);
			let x1 = Math.max(b.x + b.width, pt[0]);
			let y1 = Math.max(b.y + b.height, pt[1]);
			const pad = Math.max(x1 - x0, y1 - y0) * 0.12;
			x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
			const ratio = D.map.w / D.map.h;
			let w = x1 - x0;
			let h = y1 - y0;
			if (w / h > ratio) {
				const nh = w / ratio;
				y0 -= (nh - h) / 2;
				h = nh;
			} else {
				const nw = h * ratio;
				x0 -= (nw - w) / 2;
				w = nw;
			}
			return [x0, y0, w, h];
		}

		function zoomTo(target) {
			cancelAnimationFrame(map.raf);
			const from = map.view.slice();
			const apply = (v) => {
				map.view = v;
				map.svg.setAttribute('viewBox', v.map(n => n.toFixed(1)).join(' '));
				// Etiket ve işaretçiler ekranda hep aynı piksel boyunda kalsın:
				// k = ekrandaki 1 pikselin harita birimi karşılığı.
				const k = v[2] / (map.svg.clientWidth || 420);
				map.homeLabel.setAttribute('x', D.map.izmir[0] + 8 * k);
				map.homeLabel.setAttribute('y', D.map.izmir[1] + 4 * k);
				map.homeLabel.style.fontSize = (12 * k) + 'px';
				map.homeLabel.style.strokeWidth = (3 * k) + 'px';
				$$('.erx-map__dot, .erx-map__home circle', map.svg).forEach(c => c.setAttribute('r', (c.classList.contains('erx-map__dot') ? 4.5 : 4) * k));
				map.k = k;
				$$('.erx-map__route', map.svg).forEach((p) => { p.style.strokeWidth = 2.5 * k; });
				$$('.erx-map__route-casing', map.svg).forEach((p) => { p.style.strokeWidth = 6 * k; });
			};
			if (reduceMotion) {
				apply(target);
				return;
			}
			const t0 = performance.now();
			const tick = (now) => {
				const t = Math.min(1, (now - t0) / 320);
				const e = 1 - Math.pow(1 - t, 4);
				apply(from.map((f, i) => f + (target[i] - f) * e));
				if (t < 1) {
					map.raf = requestAnimationFrame(tick);
				}
			};
			map.raf = requestAnimationFrame(tick);
		}

		// Sayfanın tek büyük anı: İzmir'den seçili okulun şehrine çizilen rota.
		function drawRoute(id, animate) {
			map.routes.textContent = '';
			const pt = D.map.points[id];
			if (!pt) {
				return;
			}
			const [x1, y1] = D.map.izmir;
			const [x2, y2] = pt;
			const len = Math.hypot(x2 - x1, y2 - y1) || 1;
			const nx = -(y2 - y1) / len;
			const ny = (x2 - x1) / len;
			const bend = len * 0.18 * (ny < 0 ? 1 : -1);
			const d = `M${x1},${y1} Q${(x1 + x2) / 2 + nx * bend},${(y1 + y2) / 2 + ny * bend} ${x2},${y2}`;
			// pathLength=1: çizim animasyonu yakınlaştırma ne olursa olsun hattın tamamını kapsar.
			// (Eskiden vector-effect yüzünden kesik uzunluk ekran pikseliyle hesaplanıp hat yarıda kalıyordu.)
			// Altta açık renkli kenar, üstte kırmızı hat: hangi zeminden geçerse geçsin okunur.
			const casing = el('path', { d, class: 'erx-map__route-casing', pathLength: 1 }, map.routes);
			const path = el('path', { d, class: 'erx-map__route', pathLength: 1 }, map.routes);
			casing.style.strokeWidth = 6 * (map.k || 1);
			path.style.strokeWidth = 2.5 * (map.k || 1);
			if (animate !== false && !reduceMotion) {
				[casing, path].forEach((line) => {
					line.style.strokeDasharray = '1';
					const a = anim(line, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, delay: 120, fill: 'backwards' });
					if (a) {
						a.onfinish = () => { line.style.strokeDasharray = 'none'; };
					}
				});
			}
		}

		// ------------------------------------------------------------ adım 3: üniversite

		function renderUnis() {
			const list = schoolsInCountry();
			const row = currentCountry();
			$('[data-p3-sub]').textContent = `${locative(row.country)} ${state.dept} (${lvl(state.level)}) için ${list.length} okul var.`;
			$('[data-unis-count]').innerHTML = `<b>${list.length}</b> okul`;
			// Uzun listede arama kutusu çıkar; kısa listede gereksiz kalabalık olur.
			$('[data-unis-search-wrap]').hidden = list.length <= 6;
			$('[data-unis-search]').value = '';
			$('[data-unis]').innerHTML = list.map(s => `
				<li data-text="${esc(fold(s.name + ' ' + s.city))}"><button type="button" role="option" data-id="${esc(s.id)}" aria-selected="${s.id === state.school}" tabindex="${s.id === state.school ? 0 : -1}">
					<strong>${esc(s.name)}</strong>
					<span>${esc(s.city)} · ${s.outermost ? 'Avrupa dışında' : km(s.km)} · ${esc(Array.from(new Set(programsFor(s).flatMap(p => p.langs))).join(', '))}</span>
				</button></li>`).join('');
			$('[data-unis-empty]').hidden = true;
			$('[data-unis-scroll]').scrollTop = 0;
			requestAnimationFrame(updateUnisFade);
		}

		// Liste kendi içinde kayar; altta/üstte devamı varsa kenar solar.
		function updateUnisFade() {
			const box = $('[data-unis-scroll]');
			box.classList.toggle('has-more', box.scrollTop + box.clientHeight < box.scrollHeight - 4);
			box.classList.toggle('has-less', box.scrollTop > 4);
		}

		// Seçili okul görünür alanda değilse kutu içinde (sayfayı oynatmadan) ona kayar.
		function revealSelected() {
			const box = $('[data-unis-scroll]');
			const btn = $('.erx-unis button[aria-selected="true"]');
			if (!btn || btn.offsetParent === null) {
				return;
			}
			const top = btn.offsetTop - box.offsetTop;
			const bottom = top + btn.offsetHeight;
			if (top < box.scrollTop) {
				box.scrollTo({ top: top - 8, behavior: reduceMotion ? 'auto' : 'smooth' });
			} else if (bottom > box.scrollTop + box.clientHeight) {
				box.scrollTo({ top: bottom - box.clientHeight + 8, behavior: reduceMotion ? 'auto' : 'smooth' });
			}
		}

		function filterUnis() {
			const q = fold($('[data-unis-search]').value.trim());
			let shown = 0;
			$$('.erx-unis li').forEach((li) => {
				const hit = !q || li.dataset.text.includes(q);
				li.hidden = !hit;
				shown += hit ? 1 : 0;
			});
			$('[data-unis-empty]').hidden = shown > 0;
			updateUnisFade();
		}

		function selectSchool(id, opts) {
			const o = opts || {};
			if (!SCHOOLS.has(id)) {
				return;
			}
			state.school = id;
			$$('.erx-unis button').forEach((b) => {
				const on = b.dataset.id === id;
				b.setAttribute('aria-selected', String(on));
				b.tabIndex = on ? 0 : -1;
			});
			requestAnimationFrame(revealSelected);
			renderDetail(SCHOOLS.get(id), !o.quiet);
			renderStepper();
			if (state.step === 3) {
				$$('.erx-map__dot').forEach(d => d.classList.toggle('is-hot', d.dataset.id === id));
				drawRoute(id, true);
				if (compact() && !o.quiet) {
					scrollToEl($('[data-detail]'));
				}
			}
			writeHash();
		}

		function renderDetail(s, animate) {
			const box = $('[data-detail]');
			// Her şey seçili bölüm özelinde: tablo satırları, notlar ve diller yalnızca
			// o bölümün (ve seviyenin) anlaşma satırlarından gelir. Tekrarlar temizlenir.
			const mine = uniq(programsFor(s), p => [p.host, p.level, p.langs.join(',')].join('|'));
			const others = uniq(
				s.programs.filter(p => !(p.dept === state.dept && p.level === state.level)),
				p => [p.dept, p.host, p.level].join('|'),
			);
			const noteText = p => (p.note >= 0 ? fix(D.notes[p.note]) : '');
			// Aynı not listede boşluk farklarıyla birkaç kez geçebiliyor: temizlenmiş metne göre tekilleştir.
			let notes = uniq(mine.map(p => ({ host: p.host, text: noteText(p) })).filter(n => n.text), n => n.text);
			let noteLabel = notes.length > 1 ? n => `Okulun notu: ${n.host} (İEÜ listesinden, İngilizce)` : () => 'Okulun notu (İEÜ listesinden, İngilizce)';
			if (!notes.length) {
				// Bölüme ait not yoksa başka bölümün notu gösterilmez; yalnızca bütün
				// bölümlerde aynı olan okul geneli not gösterilir.
				const all = uniq(s.programs.map(noteText), t => t);
				if (all.length === 1 && all[0]) {
					notes = [{ host: null, text: all[0] }];
					noteLabel = () => 'Okulun genel notu (bütün bölümler için, İEÜ listesinden, İngilizce)';
				}
			}
			const quotaUnit = (mine[0] || s.programs[0]).quotaUnit;
			const quota = G.facultyQuota[quotaUnit];
			const langs = Array.from(new Set(mine.flatMap(p => p.langs)));
			const progRow = (p, isMine) => `<tr class="${isMine ? 'is-mine' : ''}"><td>${esc(p.dept)}</td><td>${esc(p.host)}</td><td>${esc(lvl(p.level))}</td><td>${esc(p.langs.join(', '))}</td></tr>`;
			const site = s.web.find(w => w.ok);

			box.innerHTML = `
				<header class="erx-d-head erx-glow">
					<h3>${esc(s.name)}</h3>
					<p><span>${icon('location-dot')} ${esc(s.city)}, ${esc(s.country)}</span><span class="erx-code">${esc(s.code)}</span></p>
					<div class="erx-actions">
						${site ? `<a class="erx-btn erx-btn--ghost erx-ext" href="${esc(site.url)}" target="_blank" rel="noopener">Okulun sayfasını aç ${icon('arrow-up-right-from-square')}</a>` : `<span class="erx-dead">${icon('link-slash')} Okulun sayfası şu an açılmıyor</span>`}
						<button type="button" class="erx-btn erx-btn--ghost" data-share>Bu okulun bağlantısını kopyala</button>
					</div>
				<div class="erx-trip" aria-label="İzmir'den ${esc(s.city)} şehrine ${km(s.km)}">
					<div class="erx-trip__end">İzmir<small>başlangıç</small></div>
					<div class="erx-trip__track" aria-hidden="true">
						<svg viewBox="0 0 200 28" preserveAspectRatio="none"><path class="erx-trip__line" d="M4,20 Q100,-4 196,20"/></svg>
						<span class="erx-trip__pin erx-trip__pin--from"></span>
						<span class="erx-trip__pin erx-trip__pin--to"></span>
					</div>
					<div class="erx-trip__end">${esc(s.city)}<small>${km(s.km)}</small></div>
				</div>
				</header>
				${s.outermost ? `<p class="erx-warn"><strong>Avrupa kıtası dışında.</strong>Bu okul AB'nin en dış bölgelerinden birinde. Bu bölgeler için hibe kuralları farklı olabilir; İEÜ ilanında ayrı bir satır yok.</p>` : ''}

				<section class="erx-d-sec">
					<h4><span class="erx-q" aria-hidden="true">1</span>Hangi bölümle eşleşiyorum?</h4>
					<table class="erx-mini-table">
						<thead><tr><th>İEÜ bölümü</th><th>Okuldaki bölüm</th><th>Seviye</th><th>Dil</th></tr></thead>
						<tbody>${mine.map(p => progRow(p, true)).join('')}</tbody>
					</table>
					${others.length ? `<details class="erx-qa erx-qa--inline"><summary>Bu okulla anlaşması olan diğer İEÜ bölümleri (${others.length}) ${icon('chevron-down')}</summary>
						<table class="erx-mini-table"><tbody>${others.map(p => progRow(p, false)).join('')}</tbody></table></details>` : ''}
				</section>

				<section class="erx-d-sec">
					<h4><span class="erx-q" aria-hidden="true">2</span>Dersler hangi dilde?</h4>
					<div class="erx-langs">${langs.map(l => `<span class="erx-lang">${esc(l)}</span>`).join('')}</div>
					${notes.length
						? notes.map(n => `<blockquote class="erx-quote"><strong>${esc(noteLabel(n))}</strong>${esc(n.text)}</blockquote>`).join('')
						: '<p class="erx-muted">İEÜ listesinde bu bölüm için okulun ayrıca bir notu yok.</p>'}
				</section>

				<section class="erx-d-sec">
					<h4><span class="erx-q" aria-hidden="true">3</span>Ne kadar hibe alırım?</h4>
					<div class="erx-calc" data-calc>
						<div class="erx-calc__controls">
							<div class="erx-stepper" role="group" aria-label="Kaç ay">
								<button type="button" data-months="-1" aria-label="Bir ay azalt">−</button>
								<output data-months-out aria-live="polite">5 ay</output>
								<button type="button" data-months="1" aria-label="Bir ay artır">+</button>
							</div>
							<label class="erx-check"><input type="checkbox" data-green><span>Yeşil seyahat<small>Otobüs, tren veya paylaşımlı araçla gidip dönersen</small></span></label>
							<label class="erx-check"><input type="checkbox" data-fewer><span>İmkânı kısıtlı öğrenciyim<small>Belgelenirse aylık +${eur(G.fewerOpportunitiesEur)}</small></span></label>
						</div>
						<div class="erx-calc__total"><output data-total>0 €</output><small>toplam, tahmini</small></div>
						<div class="erx-calc__lines"><table class="erx-mini-table" data-lines></table></div>
					</div>
					<p class="erx-src" style="margin-top:10px">Kesin süre kabul mektubundaki tarihlere göre hesaplanır. Hibenin %70'i gitmeden, kalanı dönüşte ödenir. Kaynak: İEÜ başvuru ilanı.</p>
				</section>

				<section class="erx-d-sec">
					<div class="erx-d-sec__head"><h4><span class="erx-q" aria-hidden="true">4</span>Okula ücret öder miyim?</h4>${feeButton(s)}</div>
					<p><strong>Öğrenim ücreti ödemezsin.</strong> ${esc(s.name)} senden öğrenim, kayıt, sınav, laboratuvar ve kütüphane ücreti alamaz. Bu kural hibesiz gidenler için de geçerlidir.</p>
					<p>İEÜ'ye bu dönemin öğrenim ücretini her zamanki takvime göre ödersin.</p>
					${feeBlock(s)}
					<p class="erx-src">Kaynak: İEÜ başvuru ilanı, İEÜ Erasmus+ SSS belgesi, <a href="${esc(CHARTER_URL)}" target="_blank" rel="noopener">Erasmus+ öğrenci beyannamesi</a> (Avrupa Komisyonu).</p>
				</section>

				<section class="erx-d-sec">
					<h4><span class="erx-q" aria-hidden="true">5</span>Kontenjan kaç kişi?</h4>
					<p>Okulun kontenjanı TURNAPortal'da, başvuru döneminde e-Devlet ile girince görünür.${quota != null ? ` Bu dönem ${esc(quotaUnit)} için toplam hibe kontenjanı <strong>${quota} kişi</strong>.` : ''}</p>
					<div class="erx-actions"><a class="erx-btn erx-btn--ghost erx-ext" href="${esc(G.links.turnaportal)}" target="_blank" rel="noopener">TURNAPortal'ı aç ${icon('arrow-up-right-from-square')}</a></div>
				</section>

				${env.cid ? `<section class="erx-d-sec">
					<h4><span class="erx-q" aria-hidden="true">6</span>Forumda soran var mı?</h4>
					<p>Bu okula giden ya da gitmeyi düşünenlerle forumda konuş.</p>
					<div class="erx-actions">
						<a class="erx-btn erx-btn--ghost" href="${esc(forumSearchUrl(s))}"${env.preview ? ' data-preview-only' : ''}>${icon('comments')} Bu okulla ilgili konuları gör</a>
						<button type="button" class="erx-btn" data-new-topic>${icon('pen-to-square')} Bu okul için konu aç</button>
					</div>
				</section>` : ''}`;

			if (animate) {
				// Önde başlık kartı, arkasından sorular 40ms arayla: hepsi birden değil.
				Array.from(box.children).forEach((child, i) => anim(child, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: Math.min(i, 6) * 40 }));
			}
			if (animate) {
				animateTrip();
			}
			setupCalc(s);
		}

		// Ücret tutarı gösterilmez: öğrenci güncel bilgiyi okulun kendi sayfasından
		// okur. Bağlantı doğrudan ücretlerin anlatıldığı bölüme gider (web
		// sayfasında vurgulanan cümleye, PDF'te ilgili sayfaya).
		function feeBlock(s) {
			const fp = s.feePage;
			const trDate = d => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
			if (!fp && s.exchangePage) {
				return `<p class="erx-warn"><strong>Okul, sigorta, öğrenci birliği üyeliği veya ders malzemesi gibi küçük ücretleri kendi öğrencilerinden aldığı kadar senden de isteyebilir. Okulun sitesinde değişim öğrencilerine özel bir ücret bilgisi bulamadık.</strong></p>
					<p class="erx-src" style="margin-top:8px">Sağ üstteki bağlantı: okulun değişim öğrencisi sayfası · ${esc(trDate(s.exchangePage.checked))} tarihinde kontrol edildi. Emin olmak için okulun uluslararası ilişkiler ofisine sorabilirsin.</p>`;
			}
			if (!fp) {
				return '<p class="erx-warn"><strong>Okul, sigorta, öğrenci birliği üyeliği veya ders malzemesi gibi küçük ücretleri kendi öğrencilerinden aldığı kadar senden de isteyebilir. Bu okulun böyle bir ücreti olup olmadığı bilgisi bizde henüz yok.</strong></p>';
			}
			const scope = fp.scope === 'exchange' ? 'değişim öğrencileri için' : 'bütün öğrenciler için dönem katkı payı';
			// PDF bazı okullarda indirilir ve #page= kaybolur; hangi sayfaya bakılacağını ayrıca yaz.
			const page = fp.format === 'pdf' ? (/#page=(\d+)/.exec(fp.url) || [])[1] : '';
			const extra = [fp.format === 'pdf' ? (page ? `PDF, ${page}. sayfa` : 'PDF') : '', fp.lang === 'de' ? 'Almanca' : ''].filter(Boolean);
			const checked = trDate(fp.checked);
			return `<p class="erx-warn"><strong>Okul, sigorta, öğrenci birliği üyeliği veya ders malzemesi gibi küçük ücretleri kendi öğrencilerinden aldığı kadar senden de isteyebilir. Güncel tutarı okulun kendi sayfasından kontrol et.</strong></p>
					<p class="erx-src" style="margin-top:8px">Sağ üstteki bağlantı: okulun kendi sayfası, ${scope}${extra.length ? ' · ' + extra.join(' · ') : ''} · ${esc(checked)} tarihinde kontrol edildi.</p>`;
		}

		// Kartın sağ üstündeki küçük buton: okulun ücret bölümü, o yoksa okulun değişim öğrencisi sayfası.
		function feeButton(s) {
			const link = (url, label) => `<a class="erx-btn erx-btn--ghost erx-btn--sm erx-ext" href="${esc(url)}" target="_blank" rel="noopener">${label} ${icon('arrow-up-right-from-square')}</a>`;
			if (s.feePage) {
				return link(s.feePage.url, 'Okulun ücret bilgisini aç');
			}
			return s.exchangePage ? link(s.exchangePage.url, 'Okulun değişim sayfasını aç') : '';
		}

		// Noktalı hat soldan sağa açılır, varış noktası en sonda belirir.
		function animateTrip() {
			const box = $('[data-detail]');
			anim($('.erx-trip__track svg', box), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 520, delay: 80 });
			anim($('.erx-trip__pin--to', box), [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 240, delay: 560 });
		}

		function setupCalc(s) {
			let months = 5;
			let shown = 0;
			const root = $('[data-calc]');
			const out = $('[data-total]', root);
			const update = () => {
				const green = $('[data-green]', root).checked;
				const fewer = $('[data-fewer]', root).checked;
				const monthly = s.grant.monthly_eur;
				const travel = green ? s.travel.green_eur : s.travel.standard_eur;
				const extra = fewer ? months * G.fewerOpportunitiesEur : 0;
				const total = months * monthly + travel + extra;
				$('[data-months-out]', root).textContent = months + ' ay';
				$('[data-lines]', root).innerHTML = `
					<tr><td>${months} ay × ${eur(monthly)} (${esc(groupLabel(s.grant.group))})</td><td class="num">${eur(months * monthly)}</td></tr>
					<tr><td>Seyahat desteği, ${green ? 'yeşil' : 'standart'} (${esc(bandLabel(G.travelGrant.find(b => s.km >= b.min_km && (b.max_km == null || s.km <= b.max_km)) || G.travelGrant[G.travelGrant.length - 1]))})</td><td class="num">${eur(travel)}</td></tr>
					${fewer ? `<tr><td>İlave destek, ${months} ay × ${eur(G.fewerOpportunitiesEur)}</td><td class="num">${eur(extra)}</td></tr>` : ''}`;
				const from = shown;
				shown = total;
				if (reduceMotion) {
					out.textContent = eur(total);
					return;
				}
				const t0 = performance.now();
				const tick = (now) => {
					const t = Math.min(1, (now - t0) / 300);
					out.textContent = eur(Math.round(from + (total - from) * (1 - Math.pow(1 - t, 3))));
					if (t < 1) {
						requestAnimationFrame(tick);
					}
				};
				requestAnimationFrame(tick);
			};
			root.addEventListener('click', (ev) => {
				const b = ev.target.closest('[data-months]');
				if (b) {
					months = Math.min(12, Math.max(2, months + Number(b.dataset.months)));
					update();
				}
			});
			root.addEventListener('change', update);
			update();
		}

		// ------------------------------------------------------------ genel SSS

		// Sorular ieu-erasmus/faq modülünde; sunucu aynı HTML'i sayfaya baştan yazar.
		function renderFaq() {
			const { html, any } = faq.render(G, $('[data-faq-search]').value.trim());
			$('[data-faq]').innerHTML = html;
			$('[data-faq-empty]').hidden = any;
		}

		function renderSources() {
			const S = G.sources;
			$('[data-sources]').innerHTML = [
				[S.agreements_page, 'İEÜ Erasmus+ anlaşmaları ve kontenjanlar'],
				[S.announcement, 'Güncel başvuru ilanı'],
				[S.outgoing_page, 'İEÜ Erasmus+ öğrenim hareketliliği sayfası'],
				[S.faq_pdf, 'İEÜ Erasmus+ sık sorulan sorular (PDF)'],
				[S.eche_api, 'AB ECHE listesi (okulların şehir bilgisi)'],
				[CHARTER_URL, 'Erasmus+ öğrenci beyannamesi (Avrupa Komisyonu)'],
			].filter(([u]) => u).map(([u, t]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
		}

		// ------------------------------------------------------------ olaylar

		async function copyLink() {
			const url = location.href;
			try {
				await navigator.clipboard.writeText(url);
			} catch (e) {
				const ta = document.createElement('textarea');
				ta.value = url;
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				ta.remove();
			}
			toast('Bağlantı kopyalandı. Forumda paylaşınca aynı seçim açılır.');
		}

		function bind() {
			root.addEventListener('click', (ev) => {
				const modeBtn = ev.target.closest('[data-mode]');
				if (modeBtn) {
					setMode(modeBtn.dataset.mode);
					if (!modeBtn.closest('.erx-tabs')) {
						$('.erx-tabs').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
					}
					return;
				}
				const go = ev.target.closest('[data-go]');
				if (go) {
					goStep(Number(go.dataset.go));
					return;
				}
				if (ev.target.closest('[data-reset]')) {
					if (!locked()) {
						resetWizard();
					}
					return;
				}
				if (ev.target.closest('[data-share]')) {
					copyLink();
					return;
				}
				if (ev.target.closest('[data-preview-only]')) {
					ev.preventDefault();
					toast('Önizlemede çalışmaz; forumda Erasmus kategorisindeki konular açılır.');
					return;
				}
				if (ev.target.closest('[data-new-topic]')) {
					openNewTopic(SCHOOLS.get(state.school));
				}
			});

			$('.erx-tabs').addEventListener('keydown', (ev) => {
				if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') {
					return;
				}
				const next = state.mode === 'faq' ? 'find' : 'faq';
				setMode(next);
				$(`.erx-tabs [data-mode="${next}"]`).focus();
			});

			$('[data-levels]').addEventListener('click', (ev) => {
				const b = ev.target.closest('[data-level]');
				if (!b || b.dataset.level === state.level) {
					return;
				}
				state.level = b.dataset.level;
				renderLevels();
				renderDepts();
			});
			$('[data-dept-search]').addEventListener('input', renderDepts);
			$('[data-depts]').addEventListener('click', (ev) => {
				const b = ev.target.closest('[data-dept]');
				if (b) {
					selectDept(b.dataset.dept);
				}
			});

			$('.erx-table--countries thead').addEventListener('click', (ev) => {
				const b = ev.target.closest('[data-sort]');
				if (!b) {
					return;
				}
				const key = b.dataset.sort;
				const dir = state.sort.key === key ? (state.sort.dir === 'desc' ? 'asc' : 'desc') : (key === 'country' || key === 'km' ? 'asc' : 'desc');
				state.sort = { key, dir };
				renderCountries();
			});
			const tbody = $('[data-countries]');
			tbody.addEventListener('click', (ev) => {
				const tr = ev.target.closest('.erx-crow');
				if (tr) {
					selectCountry(tr.dataset.cc);
				}
			});
			tbody.addEventListener('pointerover', (ev) => {
				const tr = ev.target.closest('.erx-crow');
				hot(tr ? tr.dataset.cc : null);
			});
			tbody.addEventListener('pointerleave', () => hot(null));

			const unis = $('[data-unis]');
			unis.addEventListener('click', (ev) => {
				const b = ev.target.closest('[data-id]');
				if (b && b.dataset.id !== state.school && !locked()) {
					selectSchool(b.dataset.id);
				}
			});
			unis.addEventListener('pointerover', (ev) => {
				const b = ev.target.closest('[data-id]');
				hotSchool(b ? b.dataset.id : null);
			});
			unis.addEventListener('pointerleave', () => hotSchool(null));
			// Liste kutusunda yukarı/aşağı ok ile okul değiştirilir.
			unis.addEventListener('keydown', (ev) => {
				if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') {
					return;
				}
				ev.preventDefault();
				const items = $$('.erx-unis li:not([hidden]) button');
				const i = items.indexOf(document.activeElement);
				const next = items[Math.min(items.length - 1, Math.max(0, i + (ev.key === 'ArrowDown' ? 1 : -1)))];
				if (next) {
					next.focus();
					selectSchool(next.dataset.id);
				}
			});
			$('[data-unis-scroll]').addEventListener('scroll', updateUnisFade, { passive: true });
			$('[data-unis-search]').addEventListener('input', filterUnis);

			$('[data-faq-search]').addEventListener('input', renderFaq);
			const onResize = () => {
				moveInk();
				if (state.mode === 'find' && state.step > 1) {
					zoomTo(map.view);
				}
			};
			listen(window, 'resize', onResize);
			listen(document, 'erx:theme', detectTheme);
		}

		// Adresin #'i yoksa bölüm veya okul sayfasının açılış seçimi kullanılır
		// (sunucu data-start'a yazar; /erasmus'ta boştur).
		function restoreFromHash() {
			const hash = new URLSearchParams(location.hash.slice(1));
			const p = hash.has('mod') ? hash : new URLSearchParams(root.dataset.start || '');
			if (p.get('mod') !== 'bolum') {
				return;
			}
			state.mode = 'find';
			if (LEVELS.includes(p.get('seviye'))) {
				state.level = p.get('seviye');
			}
			const dept = p.get('bolum');
			if (dept && deptIndex.has(state.level + '|' + dept)) {
				state.dept = dept;
				const cc = p.get('ulke');
				if (cc && countryRows().some(r => r.cc === cc)) {
					state.cc = cc;
					const id = p.get('okul');
					const list = schoolsInCountry();
					state.school = list.some(s => s.id === id) ? id : list[0].id;
				}
			}
			const step = Number(p.get('adim')) || 1;
			state.step = [3, 2, 1].find(n => n <= step && reachable(n));
		}

		// ------------------------------------------------------------ başlat

		restoreFromHash();
		renderHead();
		renderLevels();
		renderDepts();
		buildMap();
		if (state.dept) {
			renderCountries();
		}
		if (state.cc) {
			renderUnis();
			renderDetail(SCHOOLS.get(state.school), false);
		}
		renderFaq();
		renderSources();
		renderStepper();
		bind();
		setMode(state.mode, { force: true });
		requestAnimationFrame(moveInk);

		root.dataset.state = 'ready';
	};

	return Page;
});
