'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad'> {
  fallback?: string;
  showLoader?: boolean;
  loaderClassName?: string;
  lazy?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallback = '/placeholder.png',
  showLoader = true,
  loaderClassName,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  className,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const imageRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, shouldLoad, threshold, rootMargin]);

  // Update image source when src changes or should load
  useEffect(() => {
    if (shouldLoad && src) {
      setImageSrc(src.toString());
    }
  }, [src, shouldLoad]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setImageSrc(fallback);
  };

  return (
    <div ref={imageRef} className={cn('relative overflow-hidden', className)}>
      {isLoading && showLoader && (
        <div
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse',
            loaderClassName
          )}
        />
      )}
      {shouldLoad && (
        <Image
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            hasError && 'grayscale'
          )}
          {...props}
        />
      )}
    </div>
  );
}

// Background Image Component with lazy loading
interface OptimizedBackgroundImageProps {
  src: string;
  fallback?: string;
  className?: string;
  children?: React.ReactNode;
  lazy?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function OptimizedBackgroundImage({
  src,
  fallback = '/placeholder.png',
  className,
  children,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
}: OptimizedBackgroundImageProps) {
  const [backgroundSrc, setBackgroundSrc] = useState<string>(
    lazy ? fallback : src
  );
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy) {
      loadImage(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage(src);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, lazy, threshold, rootMargin]);

  const loadImage = (imageSrc: string) => {
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => {
      setBackgroundSrc(imageSrc);
      setIsLoading(false);
    };
    img.onerror = () => {
      setBackgroundSrc(fallback);
      setIsLoading(false);
    };
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-cover bg-center bg-no-repeat transition-all duration-300',
        isLoading && 'animate-pulse bg-gray-200',
        className
      )}
      style={{
        backgroundImage: `url(${backgroundSrc})`,
      }}
    >
      {children}
    </div>
  );
}

// Picture element component for art direction and format selection
interface OptimizedPictureProps {
  src: string;
  alt: string;
  sources?: {
    srcSet: string;
    media?: string;
    type?: string;
  }[];
  fallback?: string;
  className?: string;
  lazy?: boolean;
  width?: number;
  height?: number;
}

export function OptimizedPicture({
  src,
  alt,
  sources = [],
  fallback = '/placeholder.png',
  className,
  lazy = true,
  width,
  height,
}: OptimizedPictureProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <picture>
        {sources.map((source, index) => (
          <source key={index} {...source} />
        ))}
        <img
          src={src}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          width={width}
          height={height}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            hasError && 'hidden'
          )}
        />
      </picture>
      {hasError && (
        <img
          src={fallback}
          alt={alt}
          className="w-full h-full object-cover grayscale"
        />
      )}
    </div>
  );
}
