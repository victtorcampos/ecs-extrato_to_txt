import type { User } from '@/features/auth/services/schemas'
import type { ImportLayoutCompleto } from '@/features/import-layout/services/schemas'
import type { Regra } from '@/features/regras/services/schemas'
import type { OutputProfile } from '@/features/output-layout/services/schemas'
import type { Lote } from '@/features/lotes/services/schemas'
import type { AccountMapping } from '@/features/mapeamento/services/schemas'
import {
  SEED_USERS, SEED_IMPORT_LAYOUTS, SEED_REGRAS,
  SEED_OUTPUT_PROFILES, SEED_LOTES, SEED_ACCOUNT_MAPPINGS,
} from './seed/seed-data'

// In-memory store — resets on page refresh (MSW only)
export const db = {
  users: [...SEED_USERS] as User[],
  importLayouts: [...SEED_IMPORT_LAYOUTS] as ImportLayoutCompleto[],
  regras: [...SEED_REGRAS] as Regra[],
  outputProfiles: [...SEED_OUTPUT_PROFILES] as OutputProfile[],
  lotes: [...SEED_LOTES] as Lote[],
  accountMappings: [...SEED_ACCOUNT_MAPPINGS] as AccountMapping[],
}

export function uuid(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}
