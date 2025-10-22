// Minimal local transformer with basic safety: do not touch code fences or inline code.
(function(){
  const input = document.getElementById('in');
  const output = document.getElementById('out');
  const statusEl = document.getElementById('status');

  function transform(s) {
    if (!s) return '';
    // Protect code fences ```...``` and inline `...`
    const codeFence = /```[\s\S]*?```/g;
    const inlineCode = /`[^`]*`/g;
    const placeholders = [];
    let tmp = s
      .replace(codeFence, m => (placeholders.push(m), `@@CF${placeholders.length-1}@@`))
      .replace(inlineCode, m => (placeholders.push(m), `@@IC${placeholders.length-1}@@`));

    // Demo rule: |x| -> \lvert x\rvert (greedy but outside protected regions)
    tmp = tmp.replace(/\|([^|\n]+)\|/g, '\\lvert $1\\rvert');

    // Restore placeholders
    tmp = tmp.replace(/@@(CF|IC)(\d+)@@/g, (_, __, idx) => placeholders[Number(idx)]);
    return tmp;
  }

  document.getElementById('run').addEventListener('click', () => {
    const out = transform(input.value || '');
    output.value = out;
    statusEl.textContent = 'Patched';
    setTimeout(() => (statusEl.textContent = ''), 1200);
  });

  document.getElementById('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value || '');
      statusEl.textContent = 'Copied';
    } catch {
      statusEl.textContent = 'Copy failed';
    }
    setTimeout(() => (statusEl.textContent = ''), 1200);
  });
})();

