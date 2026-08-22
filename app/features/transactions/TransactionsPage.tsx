import { useMemo, useState } from 'react'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import { formatCurrency } from '@/lib/checkout/format'
import { formatOrderId } from '@/lib/orders/status'

import { TransactionCard } from './components/TransactionCard'
import {
  TransactionFilterBar,
  type TxChannelFilter,
  type TxDatePreset,
  type TxPaymentFilter,
  type TxStatusFilter,
} from './components/TransactionFilterBar'
import { useVendorTransactions } from './hooks/useVendorTransactions'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function dateRangeForPreset(
  preset: TxDatePreset,
  anchor: Date,
): { from: Date | null; to: Date | null; label: string } {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const todayStart = startOfDay(new Date()).getTime()

  if (preset === 'all') {
    return { from: null, to: null, label: 'All time' }
  }

  if (preset === 'today') {
    const day = startOfDay(anchor)
    const label =
      day.getTime() === todayStart ? 'Today' : fmt(day)
    return { from: day, to: endOfDay(day), label }
  }

  if (preset === 'yesterday') {
    const day = startOfDay(anchor)
    day.setDate(day.getDate() - 1)
    const yesterdayStart = todayStart - 86_400_000
    const label =
      day.getTime() === yesterdayStart ? 'Yesterday' : fmt(day)
    return { from: day, to: endOfDay(day), label }
  }

  if (preset === '7d') {
    const to = endOfDay(anchor)
    const from = startOfDay(anchor)
    from.setDate(from.getDate() - 6)
    const isCanonical =
      startOfDay(anchor).getTime() === todayStart
    return {
      from,
      to,
      label: isCanonical ? 'Last 7 days' : `${fmt(from)}–${fmt(to)}`,
    }
  }

  // month
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0))
  const now = new Date()
  const isThisMonth =
    from.getFullYear() === now.getFullYear() && from.getMonth() === now.getMonth()
  return {
    from,
    to,
    label: isThisMonth ? 'This month' : `${fmt(from)}–${fmt(to)}`,
  }
}

export function TransactionsPage() {
  const { transactions, loading, refreshing, error, hasMore, refresh, loadMore, loadingMore } =
    useVendorTransactions()

  const [searchQuery, setSearchQuery] = useState('')
  const [datePreset, setDatePreset] = useState<TxDatePreset>('today')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [payment, setPayment] = useState<TxPaymentFilter>('all')
  const [channel, setChannel] = useState<TxChannelFilter>('all')
  const [status, setStatus] = useState<TxStatusFilter>('all')

  const range = useMemo(
    () => dateRangeForPreset(datePreset, anchorDate),
    [datePreset, anchorDate],
  )

  const filtered = useMemo(() => {
    let list = transactions

    if (range.from && range.to) {
      const fromMs = range.from.getTime()
      const toMs = range.to.getTime()
      list = list.filter((row) => {
        const t = new Date(row.order.created_at).getTime()
        return t >= fromMs && t <= toMs
      })
    }

    if (payment !== 'all') {
      list = list.filter((row) => row.paymentMethod === payment)
    }

    if (channel === 'pos') {
      list = list.filter((row) => row.source === 'pos')
    } else if (channel === 'online') {
      list = list.filter((row) => row.source === 'online')
    }

    if (status === 'paid') {
      list = list.filter(
        (row) => (row.order.payment_status ?? 'paid') === 'paid',
      )
    } else if (status === 'refunded') {
      list = list.filter((row) => row.order.payment_status === 'refunded')
    }

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (row) =>
          row.customerLabel.toLowerCase().includes(query) ||
          formatOrderId(row.order.id).toLowerCase().includes(query) ||
          (row.order.order_number ?? '').toLowerCase().includes(query),
      )
    }

    return list
  }, [transactions, range, payment, channel, status, searchQuery])

  const collected = useMemo(
    () =>
      filtered
        .filter((row) => (row.order.payment_status ?? 'paid') === 'paid')
        .reduce((sum, row) => sum + (Number(row.order.total) || 0), 0),
    [filtered],
  )

  const refunded = useMemo(
    () =>
      filtered
        .filter((row) => row.order.payment_status === 'refunded')
        .reduce((sum, row) => sum + (Number(row.order.total) || 0), 0),
    [filtered],
  )

  const handleShiftDate = (direction: -1 | 1) => {
    if (datePreset === 'all') {
      setDatePreset('today')
      setAnchorDate(new Date())
      return
    }
    setAnchorDate((prev) => {
      const next = new Date(prev)
      if (datePreset === '7d') {
        next.setDate(next.getDate() + direction * 7)
      } else if (datePreset === 'month') {
        next.setMonth(next.getMonth() + direction)
      } else if (datePreset === 'yesterday') {
        // Collapse to single-day navigation from the resolved yesterday
        next.setDate(next.getDate() - 1 + direction)
        setDatePreset('today')
      } else {
        next.setDate(next.getDate() + direction)
      }
      return next
    })
  }

  const dateLabel = range.label

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ArrowLeftRight className="h-6 w-6" />
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter payments, find a sale, and review POS or online orders.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={refreshing}
          onClick={() => void refresh()}
          className="gap-2 rounded-full"
        >
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">In view · collected</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(collected)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">In view · refunded</p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(refunded)}</p>
        </div>
      </div>

      <TransactionFilterBar
        datePreset={datePreset}
        dateLabel={dateLabel}
        payment={payment}
        channel={channel}
        status={status}
        searchQuery={searchQuery}
        onDatePresetChange={(preset) => {
          setDatePreset(preset)
          setAnchorDate(new Date())
        }}
        onShiftDate={handleShiftDate}
        onPaymentChange={setPayment}
        onChannelChange={setChannel}
        onStatusChange={setStatus}
        onSearchChange={setSearchQuery}
      />

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading transactions…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No transactions match</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try another date range or clear a filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <TransactionCard
              key={row.order.id}
              row={row}
              onChanged={() => void refresh()}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && filtered.length > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="rounded-full"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
