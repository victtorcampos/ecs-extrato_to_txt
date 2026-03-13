import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'

export const regraHandlers = [
  http.get('/api/v1/import-layouts/:layoutId/rules', async ({ params, request }) => {
    await delay(200)
    const url = new URL(request.url)
    const apenasAtivas = url.searchParams.get('apenas_ativas') === 'true'
    let items = db.regras.filter(r => r.layout_id === params['layoutId'])
    if (apenasAtivas) items = items.filter(r => r.ativo)
    items.sort((a, b) => a.ordem - b.ordem)
    return HttpResponse.json({ items, total: items.length })
  }),

  http.post('/api/v1/import-layouts/:layoutId/rules', async ({ request, params }) => {
    await delay(300)
    const body = await request.json() as Record<string, unknown>
    const existentes = db.regras.filter(r => r.layout_id === params['layoutId'])
    const newRegra = {
      id: uuid(),
      layout_id: params['layoutId'] as string,
      nome: body['nome'] as string,
      descricao: body['descricao'] as string | undefined,
      ordem: existentes.length + 1,
      ativo: true,
      tipo: body['tipo'] as 'filtro' | 'transformacao' | 'validacao' | 'enriquecimento',
      condicoes: (body['condicoes'] as []) ?? [],
      condicoes_ou: (body['condicoes_ou'] as [] | undefined),
      acao: body['acao'] as { tipo_acao: 'excluir' | 'definir_valor' | 'concatenar' | 'substituir' | 'maiuscula' | 'minuscula' | 'absoluto'; campo_destino?: string; valor?: string },
      criado_em: now(),
    }
    db.regras.push(newRegra)
    return HttpResponse.json(newRegra, { status: 201 })
  }),

  http.get('/api/v1/import-layouts/:layoutId/rules/:id', async ({ params }) => {
    await delay(150)
    const regra = db.regras.find(r => r.id === params['id'] && r.layout_id === params['layoutId'])
    if (!regra) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    return HttpResponse.json(regra)
  }),

  http.put('/api/v1/import-layouts/:layoutId/rules/:id', async ({ request, params }) => {
    await delay(300)
    const idx = db.regras.findIndex(r => r.id === params['id'] && r.layout_id === params['layoutId'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    const body = await request.json() as Partial<typeof db.regras[0]>
    db.regras[idx] = { ...db.regras[idx]!, ...body, id: db.regras[idx]!.id, atualizado_em: now() }
    return HttpResponse.json(db.regras[idx])
  }),

  http.delete('/api/v1/import-layouts/:layoutId/rules/:id', async ({ params }) => {
    await delay(300)
    const idx = db.regras.findIndex(r => r.id === params['id'] && r.layout_id === params['layoutId'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.regras.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.put('/api/v1/import-layouts/:layoutId/rules/reorder', async ({ request, params }) => {
    await delay(200)
    const body = await request.json() as { ids: string[] }
    body.ids.forEach((id, i) => {
      const regra = db.regras.find(r => r.id === id && r.layout_id === params['layoutId'])
      if (regra) regra.ordem = i + 1
    })
    return HttpResponse.json({ ok: true })
  }),
]
