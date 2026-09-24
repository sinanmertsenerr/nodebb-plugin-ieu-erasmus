'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TITLE, DESCRIPTION, metaTags, linkTags, sitemapEntry, sitemapEntries } = require('../lib/seo.js');

test('açıklamada okulun bütün yazılışları geçer', () => {
	for (const word of ['İzmir Ekonomi Üniversitesi', 'İEÜ', 'IEU', 'IUE', 'Izmir University of Economics', 'Erasmus+']) {
		assert.ok(DESCRIPTION.includes(word), word);
	}
	assert.ok(TITLE.includes('Erasmus+'));
});

test('meta etiketleri forumun genel açıklamasının yerine geçer', () => {
	const tags = metaTags();
	assert.equal(tags.find(t => t.name === 'description').content, DESCRIPTION);
	assert.equal(tags.find(t => t.property === 'og:title').content, TITLE);
	assert.ok(tags.every(t => typeof t.content === 'string'));
});

test('sitemap girdisi forumun alt yolunu korur', () => {
	assert.equal(sitemapEntry('').url, '/erasmus');
	assert.equal(sitemapEntry('/forum').url, '/forum/erasmus');
});

test('bölüm ve okul sayfaları kendi başlığını ve asıl adresini verir', () => {
	const tags = metaTags({ title: 'İEÜ İşletme Erasmus+ Anlaşmalı Okulları', description: 'x' });
	assert.equal(tags.find(t => t.property === 'og:title').content, 'İEÜ İşletme Erasmus+ Anlaşmalı Okulları');
	assert.equal(tags.find(t => t.name === 'description').content, 'x');
	assert.deepEqual(linkTags('https://forum.ieu.app/erasmus/bolum/isletme'), [{ rel: 'canonical', href: 'https://forum.ieu.app/erasmus/bolum/isletme' }]);
});

test('sitemap: bölüm sayfaları okul sayfalarından önde, alt yol korunur', () => {
	const [dept, school] = sitemapEntries('/forum', ['/erasmus/bolum/isletme', '/erasmus/okul/aalen-university']);
	assert.equal(dept.url, '/forum/erasmus/bolum/isletme');
	assert.ok(dept.priority > school.priority);
});
