<!-- IMPORT partials/breadcrumbs.tpl -->
<!-- IMPORT partials/ieu-erasmus/icons.tpl -->

<div class="erx" data-erx-root data-state="loading" data-api="{dataUrl}" data-cid="{categoryId}">


<header class="erx-head">
	<div>
		<h1>Erasmus+ öğrenim hareketliliği</h1>
		<p class="erx-lede">İzmir Ekonomi Üniversitesi (İEÜ) öğrencilerinin Erasmus+ hakkında en çok sorduğu sorular ve bölümüne göre gidebileceğin okullar.</p>
		<p class="erx-meta" data-meta>Veriler yükleniyor…</p>
	</div>
	<div class="erx-notice" data-status role="status"></div>
</header>

<div class="erx-tabs" role="tablist" aria-label="Görünüm">
	<button type="button" role="tab" id="erx-tab-faq" aria-controls="erx-panel-faq" aria-selected="true" data-mode="faq">
		<svg class="i" aria-hidden="true"><use href="#erx-i-circle-info"/></svg>Genel sorular
	</button>
	<button type="button" role="tab" id="erx-tab-find" aria-controls="erx-panel-find" aria-selected="false" tabindex="-1" data-mode="find">
		<svg class="i" aria-hidden="true"><use href="#erx-i-building-columns"/></svg>Bölüm ve üniversite özelinde
	</button>
	<span class="erx-tabs__ink" aria-hidden="true"></span>
</div>

<section class="erx-view" id="erx-panel-faq" role="tabpanel" aria-labelledby="erx-tab-faq" data-view="faq">
	<div class="erx-faq__head">
		<h2>Sık sorulan sorular</h2>
		<label class="erx-search erx-search--sm">
			<span class="visually-hidden">Sorularda ara</span>
			<svg class="i" aria-hidden="true"><use href="#erx-i-magnifying-glass"/></svg>
			<input type="search" placeholder="Sorularda ara, ör. hibe" data-faq-search autocomplete="off">
		</label>
	</div>
	<div data-faq></div>
	<p class="erx-empty" data-faq-empty hidden>Bu kelimeyle eşleşen soru yok.</p>
	<div class="erx-callout erx-glow">
		<p><strong>Kendi bölümün için bakmak ister misin?</strong> Bölümünü seç; anlaşmalı ülkeleri, okulları, eğitim dilini ve tahmini hibeyi gör.</p>
		<button type="button" class="erx-btn" data-mode="find">Bölümümü seç<svg class="i" aria-hidden="true"><use href="#erx-i-chevron-right"/></svg></button>
	</div>
</section>

