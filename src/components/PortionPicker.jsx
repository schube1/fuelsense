import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { portionMath } from '../lib/estimate.js';

/**
 * Lets the user pick how much of a scanned product they ate.
 *
 * Props:
 *   product  — { name, calories100g, protein100g, servingGrams, packageGrams }
 *   onSelect(draft) — called with { description, calories, protein, source:'barcode' }
 *   onClose()
 */
export default function PortionPicker({ product, onSelect, onClose }) {
  const hasServing = Boolean(product.servingGrams);
  const hasPackage = Boolean(product.packageGrams);

  const [preset, setPreset] = useState(hasServing ? 'serving' : hasPackage ? 'package' : 'custom');
  const [qty, setQty] = useState(1); // × servings for 'custom'

  function macrosForPreset() {
    if (preset === 'serving' && hasServing) {
      return portionMath(product, product.servingGrams);
    }
    if (preset === 'package' && hasPackage) {
      return portionMath(product, product.packageGrams);
    }
    // custom: qty × serving grams
    const grams = (product.servingGrams || 100) * qty;
    return portionMath(product, grams);
  }

  const macros = macrosForPreset();

  function confirm() {
    onSelect({
      description: product.name,
      calories: macros.calories,
      protein: macros.protein,
      source: 'barcode',
    });
  }

  const presets = [
    hasServing && { id: 'serving', label: '1 serving', sub: product.servingGrams ? `${product.servingGrams} g` : null },
    hasPackage && { id: 'package', label: 'Whole package', sub: product.packageGrams ? `${product.packageGrams} g` : null },
    { id: 'custom', label: 'Custom', sub: 'choose amount' },
  ].filter(Boolean);

  return (
    <Sheet title="How much did you have?" onClose={onClose}>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 16, fontWeight: 560 }}>
        {product.name}
      </p>

      {/* Preset selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: preset === p.id ? 'var(--card-2)' : 'var(--card)',
              border: `1px solid ${preset === p.id ? 'var(--hair-strong)' : 'var(--hair)'}`,
              borderRadius: 'var(--r-md)',
              padding: '12px 14px',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ fontWeight: preset === p.id ? 640 : 500, fontSize: 14 }}>{p.label}</span>
            {p.sub && (
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{p.sub}</span>
            )}
          </button>
        ))}
      </div>

      {/* Custom qty stepper */}
      {preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, justifyContent: 'center' }}>
          <button
            className="btn"
            style={{ width: 44, padding: '10px 0', fontSize: 20 }}
            onClick={() => setQty((q) => Math.max(0.5, q - 0.5))}
          >
            −
          </button>
          <span style={{ fontSize: 20, fontWeight: 660, minWidth: 40, textAlign: 'center' }}>
            {qty % 1 === 0 ? qty : qty.toFixed(1)}×
          </span>
          <button
            className="btn"
            style={{ width: 44, padding: '10px 0', fontSize: 20 }}
            onClick={() => setQty((q) => q + 0.5)}
          >
            +
          </button>
        </div>
      )}

      {/* Macro preview */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          background: 'var(--card)',
          border: '1px solid var(--hair)',
          borderRadius: 'var(--r-md)',
          padding: '12px 14px',
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 640 }}>Calories</div>
          <div style={{ fontSize: 22, fontWeight: 660 }}>{macros.calories.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 640 }}>Protein</div>
          <div style={{ fontSize: 22, fontWeight: 660 }}>{macros.protein} g</div>
        </div>
      </div>

      <button className="btn btn-food" onClick={confirm}>
        Use these values
      </button>
      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
