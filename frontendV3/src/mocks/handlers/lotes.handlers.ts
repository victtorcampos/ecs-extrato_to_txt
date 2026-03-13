import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'

export const loteHandlers = [
  http.get('/api/v1/lotes/estatisticas', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const cnpj = url.searchParams.get('cnpj')
    const lotes = cnpj ? db.lotes.filter(l => l.cnpj === cnpj) : db.lotes
    return HttpResponse.json({
      total: lotes.length,
      concluidos: lotes.filter(l => l.status === 'concluido').length,
      pendentes: lotes.filter(l => l.status === 'pendente').length,
      processando: lotes.filter(l => l.status === 'processando').length,
      com_erro: lotes.filter(l => l.status === 'erro').length,
    })
  }),

  http.get('/api/v1/lotes', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const cnpj = url.searchParams.get('cnpj')
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const pageSize = parseInt(url.searchParams.get('page_size') ?? '20')

    let items = [...db.lotes].sort((a, b) =>
      new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    )
    if (cnpj) items = items.filter(l => l.cnpj === cnpj)
    if (status) items = items.filter(l => l.status === status)

    const total = items.length
    const start = (page - 1) * pageSize
    items = items.slice(start, start + pageSize)
    return HttpResponse.json({ items, total, page, page_size: pageSize })
  }),

  http.post('/api/v1/lotes', async ({ request }) => {
    await delay(600)
    const body = await request.json() as Record<string, unknown>
    const mes = body['periodo_mes'] as number
    const ano = body['periodo_ano'] as number
    const layout = db.importLayouts.find(l => l.id === body['layout_id'])
    const newLote = {
      id: uuid(),
      protocolo: `ECS-${ano}-${String(db.lotes.length + 1).padStart(3, '0')}`,
      cnpj: body['cnpj'] as string,
      cnpj_formatado: (body['cnpj'] as string).replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
      periodo: `${ano}-${String(mes).padStart(2, '0')}`,
      nome_layout: layout?.nome ?? 'Layout desconhecido',
      layout_id: body['layout_id'] as string | undefined,
      perfil_saida_id: body['perfil_saida_id'] as string | undefined,
      status: 'aguardando' as const,
      nome_arquivo: body['nome_arquivo'] as string | undefined,
      tem_arquivo_saida: false,
      total_lancamentos: 0,
      valor_total: 0,
      total_pendencias: 0,
      pendencias_resolvidas: 0,
      criado_em: now(),
      atualizado_em: now(),
    }
    db.lotes.push(newLote)
    return HttpResponse.json(newLote, { status: 201 })
  }),

  http.get('/api/v1/lotes/:id', async ({ params }) => {
    await delay(150)
    const lote = db.lotes.find(l => l.id === params['id'])
    if (!lote) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    return HttpResponse.json(lote)
  }),

  http.post('/api/v1/lotes/:id/processar', async ({ params }) => {
    await delay(500)
    const lote = db.lotes.find(l => l.id === params['id'])
    if (!lote) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    lote.status = 'processando'
    lote.atualizado_em = now()
    // Simula conclusão após delay
    setTimeout(() => {
      const found = db.lotes.find(l => l.id === params['id'])
      if (found) {
        found.status = 'concluido'
        found.total_lancamentos = Math.floor(Math.random() * 200) + 50
        found.valor_total = +(Math.random() * 50000 + 5000).toFixed(2)
        found.tem_arquivo_saida = true
        found.processado_em = new Date().toISOString()
        found.atualizado_em = new Date().toISOString()
      }
    }, 3000)
    return HttpResponse.json(lote)
  }),

  http.delete('/api/v1/lotes/:id', async ({ params }) => {
    await delay(300)
    const idx = db.lotes.findIndex(l => l.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.lotes.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
