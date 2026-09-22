'use strict';

// Türkçe metin yardımcıları. Hem tarayıcıda (NodeBB modülü: ieu-erasmus/text)
// hem testlerde (Node) çalışır. Kural: arayüzde Türkçe ek ve yazım hatası olmaz.

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		define('ieu-erasmus/text', [], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	}
}(function () {
	const nf = new Intl.NumberFormat('tr-TR');

	function esc(value) {
		return String(value == null ? '' : value)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}

	// Karakter karakter katlanır ki eşleşme konumu orijinal metne geri taşınabilsin.
	function fold(text) {
		return Array.from(String(text)).map(ch => ch.toLocaleLowerCase('tr').replace('ı', 'i')
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0) || ch).join('');
	}

	function highlight(text, query) {
		if (!query) {
			return esc(text);
		}
		const i = fold(text).indexOf(fold(query));
		if (i < 0) {
			return esc(text);
		}
		return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + query.length)) + '</mark>' + esc(text.slice(i + query.length));
	}

	// Türkçe ekler ünlü uyumuna ve sert ünsüze göre: Almanya'da, Portekiz'de,
	// Ocak'ta, Çek Cumhuriyeti'nde. Ülke ve ay adları veriden geldiği için sabit ek yazılamaz.
	function lastVowel(word) {
		const m = String(word).toLocaleLowerCase('tr').match(/[aeıioöuü](?=[^aeıioöuü]*$)/);
		return m ? m[0] : 'e';
	}

	function locative(word) {
		if (/Cumhuriyeti$/.test(word)) {
			return word + "'nde";
		}
		const hard = /[fstkçşhp]$/.test(String(word).toLocaleLowerCase('tr'));
		return word + "'" + (hard ? 't' : 'd') + ('aıou'.includes(lastVowel(word)) ? 'a' : 'e');
	}

	function dative(word) {
		const back = 'aıou'.includes(lastVowel(word));
		const vowelEnd = /[aeıioöuü]$/.test(String(word).toLocaleLowerCase('tr'));
		return word + "'" + (vowelEnd ? 'y' : '') + (back ? 'a' : 'e');
	}

	// İEÜ belgelerinden gelen metinlerdeki yazım hatalarını gösterirken düzeltir
	// (TDK yazımı: "yurt dışı", "ana dal", "hâlinde"; büyük harfle vurgu yok).
	const FIXES = [
		[/\u2019/g, "'"],
		[/Yurtdışı/g, 'Yurt dışı'],
		[/yurtdışı/g, 'yurt dışı'],
		[/Müdürülüğü/g, 'Müdürlüğü'],
		[/Uluslararası ilişkiler Ofisi/g, 'Uluslararası İlişkiler Ofisi'],
		[/hem Anadal hem Çift Anadal/g, 'hem ana dal hem çift ana dal'],
		[/\bONAYLI\b/g, 'onaylı'],
		[/ERASMUS\+/g, 'Erasmus+'],
		[/Eğitim Dili/g, 'eğitim dili'],
		[/TurnaPortal/g, 'TURNAPortal'],
		[/Online başvuru sistemi/g, 'Çevrim içi başvuru sistemi'],
		[/Çevrimiçi/g, 'Çevrim İçi'],
		[/ Sayılı /g, ' sayılı '],
		[/Kanunu Kapsamında/g, 'Kanunu kapsamında'],
		[/\bhalinde\b/g, 'hâlinde'],
		[/\bhalde\b/g, 'hâlde'],
		[/\bdahil\b/g, 'dâhil'],
		[/\bhalen\b/g, 'hâlen'],
		[/Uluslararası değişim programı/g, 'uluslararası değişim programı'],
		[/Büyükelçiliği \/ Konsolosluğu/g, 'büyükelçiliği veya konsolosluğu'],
		[/İEÜ Lisans programlarının/g, 'İEÜ lisans programlarının'],
		[/Genel Not Ortalaması/g, 'genel not ortalaması'],
		[/(\d)\s*-\s*(\d)/g, '$1\u2013$2'],
		[/(\d{4})\s*\u2013\s*/g, '$1 \u2013 '],
		[/\u00a0/g, ' '],
		[/\s{2,}/g, ' '],
	];
	const fix = text => FIXES.reduce((t, [re, to]) => t.replace(re, to), String(text == null ? '' : text)).trim();

	// Etiketler cümle düzeninde: "Başvuru İlan Süresi" -> "Başvuru ilan süresi".
	function sentence(text) {
		const t = fix(text);
		return t.charAt(0) + t.slice(1).toLocaleLowerCase('tr');
	}

	const CAL_LABEL = { 'Başvuru Sonuçlarının İlan Edilmesi': 'Sonuçların ilanı' };
	const calLabel = l => CAL_LABEL[l] || sentence(l);
	const lvl = l => (l === 'Yüksek Lisans' ? 'Yüksek lisans' : l);
	const gpa = n => n.toFixed(2).replace('.', ',');
	const groupLabel = g => String(g).replace(/\s*Grup Ülkeler$/, ' grup');

	// Anahtara göre tekilleştirir, ilk görüleni tutar.
	function uniq(list, key) {
		const seen = new Set();
		return list.filter((item) => {
			const k = key(item);
			if (seen.has(k)) {
				return false;
			}
			seen.add(k);
			return true;
		});
	}

	const eur = n => nf.format(n) + ' €';
	const km = n => nf.format(n) + ' km';
	const bandLabel = b => (b.max_km ? `${nf.format(b.min_km)}\u2013${nf.format(b.max_km)} km` : `${nf.format(b.min_km)} km ve üzeri`);

	function parseTrDates(text) {
		const months = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
		const out = [];
		const re = /(\d{1,2})(?:\s*[-\u2013]\s*(\d{1,2}))?\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/gi;
		let m;
		while ((m = re.exec(text))) {
			const month = months.indexOf(m[3].toLocaleLowerCase('tr'));
			out.push(new Date(+m[4], month, +m[1]));
			if (m[2]) {
				out.push(new Date(+m[4], month, +m[2]));
			}
		}
		return out;
	}

	return {
		nf, esc, fold, highlight, lastVowel, locative, dative, fix, sentence, calLabel,
		lvl, gpa, groupLabel, uniq, eur, km, bandLabel, parseTrDates,
	};
}));
