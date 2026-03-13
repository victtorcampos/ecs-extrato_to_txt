import { setupWorker } from 'msw/browser'
import { authHandlers } from './handlers/auth.handlers'
import { importLayoutHandlers } from './handlers/import-layouts.handlers'
import { regraHandlers } from './handlers/regras.handlers'
import { outputLayoutHandlers } from './handlers/output-layouts.handlers'
import { loteHandlers } from './handlers/lotes.handlers'
import { mapeamentoHandlers } from './handlers/mapeamento.handlers'

export const worker = setupWorker(
  ...authHandlers,
  ...importLayoutHandlers,
  ...regraHandlers,
  ...outputLayoutHandlers,
  ...loteHandlers,
  ...mapeamentoHandlers,
)
