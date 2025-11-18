import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
  } = options;

  const [isVisible, setIsVisible] = useState(!enabled);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!enabled || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentElement = elementRef.current;

    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
      observer.disconnect();
    };
  }, [enabled, isVisible, threshold, rootMargin]);

  return { ref: elementRef, isVisible };
}

// Hook for preloading images
export function useImagePreload(src: string | string[]) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sources = Array.isArray(src) ? src : [src];
    let mounted = true;

    const loadImages = async () => {
      try {
        await Promise.all(
          sources.map((source) => {
            return new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.src = source;
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`Failed to load: ${source}`));
            });
          })
        );

        if (mounted) {
          setLoaded(true);
          setError(false);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setLoaded(false);
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, [src]);

  return { loaded, error };
}

// Hook for progressive image loading (blur-up effect)
export function useProgressiveImage(
  lowQualitySrc: string,
  highQualitySrc: string
) {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentSrc(lowQualitySrc);
    setIsLoading(true);

    const img = new Image();
    img.src = highQualitySrc;

    img.onload = () => {
      setCurrentSrc(highQualitySrc);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [lowQualitySrc, highQualitySrc]);

  return { currentSrc, isLoading };
}

// Hook for responsive images based on viewport
export function useResponsiveImage(sources: {
  [key: string]: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    const updateImage = () => {
      const width = window.innerWidth;

      if (width < 640 && sources.mobile) {
        setCurrentSrc(sources.mobile);
      } else if (width < 1024 && sources.tablet) {
        setCurrentSrc(sources.tablet);
      } else if (sources.desktop) {
        setCurrentSrc(sources.desktop);
      } else {
        // Fallback to first available source
        setCurrentSrc(Object.values(sources)[0] || '');
      }
    };

    updateImage();

    window.addEventListener('resize', updateImage);
    return () => window.removeEventListener('resize', updateImage);
  }, [sources]);

  return currentSrc;
}
