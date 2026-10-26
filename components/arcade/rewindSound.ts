// ==========================================
// The rewind's sound, shared by every mode that puts the page back on exit: a tape-rewind
// whirr rising in pitch with a shimmer of high notes as the pieces land. It makes its own
// short-lived audio context, since the mode's own is about to be torn down.
// ==========================================

export function playRewind(muted: boolean, seconds = 1.4) {
  if (muted) return;
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    const ctx = new AC();
    const out = ctx.createGain();
    out.gain.value = 0.35;
    out.connect(ctx.destination);
    const t = ctx.currentTime;

    // the whirr: a sawtooth sweeping up through a lowpass
    const whirr = ctx.createOscillator();
    whirr.type = "sawtooth";
    whirr.frequency.setValueAtTime(70, t);
    whirr.frequency.exponentialRampToValueAtTime(420, t + seconds);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + seconds);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.0001, t);
    wg.gain.exponentialRampToValueAtTime(0.12, t + 0.15);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    whirr.connect(lp).connect(wg).connect(out);
    whirr.start(t);
    whirr.stop(t + seconds);

    // the shimmer of pieces landing back in place
    const notes = [1047, 1319, 1568, 2093, 2637];
    for (let i = 0; i < 14; i++) {
      const at = t + 0.3 + (i / 14) * seconds;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[i % notes.length];
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.04, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + 0.3);
    }
    window.setTimeout(() => void ctx.close(), (seconds + 1) * 1000);
  } catch {
    // no audio: the rewind still plays
  }
}
