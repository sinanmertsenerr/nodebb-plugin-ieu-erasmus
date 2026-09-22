'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRecord, shouldCheck, isUpToDate, RETRY_COOLDOWN_MS } = require('../lib/store.js');

const T0 = 1_790_000_000_000;
const HOUR = 60 * 60 * 1000;

test('veritabanından gelen metin alanları sayıya çevrilir', () => {
	const r = parseRecord({ hash: 'h', json: '{}', checkedAt: String(T0), schools: '180' });
	assert.equal(r.checkedAt, T0);
	assert.equal(r.schools, 180);
	assert.equal(parseRecord(null), null);
});

test('önbellek boşsa hemen denenir', () => {
	assert.equal(shouldCheck({ record: null, nowMs: T0, refreshMs: HOUR, lastAttemptAt: 0 }), true);
});

test('süre dolmadan yeniden kontrol edilmez', () => {
	const record = { json: '{}', checkedAt: T0 };
	assert.equal(shouldCheck({ record, nowMs: T0 + HOUR - 1, refreshMs: HOUR, lastAttemptAt: 0 }), false);
	assert.equal(shouldCheck({ record, nowMs: T0 + HOUR, refreshMs: HOUR, lastAttemptAt: 0 }), true);
});

test('başarısız denemeden sonra bekleme süresi uygulanır', () => {
	assert.equal(shouldCheck({ record: null, nowMs: T0 + 1000, refreshMs: HOUR, lastAttemptAt: T0 }), false);
	assert.equal(shouldCheck({ record: null, nowMs: T0 + RETRY_COOLDOWN_MS, refreshMs: HOUR, lastAttemptAt: T0 }), true);
});

test('özet ve sürüm aynıysa büyük dosyalar indirilmez', () => {
	const record = { json: '{}', hash: 'abc', version: '1.0.0' };
	assert.equal(isUpToDate(record, 'abc', '1.0.0'), true);
	assert.equal(isUpToDate(record, 'abd', '1.0.0'), false);
	assert.equal(isUpToDate(record, 'abc', '1.1.0'), false);
	assert.equal(isUpToDate({ ...record, json: '' }, 'abc', '1.0.0'), false);
});
