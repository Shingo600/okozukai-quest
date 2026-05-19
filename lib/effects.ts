"use client";

// 軽量 WebAudio で短い効果音を合成（音源ファイル不要）
let audioCtx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function tone(freq: number, dur: number, delay = 0, type: OscillatorType = "sine", gain = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type SoundKind = "approve" | "submit" | "levelup" | "badge" | "spend";

export function playSound(kind: SoundKind) {
  switch (kind) {
    case "approve":
      tone(880, 0.12, 0, "triangle");
      tone(1320, 0.18, 0.1, "triangle");
      break;
    case "submit":
      tone(660, 0.1, 0, "sine");
      break;
    case "levelup":
      tone(523, 0.12, 0, "square", 0.06);
      tone(659, 0.12, 0.12, "square", 0.06);
      tone(784, 0.12, 0.24, "square", 0.06);
      tone(1046, 0.2, 0.36, "square", 0.07);
      break;
    case "badge":
      tone(988, 0.15, 0, "triangle");
      tone(1318, 0.2, 0.12, "triangle");
      break;
    case "spend":
      tone(440, 0.1, 0, "sine");
      tone(330, 0.14, 0.1, "sine");
      break;
  }
}

// 紙吹雪：DOM API 直叩き。React 外でも呼べる。
export function confettiBurst(opts: { count?: number; colors?: string[] } = {}) {
  if (typeof window === "undefined") return;
  const count = opts.count ?? 80;
  const colors = opts.colors ?? ["#FFD9E0", "#A8E6CF", "#FFE38A", "#FFB99A", "#B89CE6"];
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "9999",
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) { canvas.remove(); return; }

  const W = canvas.width, H = canvas.height;
  type P = { x: number; y: number; vx: number; vy: number; size: number; color: string; rot: number; vr: number };
  const particles: P[] = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 100,
    y: H * 0.4,
    vx: (Math.random() - 0.5) * 8,
    vy: -6 - Math.random() * 6,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
  }));
  let frame = 0;
  const maxFrames = 90;
  function step() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.vy += 0.3;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    }
    frame += 1;
    if (frame < maxFrames) requestAnimationFrame(step);
    else canvas.remove();
  }
  requestAnimationFrame(step);
}
