'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Input } from '@/app/components/ui/input'
import { cn } from '@/lib/utils'

export type TxDatePreset = 'today' | 'yesterday' | '7d' | 'month' | 'all'
export type TxPaymentFilter = 'all' | 'cash' | 'card' | 'transfer'
export type TxChannelFilter = 'all' | 'pos' | 'online'
export type TxStatusFilter = 'all' | 'paid' | 'refunded'

type TransactionFilterBarProps = {
  datePreset: TxDatePreset
  dateLabel: string
  payment: TxPaymentFilter
  channel: TxChannelFilter
  status: TxStatusFilter
  searchQuery: string
  onDatePresetChange: (preset: TxDatePreset) => void
  onShiftDate: (direction: -1 | 1) => void
  onPaymentChange: (value: TxPaymentFilter) => void
  onChannelChange: (value: TxChannelFilter) => void
  onStatusChange: (value: TxStatusFilter) => void
  onSearchChange: (value: string) => void
}

function FilterChip({
  label,
  active,
  children,
}: {
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-10 gap-1.5 rounded-full px-3 font-medium',
            active && 'border-primary ring-1 ring-primary/30',
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[12rem]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TransactionFilterBar({
  datePreset,
  dateLabel,
  payment,
  channel,
  status,
  searchQuery,
  onDatePresetChange,
  onShiftDate,
  onPaymentChange,
  onChannelChange,
  onStatusChange,
  onSearchChange,
}: TransactionFilterBarProps) {
  const paymentLabel =
    payment === 'all'
      ? 'All Payment Methods'
      : payment === 'cash'
        ? 'Cash'
        : payment === 'card'
          ? 'Card'
          : 'Transfer'

  const channelLabel =
    channel === 'all' ? 'All Channels' : channel === 'pos' ? 'POS' : 'Online'

  const statusLabel =
    status === 'all' ? 'All Statuses' : status === 'paid' ? 'Paid' : 'Refunded'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-full border border-border bg-card">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => onShiftDate(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <FilterChip label={dateLabel} active>
            <DropdownMenuRadioGroup
              value={datePreset}
              onValueChange={(v) => onDatePresetChange(v as TxDatePreset)}
            >
              <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="yesterday">Yesterday</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="7d">Last 7 days</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="month">This month</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all">All time</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </FilterChip>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => onShiftDate(1)}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <FilterChip label={paymentLabel} active={payment !== 'all'}>
          <DropdownMenuRadioGroup
            value={payment}
            onValueChange={(v) => onPaymentChange(v as TxPaymentFilter)}
          >
            <DropdownMenuRadioItem value="all">All Payment Methods</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="cash">Cash</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="card">Card</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="transfer">Transfer</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </FilterChip>

        <FilterChip label={channelLabel} active={channel !== 'all'}>
          <DropdownMenuRadioGroup
            value={channel}
            onValueChange={(v) => onChannelChange(v as TxChannelFilter)}
          >
            <DropdownMenuRadioItem value="all">All Channels</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pos">POS</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="online">Online</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </FilterChip>

        <FilterChip label={statusLabel} active={status !== 'all'}>
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(v) => onStatusChange(v as TxStatusFilter)}
          >
            <DropdownMenuRadioItem value="all">All Statuses</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="paid">Paid</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="refunded">Refunded</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </FilterChip>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-9"
          placeholder="Filter by order #, receipt, or customer"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  )
}
