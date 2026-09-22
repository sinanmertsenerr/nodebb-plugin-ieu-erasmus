'use strict';

// Önbellek kararları (saf fonksiyonlar; veritabanı library.js'de).

const RETRY_COOLDOWN_MS = 5 * 60 * 1000;

// Veritabanı alanları metin olarak döner; sayıları geri çevir.
function parseRecord(raw) {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
	return {
		hash: raw.hash || '',
		version: raw.version || '',
		json: raw.json || '',
		term: raw.term || '',
		generatedAt: raw.generatedAt || '',
		schools: num(raw.schools),
		checkedAt: num(raw.checkedAt),
		fetchedAt: num(raw.fetchedAt),
		error: raw.error || '',
		errorAt: num(raw.errorAt),
	};
}

// `checkedAt` yalnızca başarılı kontrolde ilerler; tek başına yetmez: hiç
// başarılı çekim yokken her sayfa gösterimi yeniden deneme tetiklerdi.
// `lastAttemptAt` başarısız denemeleri de sayar.
function shouldCheck({ record, nowMs, refreshMs, lastAttemptAt, cooldownMs = RETRY_COOLDOWN_MS }) {
	if (nowMs - (lastAttemptAt || 0) < cooldownMs) {
		return false;
	}
	if (!record || !record.json) {
		return true;
	}
	return nowMs - record.checkedAt >= refreshMs;
}

// meta.json'daki içerik özeti aynıysa ve plugin sürümü değişmediyse
// büyük dosyaları yeniden indirmeye gerek yok.
function isUpToDate(record, metaHash, version) {
	return Boolean(record && record.json && record.hash === metaHash && record.version === version);
}

module.exports = { parseRecord, shouldCheck, isUpToDate, RETRY_COOLDOWN_MS };
