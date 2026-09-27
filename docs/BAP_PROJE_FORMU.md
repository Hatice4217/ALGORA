# BİLİMSEL ARAŞTIRMA PROJELERİ KOORDİNATÖRLÜĞÜ
# PROJE ÖNERİSİ BAŞVURU FORMU

> **Not (kayıt):** Bu belge 27 Eylül 2026'da sohbetten `algora/docs/` altına kaydedilmiştir. Proje hedef kitlesi formda açıkça **yalnızca YKS (TYT/AYT)** olarak sınırlandırılmıştır (bkz. Bölüm 5.5) — LGS'nin üründen tamamen kaldırılması kararının kaynağı budur.

---

## ALGORA: Yapay Zekâ Destekli, Kişiselleştirilmiş ve Sokratik Metot Tabanlı Sınav Hazırlık Platformu

- **Proje Yürütücüsü:** Hatice Şarlak
- **Danışman:** Mehmet Karayel
- **Kurum:** Karamanoğlu Mehmetbey Üniversitesi — Yazılım Geliştirme
- **Yıl:** 2026

---

## 1. GENEL BİLGİ

### Özet

Türkiye'de her yıl yaklaşık iki buçuk milyon öğrenci Yükseköğretim Kurumları Sınavı'na (YKS) hazırlanmaktadır. Mevcut eğitim sistemimizde öğrenciler büyük ölçüde standartlaştırılmış basılı kaynaklara, kalabalık sınıflara sahip dershanelere, Millî Eğitim Bakanlığı'nın ücretsiz MEBİ platformuna veya herkese aynı içeriği sunan genel amaçlı dijital platformlara bağımlı kalmaktadır. Bu durum, öğrencinin bireysel bilgi düzeyine, anlama hızına ve eksik olduğu konu başlıklarına anlık olarak uyum sağlayan kişiselleştirilmiş eğitim fırsatını sınırlamaktadır.

Bu proje kapsamında, bir öğrencinin ancak yüksek maliyetli birebir özel ders aldığında erişebileceği düzeyde anlık uyum sağlayan bir öğretmen modelini, yapay zekâ destekli bir yazılım mimarisiyle dijitalleştirmek ve düşük maliyetle erişilebilir kılmak amaçlanmaktadır. ALGORA adı verilen bu platform; öğrencinin performans geçmişine dayanarak dinamik zorluk seviyesi ayarlanmış, Türkiye (MEB/ÖSYM) müfredatına uyumlu sorular üretecek, öğrenciyi doğrudan cevaba değil çözüme yönlendiren Sokratik bir ipucu mekanizması kullanacak ve sınav stresini yönetmesine yardımcı olacak bir modülle desteklenecektir. Sistemin mimarisi; istemci isteğinin kredi kontrolünden geçirilip yapay zekâ API'sine yönlendirilmesi, üretilen içeriğin katı bir JSON şeması ile doğrulanması ve hatalı üretimlerin öğrenciye hiç gösterilmeden otomatik olarak elenmesi ilkesine dayanmaktadır (bkz. Bölüm 5).

Proje, geliştirilecek bu sistemin üniversite etik kurulu onayı alınarak, gönüllü bir öğrenci grubuyla saha testinin yapılmasını ve yapay zekânın akademik başarıya olan katkısının ön test-son test karşılaştırmasıyla somut verilerle ölçülmesini hedeflemektedir. Yapılan literatür taraması, bireyselleştirilmiş öğretimin etkisinin uzun süredir bilindiğini, ancak yapay zekâ destekli Sokratik sistemlerde bu etkinin büyüklüğünün öğrenci katılımına sıkı sıkıya bağlı olduğunu göstermektedir; bu proje, bu tartışmaya Türkiye ve YKS bağlamında, kanıta dayalı bir katkı sunmayı amaçlamaktadır.

**Anahtar Kelimeler:** Yapay zekâ destekli eğitim, kişiselleştirilmiş öğrenme, Sokratik yöntem, büyük dil modeli halüsinasyonu, YKS sınav hazırlığı

### Abstract

Every year, around 2.5 million students in Turkey prepare for the university entrance exam (YKS). Currently, students mostly rely on standard printed books, crowded course centers, or generic digital platforms that show the exact same content to everyone. This makes it very hard to get a personalized education that adapts to a student's own learning pace and specific weaknesses.

