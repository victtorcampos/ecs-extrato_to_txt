import { createFileRoute } from '@tanstack/react-router'
import { ImportLayoutFormPage } from '@/features/import-layout/components/import-layout-form'

export const Route = createFileRoute('/_authenticated/extrato/import-layout/new')({
  component: () => <ImportLayoutFormPage />,
})
