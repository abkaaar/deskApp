import { Star, UtensilsCrossed } from 'lucide-react'

import { formatCurrency } from '@/lib/checkout/format'
import type { MenuPost } from '@/lib/checkout/types'
import { cn } from '@/lib/utils'

type ProductCardProps = {
  post: MenuPost
  onAdd: (post: MenuPost) => void
  favorited?: boolean
  onToggleFavorite?: () => void
}

export function ProductCard({ post, onAdd, favorited = false, onToggleFavorite }: ProductCardProps) {
  const price = post.price ?? 0
  const outOfStock =
    post.is_available === false || (post.stock_quantity != null && post.stock_quantity <= 0)
  const sellable = !outOfStock && price > 0

  return (
    <div
      className={cn(
        'relative flex h-[168px] flex-col overflow-hidden rounded-[12px] border border-border bg-card text-left',
        !sellable && 'opacity-50',
      )}
    >
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={favorited ? 'Unpin favorite' : 'Pin favorite'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className="absolute right-1 top-1 z-10 rounded-full p-1.5 text-lg leading-none"
        >
          <Star
            className={cn(
              'h-4 w-4',
              favorited ? 'fill-primary text-primary' : 'text-muted-foreground',
            )}
          />
        </button>
      )}
      <button
        type="button"
        disabled={!sellable}
        onClick={() => onAdd(post)}
        className={cn(
          'flex h-full flex-col text-left',
          sellable ? 'active:scale-[0.99]' : 'cursor-not-allowed',
        )}
      >
        <div className="flex h-[72px] w-full items-center justify-center overflow-hidden rounded-[12px] bg-muted">
          {post.image_url ? (
            <img src={post.image_url} alt={post.title} className="h-full w-full object-cover" />
          ) : (
            <UtensilsCrossed className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">{post.title}</p>
          <p className="text-sm font-medium">
            {!sellable
              ? outOfStock
                ? 'Out of stock'
                : 'Unavailable'
              : formatCurrency(price)}
          </p>
          {post.stock_quantity != null && post.stock_quantity > 0 && (
            <p className="text-[11px] text-muted-foreground">Stock {post.stock_quantity}</p>
          )}
        </div>
      </button>
    </div>
  )
}
