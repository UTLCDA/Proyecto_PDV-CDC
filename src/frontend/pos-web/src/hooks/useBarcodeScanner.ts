import { useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  timeThresholdMs?: number;
}

export const useBarcodeScanner = ({ onScan, timeThresholdMs = 50 }: UseBarcodeScannerProps) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if user is typing inside text inputs, textareas, or selects
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        // Exception: allow scanning if target has data-barcode-input attribute
        if (!target.getAttribute('data-barcode-input')) {
          return;
        }
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Reset buffer if time between keypresses is too long (human typing)
      if (timeDiff > timeThresholdMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.trim().length >= 3) {
          e.preventDefault();
          onScan(bufferRef.current.trim());
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, timeThresholdMs]);
};
