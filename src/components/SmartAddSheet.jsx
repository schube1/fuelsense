import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet.jsx';
import BarcodeScanner from './BarcodeScanner.jsx';
import PortionPicker from './PortionPicker.jsx';
import { estimateFromText, lookupBarcode } from '../lib/estimate.js';
import * as store from '../data/store.js';

/**
 * AI/barcode pre-fill sheet.
 *
 * Resolves a meal into { description, calories, protein, source } and hands
 * it back via onDraft. Never writes to storage directly.
 *
 * Props:
 *   onDraft({ description, calories, protein, source }) — called on success
 *   onClose()
 */
export default function SmartAddSheet({ onDraft, onClose }) {
  const [mode, setMode] = useState('text'); // 'text' | 'scanning' | 'barcode-loading' | 'portion' | 'loading' | 'error'
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);   // from lookupBarcode
  const [fromArchive, setFromArchive] = useState(false);
  const libraryRef = useRef(null);

  // Load food library once on mount for offline archive matching
  useEffect(() => {
    store.getFoodLibrary().then((lib) => { libraryRef.current = lib; });
  }, []);

  async function handleEstimate() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMode('loading');
    setError(null);
    setFromArchive(false);

    try {
      const draft = await estimateFromText(trimmed, libraryRef.current ?? []);
      if (draft.source === 'library') setFromArchive(true);
      onDraft(draft);
    } catch (err) {
      setError(err.message || 'Could not estimate — try again or log manually.');
      setMode('error');
    }
  }

  async function handleScan(code) {
    setMode('barcode-loading');
    setError(null);

    try {
      const result = await lookupBarcode(code);
      if (result.notFound) {
        setError(`Barcode ${code} not found in Open Food Facts. Describe the meal instead.`);
        setMode('error');
        return;
      }
      setProduct(result);
      setMode('portion');
    } catch (err) {
      setError(err.message || 'Barcode lookup failed — try again or describe the meal.');
      setMode('error');
    }
  }

  // ---------------------------------------------------------------- portion mode

  if (mode === 'portion' && product) {
    return (
      <PortionPicker
        product={product}
        onSelect={(draft) => onDraft(draft)}
        onClose={onClose}
      />
    );
  }

  // ---------------------------------------------------------------- scanning mode

  if (mode === 'scanning') {
    return (
      <Sheet title="Scan barcode" onClose={onClose}>
        <BarcodeScanner onScan={handleScan} onClose={() => setMode('text')} />
      </Sheet>
    );
  }

  // ---------------------------------------------------------------- loading / barcode-loading

  if (mode === 'loading' || mode === 'barcode-loading') {
    return (
      <Sheet title={mode === 'barcode-loading' ? 'Looking up product…' : 'Estimating…'} onClose={onClose}>
        <div className="empty" style={{ padding: '48px 0' }}>
          {mode === 'barcode-loading' ? 'Checking Open Food Facts…' : 'Asking Claude…'}
        </div>
      </Sheet>
    );
  }

  // ---------------------------------------------------------------- text / error mode

  const isError = mode === 'error';

  return (
    <Sheet title="What did you eat?" onClose={onClose}>
      {isError && (
        <div
          style={{
            background: 'rgba(208, 59, 59, 0.12)',
            border: '1px solid rgba(208, 59, 59, 0.3)',
            borderRadius: 'var(--r-md)',
            padding: '10px 13px',
            marginBottom: 14,
            fontSize: 13,
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      <div className="field">
        <label htmlFor="smart-desc">Describe your meal</label>
        <textarea
          id="smart-desc"
          className="notes-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. grilled chicken breast, cup of rice, broccoli"
          rows={3}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--hair)',
            borderRadius: 11,
            padding: '12px 13px',
            fontSize: 16,
            resize: 'none',
            marginTop: 0,
            minHeight: 80,
          }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleEstimate();
          }}
        />
      </div>

      <div className="spacer-sm" />

      <button
        className="btn btn-food"
        disabled={!text.trim()}
        onClick={handleEstimate}
      >
        ✨ Estimate macros
      </button>

      <button
        className="btn btn-ghost"
        onClick={() => setMode('scanning')}
        style={{ marginTop: 4 }}
      >
        Scan barcode instead
      </button>

      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
