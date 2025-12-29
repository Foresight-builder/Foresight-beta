"use client";

import { useState, useCallback } from "react";
import Image, { type ImageProps } from "next/image";

type OptimizedImageProps = Omit<ImageProps, "onError"> & {
  fallbackSrc?: string;
  fallbackGenerator?: (alt: string) => string;
};

/**
 * 优化图片组件
 * - 使用 Next.js Image 自动优化（WebP/AVIF、响应式、懒加载）
 * - 支持加载失败时自动回退到 fallback 图片
 * - 支持 blur placeholder
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  fallbackGenerator,
  className,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (hasError) return; // 防止循环
    setHasError(true);

    // 优先使用 fallbackSrc，其次使用 fallbackGenerator
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else if (fallbackGenerator) {
      setImgSrc(fallbackGenerator(alt));
    }
  }, [hasError, fallbackSrc, fallbackGenerator, alt]);

  // 当 src 变化时重置状态
  if (src !== imgSrc && !hasError) {
    setImgSrc(src);
  }

  return <Image {...props} src={imgSrc} alt={alt} className={className} onError={handleError} />;
}

/**
 * 事件卡片图片组件
 * 预设了适合卡片的尺寸和样式
 */
export function EventCardImage({
  src,
  alt,
  fallbackSrc,
  className = "",
}: {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (hasError) return;
    setHasError(true);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  }, [hasError, fallbackSrc]);

  // src 变化时重置
  if (src !== imgSrc && !hasError) {
    setImgSrc(src);
    setHasError(false);
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
      className={`object-cover transition-opacity duration-300 ${className}`}
      onError={handleError}
      priority={false}
    />
  );
}

/**
 * Hero 图片组件
 * 预设了适合 Hero 区域的尺寸和优先加载
 */
export function HeroImage({
  src,
  alt,
  fallbackSrc,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  priority?: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (hasError) return;
    setHasError(true);
    if (fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  }, [hasError, fallbackSrc]);

  // src 变化时重置
  if (src !== imgSrc && !hasError) {
    setImgSrc(src);
    setHasError(false);
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      className={`object-cover ${className}`}
      onError={handleError}
      priority={priority}
    />
  );
}
