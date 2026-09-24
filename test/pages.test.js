'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPayload } = require('../lib/view.js');
const pages = require('../lib/pages.js');
const faq = require('../static/lib/faq.js');
const map = require('../static/europe-map.json');
const sample = require('./fixtures/sample.json');

const payload = buildPayload({ ...sample, map, version: '1.0.0' });
const site = pages.buildSite(payload);

test('adresler Türkçe ve Avrupa harflerinden arınır', () => {
	assert.equal(pages.slugify('İşletme'), 'isletme');
	assert.equal(pages.slugify('Uluslararası Ticaret ve Finansman'), 'uluslararasi-ticaret-ve-finansman');
	assert.equal(pages.slugify('Freie Universität Berlin'), 'freie-universitat-berlin');
	assert.equal(pages.slugify('Politechnika Łódzka'), 'politechnika-lodzka');
	assert.equal(pages.slugify('"Ovidius" University – Constanța'), 'ovidius-university-constanta');
	assert.equal(pages.slugify('Große Schule'), 'grosse-schule');
});

test('her bölüm ve okulun tek bir adresi olur; lisans dışı seviye adreste yazar', () => {
	const slugs = site.depts.map(d => d.slug);
	assert.equal(new Set(slugs).size, slugs.length);
	assert.ok(site.deptBySlug.has('isletme'));
	assert.equal(site.deptBySlug.get('isletme-mba-yuksek-lisans').level, 'Yüksek Lisans');
	assert.equal(site.schoolSlug('DBERLIN01'), 'freie-universitat-berlin');
	assert.equal(site.schoolBySlug.get('freie-universitat-berlin').id, 'DBERLIN01');
});

test('aynı adlı iki okul Erasmus koduyla ayrılır', () => {
	const twin = { ...payload.schools[0], id: 'DBERLIN02', code: 'D BERLIN02' };
	const s = pages.buildSite({ ...payload, schools: [...payload.schools, twin] });
	assert.equal(s.schoolSlug('DBERLIN01'), 'freie-universitat-berlin-d-berlin01');
	assert.equal(s.schoolSlug('DBERLIN02'), 'freie-universitat-berlin-d-berlin02');
});

test('bölüm sayfası: başlık, açıklama, açılış seçimi ve okul bağlantıları', () => {
	const view = pages.page(site, 'dept', site.deptBySlug.get('isletme'), '/forum/erasmus');
	assert.equal(view.path, '/forum/erasmus/bolum/isletme');
	assert.equal(view.title, 'İEÜ İşletme Erasmus+ Anlaşmalı Okulları');
	assert.match(view.description, /İzmir Ekonomi Üniversitesi \(İEÜ\) İşletme lisans öğrencileri/);
	assert.match(view.description, /2 ülkede 2 okul/);
	assert.ok(!/["<>]/.test(view.description));
	const start = new URLSearchParams(view.start);
	assert.deepEqual([start.get('mod'), start.get('adim'), start.get('seviye'), start.get('bolum')], ['bolum', '2', 'Lisans', 'İşletme']);
	// Okula geçince aynı bölümle açılsın diye bağlantıda seçim de taşınır.
	assert.ok(view.html.includes('href="/forum/erasmus/okul/freie-universitat-berlin#mod=bolum&amp;adim=3&amp;seviye=Lisans'));
	assert.ok(view.html.includes('data-landing'));
});

test('okul sayfası: başlık, bölüm bağlantıları ve varsayılan bölüm', () => {
	const s = site.schoolBySlug.get('southwest-university-neofit-rilski');
	const view = pages.page(site, 'school', s, '/erasmus');
	assert.equal(view.title, 'Southwest University Neofit Rilski Erasmus+ Anlaşması – İEÜ');
	assert.match(view.description, /Anlaşmalı bölümler: .+ ve \d bölüm daha\./);
	// Önce lisans, sonra alfabetik ilk bölüm.
	const start = new URLSearchParams(view.start);
	assert.deepEqual([start.get('adim'), start.get('seviye'), start.get('bolum'), start.get('ulke'), start.get('okul')], ['3', 'Lisans', 'Fizyoterapi ve Rehabilitasyon', 'BG', 'BGBLAGOEV02']);
	assert.ok(view.html.includes('href="/erasmus/bolum/isletme-mba-yuksek-lisans"'));
	assert.ok(view.html.includes('Öğrenim ücreti ödemezsin'));
});

test('açılış seçimi tarayıcının # biçimiyle aynı sırada yazılır', () => {
	// erasmus.js writeHash aynı sırayı kullanır; eşitse adres temiz kalır.
	assert.equal(
		pages.startParams({ level: 'Yüksek Lisans', dept: 'İşletme (MBA)', cc: 'BG', school: 'X1', step: 3 }),
		'mod=bolum&adim=3&seviye=Y%C3%BCksek+Lisans&bolum=%C4%B0%C5%9Fletme+%28MBA%29&ulke=BG&okul=X1',
	);
});

test('ana sayfa genel başlığı korur, dizin her sayfada var', () => {
	const view = pages.page(site, 'main', null, '/erasmus');
	assert.equal(view.heading, pages.BASE_HEADING);
	assert.equal(view.start, '');
	assert.ok(!view.html.includes('data-landing'));
	assert.ok(view.html.includes('href="/erasmus/bolum/isletme"'));
	assert.ok(view.html.includes('href="/erasmus/okul/universite-de-la-reunion"'));
});

test('sitemap bütün bölüm ve okul adreslerini içerir', () => {
	const paths = pages.sitemapPaths(site, '/erasmus');
	assert.equal(paths.length, site.depts.length + site.schools.length);
	assert.ok(paths.includes('/erasmus/bolum/isletme'));
	assert.ok(paths.includes('/erasmus/okul/freie-universitat-berlin'));
});

test('sunucuda yazılan SSS soruları içerir, aramada eşleşmeyen grup çıkmaz', () => {
	const all = faq.render(payload.general, '');
	assert.ok(all.any);
	assert.ok(all.html.includes('Kimler başvurabilir?'));
	assert.equal((all.html.match(/erx-faq-group /g) || []).length, 4);
	const none = faq.render(payload.general, 'zzzz-yok');
	assert.equal(none.any, false);
	assert.equal(none.html, '');
});
