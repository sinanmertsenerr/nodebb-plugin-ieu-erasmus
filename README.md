# nodebb-plugin-ieu-erasmus

İzmir Ekonomi Üniversitesi öğrencileri için [forum.ieu.app](https://forum.ieu.app)'e bir **Erasmus+ sayfası** (`/erasmus`) ekleyen NodeBB 4 plugin'i.

Sayfa iki şey yapar: İEÜ'nün Erasmus+ hakkında en çok sorulan sorularını tek yerde toplar ve öğrencinin **kendi bölümüne göre** hangi ülkedeki hangi üniversiteye gidebileceğini adım adım gösterir. Her okul için eğitim dili, bölüm eşleşmesi, tahmini hibe, ücret kuralları ve kontenjan bilgisi sayfanın içinde açılır.

> Bu plugin İEÜ'nün resmî bir ürünü değildir. Bilgiler İEÜ Uluslararası İlişkiler Müdürlüğü'nün yayımladığı anlaşma listesi, başvuru ilanı ve SSS belgesinden derlenir ve her gün kontrol edilir.

![Sık sorulan sorular](https://raw.githubusercontent.com/sinanmertsenerr/nodebb-plugin-ieu-erasmus/main/docs/sss.png)

## Neler var

**Sık sorulan sorular.** Sayfa SSS ile açılır. Sorular dört grupta: başvuru ve seçim, hibe ve ücretler, dersler ve denklik, vize ve hazırlık. Arama kutusu Türkçe karakterlere duyarsızdır ("isletme" yazınca "İşletme" bulunur). Her cevabın altında kaynağı yazar.

**Bölüm → ülke → üniversite.** "Bölüm ve üniversite özelinde" sekmesinde adımlar tek tek gelir:

1. **Bölüm:** Lisans / yüksek lisans / doktora seçilir, bölüm kartlarından biri seçilir. Her kartta o bölümün anlaşmalı okul ve ülke sayısı yazar.
2. **Ülke:** Anlaşmalı ülkeler tabloda (okul sayısı, aylık hibe, İzmir'e uzaklık; sıralanabilir) ve haritada görünür. Ülkeler İzmir'den dışa doğru dalga hâlinde renklenir.
3. **Üniversite:** Solda okul listesi (uzun listelerde kendi içinde kayar, okul veya şehir aranabilir), sağda seçili okulun bilgileri. Haritada İzmir'den okulun şehrine rota çizilir.

Üstteki 1-2-3 adımlarına veya başlıklara basınca o adıma dönülür. "Seçimleri sıfırla" hepsini temizler. Seçimler adrese yazılır; bağlantı forumda paylaşılınca aynı okul açılır.

**Telefonda ve PWA'da.** Her adımdan sonra sayfa yeni adımın başına kayar (bölüm seçince ülke listesine, ülke seçince okul listesine, okul seçince okul bilgisine); forumun yapışkan üst menü çubuğunun altında durur. Dar ekranda sekmeler ekranı ikiye böler, ülke tablosunda uzaklık sütunu gizlenir, arama kutuları iPhone'da sayfayı büyütmez, bildirimler ekranın alt çizgisinin üstünde kalır.

![Ülke seçimi ve harita](https://raw.githubusercontent.com/sinanmertsenerr/nodebb-plugin-ieu-erasmus/main/docs/ulke.png)

**Okul bilgileri** (hepsi seçili bölüme özeldir; başka bölümün notu gösterilmez):

- Hangi İEÜ bölümünün okuldaki hangi bölümle eşleştiği, seviye ve dil
- Eğitim dili ve okulun İEÜ listesindeki notu
- Hibe hesaplayıcı: ay sayısı, yeşil seyahat ve imkânı kısıtlı öğrenci desteğiyle tahmini toplam
- Ücret kuralı: gidilen okula öğrenim ücreti ödenmez; sigorta, öğrenci birliği gibi küçük ücretler için uyarı (kaynak: Erasmus+ öğrenci beyannamesi). Sağ üstteki buton okulun kendi ücret bölümünü açar (web sayfasında ilgili cümleye, PDF'te ilgili sayfaya gider). Okulun sitesinde ücret bilgisi yoksa okulun değişim öğrencisi sayfasını açar.
- Kontenjan: fakültenin bu dönemki hibe kontenjanı ve TURNAPortal bağlantısı
- Forum: "Bu okulla ilgili konuları gör" ve "Bu okul için konu aç" (Erasmus kategorisi seçildiyse)

![Üniversite bilgileri, koyu tema](https://raw.githubusercontent.com/sinanmertsenerr/nodebb-plugin-ieu-erasmus/main/docs/universite-koyu.png)

**Forumla uyum.** Renkler, yazı tipi ve yerleşim forumun kendisinden gelir (Harmony teması, simplex kırmızısı, Inter). Sayfa forumun açık/koyu temasını kendiliğinden algılar. Bütün stiller `.erx` kök öğesinin içindedir; forumun geri kalanına dokunmaz. Animasyonlar "hareketi azalt" tercihine uyar; klavye ve ekran okuyucuyla kullanılabilir.

**Arama motorları.** Sayfanın başlığı "İEÜ Erasmus+ Rehberi"; Google açıklamasında okulun bütün yazılışları geçer (İzmir Ekonomi Üniversitesi, İEÜ, IEU, IUE, Izmir University of Economics). Her bölümün ve okulun kendi sayfası vardır: `/erasmus/bolum/isletme`, `/erasmus/bolum/isletme-mba-yuksek-lisans`, `/erasmus/okul/aalen-university`. Her birinin kendi başlığı, açıklaması ve asıl adresi (canonical) olur, ayrı bir arama sonucu olarak çıkabilir. Sorular, bölümün okul listesi ve okulun bilgileri sunucuda HTML'e yazılır; arama motoru JavaScript'i beklemeden okur. Sayfa açılınca araç aynı bölüm veya okulla açılır. Bütün adresler forumun `sitemap.xml`'ine kendiliğinden eklenir; forumda ayrıca bir ayar gerekmez.

**Türkçe.** Ülke, ay ve şehir adlarına gelen ekler ünlü uyumuna göre üretilir (Portekiz'de, Ocak'ta, Çek Cumhuriyeti'nde). İEÜ belgelerindeki yazım hataları gösterilirken düzeltilir ("yurt dışı", "ana dal", ondalıkta virgül).

![Bölüm seçimi, koyu tema](https://raw.githubusercontent.com/sinanmertsenerr/nodebb-plugin-ieu-erasmus/main/docs/bolum-koyu.png)

## Veri nereden geliyor

```
İEÜ sitesi (anlaşma listesi, ilan, SSS) + AB ECHE listesi
        │  her gün 07:00'de otomatik derlenir, doğrulanır
        ▼
erasmus-data.sinansener.com   meta.json · general.json · schools.json
        │  plugin önce küçük meta.json'a bakar; içerik değiştiyse
        │  büyük dosyaları indirir, doğrular, önbelleğe yazar
        ▼
NodeBB (plugin)  →  /api/ieu-erasmus/data  →  /erasmus sayfası
```

- Sadece **en güncel dönem** gösterilir; yeni dönem yayımlanınca eskisinin yerine geçer.
- Veri sunucu tarafında çekilir; öğrencinin tarayıcısı veri sitesine gitmez.
- Gelen veri alan alan doğrulanır. Bozuk ya da eksik yanıt gelirse **eski veri yayında kalır**, hata yönetim panelinde görünür.
- Sayfanın verisi ETag ile önbelleklenir; değişmedikçe yeniden indirilmez.
- Okul bazında kontenjan açık kaynakta yok; yalnızca TURNAPortal'da (e-Devlet ile) görünür. Sayfa oraya yönlendirir.

## Kurulum

NodeBB 4 ve Node.js 22 veya üstü gerekir.

```bash
cd /path/to/nodebb
npm install nodebb-plugin-ieu-erasmus
./nodebb build
./nodebb restart
```

Sonra yönetim panelinde:

1. **Eklentiler:** "İEÜ Erasmus+" eklentisini etkinleştir, forumu yeniden derle ve başlat.
2. **Ayarlar → Navigasyon:** "Erasmus+" öğesini menüye ekle (örneğin "Bilgi" bölümüne, Akademik Takvim'in altına).
3. **Kategoriler:** Forum konuları için bir "Erasmus" kategorisi aç ve kimliğini (cid) not al.
4. **Eklentiler → Erasmus+:** Kategori kimliğini gir ve kaydet.

## Ayarlar

| Ayar | Varsayılan | Açıklama |
| --- | --- | --- |
| Veri adresi | `https://erasmus-data.sinansener.com` | `meta.json`, `general.json`, `schools.json` bu adreste olmalı. `*.pages.dev` adresleri Türkiye'de engelli olabilir; kendi alan adını kullan. |
| Kontrol aralığı | 60 dakika | Bu sürede bir `meta.json` kontrol edilir. |
| Erasmus kategorisi (cid) | boş | Boşsa okul sayfasındaki iki forum butonu gösterilmez. |

Yönetim sayfası ayrıca dönemi, okul sayısını, son kontrol ve indirme zamanını, varsa son hatayı gösterir. "Şimdi kontrol et" beklemeden yeniler.

## Geliştirme

```bash
npm install          # yalnızca geliştirme araçları (d3-geo, topojson-client)
npm test             # node:test ile 42 test
npm run preview      # canlı veriyle tek dosyalık önizleme: preview/dist/erasmus-plugin-tasarim.html
PAGE=bolum/isletme npm run preview   # bölüm veya okul sayfasının önizlemesi (PAGE=okul/aalen-university)
npm run build:map    # static/europe-map.json'u yeniden üretir (Natural Earth, world-atlas)
npm run build:icons  # templates/partials/ieu-erasmus/icons.tpl (Font Awesome Free)
```

Önizleme, forumu taklit eden bir kabuğun içinde plugin'in kendi şablonunu, CSS'ini ve JS'ini kullanır; forum kurmadan sayfayı görmek için yeterlidir. Adres satırına `?tema=dark` ekleyerek koyu temayı açabilirsin.

```
library.js               rotalar, önbellek, ayarlar, yönetim sayfası
lib/fetch.js             veri indirme ve alan alan doğrulama
lib/view.js              sayfaya giden sade veri, ülke kodları, harita noktaları
lib/projection.js        harita projeksiyonu (d3 ile birebir aynı sonuç, bağımlılıksız)
lib/store.js             önbellek kararları
lib/seo.js               sayfa başlığı, Google açıklaması, canonical, sitemap girdileri
lib/pages.js             bölüm ve okul sayfaları: adresler, başlıklar, sunucuda yazılan içerik
static/lib/erasmus.js    sayfa (forum/ieu-erasmus modülü)
static/lib/faq.js        genel sorular (sunucu ve tarayıcı ortak kullanır)
static/lib/text.js       Türkçe ekler, yazım düzeltmeleri, arama
static/css/erasmus.css   stiller (.erx içinde)
static/europe-map.json   önceden çizilmiş Avrupa haritası
templates/               sayfa, ikonlar ve yönetim şablonları
preview/                 önizleme kabuğu ve derleyicisi
```

## Katkı ve kaynaklar

- Veri: [İEÜ Erasmus+ anlaşmaları](https://www.ieu.edu.tr/international/tr/erasmus-anlasmalari-ve-kontenjanlar), İEÜ başvuru ilanı ve SSS belgesi, [AB ECHE listesi](https://eche-list.erasmuswithoutpaper.eu/), [Erasmus+ öğrenci beyannamesi](https://erasmus-plus.ec.europa.eu/resources-and-tools/erasmus-student-charter-0)
- Harita: [Natural Earth](https://www.naturalearthdata.com/) (kamu malı), [world-atlas](https://github.com/topojson/world-atlas) üzerinden
- İkonlar: [Font Awesome Free](https://fontawesome.com/license/free) (CC BY 4.0)

## Lisans

MIT
