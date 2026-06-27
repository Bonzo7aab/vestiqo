'use client'

import { LogOut } from 'lucide-react'
import posthog from 'posthog-js'
import { logoutAction } from '../lib/auth/actions'
import { DropdownMenuItem } from './ui/dropdown-menu'

export function LogoutButton() {
  const handleLogout = async () => {
    posthog.capture('user_logged_out')
    posthog.reset()
    await logoutAction()
  }

  return (
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      <span>Wyloguj się</span>
    </DropdownMenuItem>
  )
}

