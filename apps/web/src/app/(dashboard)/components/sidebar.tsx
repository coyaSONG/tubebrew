'use client';

import { AI_CONFIG } from '@tubebrew/ai';

const CATEGORIES = ['전체', ...AI_CONFIG.categories];

interface SidebarProps {
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
}

export function Sidebar({
  selectedCategory,
  onCategoryChange,
}: SidebarProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3 text-sm">Categories</h3>
        <div className="space-y-1">
          {CATEGORIES.map((category) => {
            const isSelected =
              (category === '전체' && !selectedCategory) ||
              selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() =>
                  onCategoryChange?.(category === '전체' ? null : category)
                }
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-border">
        <h3 className="font-semibold mb-3 text-sm">Quick Actions</h3>
        <div className="space-y-2 text-sm">
          <button className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Refresh Feed
          </button>
          <button className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Manage Channels
          </button>
        </div>
      </div>
    </div>
  );
}
