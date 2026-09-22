'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isMeta, isGeneral, isSchools, fetchJson, joinUrl } = require('../lib/fetch.js');
const sample = require('./fixtures/sample.json');

const clone = v => JSON.parse(JSON.stringify(v));

test('gerçek veri seti doğrulamadan geçer', () => {
	assert.equal(isMeta(sample.meta), true);
	assert.equal(isGeneral(sample.general), true);
	assert.equal(isSchools(sample.schools), true);
});

test('eksik ya da bozuk alan bütün yanıtı reddeder', () => {
	const meta = clone(sample.meta);
	delete meta.content_hash;
	assert.equal(isMeta(meta), false);

	const general = clone(sample.general);
	general.announcement.monthly_grant = [];
	assert.equal(isGeneral(general), false);

	const schools = clone(sample.schools);
	schools[0].coords = ['39', 27];
	assert.equal(isSchools(schools), false);
	assert.equal(isSchools([]), false);
	assert.equal(isSchools([null]), false);
});

test('HTTP hatası istisnaya dönüşür', async () => {
	const fetchImpl = async () => ({ ok: false, status: 503 });
	await assert.rejects(fetchJson('https://x.test/meta.json', { fetchImpl }), /HTTP 503/);
});

test('zaman aşımında istek iptal edilir', async () => {
	const fetchImpl = (url, { signal }) => new Promise((resolve, reject) => {
		signal.addEventListener('abort', () => reject(new Error('aborted')));
	});
	await assert.rejects(fetchJson('https://x.test/meta.json', { fetchImpl, timeoutMs: 20 }), /aborted/);
});

test('adres birleştirme sondaki eğik çizgiyi yutar', () => {
	assert.equal(joinUrl('https://a.test/', 'meta.json'), 'https://a.test/meta.json');
	assert.equal(joinUrl('https://a.test', 'meta.json'), 'https://a.test/meta.json');
});
