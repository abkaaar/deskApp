import { Routes, Route, Navigate } from 'react-router-dom'

import { CheckoutPage } from '@/app/features/checkout/CheckoutPage'
import { CustomersPage } from '@/app/features/customers/CustomersPage'
import { DeliveryPage } from '@/app/features/delivery/DeliveryPage'
import { InventoryPage } from '@/app/features/inventory/InventoryPage'
import { KitchenDisplayPage } from '@/app/features/kds/KitchenDisplayPage'
import { MenuPage } from '@/app/features/menu/MenuPage'
import { OrdersPage } from '@/app/features/orders/OrdersPage'
import { TablesPage } from '@/app/features/tables/TablesPage'
import { TransactionsPage } from '@/app/features/transactions/TransactionsPage'

import { SettingsPage } from './SettingsPage'

export function Main() {
  return (
    <Routes>
      <Route path="/" element={<CheckoutPage />} />
      <Route path="/checkout" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<Navigate to="/transactions" replace />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/kitchen" element={<KitchenDisplayPage />} />
      <Route path="/delivery" element={<DeliveryPage />} />
      <Route path="/tables" element={<TablesPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
