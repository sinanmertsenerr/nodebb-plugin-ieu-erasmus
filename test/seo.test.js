'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TITLE, DESCRIPTION, metaTags, sitemapEntry } = require('../lib/seo.js');

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