This project aims to use artificial intelligence to build a low-cost, digital version of a private tutor. The platform, named ALGORA, will generate questions based on the national (MEB/ÖSYM) curriculum. The difficulty of these questions will change dynamically depending on the student's past performance. Instead of just giving the correct answer, ALGORA will use a Socratic hint system to guide students to solve the problem themselves. It will also include a focus module to help them manage exam stress. On the technical side, the system checks the user's daily credit, sends a request to the AI API, and strictly validates the AI's response using a JSON schema. If the AI produces a flawed output, the system automatically deletes it and tries again without showing it to the user.

After getting ethics committee approval, we plan to test this system with a group of volunteer students. By comparing their pre-test and post-test scores, we aim to measure how much this AI platform actually improves academic success. While personalized tutoring is known to be effective, the success of AI-supported Socratic systems heavily depends on student engagement. This project intends to show real-world, evidence-based results of this approach for YKS students in Turkey.

**Keywords:** AI-supported education, personalized learning, Socratic method, large language model hallucination, YKS exam preparation

---

## 2. GİRİŞ

Eğitim teknolojileri literatüründe, bireye özel geri bildirimin kalabalık grup eğitimlerine kıyasla öğrenme başarısını belirgin biçimde artırdığı uzun süredir bilinmektedir. Bloom'un (1984) "2 Sigma Problemi" olarak bilinen meşhur çalışması, bire bir özel ders alan öğrencilerin çok daha başarılı olabildiğini kanıtlamıştır [1]. Türkiye'ye özgü bir örnekte, Kayaaslan ve Çakır'ın (2017) yürüttüğü deneysel çalışmada da kişiselleştirilmiş sorularla çalışan öğrenci grubunun başarısında anlamlı bir artış görülmüştür [2]. Bu durum, özel dersin yüksek maliyetine karşı dijital sistemlerin nasıl daha ucuz ve etkili bir alternatif olabileceği sorusunu doğurmaktadır.

Türkiye pazarında ve küresel ölçekte bu boşluğu doldurmaya çalışan çeşitli platformlar bulunmaktadır. Millî Eğitim Bakanlığı'nın MEBİ platformundan bugüne kadar yüz binlerce öğrenci yararlanmıştır [3]; platformun en büyük avantajı ücretsiz olması, en büyük zayıflığı ise sınırlı kişiselleştirme derinliği ve Sokratik yönlendirme gibi modern pedagojik yaklaşımlardan yoksun olmasıdır. Kunduz gibi popüler uygulamalar ise öğrencilerin sorularını çözmektedir [4]; ancak bu model, binlerce insan eğitmene dayandığından 7/24 anlık ve sınırsız kişiselleştirilmiş soru üretimini yapısal olarak sağlayamamaktadır. Photomath ise dünya genelinde milyonlarca kullanıcıya ulaşmıştır, ancak literatür bu tür "doğrudan cevap verme" yaklaşımlarının öğrencinin analitik düşünme becerisini zayıflatabileceğine dikkat çekmektedir [5].

Bu projeye en yakın küresel örnek, Sokratik yöntemi kullanan Khan Academy'nin Khanmigo aracıdır. Oreopoulos ve Low'un (2026) Khanmigo üzerinde yürüttüğü güncel bir saha deneyi, yapay zekânın akademik başarıya katkı sağlayabildiğini, ancak öğrencilerin çoğu zaman yapay zekâ doğrudan cevap vermeyi reddedip soru sorduğunda aracı kullanmayı bıraktığını göstermiştir [6]. Bu bulgu, ALGORA projesi açısından kritik bir uyarıdır: Sokratik yöntemin "kâğıt üzerinde" doğru bir yaklaşım olması tek başına yeterli değildir; etkili olabilmesi için öğrencinin sistemde tutulması şarttır. Bu nedenle ALGORA, öğrenciyi tamamen çözümsüz bırakmayan kademeli bir ipucu mekanizması ile bu katılım sorununu en baştan tasarıma dâhil etmeyi planlamaktadır.

