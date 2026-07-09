import { Home, ListTodo, Settings } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar'

const navigation = [
  { name: 'Home', icon: Home, href: '/' },
  { name: 'Tasks', icon: ListTodo, href: '/tasks' },
  { name: 'Settings', icon: Settings, href: '/settings' },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar className="bg-slate-800 text-white border-r-0">
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? 'bg-orange-500 text-white hover:bg-orange-500 hover:text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }
                    >
                      <NavLink to={item.href} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
