<div class="acp-page-container">
	<div class="row">
		<div class="col-12 col-lg-7">
			<form role="form" class="ieu-erasmus-settings">
				<h5 class="fw-bold mb-3">Ayarlar</h5>
				<div class="mb-3">
					<label class="form-label" for="dataUrl">Veri adresi</label>
					<input type="url" id="dataUrl" name="dataUrl" class="form-control" placeholder="https://erasmus-data.sinansener.com" />
					<p class="form-text">meta.json, general.json ve schools.json bu adreste olmalı. Boş bırakılırsa varsayılan adres kullanılır. <code>*.pages.dev</code> adresleri Türkiye'de engelli olabilir; kendi alan adını kullan.</p>
				</div>
				<div class="mb-3">
					<label class="form-label" for="refreshMinutes">Kontrol aralığı (dakika)</label>
					<input type="number" id="refreshMinutes" name="refreshMinutes" class="form-control" min="5" placeholder="60" />
					<p class="form-text">Önce yalnızca küçük meta.json'a bakılır; veri değişmediyse büyük dosyalar indirilmez.</p>
				</div>
				<div class="mb-3">
					<label class="form-label" for="categoryId">Erasmus kategorisinin kimliği (cid)</label>
					<input type="text" id="categoryId" name="categoryId" class="form-control" inputmode="numeric" placeholder="örneğin 42" />
					<p class="form-text">Okul sayfasındaki "Bu okulla ilgili konuları gör" ve "Bu okul için konu aç" bu kategoriyi kullanır. Boş bırakılırsa bu iki buton gösterilmez.</p>
				</div>
			</form>
			<button id="save" class="btn btn-primary">Kaydet</button>
		</div>
		<div class="col-12 col-lg-5">
			<div class="card">
				<div class="card-body">
					<h5 class="fw-bold mb-3">Veri durumu</h5>
					<dl class="row mb-3 small">
						<dt class="col-5">Dönem</dt><dd class="col-7">{status.term}</dd>
						<dt class="col-5">Okul sayısı</dt><dd class="col-7">{status.schools}</dd>
						<dt class="col-5">Veri üretimi</dt><dd class="col-7">{status.generatedAt}</dd>
						<dt class="col-5">Son kontrol</dt><dd class="col-7">{status.checkedAt}</dd>
						<dt class="col-5">Son indirme</dt><dd class="col-7">{status.fetchedAt}</dd>
					</dl>
					{{{ if status.error }}}<div class="alert alert-warning small">Son deneme başarısız: {status.error}. Yayındaki veri değişmedi.</div>{{{ end }}}
					<button id="refresh" class="btn btn-outline-secondary btn-sm">Şimdi kontrol et</button>
					<p class="form-text mt-3 mb-0">Menüye eklemek için: Ayarlar → Navigasyon → "Erasmus+".</p>
				</div>
			</div>
		</div>
	</div>
</div>
