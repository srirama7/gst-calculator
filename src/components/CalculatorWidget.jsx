import { useState, useRef, useEffect } from 'react'

const MODES = ['Scientific', 'GST', 'Tax'];

export default function CalculatorWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('Scientific');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState(0);
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [angleMode, setAngleMode] = useState('DEG');

  // GST mode state
  const [gstAmount, setGstAmount] = useState('');
  const [gstRate, setGstRate] = useState(18);
  const [gstType, setGstType] = useState('exclusive');

  // Tax mode state
  const [taxIncome, setTaxIncome] = useState('');
  const [taxRegime, setTaxRegime] = useState('new');

  function toRad(val) {
    return angleMode === 'DEG' ? (val * Math.PI / 180) : (angleMode === 'GRAD' ? (val * Math.PI / 200) : val);
  }

  function fromRad(val) {
    return angleMode === 'DEG' ? (val * 180 / Math.PI) : (angleMode === 'GRAD' ? (val * 200 / Math.PI) : val);
  }

  function inputDigit(d) {
    if (isNewNumber) {
      setDisplay(d === '.' ? '0.' : d);
      setIsNewNumber(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      setDisplay(display + d);
    }
  }

  function inputOperator(op) {
    setExpression(display + ' ' + op + ' ');
    setIsNewNumber(true);
  }

  function calculate() {
    try {
      const fullExpr = expression + display;
      const sanitized = fullExpr
        .replace(/\u00d7/g, '*')
        .replace(/\u00f7/g, '/')
        .replace(/\^/g, '**');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      setDisplay(String(parseFloat(result.toPrecision(12))));
      setExpression('');
      setIsNewNumber(true);
    } catch {
      setDisplay('Error');
      setExpression('');
      setIsNewNumber(true);
    }
  }

  function clear() {
    setDisplay('0');
    setExpression('');
    setIsNewNumber(true);
  }

  function backspace() {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setIsNewNumber(true);
    }
  }

  function sciFunction(fn) {
    const val = parseFloat(display);
    let result;
    try {
      switch (fn) {
        case 'sin': result = Math.sin(toRad(val)); break;
        case 'cos': result = Math.cos(toRad(val)); break;
        case 'tan': result = Math.tan(toRad(val)); break;
        case 'asin': result = fromRad(Math.asin(val)); break;
        case 'acos': result = fromRad(Math.acos(val)); break;
        case 'atan': result = fromRad(Math.atan(val)); break;
        case 'log': result = Math.log10(val); break;
        case 'ln': result = Math.log(val); break;
        case 'sqrt': result = Math.sqrt(val); break;
        case 'cbrt': result = Math.cbrt(val); break;
        case 'x2': result = val * val; break;
        case 'x3': result = val * val * val; break;
        case '1/x': result = 1 / val; break;
        case 'abs': result = Math.abs(val); break;
        case 'fact': result = factorial(val); break;
        case 'exp': result = Math.exp(val); break;
        case '10x': result = Math.pow(10, val); break;
        case 'pi': result = Math.PI; break;
        case 'e': result = Math.E; break;
        case '%': result = val / 100; break;
        case '+/-': result = -val; break;
        default: result = val;
      }
      setDisplay(String(parseFloat(result.toPrecision(12))));
      setIsNewNumber(true);
    } catch {
      setDisplay('Error');
      setIsNewNumber(true);
    }
  }

  function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= Math.floor(n); i++) r *= i;
    return r;
  }

  function memoryOp(op) {
    const val = parseFloat(display);
    switch (op) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(String(memory)); setIsNewNumber(true); break;
      case 'M+': setMemory(memory + val); break;
      case 'M-': setMemory(memory - val); break;
    }
  }

  // GST calculations
  function calcGST() {
    const amt = parseFloat(gstAmount) || 0;
    const rate = parseFloat(gstRate) || 0;
    if (gstType === 'exclusive') {
      const gst = amt * rate / 100;
      const cgst = gst / 2;
      const sgst = gst / 2;
      return { base: amt, gst, cgst, sgst, total: amt + gst };
    } else {
      const base = amt / (1 + rate / 100);
      const gst = amt - base;
      const cgst = gst / 2;
      const sgst = gst / 2;
      return { base, gst, cgst, sgst, total: amt };
    }
  }

  // Income Tax calculation (India)
  function calcTax() {
    const income = parseFloat(taxIncome) || 0;
    let tax = 0;
    if (taxRegime === 'new') {
      // New regime FY 2024-25
      const slabs = [
        { limit: 300000, rate: 0 },
        { limit: 700000, rate: 5 },
        { limit: 1000000, rate: 10 },
        { limit: 1200000, rate: 15 },
        { limit: 1500000, rate: 20 },
        { limit: Infinity, rate: 30 },
      ];
      let remaining = income;
      let prev = 0;
      for (const slab of slabs) {
        const taxable = Math.min(remaining, slab.limit - prev);
        if (taxable <= 0) break;
        tax += taxable * slab.rate / 100;
        remaining -= taxable;
        prev = slab.limit;
      }
      // Rebate u/s 87A for income up to 7L
      if (income <= 700000) tax = 0;
    } else {
      // Old regime
      const slabs = [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 5 },
        { limit: 1000000, rate: 20 },
        { limit: Infinity, rate: 30 },
      ];
      let remaining = income;
      let prev = 0;
      for (const slab of slabs) {
        const taxable = Math.min(remaining, slab.limit - prev);
        if (taxable <= 0) break;
        tax += taxable * slab.rate / 100;
        remaining -= taxable;
        prev = slab.limit;
      }
      // Rebate u/s 87A for income up to 5L
      if (income <= 500000) tax = 0;
    }
    const cess = tax * 0.04;
    return { tax, cess, total: tax + cess, effective: income > 0 ? ((tax + cess) / income * 100) : 0 };
  }

  const btnBase = "flex items-center justify-center rounded-lg font-semibold transition-all duration-200 active:scale-95 select-none";

  function renderScientific() {
    const sciBtns = [
      ['sin', 'cos', 'tan', 'pi'],
      ['asin', 'acos', 'atan', 'e'],
      ['log', 'ln', 'sqrt', 'cbrt'],
      ['x2', 'x3', '1/x', 'fact'],
      ['exp', '10x', '%', '+/-'],
    ];
    const sciBtnLabels = {
      'sin': 'sin', 'cos': 'cos', 'tan': 'tan', 'pi': '\u03C0',
      'asin': 'sin\u207B\u00B9', 'acos': 'cos\u207B\u00B9', 'atan': 'tan\u207B\u00B9', 'e': 'e',
      'log': 'log', 'ln': 'ln', 'sqrt': '\u221A', 'cbrt': '\u221B',
      'x2': 'x\u00B2', 'x3': 'x\u00B3', '1/x': '1/x', 'fact': 'n!',
      'exp': 'e\u02E3', '10x': '10\u02E3', '%': '%', '+/-': '\u00B1',
    };

    return (
      <div>
        {/* Display */}
        <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
          <div className="text-xs text-right" style={{ color: 'var(--text-muted)', minHeight: '16px' }}>{expression || '\u00A0'}</div>
          <div className="text-right text-2xl font-mono font-bold truncate" style={{ color: 'var(--text-primary)' }}>{display}</div>
        </div>

        {/* Angle mode + Memory */}
        <div className="flex gap-1 mb-2">
          <button onClick={() => setAngleMode(a => a === 'DEG' ? 'RAD' : a === 'RAD' ? 'GRAD' : 'DEG')}
            className={`${btnBase} text-[10px] py-1 px-2`} style={{ background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>
            {angleMode}
          </button>
          {['MC', 'MR', 'M+', 'M-'].map(m => (
            <button key={m} onClick={() => memoryOp(m)}
              className={`${btnBase} text-[10px] py-1 px-2 flex-1`} style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              {m}
            </button>
          ))}
        </div>

        {/* Scientific buttons */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {sciBtns.flat().map(fn => (
            <button key={fn} onClick={() => sciFunction(fn)}
              className={`${btnBase} text-[11px] py-2`} style={{ background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>
              {sciBtnLabels[fn]}
            </button>
          ))}
        </div>

        {/* Main keypad */}
        <div className="grid grid-cols-4 gap-1">
          <button onClick={clear} className={`${btnBase} py-2.5 text-sm`} style={{ background: 'rgba(255,107,107,0.2)', color: 'var(--danger-text)', border: '1px solid rgba(255,107,107,0.3)' }}>AC</button>
          <button onClick={backspace} className={`${btnBase} py-2.5 text-sm`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>DEL</button>
          <button onClick={() => inputOperator('^')} className={`${btnBase} py-2.5 text-sm`} style={{ background: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>x^y</button>
          <button onClick={() => inputOperator('\u00f7')} className={`${btnBase} py-2.5 text-lg`} style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: '#0a0e27' }}>{'\u00f7'}</button>

          {['7','8','9'].map(d => <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} py-2.5 text-base`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>{d}</button>)}
          <button onClick={() => inputOperator('\u00d7')} className={`${btnBase} py-2.5 text-lg`} style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: '#0a0e27' }}>{'\u00d7'}</button>

          {['4','5','6'].map(d => <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} py-2.5 text-base`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>{d}</button>)}
          <button onClick={() => inputOperator('-')} className={`${btnBase} py-2.5 text-lg`} style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: '#0a0e27' }}>-</button>

          {['1','2','3'].map(d => <button key={d} onClick={() => inputDigit(d)} className={`${btnBase} py-2.5 text-base`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>{d}</button>)}
          <button onClick={() => inputOperator('+')} className={`${btnBase} py-2.5 text-lg`} style={{ background: 'linear-gradient(135deg, #00ffcc, #00ccff)', color: '#0a0e27' }}>+</button>

          <button onClick={() => inputDigit('0')} className={`${btnBase} py-2.5 text-base col-span-2`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>0</button>
          <button onClick={() => inputDigit('.')} className={`${btnBase} py-2.5 text-base`} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>.</button>
          <button onClick={calculate} className={`${btnBase} py-2.5 text-lg`} style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)', color: 'white' }}>=</button>
        </div>
      </div>
    );
  }

  function renderGST() {
    const result = calcGST();
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Amount ({'\u20B9'})</label>
          <input type="number" value={gstAmount} onChange={e => setGstAmount(e.target.value)}
            placeholder="Enter amount" className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>GST Rate</label>
          <div className="grid grid-cols-5 gap-1">
            {[0, 5, 12, 18, 28].map(r => (
              <button key={r} onClick={() => setGstRate(r)}
                className={`${btnBase} text-xs py-2`}
                style={{ background: gstRate === r ? 'linear-gradient(135deg, #00ffcc, #00ccff)' : 'var(--bg-input)', color: gstRate === r ? '#0a0e27' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: gstRate === r ? 700 : 400 }}>
                {r}%
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
          <div className="grid grid-cols-2 gap-1">
            {['exclusive', 'inclusive'].map(t => (
              <button key={t} onClick={() => setGstType(t)}
                className={`${btnBase} text-xs py-2 capitalize`}
                style={{ background: gstType === t ? 'linear-gradient(135deg, #00ffcc, #00ccff)' : 'var(--bg-input)', color: gstType === t ? '#0a0e27' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: gstType === t ? 700 : 400 }}>
                GST {t}
              </button>
            ))}
          </div>
        </div>

        {gstAmount && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Base Amount:</span><span style={{ color: 'var(--text-primary)' }}>{'\u20B9'}{result.base.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>CGST ({gstRate/2}%):</span><span style={{ color: 'var(--text-primary)' }}>{'\u20B9'}{result.cgst.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>SGST ({gstRate/2}%):</span><span style={{ color: 'var(--text-primary)' }}>{'\u20B9'}{result.sgst.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Total GST:</span><span style={{ color: 'var(--accent)' }}>{'\u20B9'}{result.gst.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Total:</span>
              <span style={{ color: 'var(--success-text)' }}>{'\u20B9'}{result.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderTax() {
    const result = calcTax();
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Annual Income ({'\u20B9'})</label>
          <input type="number" value={taxIncome} onChange={e => setTaxIncome(e.target.value)}
            placeholder="Enter annual income" className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Tax Regime</label>
          <div className="grid grid-cols-2 gap-1">
            {[{ key: 'new', label: 'New Regime' }, { key: 'old', label: 'Old Regime' }].map(r => (
              <button key={r.key} onClick={() => setTaxRegime(r.key)}
                className={`${btnBase} text-xs py-2`}
                style={{ background: taxRegime === r.key ? 'linear-gradient(135deg, #00ffcc, #00ccff)' : 'var(--bg-input)', color: taxRegime === r.key ? '#0a0e27' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: taxRegime === r.key ? 700 : 400 }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slab info */}
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>{taxRegime === 'new' ? 'New' : 'Old'} Regime Slabs</p>
          {taxRegime === 'new' ? (
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              <p>Up to 3L: Nil</p>
              <p>3L - 7L: 5%</p>
              <p>7L - 10L: 10%</p>
              <p>10L - 12L: 15%</p>
              <p>12L - 15L: 20%</p>
              <p>Above 15L: 30%</p>
            </div>
          ) : (
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              <p>Up to 2.5L: Nil</p>
              <p>2.5L - 5L: 5%</p>
              <p>5L - 10L: 20%</p>
              <p>Above 10L: 30%</p>
            </div>
          )}
        </div>

        {taxIncome && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Income Tax:</span><span style={{ color: 'var(--text-primary)' }}>{'\u20B9'}{result.tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>Cess (4%):</span><span style={{ color: 'var(--text-primary)' }}>{'\u20B9'}{result.cess.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Total Tax:</span>
              <span style={{ color: 'var(--danger-text)' }}>{'\u20B9'}{result.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs"><span style={{ color: 'var(--text-muted)' }}>Effective Rate:</span><span style={{ color: 'var(--accent)' }}>{result.effective.toFixed(2)}%</span></div>
          </div>
        )}
      </div>
    );
  }

  const panelRef = useRef(null);
  const fabRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        fabRef.current && !fabRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <>
      {/* Floating toggle button - always at bottom right */}
      <button
        ref={fabRef}
        onClick={() => setOpen(!open)}
        className="fixed z-[60] flex items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          bottom: '80px',
          right: '16px',
          width: '52px',
          height: '52px',
          background: 'linear-gradient(135deg, #00ffcc, #00ccff)',
          color: '#0a0e27',
          boxShadow: '0 4px 20px rgba(0,255,204,0.4)',
          fontSize: '22px',
        }}
      >
        {'\u{1F5A9}'}
      </button>

      {/* Calculator panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-[55] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            bottom: '140px',
            right: '16px',
            width: 'min(340px, calc(100vw - 32px))',
            maxHeight: 'min(70vh, 520px)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header with mode tabs */}
          <div className="flex items-center p-2 gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {MODES.map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`${btnBase} text-xs py-1.5 px-3 flex-1`}
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #00ffcc, #00ccff)' : 'transparent',
                  color: mode === m ? '#0a0e27' : 'var(--text-muted)',
                  fontWeight: mode === m ? 700 : 400,
                  borderRadius: '8px',
                }}>
                {m}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
            {mode === 'Scientific' && renderScientific()}
            {mode === 'GST' && renderGST()}
            {mode === 'Tax' && renderTax()}
          </div>
        </div>
      )}
    </>
  );
}
