export type Restorer = (s: string) => string;

export function stashByRegex(text: string, pattern: RegExp, token: string): { text: string; restore: Restorer } {
  const store: string[] = [];
  let idx = 0;
  const out = text.replace(pattern, (m) => {
    store.push(m);
    return `§§${token}${idx++}§§`;
  });
  const restore: Restorer = (s: string) => {
    let res = s;
    for (let i = 0; i < store.length; i++) {
      res = res.split(`§§${token}${i}§§`).join(store[i]);
    }
    return res;
  };
  return { text: out, restore };
}

export function stashCodeAndLinks(text: string): { text: string; restore: Restorer } {
  // fenced code, inline code, markdown links/images
  let t = text;
  const r1 = stashByRegex(t, /```[\s\S]*?```/g, 'CODE');
  t = r1.text;
  const r2 = stashByRegex(t, /`[^`\n]*`/g, 'IC');
  t = r2.text;
  const r3 = stashByRegex(t, /!?\[[^\]]*\]\([^\)]+\)/g, 'LINK');
  t = r3.text;
  const restore: Restorer = (s) => r1.restore(r2.restore(r3.restore(s)));
  return { text: t, restore };
}

