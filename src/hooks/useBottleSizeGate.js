import { useState } from 'react';
import * as store from '../data/store.js';

/**
 * Shared "how big is your bottle?" logic for both the Today quick-add and the
 * Water screen, so the same day/prompt/goal-recompute behavior lives in one
 * place instead of being copy-pasted at each call site.
 *
 * Two ways to open it:
 *   gated(action)  — run `action` now, unless today hasn't answered yet, in
 *                     which case ask first and run `action` right after.
 *   openToChange() — open it standalone, any time, to switch to a new size
 *                     (e.g. you grabbed a different bottle today).
 */
export function useBottleSizeGate(date, day, run) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('ask'); // 'ask' | 'change'
  const [pendingAction, setPendingAction] = useState(null); // null | () => void
  const [sizeInput, setSizeInput] = useState('');

  const needsBottleSize = day?.water?.bottleOz == null;
  const currentOz = day?.water?.bottleOz ?? day?.goals?.bottleOz;

  const gated = (action) => {
    if (needsBottleSize) {
      setMode('ask');
      setSizeInput(String(currentOz));
      setPendingAction(() => action);
      setOpen(true);
    } else {
      action();
    }
  };

  const openToChange = () => {
    setMode('change');
    setSizeInput(String(currentOz));
    setPendingAction(null);
    setOpen(true);
  };

  const cancel = () => {
    setOpen(false);
    setPendingAction(null);
  };

  const confirm = async () => {
    const oz = Number(sizeInput);
    if (!Number.isFinite(oz) || oz <= 0) return;
    await run(() => store.setBottleSize(date, oz));
    setOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  };

  return {
    needsBottleSize,
    gated,
    openToChange,
    sheetProps: {
      open,
      title: mode === 'change' ? 'Change bottle size' : 'How big is your bottle?',
      sizeInput,
      setSizeInput,
      onConfirm: confirm,
      onCancel: cancel,
    },
  };
}
