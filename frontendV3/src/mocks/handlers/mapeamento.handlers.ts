import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'

export const mapeamentoHandlers = [
  http.get('/api/v1/account-mappings', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const cnpj = url.searchParams.get('cnpj')
    let items = [...db.accountMappings]
    if (cnpj) items = items.filter(m => m.cnpj === cnpj)
    return HttpResponse.json({ items, total: items.length })
  }),

  http.post('/api/v1/account-mappings', async ({ request }) => {
    await delay(300)
    const body = await request.json() as Record<string, unknown>
    const cnpj = body['cnpj'] as string
    const newMapping = {
      id: uuid(),
      cnpj,
      cnpj_formatado: cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
      conta_cliente: body['conta_cliente'] as string,
      conta_padrao: body['conta_padrao'] as string,
      nome_conta_cliente: body['nome_conta_cliente'] as string | undefined,
      nome_conta_padrao: body['nome_conta_padrao'] as string | undefined,
      criado_em: now(),
    }
    db.accountMappings.push(newMapping)
    return HttpResponse.json(newMapping, { status: 201 })
  }),

  http.put('/api/v1/account-mappings/:id', async ({ request, params }) => {
    await delay(300)
    const idx = db.accountMappings.findIndex(m => m.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    const body = await request.json() as Partial<typeof db.accountMappings[0]>
    db.accountMappings[idx] = { ...db.accountMappings[idx]!, ...body, id: db.accountMappings[idx]!.id }
    return HttpResponse.json(db.accountMappings[idx])
  }),

  http.delete('/api/v1/account-mappings/:id', async ({ params }) => {
    await delay(300)
    const idx = db.accountMappings.findIndex(m => m.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.accountMappings.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
