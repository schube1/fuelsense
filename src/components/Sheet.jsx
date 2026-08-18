import { useEffect } from 'react';

/**
 * A bottom sheet — the iOS-native way to present a small form.
 *
 * Closes on backdrop tap and on Escape (useful when you're testing on a laptop).
 * While it's open, the page behind it can't scroll.
 */
export default function Sheet({ title, action, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        // Only close when the backdrop itself was pressed, not when a drag
        // started inside the sheet and ended out here.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h3>{title}</h3>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
