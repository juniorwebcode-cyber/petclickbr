import React, { useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react';
import { resolveAssetUrl } from '../lib/imageManifest';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const { primary, fallback } = resolveAssetUrl(src);
  const [stage, setStage] = useState<'primary' | 'fallback' | 'failed'>('primary');

  useEffect(() => {
    setStage('primary');
  }, [primary, fallback]);

  const activeSrc =
    stage === 'primary' ? primary : stage === 'fallback' && fallback ? fallback : '';

  if (!activeSrc || stage === 'failed') {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-emerald-50/40 to-orange-50/40 text-stone-400 select-none p-4 ${className}`}
        role="img"
        aria-label={alt}
      >
        <PawPrint className="w-8 h-8 text-emerald-800/40 mb-2" strokeWidth={1.6} />
        {fallbackLabel && (
          <span className="text-xs font-medium text-stone-500 text-center line-clamp-2 max-w-[180px]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (stage === 'primary' && fallback && fallback !== primary) {
          setStage('fallback');
        } else {
          setStage('failed');
        }
      }}
      className={className}
      loading="lazy"
    />
  );
};
