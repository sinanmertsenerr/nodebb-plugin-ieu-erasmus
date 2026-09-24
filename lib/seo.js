'use strict';

// Arama motorunda nasıl görüneceği. Öğrenciler okulu farklı yazıyor
// (İEÜ, IEU, IUE, İzmir Ekonomi, Izmir University of Economics); Google
// "IUE"yi "IEU" ile aynı saymaz, bu yüzden hepsi açıklamada açıkça geçer.

const TITLE = 'İEÜ Erasmus+ Rehberi';
const DESCRIPTION = 'İzmir Ekonomi Üniversitesi (İEÜ, IEU, IUE) öğrencileri için Erasmus+ rehberi: ' +
	'bölümüne göre anlaşmalı üniversiteler, ülkeler, hibe hesaplama ve sık sorulan sorular. ' +
	'Erasmus+ guide for Izmir University of Economics students.';

// Bölüm ve okul sayfaları kendi başlığını ve açıklamasını verir.
function metaTags({ title = TITLE, description = DESCRIPTION } = {}) {
	return [
		{ name: 'description', content: description },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
	];
}

// Aynı içerik #'li adreslerle de açılır; Google'a asıl adres söylenir.
function linkTags(canonicalUrl) {
	return [{ rel: 'canonical', href: canonicalUrl }];
}

function sitemapEntry(relativePath) {
	return { url: `${relativePath || ''}/erasmus`, changefreq: 'weekly', priority: 0.6 };
}

// Bölüm sayfaları okul sayfalarından biraz önde: öğrenci önce bölümünü arar.
function sitemapEntries(relativePath, pagePaths) {
	return pagePaths.map(p => ({
		url: `${relativePath || ''}${p}`,
		changefreq: 'weekly',
		priority: p.startsWith('/erasmus/bolum/') ? 0.5 : 0.4,
	}));
}

module.exports = { TITLE, DESCRIPTION, metaTags, linkTags, sitemapEntry, sitemapEntries };
