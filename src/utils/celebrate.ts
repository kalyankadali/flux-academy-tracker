import confetti from 'canvas-confetti';

export function celebrate(level: 'subtask' | 'lesson' | 'module') {
  if (level === 'subtask') {
    confetti({
      particleCount: 28,
      spread: 50,
      startVelocity: 22,
      origin: { y: 0.75 },
      colors: ['#86efac', '#93c5fd', '#a7f3d0', '#bfdbfe'],
      disableForReducedMotion: true,
    });
    return;
  }
  if (level === 'lesson') {
    confetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 28,
      origin: { y: 0.65 },
      colors: ['#6ee7b7', '#67e8f9', '#93c5fd', '#c4b5fd'],
      disableForReducedMotion: true,
    });
    return;
  }
  confetti({
    particleCount: 100,
    spread: 90,
    startVelocity: 35,
    origin: { y: 0.6 },
    colors: ['#34d399', '#38bdf8', '#a78bfa', '#fcd34d'],
    disableForReducedMotion: true,
  });
}
