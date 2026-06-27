"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export interface GalleryImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  /** Height of the gallery container in pixels */
  height?: number;
  className?: string;
}

function ImageGallery({ images, height = 300, className = "" }: ImageGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  // Initialize scroll state after mount and when images change
  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, images]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  if (images.length === 0) return null;

  return (
    <div className={`relative group ${className}`} role="region" aria-label="Image gallery">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-[var(--spacing-sm)] overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ height }}
      >
        {images.map((image, index) => (
          <div
            key={`${image.src}-${index}`}
            className="flex-shrink-0 snap-start rounded-md overflow-hidden"
            style={{ height }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width ?? 400}
              height={image.height ?? height}
              className="h-full w-auto object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Left navigation button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-elevated/90 p-2 shadow-md transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Scroll gallery left"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Right navigation button */}
      {canScrollRight && images.length > 1 && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface-elevated/90 p-2 shadow-md transition-opacity duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Scroll gallery right"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7.5 15L12.5 10L7.5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export { ImageGallery };
