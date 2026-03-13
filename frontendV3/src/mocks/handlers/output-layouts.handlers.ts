import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'

export const outputLayoutHandlers = [
  http.get('/api/v1/output-profiles', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
    let items = [...db.outputProfiles]
    if (apenasAtivos) items = items.filter(p => p.ativo)
    return HttpResponse.json({ items, total: items.length })
  }),

  http.post('/api/v1/output-profiles', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Record<string, unknown>
    const newProfile = {
      id: uuid(),
      nome: body['nome'] as string,
      sistema_destino: body['sistema_destino'] as string,
      sistema_destino_nome: body['sistema_destino_nome'] as string ?? body['sistema_destino'] as string,
      formato: body['formato'] as string,
      formato_nome: body['formato_nome'] as string ?? body['formato'] as string,
      ativo: (body['ativo'] as boolean | undefined) ?? true,
      padrao: (body['padrao'] as boolean | undefined) ?? false,
      config: {},
      criado_em: now(),
      atualizado_em: now(),
      descricao: body['descricao'] as string | undefined,
    }
    if (newProfile.padrao) {
      db.outputProfiles.forEach(p => { p.padrao = false })
    }
    db.outputProfiles.push(newProfile)
    return HttpResponse.json(newProfile, { status: 201 })
  }),

  http.get('/api/v1/output-profiles/:id', async ({ params }) => {
    await delay(150)
    const profile = db.outputProfiles.find(p => p.id === params['id'])
    if (!profile) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    return HttpResponse.json(profile)
  }),

  http.put('/api/v1/output-profiles/:id', async ({ request, params }) => {
    await delay(400)
    const idx = db.outputProfiles.findIndex(p => p.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    const body = await request.json() as Partial<typeof db.outputProfiles[0]>
    if (body.padrao) {
      db.outputProfiles.forEach(p => { p.padrao = false })
    }
    db.outputProfiles[idx] = { ...db.outputProfiles[idx]!, ...body, id: db.outputProfiles[idx]!.id, atualizado_em: now() }
    return HttpResponse.json(db.outputProfiles[idx])
  }),

  http.delete('/api/v1/output-profiles/:id', async ({ params }) => {
    await delay(300)
    const idx = db.outputProfiles.findIndex(p => p.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.outputProfiles.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
