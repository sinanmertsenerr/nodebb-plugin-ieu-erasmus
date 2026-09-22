'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const t = require('../static/lib/text.js');

test('bulunma eki ünlü uyumuna ve sert ünsüze uyar', () => {
	const cases = {
		'Almanya': "Almanya'da", 'Portekiz': "Portekiz'de", 'Çek Cumhuriyeti': "Çek Cumhuriyeti'nde",
		'Hollanda': "Hollanda'da", 'Yunanistan': "Yunanistan'da", '21 Eylül': "21 Eylül'de",
		'15 Ocak': "15 Ocak'ta", '3 Mart': "3 Mart'ta", '4 Ağustos': "4 Ağustos'ta", '2 Aralık': "2 Aralık'ta",
	};
	for (const [word, expected] of Object.entries(cases)) {
		assert.equal(t.locative(word), expected);
	}
});

test('yönelme eki doğru', () => {
	assert.equal(t.dative('5 Ekim'), "5 Ekim'e");
	assert.equal(t.dative('15 Ocak'), "15 Ocak'a");
	assert.equal(t.dative('İzmir'), "İzmir'e");
	assert.equal(t.dative('Almanya'), "Almanya'ya");
});

test('kaynak metinlerdeki yazım hataları düzeltilir', () => {
	assert.equal(t.fix('Yurtdışında aldığınız dersler'), 'Yurt dışında aldığınız dersler');
	assert.equal(t.fix('Ofisi Müdürülüğü’nden'), "Ofisi Müdürlüğü'nden");
	assert.equal(t.fix('ONAYLI  belge'), 'onaylı belge');
	assert.equal(t.fix('7-21 Eylül 2026'), '7–21 Eylül 2026');
	assert.equal(t.fix('28 Eylül 2026– 5 Ekim 2026'), '28 Eylül 2026 – 5 Ekim 2026');
	assert.equal(t.fix('hem Anadal hem Çift Anadal'), 'hem ana dal hem çift ana dal');
});

test('biçimler: not, seviye, grup, mesafe', () => {
	assert.equal(t.gpa(2.2), '2,20');
	assert.equal(t.lvl('Yüksek Lisans'), 'Yüksek lisans');
	assert.equal(t.groupLabel('1. ve 2. Grup Ülkeler'), '1. ve 2. grup');
	assert.equal(t.bandLabel({ min_km: 2000, max_km: 2999 }), '2.000–2.999 km');
	assert.equal(t.bandLabel({ min_km: 8000, max_km: null }), '8.000 km ve üzeri');
	assert.equal(t.calLabel('Başvuru İlan Süresi'), 'Başvuru ilan süresi');
});

test('arama Türkçe karakterlere duyarsız', () => {
	assert.equal(t.fold('İŞLETME'), 'isletme');
	assert.ok(t.highlight('Uluslararası Ticaret', 'ticaret').includes('<mark>Ticaret</mark>'));
	assert.equal(t.highlight('<b>', ''), '&lt;b&gt;');
});

test('tarihler Türkçe metinden okunur', () => {
	const d = t.parseTrDates('7-21 Eylül 2026');
	assert.equal(d.length, 2);
	assert.equal(d[0].getDate(), 7);
	assert.equal(d[1].getDate(), 21);
	assert.equal(d[1].getMonth(), 8);
});

test('tekilleştirme ilk kaydı tutar', () => {
	assert.deepEqual(t.uniq([{ a: 1, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }], x => x.a), [{ a: 1, b: 1 }, { a: 2, b: 3 }]);
});
