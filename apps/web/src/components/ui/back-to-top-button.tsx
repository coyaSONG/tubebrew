'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from './button';

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 1000px
      setIsVisible(window.scrollY > 1000);
    };

    // Add scroll event listener
    window.addEventListener('scroll', toggleVisibility);

    // Check on mount
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-8 right-8 rounded-full shadow-lg z-50"
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="w-4 h-4" />
    </Button>
  );
}