Büyük dil modellerinin (LLM) eğitimde kullanımındaki en kritik teknik risk ise gerçek görünen ama yanlış bilgi üretmesidir (halüsinasyon). Güncel bir araştırma, GPT-3.5 ve GPT-4'ü üniversite ders kitaplarından alınan fizik, kimya ve matematik sorularıyla test ettiğinde ciddi hata oranlarıyla karşılaştığını aktarmaktadır [7]. Bu bulgu, halüsinasyon riskinin "en iyi yapay zeka modelini seçerek" değil, sistem mimarisine yazılacak bağımsız bir doğrulama katmanıyla azaltılması gerektiğini ortaya koymaktadır — ki bu proje tam olarak bu yazılımsal ihtiyaca yanıt vermek üzere tasarlanmıştır.

---

## 3. ÖZGÜN DEĞER

ALGORA projesinin özgün değeri, Bölüm 2'de aktarılan literatür ve pazar boşluklarını, denetlenebilir bir teknik mimariyle kapatmasında yatmaktadır. Projenin literatürdeki ve piyasadaki mevcut çözümlerden ayrıştığı üç temel nokta şöyledir:

### A. Format Dayatmalı Doğrulama ile Halüsinasyon Riskinin Azaltılması

Piyasadaki genel amaçlı yapay zekâların aksine, ALGORA yapay zekâyı serbest bir sohbet motoru olarak değil, katı kurallara bağlı bir üretim motoru olarak kullanır. Sistem, yapay zekâdan rastgele bir metin kabul etmez; ona mutlaka bir soru metni, dört seçenek, bir doğru cevap ve adım adım çözümden oluşan matematiksel bir JSON şablonu dayatır. Yapay zekâ müfredat dışına çıkarsa veya formatı bozarsa, bu içerik öğrenciye hiç gösterilmeden arka planda silinir ve süreç otomatik olarak tekrar edilir. Bu katman, Bölüm 2'de aktarılan halüsinasyon riskine karşı literatürde önerilen genel yaklaşımların (örn. geri getirme destekli üretim [8]) somut, uygulanabilir bir varyantıdır.

### B. Ödünsüz Değil, Kademeli Sokratik Yöntem

Khanmigo örneğinin gösterdiği katılım sorununa karşı, ALGORA öğrenciyi asla doğrudan cevaba değil çözüme yönlendiren, ancak öğrenciyi tamamen yalnız bırakmayan kademeli bir ipucu mekanizması kullanır (bkz. Bölüm 5.3). Bu tasarım tercihi, Sokratik ilkeden ödün vermeden, literatürde gözlemlenen terk etme riskini azaltmayı hedeflemektedir.

### C. Rekabetçi Değil, Odaklanmayı Destekleyen Motivasyon Tasarımı

Piyasadaki rakiplerin sıkça kullandığı yarışmacı oyunlaştırma (haftalık sıralama tabloları, rozetler) yaklaşımının aksine, ALGORA'nın sadeleştirilmiş çalışma arayüzü düşük uyarıcılı, odaklanmayı destekleyen bir tasarım kullanır. Bu tercih, oyunlaştırmanın öğrenme kazanımı sağlarken aynı zamanda kaygıyı artırabildiğini gösteren deneysel bulgularla [9] temellendirilmektedir.

---

## 4. KAPSAM

Proje kapsamında, öğrencinin geçmiş performansına göre dinamik olarak zorluk seviyesi ayarlanan, JSON şablonuyla denetlenen ve Sokratik yöntemle yönlendirilen bir soru üretim ve takip sistemi tasarlanacak ve üretilecektir. Sistem; kimlik doğrulama, kişiselleştirilmiş soru üretim motoru, ilerleme takip paneli, abonelik/kota yönetimi ve odaklanma desteği modüllerinden oluşan uçtan uca bir yazılım mimarisi olarak geliştirilecektir.

Bu proje, yapay zekâ destekli eğitim teknolojileri alanında, MEB müfredatına özel olarak uyarlanmış, denetlenebilir bir doğrulama katmanıyla çalışan yerli bir dijital altyapı sunarak, bu alandaki dışa bağımlılığın azaltılmasına katkı sağlamayı hedeflemektedir.

Proje ile birlikte şu kazanımlar amaçlanmaktadır:

