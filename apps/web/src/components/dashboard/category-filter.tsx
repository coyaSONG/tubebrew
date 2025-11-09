'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categoryCounts?: Record<string, number>;
  showCount?: boolean;
  className?: string;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  categoryCounts,
  showCount = false,
  className = '',
}: CategoryFilterProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleCategoryClick = (category: string | null) => {
    onCategoryChange(category);
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft =
        direction === 'left'
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });

      setTimeout(checkScrollButtons, 300);
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative w-full bg-background ${className}`}>
      <div className="relative flex items-center">
        {showLeftArrow && (
          <div className="absolute left-0 z-10 flex items-center h-full bg-gradient-to-r from-background via-background to-transparent pr-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background border border-border shadow-sm hover:bg-accent"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-4 px-1"
          onScroll={checkScrollButtons}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* "All" button */}
          <button
            onClick={() => handleCategoryClick(null)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
              transition-all duration-200 ease-in-out
              border font-medium text-sm
              ${
                activeCategory === null
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                  : 'bg-background text-foreground border-border hover:bg-accent hover:border-accent-foreground/20 hover:scale-105'
              }
            `}
            aria-pressed={activeCategory === null}
          >
            <span>전체</span>
            {showCount && categoryCounts?.['all'] !== undefined && (
              <Badge
                variant={activeCategory === null ? 'secondary' : 'outline'}
                className={`
                  h-5 px-1.5 text-xs font-semibold
                  ${
                    activeCategory === null
                      ? 'bg-primary-foreground/20 text-primary-foreground border-0'
                      : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {categoryCounts['all']}
              </Badge>
            )}
          </button>

          {/* Category buttons */}
          {categories.map((category) => {
            const isActive = category === activeCategory;
            const count = categoryCounts?.[category];

            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                  transition-all duration-200 ease-in-out
                  border font-medium text-sm
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                      : 'bg-background text-foreground border-border hover:bg-accent hover:border-accent-foreground/20 hover:scale-105'
                  }
                `}
                aria-pressed={isActive}
              >
                <span>{category}</span>
                {showCount && count !== undefined && (
                  <Badge
                    variant={isActive ? 'secondary' : 'outline'}
                    className={`
                      h-5 px-1.5 text-xs font-semibold
                      ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground border-0'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {showRightArrow && (
          <div className="absolute right-0 z-10 flex items-center h-full bg-gradient-to-l from-background via-background to-transparent pl-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background border border-border shadow-sm hover:bg-accent"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
