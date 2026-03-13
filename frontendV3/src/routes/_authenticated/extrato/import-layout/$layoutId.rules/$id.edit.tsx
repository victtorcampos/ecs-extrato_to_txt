import { createFileRoute } from '@tanstack/react-router'
import { RegraFormPage } from '@/features/regras/components/regra-form'

export const Route = createFileRoute('/_authenticated/extrato/import-layout/$layoutId/rules/$id/edit')({
  component: () => {
    const { layoutId, id } = Route.useParams()
    return <RegraFormPage layoutId={layoutId} id={id} />
  },
})
