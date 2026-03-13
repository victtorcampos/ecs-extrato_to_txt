import { createFileRoute } from '@tanstack/react-router'
import { OutputLayoutFormPage } from '@/features/output-layout/components/output-layout-form'

export const Route = createFileRoute('/_authenticated/extrato/output-layout/$id/edit')({
  component: () => {
    const { id } = Route.useParams()
    return <OutputLayoutFormPage id={id} />
  },
})
