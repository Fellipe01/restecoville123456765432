// Toca um "ding ding" de notificação usando Web Audio API (sem arquivo)
export function playNewOrderSound() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    function tone(freq: number, startOffset: number, duration: number, vol = 0.25) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + startOffset
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration)
    }

    // Três tons descendentes: ding ding dong
    tone(1047, 0.00, 0.45) // dó
    tone(880,  0.18, 0.45) // lá
    tone(659,  0.36, 0.60) // mi
  } catch {
    // Autoplay bloqueado ou API não suportada — silencioso
  }
}
