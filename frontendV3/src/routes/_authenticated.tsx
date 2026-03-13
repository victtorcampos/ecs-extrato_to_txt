import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/shared/components/layout/app-shell'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('ecs_token')
    if (!token) throw redirect({ to: '/login' })
  },
  component: AppShell,
})