- Bu proje kapsamında elde edilen saha testi sonuçlarının ulusal veya uluslararası bir akademik dergide/kongrede yayımlanması,
- Geliştirilen soru üretim ve doğrulama mimarisinin özgün bir yazılım yöntemi olarak belgelenmesi ve uygunluğu değerlendirildiği takdirde telif/patent başvurusunda bulunulması,
- Türkçe müfredata özgü, halüsinasyon riskini azaltmayı hedefleyen bir soru üretim mimarisinin literatüre ve yerli EdTech ekosistemine kazandırılması,
- Özel ders almaya maddi imkânı yetmeyen öğrenciler için düşük maliyetli, fırsat eşitliğini destekleyen ölçeklenebilir bir dijital sınav hazırlık alternatifinin ortaya konması.

Proje sonunda, yukarıda tanımlanan mimariye sahip, saha testinden geçirilmiş ve bulguları raporlanmış kullanıma hazır bir dijital eğitim platformu üretilmiş olacaktır.

---

## 5. YÖNTEM

### 5.1. Sistem Mimarisi ve Akış Şeması

Sistemin uçtan uca çalışma mantığı, öğrenci isteğinden veritabanı yazımına kadar aşağıdaki adımlarla işlemektedir. Bu akış, projenin "Atomik Kredi" ve "Sıfır Hata" ilkelerinin teknik karşılığıdır:

```
▸ 1. Öğrenci İsteği — Öğrenci arayüzden yeni soru talep eder
        ↓
▸ 2. Middleware Kredi Kontrolü — Sistem, API çağrısından önce öğrencinin
   günlük kotasından krediyi düşer (atomik işlem)
        ↓
▸ 3. Bağlam Oluşturma — Önceki Soru Hafızası ile öğrencinin geçmiş
   sorularının tekrarını önleyecek bir istek (prompt) kurgulanır
        ↓
▸ 4. Yapay Zekâ API Çağrısı — İstek, Bölüm 5.2'deki parametrelerle
   Gemini API'sine gönderilir
        ↓
▸ 5. JSON Doğrulama Katmanı — Dönen yanıt şema kontrolünden geçirilir
        ↓
▸ 6a. Şema geçerliyse → Veritabanı Yazımı ve öğrenciye gösterim
▸ 6b. Şema geçersizse → Otomatik Silme ve 4. adıma dönerek yeniden deneme
        ↓
▸ 7. Hata Durumunda Kredi İadesi — API hatası veya zaman aşımı durumunda
   2. adımda düşülen kredi öğrenciye anında iade edilir
```

### 5.2. Yapay Zekâ Soru Üretim Parametreleri

Soru üretim motorunda kullanılan API parametreleri ve doğrulama kuralları aşağıda tablolanmıştır. Sistemde iki ayrı API çağrı yapılandırması bulunmaktadır: soru üretimi çağrısı yalnızca tek bir soru + 4 seçenek + çözüm içeren, göreli olarak küçük bir JSON çıktısı ürettiğinden 1000 token yeterli bulunmuştur; buna karşılık Sokratik ipucu üretimi çağrısı, girdi olarak sorunun tam metnini, öğrencinin yanlış cevabını ve o âna kadarki ipucu geçmişini aldığından ve çıktı olarak kademeye özel yönlendirici metni ürettiğinden, bağlamın tutarlı işlenebilmesi için çıktı sınırı 2000 token'a çıkarılmıştır. Bu ayrım, iki farklı görevin token ihtiyacının birbirinden bağımsız yapılandırılmasını sağlamaktadır.

