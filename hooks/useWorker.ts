import { useEffect, useRef, useState, useCallback } from 'react';
import { workerScript } from '../utils/workerCode';
import { WorkerMessage, WorkerResponse } from '../types';

export const useWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;
    setIsReady(true);

    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  }, []);

  const processImage = useCallback((message: WorkerMessage): Promise<WorkerResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject('Worker not ready');

      const handleMessage = (e: MessageEvent) => {
        workerRef.current?.removeEventListener('message', handleMessage);
        resolve(e.data);
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage(message);
    });
  }, []);

  return { processImage, isReady };
};
