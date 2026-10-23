const key = 'glossframe-guide-progress-v1';
const boxes = [...document.querySelectorAll('[data-progress]')];
try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); for (const box of boxes) box.checked = saved[box.dataset.progress] === true; } catch {}
for (const box of boxes) box.addEventListener('change', () => { try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(boxes.map(item => [item.dataset.progress, item.checked])))); } catch {} });
document.getElementById('reset').onclick = () => { for (const box of boxes) box.checked = false; try { localStorage.removeItem(key); } catch {} };
document.querySelector('[data-copy]').onclick = async event => { try { await navigator.clipboard.writeText(document.querySelector('pre').textContent); event.target.textContent = 'コピーしました'; } catch { event.target.textContent = 'コマンドを選択してコピーしてください'; } };
