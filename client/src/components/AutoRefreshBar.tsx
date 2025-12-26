import { useEffect, useState, useRef } from 'react';

interface AutoRefreshBarProps {
  interval: number; // ms
  onRefresh: () => Promise<void> | void;
  className?: string;
}

export default function AutoRefreshBar({ interval, onRefresh, className = '' }: AutoRefreshBarProps) {
  const [progress, setProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startTime = useRef(Date.now());
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime.current;
      
      if (elapsed >= interval) {
        handleRefresh();
      } else {
        setProgress((elapsed / interval) * 100);
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const handleRefresh = async () => {
      setIsRefreshing(true);
      setProgress(100);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        startTime.current = Date.now();
        setProgress(0);
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [interval, onRefresh]);

  return (
    <div className={`w-full h-1 bg-gray-800 overflow-hidden ${className}`}>
      <div 
        className={`h-full bg-primary ${isRefreshing ? 'opacity-50' : ''}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
