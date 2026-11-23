import React, { useEffect, useState } from 'react';
import { PETCLICK_IMAGES, PETCLICK_LOGO_REMOTE_URL } from '../lib/defaults';
import { resolveAssetUrl } from '../lib/imageManifest';
import { useStore } from '../context/StoreContext';

interface BrandLogoProps {
  variant?: 'header' | 'footer' | 'auth' | 'sidebar' | 'preview';
  customSrc?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'header',
  customSrc,
  className = '',
}) => {
  const { settings } = useStore();
  const [srcStage, setSrcStage] = useState<'primary' | 'remote' | 'text'>('primary');

  const resolved = resolveAssetUrl(customSrc ?? settings.logoUrl);
  const configuredSrc = resolved.primary || PETCLICK_IMAGES.logo;

  useEffect(() => {
    setSrcStage('primary');
  }, [configuredSrc]);

  const activeSrc =
    srcStage === 'primary'
      ? configuredSrc
      : srcStage === 'remote'
      ? resolved.fallback || PETCLICK_LOGO_REMOTE_URL
      : '';

  const storeName = settings.storeName || 'PetClick';
  const altText = `${storeName} — ${settings.slogan || 'Tudo para seu pet em um só lugar!'}`;

  const handleError = () => {
    if (srcStage === 'primary' && configuredSrc !== PETCLICK_LOGO_REMOTE_URL) {
      setSrcStage('remote');
    } else {
      setSrcStage('text');
    }
  };

  if (srcStage === 'text' || !activeSrc) {
    return (
      <span
        className={`font-extrabold tracking-tight whitespace-nowrap ${
          variant === 'footer' || variant === 'sidebar' ? 'text-white text-xl' : 'text-emerald-950 text-xl'
        } ${className}`}
      >
        {storeName}
      </span>
    );
  }

  if (variant === 'footer') {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-emerald-900/15 max-w-full ${className}`}
      >
        <img
          src={activeSrc}
          alt={altText}
          onError={handleError}
          className="w-48 sm:w-52 h-auto max-h-36 object-contain select-none"
        />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`inline-flex items-center justify-center bg-white rounded-xl px-2.5 py-1.5 shadow-sm ${className}`}>
        <img
          src={activeSrc}
          alt={altText}
          onError={handleError}
          className="h-11 w-auto max-w-[140px] object-contain select-none"
        />
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={activeSrc}
          alt={altText}
          onError={handleError}
          className="h-28 sm:h-32 w-auto max-w-full object-contain select-none"
        />
      </div>
    );
  }

  if (variant === 'preview') {
    return (
      <img
        src={activeSrc}
        alt={altText}
        onError={handleError}
        className={`h-24 w-auto object-contain select-none ${className}`}
      />
    );
  }

  // 'header': generous height so illustration, bone plaque, title & slogan remain crisp and completely uncropped
  return (
    <img
      src={activeSrc}
      alt={altText}
      onError={handleError}
      className={`h-16 sm:h-[76px] w-auto max-w-[140px] object-contain shrink-0 select-none ${className}`}
    />
  );
};
