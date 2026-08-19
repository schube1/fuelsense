import { useEffect, useRef } from 'react';

/**
 * Camera-based barcode scanner using html5-qrcode.
 *
 * REQUIRES HTTPS — camera access is blocked on plain HTTP (including the
 * `npm run dev --host` LAN URL). Test this component on a Vercel preview
 * deployment or on localhost (which counts as secure).
 *
 * Props:
 *   onScan(code: string) — called once on successful decode; stream stops
 *   onClose()            — called when the user taps the close button
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const divId = 'barcode-reader';

  useEffect(() => {
    // Warn in dev if not on a secure context
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost'
    ) {
      console.warn(
        '[BarcodeScanner] Camera requires HTTPS. ' +
          'Use a Vercel preview URL to test on a real device.',
      );
    }

    let scanner = null;
    let stopped = false;

    async function start() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      scanner = new Html5Qrcode(divId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 120 } },
          async (decodedText) => {
            if (stopped) return;
            stopped = true;
            await stopScanner(scanner);
            onScan(decodedText);
          },
          () => { /* per-frame decode errors — ignore */ },
        );
      } catch (err) {
        console.error('[BarcodeScanner] start failed:', err);
      }
    }

    start();

    return () => {
      stopped = true;
      stopScanner(scannerRef.current);
    };
  }, [onScan]);

  async function handleClose() {
    await stopScanner(scannerRef.current);
    onClose();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        id={divId}
        style={{
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#000',
          minHeight: 200,
        }}
      />
      <p
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 13,
          margin: 0,
        }}
      >
        Point at a barcode — it scans automatically
      </p>
      <button className="btn btn-ghost" onClick={handleClose}>
        Cancel scan
      </button>
    </div>
  );
}

async function stopScanner(scanner) {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
    scanner.clear();
  } catch {
    /* already stopped */
  }
}
