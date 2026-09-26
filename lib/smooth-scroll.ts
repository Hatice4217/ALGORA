// OS/tarayıcı ayarlarından (prefers-reduced-motion) bağımsız tutarlı yumuşak kaydırma.
// CSS `scroll-behavior: smooth` ve `scrollIntoView({ behavior: 'smooth' })`, kullanıcının
// "animasyonları azalt" ayarı açıksa tarayıcı tarafından anında atlamaya dönüştürülür;
// bu yüzden kaydırmayı rAF ile kendimiz animasyonlarız.
export function scrollToElementId(id: string, durationMs = 600): void {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(id);
  if (!element) return;

  const targetY = element.getBoundingClientRect().top + window.scrollY;
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return;

  const start = performance.now();
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / durationMs);
    // behavior:'instant' şart — aksi halde CSS scroll-behavior:smooth her adımı
    // yeniden animasyona sokup takılan bir kaydırma yaratır
    window.scrollTo({ top: startY + delta * easeInOutCubic(progress), behavior: 'instant' });
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
