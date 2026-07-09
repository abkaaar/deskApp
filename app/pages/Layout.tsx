import React from 'react'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../components/ui/sidebar'
import { AppSidebar } from '../components/layout/Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="m-4 fixed bg-teal-500 hover:bg-teal-600 cursor-pointer" />
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
