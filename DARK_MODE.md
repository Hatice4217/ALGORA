# ALGORA Dark Mode — Palet Eşleme Tablosu (tek kaynak)

Tailwind v4 class-stratejisi (`@custom-variant dark`, next-themes `attribute="class"`, `storageKey="algora_theme"`, `defaultTheme="system"`).
Mekanik `dark:` pass'inde KARAR VERME — bu tabloya bak, uygula. Tablo dışındaki durumlar için en yakın satırı seç.

## Eşleme tablosu

| Açık | Koyu | Not |
|---|---|---|
| kök `bg-slate-50` / body `#fff` | `dark:bg-slate-950` (body `#0a0a0a`) | sayfa kökleri |
| kart `bg-white` | `dark:bg-slate-900` | modallar, paneller, kartlar |
| iç panel `bg-slate-50`, `bg-slate-100`, `bg-gray-100`, `bg-gray-50` | `dark:bg-slate-800` | |
| iç panel hover `hover:bg-slate-100/50` vb. | `dark:hover:bg-slate-700` | tıklanabilir iç yüzeyler |
| `border-gray-200`, `border-gray-100`, `border-slate-200` (dış/kart) | `dark:border-slate-700` | |
| `border-slate-100`, `border-gray-100` (ince iç ayraç) | `dark:border-slate-800` | |
| `text-gray-900` / `text-slate-900` | `dark:text-slate-100` | başlıklar |
| `text-gray-700`, `text-gray-600`, `text-slate-700` | `dark:text-slate-300` | gövde |
| `text-gray-500`, `text-slate-500`, `text-gray-400` | `dark:text-slate-400` | ikincil |
| `text-purple-600`, `text-purple-700` | `dark:text-purple-400` | |
| `bg-purple-50` (+ hover) | `dark:bg-purple-500/10` (+ `dark:hover:bg-purple-500/20`) | diğer 50'ler (blue/cyan/emerald/red/amber/teal) aynı `/10`–`/15` kalıbı |
| `bg-white/40`, `bg-white/80`, `bg-white/90` overlay | `dark:bg-slate-800/40` vb. | opaklığı koru |
| `divide-gray-100/200` | `dark:divide-slate-800` | |
| `ring-purple-200/300` | `dark:ring-purple-500/40` | |
| auth kökü `from-purple-50 via-white to-blue-50` | `dark:from-slate-950 dark:via-slate-900 dark:to-slate-950` | 4 auth sayfası |

## DOKUNULMAZ (dark: YASAK)

- `text-white` — marka gradient butonlarının metni (koyu zaten)
- `from-purple-600 to-cyan-500` ve türevleri — marka gradient (SoruModali "Sıradaki", avatar, primary Button)
  - İSTİSNA: disabled haline `dark:disabled:from-slate-600 dark:disabled:to-slate-700` eklenir (`disabled:bg-slate-400` gradient'de işlemez)
- Spinner'ların `border-purple-600` gibi ana vurgu renkleri — yalnız `border-X-200/100` açık tonlar `dark:border-slate-700` olur

## Durum renkleri (SoruModali şıkları vb.)

- Doğru emerald: `bg-emerald-50` → `dark:bg-emerald-500/15`, `border-emerald-500` kalır, `text-emerald-700` → `dark:text-emerald-400`
- Yanlış red: `bg-red-50` → `dark:bg-red-500/15`, `text-red-700` → `dark:text-red-400`
- BlokluAnlatım mor kutu: `bg-purple-50/40 border-l-4 border-purple-300` → `dark:bg-purple-500/10 dark:border-purple-500/40`
- KONTRAST UYARISI: `purple-400` ve soluk `/10` arka planlar üstündeki KÜÇÜK metinlerde görsel kontrol şart (özellikle SoruModali şıkları, doğru/yanlış durum metinleri).

## Denetim (her aşama sonunda)

```bash
grep -rnE "bg-white|text-gray-|border-gray-" --include="*.tsx" app components | grep -v "dark:"
```
- Kalandan **kasıtlı** olanlar (DOKUNULMAZ listesi, gradient disabled vb.) yok sayılır; kalanlar kapatılır.
- Kapanışta ek olarak `grep -rc "dark:"` sayım raporu alınır.

## Bilinen sınırlamalar

- Ayarlar'da tema Select'i `system` seçeneği YOK — kullanıcı bir kez manuel seçince sistem tercihine dönemez (kabul edilmiş).
- SettingsPanel tema değeri DB'ye yazılır ama geri okunmaz; Select'in başlangıç değeri `useTheme().resolvedTheme`'den gelir (cihaz tercihi flash'ı önler).
- Viewport `themeColor` medya-tabanlı kalır — manuel geçişte adres çubuğu rengi değişmez (kabul edilmiş; istenirse resolvedTheme ile dinamik meta güncellenebilir).
- Logo/mockup görselleri koyu zeminde kontrol edilir (Aşama 2 listesi).