| Parametre | Değer / Açıklama |
|---|---|
| Model | gemini-flash-lite-latest |
| Temperature | 0.7 (yaratıcılık/tutarlılık dengesi için orta seviye) |
| maxOutputTokens | Soru üretimi: 1000 / Sokratik ipucu üretimi: 2000 (bkz. Bölüm 5.2 gerekçe) |
| Kimlik doğrulama | x-goog-api-key (header üzerinden; URL'de taşınmaz) |
| Çıktı şeması | Zorunlu JSON: soruMetni, secenekler[4], dogruCevapIndex, aciklama |
| Reddetme koşulu | Şema dışı/eksik alanlı yanıt → otomatik silme ve yeniden deneme |

### 5.3. Sokratik İpucu Üretim Mekanizması

Sistemin en özgün bileşeni, öğrenciyi doğrudan cevaba değil çözüme yönlendiren Sokratik ipucu üretim mantığıdır. Öğrenci bir soruda yanlış cevap verdiğinde veya ipucu istediğinde, sistem yapay zekâya sorunun tam metnini, doğru cevabını, öğrencinin verdiği yanlış cevabı ve o âna kadar kaç ipucu istediğini birlikte gönderir; böylece üretilecek ipucu hem soruya hem de öğrencinin o anki durumuna özel olur.

İpuçları kademeli bir yapıda tasarlanmıştır ve önceden tanımlanmış, ölçülebilir mühendislik eşiklerine göre giderek açıklığa yaklaşır:

- **1. kademe** — öğrenci bir soruda ilk kez yanlış cevap verdiğinde veya ipucu butonuna ilk kez bastığında devreye girer ve öğrenciyi genel bir yöne işaret eden kavramsal bir soru sorar (örn. "Bu geometri sorusunda iç ters açıları kullanmayı denedin mi?").
- **2. kademe** — aynı soru için art arda 2. kez yanlış cevap girildiğinde veya ipucu butonuna 2. kez basıldığında devreye girer ve öğrencinin yaptığı işlemdeki olası hatayı işaret eder, ama düzeltmeyi söylemez (örn. "Eksi işaretine dikkat ederek tekrar düşünmek ister misin?").
- **3. kademe** — aynı soru için 3. kez yanlış cevap girildiğinde veya ipucu butonuna 3. kez basıldığında devreye girer ve çözümün ilk adımını kısmen gösterip devamını öğrenciye bırakan, sınırlı bir yönlendirme sunar.

Sistem, bu üç kademenin hiçbirinde doğru şıkkı veya sonucu doğrudan yazmaz; bu kural aynı JSON şablon zorunluluğuyla işlenir ve her kademe geçişi, öğrencinin o soru özelinde yanlış cevap/ipucu isteği sayacına bağlı, denetlenebilir bir durum makinesi olarak loglanır.

Bölüm 2'de vurgulanan, öğrencilerin çözümsüz kaldıklarında sistemi terk etme (katılım) riskine karşı ALGORA, süreci çıkmaz sokağa dönüştürmeden esnek bir şekilde yönetir. Öğrenci 3. kademe ipucundan sonra hâlâ soruyu çözemezse, "tam çözümü göster" seçeneği yalnızca o soru için, öğrencinin kendi isteğiyle tıkladığı ayrı bir buton olarak sunulur ve sistem tarafından otomatik olarak önerilmez. Bu tasarım, projenin Sokratik tezinden ödün vermez; aksine tezi netleştirir: ALGORA'nın iddiası "öğrenciye asla çözüm gösterilmez" değil, "çözüm, öğrenci üç kademeli bir düşünme sürecinden geçmeden asla dayatılmaz" şeklindedir.

Ancak öğrencilerin sistemi istismar ederek (ipucu butonuna peş peşe basarak) doğrudan tam çözüme ulaşmasını engellemek amacıyla **"Sistemi İstismar Koruması"** tasarlanmıştır. İpucu butonları arasına zamansal bekleme süresi eklenecek ve sistem, öğrencinin peş peşe ipucu almasını algoritmik olarak kilitleyecektir. Bir sonraki ipucu butonunun aktif hale gelebilmesi için, öğrencinin sisteme yeni bir etkileşim sunması; örneğin arayüzdeki dijital çözüm alanına matematiksel bir adım/karakter girmesi veya yeni bir şıkkı işaretleyerek soruyu çözmeyi yeniden denemesi zorunlu tutulacaktır. Böylece öğrencinin sadece butona tıklayan pasif bir izleyici olması engellenir ve Sokratik düşünme döngüsüne aktif katılımı yazılım mimarisiyle güvence altına alınır. Bu mekanizmanın öğrenci davranışı üzerindeki gerçek etkisi — özellikle öğrencilerin kaçıncı kademede tam çözüme yöneldiği — pilot uygulamada ayrıca izlenecektir.

### 5.4. Veri Güvenliği ve KVKK Uyumu

Sistem, satır bazlı veritabanı kalkanı ile korunmaktadır; bir öğrenci başka bir öğrencinin verisine hiçbir şekilde erişemez. Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında platformdan ayrılmak isteyen kullanıcılar için güvenli hesap silme fonksiyonu aktiftir: bir öğrenci hesabını silmek istediğinde cevap geçmişi, çalışma süreleri ve kişisel bilgileri ilgili tüm veritabanı tablolarından, şifre doğrulaması ile tamamen ve kalıcı olarak temizlenir.

### 5.5. Araştırma Deseni, Etik Kurul Onayı ve Örneklem

Geliştirilen sistemin etkinliği, yazılım tamamlandıktan sonra gerçek bir saha testiyle bilimsel olarak ölçülecektir. Araştırma deseni, baştan kesin olarak iki gruplu (deney-kontrol) ön test-son test desenidir: gönüllü katılımcılar random olarak deney grubuna (ALGORA kullanan) ve kontrol grubuna (ALGORA kullanmadan kendi mevcut çalışma yöntemine devam eden) atanacaktır. Bu, projenin tasarım aşamasında sabitlenmiş, saha uygulamasındaki gönüllü sayısına bağlı olarak değiştirilmeyecek bir taahhüttür. **Hedef kitle, istatistiksel homojenliği korumak amacıyla yalnızca YKS'ye (TYT/AYT) hazırlanan lise öğrencileriyle sınırlandırılmıştır.**

Katılımcıların önemli bir kısmının 17-18 yaş aralığında, bir kısmının ise henüz reşit olmayan lise öğrencilerinden oluşabileceği göz önünde bulundurularak, saha uygulamasına başlanmadan önce üniversitenin ilgili Etik Kurulu'na başvuru yapılacak ve onay alınmadan hiçbir veri toplama faaliyeti başlatılmayacaktır. Reşit olmayan katılımcılar için hem öğrenciden hem de velisinden/yasal vasisinden yazılı aydınlatılmış onam alınacaktır. Sonuçların bilimsel açıdan güvenilir ve anlamlı olabilmesi için, deney ve kontrol gruplarının toplamından oluşan en az 80-100 kişilik bir öğrenci grubu hedeflenmektedir. Kesin katılımcı sayısı, saha uygulamasına başlamadan önce yapılacak istatistiksel bir ön hesaplamayla (güç analizi) netleştirilecektir.

Ön-test ve son-test ölçüm aracı olarak; alan uzmanları (akademisyen ve öğretmenler) tarafından kapsam geçerliği sağlanmış ve KR-20 güvenirlik katsayısı hesaplanmış, ÖSYM standartlarına uygun Çoktan Seçmeli Başarı Testleri kullanılacaktır. Toplanan sayısal veriler (ön test ve son test puanları), öğrencilerin başlangıçtaki bilgi düzeyleri dikkate alınarak analiz edilecek; ALGORA'yı kullanan ve kullanmayan gruplar arasındaki başarı farkı istatistiksel olarak karşılaştırılacaktır. Elde edilen sonuçların bilimsel olarak anlamlı olup olmadığı standart testlerle ölçülecektir. Öğrencilerden gelen yorum ve yazılı geri bildirimler ise ortak başlıklar (temalar) altında gruplandırılarak incelenecektir.

---

## 6. YÖNETİM DÜZENİ

| Adı ve Soyadı | Görevi | Projeye Ayıracakları Süre (%) |
|---|---|---|
| Hatice Şarlak | Proje Yürütücüsü | %100 |
| Mehmet Karayel | Danışman | %30 |

Proje yürütücüsü Hatice Şarlak; sistem mimarisinin tasarımı, yazılım geliştirme, saha uygulamasının koordinasyonu ve raporlamadan sorumludur. Danışman Mehmet Karayel; araştırma deseni, etik kurul süreci ve istatistiksel analiz metodolojisi konusunda akademik danışmanlık sağlayacaktır.

---

## 7. ARAŞTIRMA OLANAKLARI

| Altyapı/Teknoloji | Projede Kullanım Amacı |
|---|---|
| Next.js 16 (App Router) + React 19 + TypeScript 5 | Uygulamanın istemci ve sunucu tarafı (API route) mimarisinin tek bir repo üzerinde geliştirilmesi |
| Supabase (PostgreSQL 16 tabanlı, Row Level Security aktif) | Öğrenci hesapları, cevap geçmişi ve analitik verilerin güvenli, satır bazlı erişim kontrollü şekilde saklanması |
| Google Gemini API (REST) | Müfredata uygun, zorluk seviyesi ayarlanmış soruların üretilmesi |
| Vercel (sunucusuz dağıtım altyapısı) | Uygulamanın ölçeklenebilir şekilde barındırılması ve CI/CD entegrasyonu |
| Jest + Playwright (test altyapısı) | API uç noktalarının birim testleri ve uçtan uca kullanıcı senaryolarının otomatik test edilmesi |
| Kişisel geliştirme ortamı (dizüstü bilgisayar) | Geliştirme, hata ayıklama ve yerel test süreçleri için kullanılacaktır |

---

## 8. ÇALIŞMA TAKVİMİ

| İP No | İş Paketinin Adı ve Hedefleri | Kim(ler) | Zaman Aralığı | Başarı Ölçütü |
|---|---|---|---|---|
| 1 | Alt yapı, kimlik doğrulama, veritabanı ve KVKK/güvenlik şemasının kurulması | Yürütücü | 1-2. Ay | Kayıt/giriş akışının hatasız tamamlanması; RLS politikalarının tüm tablolarda aktif ve testlerden geçmiş olması |
| 2 | Sokratik yönlendirmeli, JSON doğrulamalı soru üretim motorunun kodlanması | Yürütücü | 3-4. Ay | Üretilen soruların en az %95'inin JSON şemasına tam uyumlu olması ve ortalama API yanıt süresinin 2 saniyenin altında kalması |
| 3 | Kişiselleştirilmiş öğrenme paneli ve grafiksel istatistik (Radar Grafik) modülleri | Yürütücü | 5-6. Ay | Öğrencinin konu bazlı ilerlemesinin panelde gecikmesiz (<500 ms) ve doğru şekilde görüntülenmesi |
| 4 | Etik kurul başvurusu, onam formlarının hazırlanması ve pilot grup davetleri | Yürütücü, Danışman | 5-7. Ay | Etik kurul onayının alınmış olması ve deney+kontrol grupları toplamı asgari hedeflenen gönüllü sayısına (80-100 öğrenci) ulaşılması |
| 5 | Abonelik, kota, geri ödeme sistemi ve kullanıcı yönetim altyapısının entegrasyonu | Yürütücü | 7. Ay | Kota/iade işlemlerinin atomik biçimde, veri kaybı olmadan çalıştığının test senaryolarıyla doğrulanması |
| 6 | Güvenlik testleri, performans optimizasyonu ve hata giderme | Yürütücü, Danışman | 8. Ay | Lighthouse performans skorunun tüm kategorilerde 90 ve üzerinde olması; kritik güvenlik açığı bulunmaması |
| 7 | Ön test uygulaması ve pilot öğrenci grubuyla saha çalışması (4-6 hafta) | Yürütücü, Danışman | 9-10. Ay | Planlanan katılımcı sayısının en az %80'inin süreci tamamlaması ve eksiksiz veri setinin toplanması |
| 8 | Son test, istatistiksel analiz, raporlama ve makale hazırlığı | Yürütücü, Danışman | 11-12. Ay | Ön test-son test farkının istatistiksel olarak analiz edilmiş olması ve bulguların yayına dönüştürülebilir bir taslak hâline getirilmesi |

### Risk Analizi

| Risk | Olasılık | Önlem |
|---|---|---|
| Yapay zekâ API maliyetlerinin artması | Orta | Sorgu başına maliyet takibi, önbellekleme (cache) ve kota sistemiyle maliyetin öngörülebilir kılınması |
| Google Gemini API'sine tek sağlayıcı bağımlılığı (ani fiyat değişikliği, erişim kısıtlaması veya hizmet kesintisi) | Düşük-Orta | B planı olarak açık kaynaklı, yerelde veya alternatif bulut üzerinde çalıştırılabilir bir büyük dil modelinin (örn. Llama 3 veya Mistral tabanlı bir model) soru üretim motoruna entegre edilebilir yedek bir uyarlayıcı (adapter) katmanı olarak tasarlanması |
| Pilot gruptaki öğrencilerin süreci yarıda bırakması | Yüksek | Yedek gönüllü havuzu oluşturulması, haftalık hatırlatma ve düşük katılım eşiğinde esnek süre uzatımı |
| Etik kurul onay sürecinin uzaması | Orta | Başvurunun proje takviminin ilk aylarında, erken yapılması |
| Yapay zekânın müfredat dışı/hatalı soru üretmesi | Orta | JSON şablon zorunluluğu ve otomatik reddetme katmanı; üretici teşhis loglarının düzenli incelenmesi |
| Küçük örneklem nedeniyle istatistiksel gücün düşük kalması | Orta | Saha uygulaması öncesi güç analiziyle asgari örneklem büyüklüğünün belirlenmesi; deney-kontrol atamasının baştan sabit tutulması |

### Tahmini Bütçe

Projenin yürütülmesi için öngörülen bütçe kalemleri ve tahmini tutarları aşağıda listelenmiştir. Yapay zekâ API maliyeti, Gemini Flash-Lite modelinin güncel fiyatlandırması (yaklaşık 0,10 USD / milyon giriş token, 0,40 USD / milyon çıkış token) üzerinden, pilot dönemde 80-100 öğrencinin günde ortalama 15 soru/ipucu isteği ürettiği varsayımıyla hesaplanmıştır. Kesin tutarlar üniversitenin BAP birimi tarafından belirlenen üst limitlere ve başvuru anındaki güncel kur/fiyatlara göre teyit edilecektir:

| Kalem | Tahmini Tutar (Yıllık) |
|---|---|
| Yapay zekâ API kullanım maliyeti (soru üretimi + Sokratik ipucu sorguları) | ≈ 9.000 ₺ |
| Sunucu, Veritabanı ve Bulut Barındırma Hizmet Alımı (1 Yıllık — Toplu Faturalandırılacaktır) | ≈ 18.000 ₺ |
| Pilot uygulama anket/ölçek giderleri ve veri toplama malzemeleri | ≈ 5.000 ₺ |
| Saha uygulaması sırasında katılımcı okullara ulaşım/organizasyon giderleri | ≈ 3.000 ₺ |
| Bulguların bir kongrede sunulması veya makale yayın gideri | ≈ 8.000 ₺ |

**Toplam tahmini bütçe: yaklaşık 43.000 ₺.** Bu rakam, projenin asgari işlerlik için ihtiyaç duyduğu alt sınırı yansıtmaktadır; üniversitenin BAP üst limitlerine göre kalemler orantılı olarak güncellenecektir.

---

## 9. PROJE EKİBİNİN DİĞER PROJELERİ

Proje yürütücüsü Hatice Şarlak için, bu proje kapsamı dışında yürütülmekte olan başka bir akademik/bilimsel araştırma projesi bulunmamaktadır. Danışman Mehmet Karayel'in varsa yürütmekte olduğu diğer projeler, danışmanın onayıyla bu bölüme eklenecektir.

---

## 10. KAYNAKÇA

1. Bloom, B. S., 1984. "The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring", *Educational Researcher*, 13(6), 4-16.
2. Kayaaslan, T., Çakır, Ö., 2017. "Türkçe Öğretiminde Kişiselleştirilmiş Alıştırma Sorularının Öğrenci Başarısına Etkisi", *Ankara Üniversitesi Eğitim Bilimleri Fakültesi Dergisi*, 50(1).
3. T.C. Millî Eğitim Bakanlığı, 2026. "Yapay Zekâ Destekli MEBİ Yeni Özellikleriyle Öğrencilerin Yanında", meb.gov.tr.
4. Kunduz, 2026. "Okullar İçin Kunduz — 2025-2026 Öğrenci Anket Verileri", kunduz.com.
5. Webel, C., Otten, S., 2015. "Teaching in a World with Photomath", *Mathematics Teacher*, 109(5), 368-373.
6. Oreopoulos, P., Low, N., 2026. "One Click Away: AI Tutoring with Khanmigo in a Two-Year School Experiment", NBER Working Paper No. 35620.
7. Zhuo, T. Y. ve ark., 2024. "Large Language Models for Education: A Survey and Outlook", arXiv:2403.18105.
8. Xu, Z., Jain, S., Kankanhalli, M., 2024. "Hallucination is Inevitable: An Innate Limitation of Large Language Models", arXiv:2401.11817.
9. Inter-American Development Bank (IADB), 2026. "Does Gamification in Education Work? Experimental Evidence from Chile".
