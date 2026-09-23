'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPayload, countryCode } = require('../lib/view.js');
const map = require('../static/europe-map.json');
const sample = require('./fixtures/sample.json');

const payload = buildPayload({ ...sample, map, version: '1.0.0' });

test('ülke kodları anlaşma listesindeki adlardan çıkarılır', () => {
	assert.equal(countryCode('Germany'), 'DE');
	assert.equal(countryCode('The Netherlands'), 'NL');
	assert.equal(countryCode('Czech Republic'), 'CZ');
	assert.equal(countryCode('Macedonia'), 'MK');
	assert.equal(countryCode('Atlantis'), '');
});

test('okullar sade biçime çevrilir, notlar tek kopya tutulur', () => {
	assert.equal(payload.schools.length, 3);
	const berlin = payload.schools.find(s => s.id === 'DBERLIN01');
	assert.equal(berlin.cc, 'DE');
	assert.ok(berlin.programs.every(p => typeof p.note === 'number'));
	assert.equal(new Set(payload.notes).size, payload.notes.length);
});

test('harita dışındaki okulun noktası boş, diğerleri harita içinde', () => {
	assert.equal(payload.map.points.FSTDENI01, null);
	const [x, y] = payload.map.points.DBERLIN01;
	assert.ok(x > 0 && x < map.w && y > 0 && y < map.h);
});

test('genel bilgiler ve dönem aktarılır', () => {
	assert.equal(payload.meta.contentHash, sample.meta.content_hash);
	assert.ok(payload.general.monthlyGrant.length > 0);
	assert.ok(payload.general.travelGrant.length > 0);
	assert.equal(payload.version, '1.0.0');
});

test('ücret bağlantısı varsa aktarılır, yoksa boş kalır', () => {
	const withFee = JSON.parse(JSON.stringify(sample));
	withFee.schools[0].fee_page = { url: 'https://www.fu-berlin.de/en/x.html#:~:text=Semesterticket', scope: 'exchange', format: 'html', lang: 'en', checked: '2026-09-23' };
	const out = buildPayload({ ...withFee, map, version: '1.0.0' });
	assert.equal(out.schools[0].feePage.scope, 'exchange');
	assert.ok(out.schools[0].feePage.url.includes('#:~:text='));
	assert.equal(out.schools[1].feePage, null);
});

test('değişim sayfası varsa aktarılır, yoksa boş kalır', () => {
	const data = JSON.parse(JSON.stringify(sample));
	data.schools[1].exchange_page = { url: 'https://a.test/incoming', checked: '2026-09-23' };
	const out = buildPayload({ ...data, map, version: '1.0.0' });
	assert.deepEqual(out.schools[1].exchangePage, { url: 'https://a.test/incoming', checked: '2026-09-23' });
	assert.equal(out.schools[0].exchangePage, null);
});

test('okul sitesi yalnızca kesin kırıksa açılmıyor sayılır', () => {
	const data = JSON.parse(JSON.stringify(sample));
	const s = data.schools[0];
	s.websites = ['https://a.test/ok', 'https://a.test/blocked', 'https://a.test/timeout', 'https://a.test/gone', 'https://a.test/down'];
	s.link_status = { 'https://a.test/ok': 200, 'https://a.test/blocked': 403, 'https://a.test/timeout': 0, 'https://a.test/gone': 404, 'https://a.test/down': 503 };
	const out = buildPayload({ ...data, map, version: '1.0.0' });
	assert.deepEqual(out.schools[0].web.map(w => w.ok), [true, true, true, false, false]);
});
