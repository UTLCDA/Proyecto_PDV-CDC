import { useEffect, useRef } from 'react';

interface OpcionesEscaner {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxIntervalMs?: number;
}

export const usarEscanerCodigoBarras = ({
  onScan,
  minLength = 3,
  maxIntervalMs = 50
}: OpcionesEscaner) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting input in form fields
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (timeDiff > maxIntervalMs) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          onScan(bufferRef.current);
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, minLength, maxIntervalMs]);
};

export default usarEscanerCodigoBarras;
