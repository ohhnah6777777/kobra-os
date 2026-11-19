import { useState } from 'react';
import type { Win } from '../store';

export function calculate(source: string): number {
  const tokens = source.match(/(?:\d*\.\d+|\d+\.?\d*)|[()+*/-]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s/g, '')) throw Error('Invalid expression');
  let i = 0;
  function atom(): number {
    const t = tokens[i++];
    if (t === '-') return -atom();
    if (t === '+') return atom();
    if (t === '(') { const n = sum(); if (tokens[i++] !== ')') throw Error('Missing parenthesis'); return n; }
    if (!t || !/^\d*\.?\d/.test(t)) throw Error('Expected number');
    return Number(t);
  }
  function product(): number { let n = atom(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++]; const r = atom(); n = op === '*' ? n * r : n / r; } return n; }
  function sum(): number { let n = product(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++]; const r = product(); n = op === '+' ? n + r : n - r; } return n; }
  const n = sum(); if (i !== tokens.length || !Number.isFinite(n)) throw Error('Undefined result'); return Number(n.toPrecision(12));
}
export default function CalculatorApp({ win: _win }: { win: Win }) {
  const [value, setValue] = useState('0'); const [history, setHistory] = useState(''); const [done, setDone] = useState(false);
  function press(key: string) {
    if (key === 'AC' || key === 'Escape') { setValue('0'); setDone(false); return; }
    if (key === 'Backspace') { setValue(v => v.length > 1 ? v.slice(0, -1) : '0'); return; }
    if (key === '=' || key === 'Enter') { try { setHistory(value); setValue(String(calculate(value))); } catch { setValue('Error'); } setDone(true); return; }
    if (key === '±' || key === '%') { try { setValue(String(calculate(value) * (key === '%' ? .01 : -1))); } catch { setValue('Error'); } return; }
    const k = ({ '÷': '/', '×': '*', '−': '-' } as Record<string, string>)[key] ?? key;
    if (!/^[\d.+*/()-]$/.test(k)) return;
    setValue(v => { const start = v === 'Error' || (done && /[\d.(]/.test(k)) ? '0' : v; if (k === '.' && /\.[\d]*$/.test(start)) return start; return start === '0' && /\d/.test(k) ? k : start + k; }); setDone(false);
  }
  return <div tabIndex={0} aria-label="Calculator; focus to use keyboard" onKeyDown={e => { if (/^[\d.+*/()=-]$/.test(e.key) || ['Enter','Escape','Backspace','%'].includes(e.key)) { e.preventDefault(); press(e.key); } }} className="flex h-full flex-col bg-background/80 p-4 outline-none">
    <div className="flex min-h-24 flex-1 flex-col items-end justify-end overflow-hidden pb-5"><span className="h-6 max-w-full truncate text-xs text-muted-foreground">{history && `${history} =`}</span><output className="w-full truncate text-right font-light tabular-nums" style={{ fontSize: `${Math.max(22, 56 - Math.max(0, value.length - 8) * 2.4)}px` }}>{value.replaceAll('*','×').replaceAll('/','÷')}</output></div>
    <div className="grid grid-cols-4 gap-2">{['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','='].map(k => <button key={k} onClick={() => press(k)} className={`min-h-12 rounded-full py-3 text-xl transition hover:brightness-125 active:scale-95 ${k === '0' ? 'col-span-2' : ''} ${['÷','×','−','+','='].includes(k) ? 'bg-primary text-primary-foreground' : ['AC','±','%'].includes(k) ? 'bg-secondary text-foreground' : 'bg-muted text-foreground'}`}>{k}</button>)}</div>
  </div>;
}
