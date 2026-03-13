import { createFileRoute } from '@tanstack/react-router'
import { RegraFormPage } from '@/features/regras/components/regra-form'

export const Route = createFileRoute('/_authenticated/extrato/import-layout/$layoutId/rules/new')({
  component: () => {
    const { layoutId } = Route.useParams()
    return <RegraFormPage layoutId={layoutId} />
  },
})
