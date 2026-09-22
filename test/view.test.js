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
