'use strict';

// Arama motorunda nasıl görüneceği. Öğrenciler okulu farklı yazıyor
// (İEÜ, IEU, IUE, İzmir Ekonomi, Izmir University of Economics); Google
// "IUE"yi "IEU" ile aynı saymaz, bu yüzden hepsi açıklamada açıkça geçer.

const TITLE = 'İEÜ Erasmus+ Rehberi';
const DESCRIPTION = 'İzmir Ekonomi Üniversitesi (İEÜ, IEU, IUE) öğrencileri için Erasmus+ rehberi: ' +
	'bölümüne göre anlaşmalı üniversiteler, ülkeler, hibe hesaplama ve sık sorulan sorular. ' +
	'Erasmus+ guide for Izmir University of Economics students.';

function metaTags() {
	return [
		{ name: 'description', content: DESCRIPTION },
		{ property: 'og:title', content: TITLE },
		{ property: 'og:description', content: DESCRIPTION },
	];
}

function sitemapEntry(relativePath) {
	return { url: `${relativePath || ''}/erasmus`, changefreq: 'weekly', priority: 0.6 };
}

module.exports = { TITLE, DESCRIPTION, metaTags, sitemapEntry };
