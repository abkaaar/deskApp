export function canAccessRestaurantDesktop(profile: {
  role: string | null
  vendor_type: string | null
}): boolean {
  return (
    profile.role?.toLowerCase() === 'premium' &&
    profile.vendor_type?.toLowerCase() === 'restaurant'
  )
}

export function getDesktopAccessDenialMessage(profile: {
  role: string | null
  vendor_type: string | null
}): string {
  if (profile.role?.toLowerCase() !== 'premium') {
    return 'Foodma Restaurant Desktop requires an approved premium restaurant account.'
  }
  if (profile.vendor_type?.toLowerCase() !== 'restaurant') {
    return 'This app is for restaurant businesses only. Other vendor types should use the Foodma mobile app.'
  }
  return 'Your account does not have access to Foodma Restaurant Desktop.'
}
