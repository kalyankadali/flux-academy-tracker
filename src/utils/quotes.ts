export interface Quote {
  text: string;
  plain?: string;
}

export const QUOTES: Quote[] = [
  { text: 'Small steps still move you forward.', plain: 'Even a short lesson counts.' },
  { text: 'Done is kinder than perfect.', plain: 'Finishing matters more than perfection.' },
  { text: 'One lesson is a win. Celebrate it.', plain: 'Marking progress is allowed to feel good.' },
  { text: 'You showed up. That matters.', plain: 'Opening the course is already progress.' },
  { text: 'Progress compounds quietly.', plain: 'Steady practice builds real skill over time.' },
  { text: 'Curiosity over pressure.', plain: 'Learn because you’re interested, not scared.' },
  { text: 'Gentle focus beats harsh urgency.', plain: 'Calm attention helps more than rushing.' },
  { text: 'Your pace is valid.', plain: 'You don’t need to match anyone else’s speed.' },
  { text: 'Tiny wins stack into skill.', plain: 'Check off one task — it adds up.' },
  { text: 'Rest is part of learning too.', plain: 'Breaks help ideas settle.' },
  { text: 'Consistency is enough.', plain: 'Showing up regularly beats cramming.' },
  { text: 'You’re building something real.', plain: 'Each module grows a usable craft.' },
];

export function quoteForToday(): Quote {
  const d = new Date();
  const idx = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % QUOTES.length;
  return QUOTES[idx];
}
