// Image optimization utilities

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

// Generate optimized image URL for CDN
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width,
    height,
    quality = 75,
    format = 'webp',
    fit = 'cover',
  } = options;

  // If using Next.js Image component, it handles optimization
  // This is for external CDN services like Cloudinary, Imgix, etc.

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  if (!cdnUrl) {
    return src;
  }

  const params = new URLSearchParams();

  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('f', format);
  params.append('fit', fit);

  return `${cdnUrl}/${src}?${params.toString()}`;
}

// Generate srcSet for responsive images
export function generateSrcSet(
  src: string,
  widths: number[] = [640, 750, 828, 1080, 1200, 1920],
  options: ImageOptimizationOptions = {}
): string {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(src, { ...options, width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

// Generate sizes attribute
export function generateSizes(breakpoints: {
  [key: string]: string;
}): string {
  return Object.entries(breakpoints)
    .map(([breakpoint, size]) => `(max-width: ${breakpoint}) ${size}`)
    .join(', ');
}

// Convert image to base64 for blur placeholder
export async function getBase64ImageUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error generating base64:', error);
    return null;
  }
}

// Get image dimensions
export async function getImageDimensions(
  src: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    img.src = src;

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      resolve(null);
    };
  });
}

// Preload critical images
export function preloadImage(src: string, options?: ImageOptimizationOptions): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = options ? getOptimizedImageUrl(src, options) : src;

  document.head.appendChild(link);
}

// Batch preload images
export function preloadImages(
  sources: Array<{ src: string; options?: ImageOptimizationOptions }>
): void {
  sources.forEach(({ src, options }) => {
    preloadImage(src, options);
  });
}

// Image compression (client-side)
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
}

// Check if browser supports WebP
export function supportsWebP(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const webP = new Image();
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
  });
}

// Check if browser supports AVIF
export function supportsAVIF(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const avif = new Image();
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
  });
}
