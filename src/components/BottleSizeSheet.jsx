import Sheet from './Sheet.jsx';

/** Renders when `open` is true. Pass the `sheetProps` from useBottleSizeGate. */
export default function BottleSizeSheet({ open, title, sizeInput, setSizeInput, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="field">
        <label htmlFor="bottle-size">Size (fl oz)</label>
        <input
          id="bottle-size"
          type="number"
          inputMode="decimal"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
      </div>

      <div className="spacer-sm" />

      <button className="btn btn-water" disabled={!(Number(sizeInput) > 0)} onClick={onConfirm}>
        Confirm
      </button>

      <button className="btn btn-ghost" onClick={onCancel}>
        Cancel
      </button>
    </Sheet>
  );
}
