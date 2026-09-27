// 計測のイベントを送る。GA4(gtag)が読み込まれていれば送り、なければ何もしない
declare global { interface Window { gtag?: (...a: unknown[]) => void } }
export function track(name: string, params: Record<string, unknown> = {}) {
  try { window.gtag?.("event", name, params); } catch {}
}
