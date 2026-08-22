import { cn } from '@/lib/utils'

type CategoryChipsProps = {
  categories: string[]
  activeCategory: string | null
  onSelect: (category: string | null) => void
}

export function CategoryChips({ categories, activeCategory, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((category) => {
        const isAll = category === 'All'
        const isActive = isAll ? activeCategory === null : activeCategory === category

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(isAll ? null : category)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}