<section class="erx-view" id="erx-panel-find" role="tabpanel" aria-labelledby="erx-tab-find" data-view="find" hidden>
	<ol class="erx-steps" aria-label="Adımlar">
		<li><button type="button" class="erx-steps__btn" data-go="1">
			<span class="erx-steps__num"><b>1</b><svg class="i" aria-hidden="true"><use href="#erx-i-check"/></svg></span>
			<span class="erx-steps__txt"><span class="erx-steps__lbl">Bölüm</span><span class="erx-steps__val" data-val="1">Seçilmedi</span></span>
		</button></li>
		<li><button type="button" class="erx-steps__btn" data-go="2">
			<span class="erx-steps__num"><b>2</b><svg class="i" aria-hidden="true"><use href="#erx-i-check"/></svg></span>
			<span class="erx-steps__txt"><span class="erx-steps__lbl">Ülke</span><span class="erx-steps__val" data-val="2">Seçilmedi</span></span>
		</button></li>
		<li><button type="button" class="erx-steps__btn" data-go="3">
			<span class="erx-steps__num"><b>3</b><svg class="i" aria-hidden="true"><use href="#erx-i-check"/></svg></span>
			<span class="erx-steps__txt"><span class="erx-steps__lbl">Üniversite</span><span class="erx-steps__val" data-val="3">Seçilmedi</span></span>
		</button></li>
		<li class="erx-steps__track" aria-hidden="true"><span class="erx-steps__fill"></span></li>
	</ol>

	<div class="erx-stage" data-stage>
		<section class="erx-panel" data-panel="1" aria-labelledby="erx-p1">
			<div class="erx-panel__head">
				<div class="erx-panel__title"><h2 id="erx-p1" tabindex="-1">Bölümünü seç</h2><button type="button" class="erx-reset" data-reset hidden><svg class="i" aria-hidden="true"><use href="#erx-i-rotate-left"/></svg>Seçimleri sıfırla</button></div>
				<p class="erx-muted">Dönem: <strong data-term></strong> · sadece en güncel dönem gösterilir</p>
			</div>
			<div class="erx-toolbar">
				<div class="erx-seg" role="radiogroup" aria-label="Öğrenim seviyesi" data-levels></div>
				<label class="erx-search">
					<span class="visually-hidden">Bölüm ara</span>
					<svg class="i" aria-hidden="true"><use href="#erx-i-magnifying-glass"/></svg>
					<input type="search" placeholder="Bölüm ara, ör. ekonomi" data-dept-search autocomplete="off">
				</label>
			</div>
			<div class="erx-depts" data-depts></div>
		</section>

		<section class="erx-panel" data-panel="2" aria-labelledby="erx-p2" hidden>
			<div class="erx-panel__head">
				<button type="button" class="erx-back" data-go="1"><svg class="i" aria-hidden="true"><use href="#erx-i-arrow-left"/></svg>Bölümü değiştir</button>
				<div class="erx-panel__title"><h2 id="erx-p2" tabindex="-1">Ülke seç</h2><button type="button" class="erx-reset" data-reset hidden><svg class="i" aria-hidden="true"><use href="#erx-i-rotate-left"/></svg>Seçimleri sıfırla</button></div>
				<p class="erx-muted" data-p2-sub></p>
			</div>
			<div class="erx-split">
				<div>
					<div class="erx-card">
					<table class="erx-table erx-table--countries">
						<caption class="visually-hidden">Seçili bölüm için anlaşmalı ülkeler</caption>
						<thead>
							<tr>
								<th scope="col"><button type="button" data-sort="country">Ülke</button></th>
								<th scope="col" class="num"><button type="button" data-sort="count">Okul</button></th>
								<th scope="col" class="num"><button type="button" data-sort="grant">Aylık hibe</button></th>
								<th scope="col" class="num"><button type="button" data-sort="km">İzmir'e uzaklık</button></th>
							</tr>
						</thead>
						<tbody data-countries></tbody>
					</table>
					</div>
					<p class="erx-foot-note">Aylık hibe ülke grubuna göre değişir. Uzaklık, en yakın okulun şehrine kuş uçuşu mesafedir.</p>
				</div>
				<div data-map-slot="2"></div>
			</div>
		</section>

		<section class="erx-panel" data-panel="3" aria-labelledby="erx-p3" hidden>
			<div class="erx-panel__head">
				<button type="button" class="erx-back" data-go="2"><svg class="i" aria-hidden="true"><use href="#erx-i-arrow-left"/></svg>Ülkeyi değiştir</button>
				<div class="erx-panel__title"><h2 id="erx-p3" tabindex="-1">Üniversiteyi seç</h2><button type="button" class="erx-reset" data-reset hidden><svg class="i" aria-hidden="true"><use href="#erx-i-rotate-left"/></svg>Seçimleri sıfırla</button></div>
				<p class="erx-muted" data-p3-sub></p>
			</div>
			<div class="erx-uni">
				<div class="erx-uni__side">
					<div class="erx-unis-card erx-glow">
						<div class="erx-unis-card__head">
							<span>Okullar</span>
							<span class="erx-pill" data-unis-count></span>
						</div>
						<label class="erx-search erx-search--in" data-unis-search-wrap hidden>
							<span class="visually-hidden">Okul veya şehir ara</span>
							<svg class="i" aria-hidden="true"><use href="#erx-i-magnifying-glass"/></svg>
							<input type="search" placeholder="Okul veya şehir ara" data-unis-search autocomplete="off">
						</label>
						<div class="erx-unis-scroll" data-unis-scroll>
							<ul class="erx-unis" data-unis role="listbox" aria-label="Üniversiteler"></ul>
							<p class="erx-empty erx-unis-empty" data-unis-empty hidden>Bu adla eşleşen okul yok.</p>
						</div>
					</div>
					<div data-map-slot="3"></div>
				</div>
				<article class="erx-uni__detail" data-detail aria-live="polite"></article>
			</div>
		</section>
	</div>

	<figure class="erx-map" data-map-figure>
		<div class="erx-map__frame">
			<svg class="erx-map__svg" data-map role="img" aria-labelledby="erx-map-cap"></svg>
			<div class="erx-map__tip" data-tip hidden></div>
		</div>
		<div class="erx-legend" aria-hidden="true">
			<b>Okul sayısı</b>
			<span><i style="background:var(--map-1)"></i>1</span>
			<span><i style="background:var(--map-2)"></i>2–4</span>
			<span><i style="background:var(--map-3)"></i>5 ve üzeri</span>
			<span><i style="background:var(--fg)"></i>İzmir</span>
		</div>
		<figcaption id="erx-map-cap" data-map-cap></figcaption>
	</figure>
</section>

<footer class="erx-sources">
	<h2>Kaynaklar</h2>
	<ul data-sources></ul>
	<p class="erx-muted">Bu sayfa İEÜ'nün resmi sayfası değildir. Bilgiler İEÜ Uluslararası İlişkiler Müdürlüğü'nün yayımladığı anlaşma listesi, başvuru ilanı ve SSS belgesinden derlenir, her gün kontrol edilir. Kesin bilgi için ilana bak.</p>
</footer>


<div class="erx-toast" data-toast role="status" hidden></div>
</div>
