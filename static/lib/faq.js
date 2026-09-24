'use strict';

// Genel sık sorulan sorular. Hem tarayıcıda (NodeBB modülü: ieu-erasmus/faq)
// hem sunucuda çalışır: sunucu aynı HTML'i sayfaya baştan yazar (arama
// motorları JavaScript beklemeden okur), tarayıcı arama kutusuna göre yeniden çizer.

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define('ieu-erasmus/faq', ['ieu-erasmus/text'], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('./text'));
	}
}(function (text) {
	const { esc, fold, highlight, fix, calLabel, gpa, groupLabel, eur, bandLabel } = text;

	const CHARTER_URL = 'https://erasmus-plus.ec.europa.eu/resources-and-tools/erasmus-student-charter-0';
	const SRC_ILAN = 'İEÜ başvuru ilanı';
	const SRC_SSS = 'İEÜ Erasmus+ SSS belgesi';

	const QUESTION_TEXT = {
		'Hibesiz Olarak Hareketlilikten Yararlanmak Mümkün mü?': 'Hibesiz gidebilir miyim?',
		'Gidilen Ünivesiteye Ücret Ödenir mi?': 'Gideceğim okula ücret öder miyim?',
		'Elenirsem Bir Sonraki Dönem Tekrar Başvurabilir miyim?': 'Elenirsem sonraki dönem tekrar başvurabilir miyim?',
		'Yurtdışında alınan derslere İEÜ’de denklik veriliyor mu?': 'Yurt dışında aldığım dersler İEÜ\'de sayılır mı?',
		'Gittiğim Üniversitede Hangi Dilde Ders Alacağım?': 'Gittiğim okulda hangi dilde ders alacağım?',
		'Erasmus+ Programına Katılırsam Okulum Uzar mı?': 'Erasmus\'a gidersem okulum uzar mı?',
		'ÇAP Öğrencileri Erasmus+ Programına Başvurabilir mi?': 'ÇAP öğrencileri başvurabilir mi?',
		'Nasıl Vize Alacağım?': 'Vizeyi nasıl alırım?',
	};

	const icon = name => `<svg class="i" aria-hidden="true"><use href="#erx-i-${name}"/></svg>`;

	// G: /api/ieu-erasmus/data yanıtındaki `general`.
	function groups(G) {
		const R = G.rules;
		const ieuFaq = Object.fromEntries(G.faq.map(f => [f.q, f.a]));
		const fromFaq = q => ({ q: QUESTION_TEXT[q] || q, a: `<p>${esc(fix(ieuFaq[q] || ''))}</p>`, src: SRC_SSS });
		const table = (head, rows) => `<table class="erx-mini-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === r.length - 1 && /€|kişi|puan/.test(c) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
		const link = (u, t) => `<a class="erx-ext" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ${icon('arrow-up-right-from-square')}</a>`;
		return [
			{
				title: 'Başvuru ve seçim',
				icon: 'file-lines',
				items: [
					{ q: 'Kimler başvurabilir?', src: SRC_ILAN, a: `<p>Lisans öğrencileri için genel not ortalaması en az ${gpa(G.minGpa.lisans)}, yüksek lisans ve doktora için en az ${gpa(G.minGpa.lisansustu)} olmalı (4 üzerinden).</p><p>${esc(fix(R.first_year))}</p><p>${esc(fix(R.language_doc))}</p>` },
					{ q: 'Başvuru takvimi nasıl?', src: SRC_ILAN, a: table(['Aşama', 'Tarih'], G.calendar.map(c => [calLabel(c.label), fix(c.value)])) },
					{ q: 'Seçim puanı nasıl hesaplanıyor?', src: SRC_ILAN, a: `<p>${esc(fix(R.selection))}</p>${table(['Ölçüt', 'Puan'], G.scoring.map(s => [fix(s.criterion), fix(s.points)]))}` },
					{ q: 'Okulların kontenjanını nereden görürüm?', src: SRC_ILAN, a: `<p>${esc(fix(R.school_quota))} ${link(G.links.turnaportal, 'TURNAPortal')}</p><p>Bu dönem birimlere göre hibe kontenjanı:</p>${table(['Birim', 'Kontenjan'], [...Object.entries(G.facultyQuota).map(([k, v]) => [k, v + ' kişi']), ['Toplam', G.facultyQuotaTotal + ' kişi']])}` },
					fromFaq('Elenirsem Bir Sonraki Dönem Tekrar Başvurabilir miyim?'),
					fromFaq('ÇAP Öğrencileri Erasmus+ Programına Başvurabilir mi?'),
				],
			},
			{
				title: 'Hibe ve ücretler',
				icon: 'euro-sign',
				items: [
					{ q: 'Aylık hibe ne kadar?', src: SRC_ILAN, a: table(['Grup', 'Ülkeler', 'Aylık'], G.monthlyGrant.map(g => [groupLabel(g.group), g.countries.join(', '), eur(g.eur)])) },
					{ q: 'Seyahat desteği ne kadar?', src: SRC_ILAN, a: `<p>İzmir ile okulun şehri arasındaki mesafeye göre tek sefer ödenir; gidişi ve dönüşü kapsar. Yeşil seyahat otobüs, tren veya paylaşımlı araçla yapılan yolculuktur.</p>${table(['Mesafe', 'Standart', 'Yeşil'], G.travelGrant.map(b => [bandLabel(b), eur(b.standard_eur), eur(b.green_eur)]))}` },
					{ q: 'İmkânı kısıtlı öğrencilere ek destek var mı?', src: SRC_ILAN, a: `<p>Evet. Durumunu belgeleyen öğrenciye aylık ${eur(G.fewerOpportunitiesEur)} ilave hibe verilir.</p>` },
					{ q: 'Hibe ne zaman ödenir?', src: SRC_ILAN, a: `<p>${esc(fix(R.payment))}</p><p>${esc(fix(R.two_thirds))}</p>` },
					{ q: 'İEÜ\'ye ücret öder miyim?', src: SRC_ILAN, a: `<p>${esc(fix(R.tuition))}</p>` },
					{ q: QUESTION_TEXT['Gidilen Ünivesiteye Ücret Ödenir mi?'], src: SRC_SSS + ', Erasmus+ öğrenci beyannamesi', a: `<p>${esc(fix(ieuFaq['Gidilen Ünivesiteye Ücret Ödenir mi?'] || ''))}</p><p>Gidilen okul öğrenim, kayıt, sınav, laboratuvar ve kütüphane ücreti alamaz. Bu kural hibesiz gidenler için de geçerlidir.</p><p class="erx-warn"><strong>Sigorta, öğrenci birliği üyeliği veya ders malzemesi gibi küçük ücretleri ise okul kendi öğrencilerinden aldığı kadar senden de isteyebilir. Gideceğin okulun sayfasından kontrol et.</strong></p>` },
					fromFaq('Hibesiz Olarak Hareketlilikten Yararlanmak Mümkün mü?'),
				],
			},
			{
				title: 'Dersler ve denklik',
				icon: 'graduation-cap',
				items: [
					fromFaq('Yurtdışında alınan derslere İEÜ’de denklik veriliyor mu?'),
					{ q: 'Kaç AKTS ders almalıyım?', src: SRC_ILAN, a: `<p>${esc(fix(R.ects))}</p>` },
					fromFaq('Gittiğim Üniversitede Hangi Dilde Ders Alacağım?'),
					fromFaq('Erasmus+ Programına Katılırsam Okulum Uzar mı?'),
				],
			},
			{
				title: 'Vize ve hazırlık',
				icon: 'plane-departure',
				items: [
					fromFaq('Nasıl Vize Alacağım?'),
					{ q: 'Konaklama ve diğer masraflar kime ait?', src: SRC_ILAN, a: `<p>${esc(fix(R.costs))}</p>` },
					{ q: 'Hangi belgeler işime yarar?', src: 'İEÜ Erasmus+ sayfası', a: `<ul>${Object.entries(G.links.documents).map(([t, u]) => `<li>${link(u, fix(t))}</li>`).join('')}<li>${link(G.links.department_coordinators, 'Bölüm Erasmus koordinatörleri')}</li></ul>` },
				],
			},
		];
	}

	// q: arama kutusundaki metin. `any` false ise hiçbir soru eşleşmedi.
	function render(G, q) {
		let any = false;
		const html = groups(G).map((g) => {
			const items = g.items.filter(it => !q || fold(it.q + ' ' + it.a.replace(/<[^>]+>/g, ' ')).includes(fold(q)));
			if (!items.length) {
				return '';
			}
			any = true;
			return `<section class="erx-faq-group erx-glow">
				<header class="erx-faq-group__head">
					<span class="erx-faq-group__icon" aria-hidden="true">${icon(g.icon)}</span>
					<h3>${esc(g.title)}</h3>
					<span class="erx-pill"><b>${items.length}</b> soru</span>
				</header>
				<div class="erx-faq-group__list">${items.map(it => `
				<details class="erx-qa"${q ? ' open' : ''}>
					<summary>${highlight(it.q, q)} ${icon('chevron-down')}</summary>
					<div class="erx-qa__a">${it.a}<p class="erx-src">Kaynak: ${esc(it.src)}</p></div>
				</details>`).join('')}</div></section>`;
		}).join('');
		return { html, any };
	}

	return { CHARTER_URL, groups, render };
}));
