export type VendorStaffRole =
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'waiter'
  | 'kitchen'

export type VendorStaffPermission =
  | 'checkout'
  | 'orders'
  | 'menu'
  | 'inventory'
  | 'customers'
  | 'staff'
  | 'tables'
  | 'settings'
  | 'reports'
  | 'kitchen_display'
  | 'refund'
  | 'discount'

export function permissionsForRole(role: VendorStaffRole): VendorStaffPermission[] {
  const all: VendorStaffPermission[] = [
    'checkout',
    'orders',
    'menu',
    'inventory',
    'customers',
    'staff',
    'tables',
    'settings',
    'reports',
    'kitchen_display',
    'refund',
    'discount',
  ]

  switch (role) {
    case 'owner':
    case 'manager':
      return all
    case 'supervisor':
      return [
        'checkout',
        'orders',
        'menu',
        'inventory',
        'customers',
        'tables',
        'reports',
        'refund',
        'discount',
      ]
    case 'cashier':
      return ['checkout', 'orders', 'customers', 'tables', 'reports']
    case 'waiter':
      return ['orders', 'tables']
    case 'kitchen':
      return ['orders', 'kitchen_display']
    default:
      return []
  }
}

/** Map desktop nav href → required permission (null = always for owner). */
export function permissionForNavHref(href: string): VendorStaffPermission | null {
  switch (href) {
    case '/':
      return 'checkout'
    case '/transactions':
      return 'reports'
    case '/orders':
      return 'orders'
    case '/kitchen':
      return 'kitchen_display'
    case '/delivery':
      return 'orders'
    case '/tables':
      return 'tables'
    case '/menu':
      return 'menu'
    case '/inventory':
      return 'inventory'
    case '/customers':
      return 'customers'
    case '/settings':
      return 'settings'
    default:
      return 'settings'
  }
}
