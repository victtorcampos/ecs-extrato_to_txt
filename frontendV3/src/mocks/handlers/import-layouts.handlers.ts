import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'

const CAMPOS_DISPONIVEIS = {
  data:          { label: 'Data', tipo: 'date', obrigatorio: true },
  valor:         { label: 'Valor', tipo: 'decimal', obrigatorio: true },
  historico:     { label: 'Histórico', tipo: 'string', obrigatorio: false },
  documento:     { label: 'Documento', tipo: 'string', obrigatorio: false },
  conta_debito:  { label: 'Conta Débito', tipo: 'string', obrigatorio: false },
  conta_credito: { label: 'Conta Crédito', tipo: 'string', obrigatorio: false },
  complemento:   { label: 'Complemento', tipo: 'string', obrigatorio: false },
}

export const importLayoutHandlers = [
  http.get('/api/v1/import-layouts/campos-disponiveis', async () => {
    await delay(150)
    return HttpResponse.json(CAMPOS_DISPONIVEIS)
  }),

  http.get('/api/v1/import-layouts', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const cnpj = url.searchParams.get('cnpj')
    const apenasAtivos = url.searchParams.get('apenas_ativos') === 'true'
    let items = [...db.importLayouts]
    if (cnpj) items = items.filter(l => l.cnpj === cnpj)
    if (apenasAtivos) items = items.filter(l => l.ativo)
    return HttpResponse.json({ items, total: items.length })
  }),

  http.post('/api/v1/import-layouts', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Record<string, unknown>
    const newLayout = {
      id: uuid(),
      nome: body['nome'] as string,
      cnpj: body['cnpj'] as string,
      ativo: (body['ativo'] as boolean | undefined) ?? true,
      criado_em: now(),
      descricao: body['descricao'] as string | undefined,
      config_planilha: body['config_planilha'] as Record<string, unknown> | undefined,
      colunas: (body['colunas'] as unknown[]) ?? [],
    }
    db.importLayouts.push(newLayout as typeof db.importLayouts[0])
    return HttpResponse.json(newLayout, { status: 201 })
  }),

  http.get('/api/v1/import-layouts/:id', async ({ params }) => {
    await delay(150)
    const layout = db.importLayouts.find(l => l.id === params['id'])
    if (!layout) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    return HttpResponse.json(layout)
  }),

  http.put('/api/v1/import-layouts/:id', async ({ request, params }) => {
    await delay(400)
    const idx = db.importLayouts.findIndex(l => l.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    const body = await request.json() as Partial<typeof db.importLayouts[0]>
    db.importLayouts[idx] = { ...db.importLayouts[idx]!, ...body, id: db.importLayouts[idx]!.id }
    return HttpResponse.json(db.importLayouts[idx])
  }),

  http.delete('/api/v1/import-layouts/:id', async ({ params }) => {
    await delay(300)
    const idx = db.importLayouts.findIndex(l => l.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.importLayouts.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/v1/import-layouts/preview-excel', async ({ request }) => {
    await delay(600)
    const body = await request.json() as Record<string, unknown>
    const linhaCabecalho = (body['linha_cabecalho'] as number | undefined) ?? 0
    const maxLinhas = (body['max_linhas'] as number | undefined) ?? 8
    const cabecalhos = ['Data', 'Histórico', 'Documento', 'Valor Débito', 'Valor Crédito', 'Saldo']
    const linhas = Array.from({ length: maxLinhas }, (_, i) => [
      `${String(i + 1).padStart(2, '0')}/01/2025`,
      i % 3 === 0 ? 'PAGTO FORNECEDOR' : i % 3 === 1 ? 'RECEITA VENDA' : 'TARIFA BANCARIA',
      `DOC${String(1000 + i)}`,
      i % 2 === 0 ? (Math.random() * 5000).toFixed(2) : '',
      i % 2 === 1 ? (Math.random() * 5000).toFixed(2) : '',
      (10000 + Math.random() * 5000).toFixed(2),
    ])
    return HttpResponse.json({
      abas: ['Extrato', 'Resumo'],
      aba_selecionada: (body['nome_aba'] as string | undefined) ?? 'Extrato',
      cabecalhos,
      linhas: linhaCabecalho === 0 ? linhas : [[...cabecalhos], ...linhas].slice(0, maxLinhas),
      total_linhas: 120,
      total_colunas: 6,
    })
  }),

  http.post('/api/v1/import-layouts/test-parse', async ({ request }) => {
    await delay(800)
    const body = await request.json() as Record<string, unknown>
    const mes = body['periodo_mes'] as number ?? 1
    const ano = body['periodo_ano'] as number ?? 2025
    const lancamentos = Array.from({ length: 12 }, (_, i) => ({
      linha: i + 2,
      data: `${String(i + 1).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`,
      valor: +(Math.random() * 8000 + 100).toFixed(2),
      conta_debito: i % 4 === 0 ? '' : '1.1.1.01',
      conta_credito: '3.1.1.01',
      historico: ['PAGTO FORNECEDOR', 'RECEITA VENDA', 'TARIFA BANCARIA', 'TRANSFERENCIA'][i % 4]!,
      documento: `DOC${1000 + i}`,
      status: i === 3 ? 'erro' : i % 4 === 0 ? 'sem_conta' : 'ok',
      mensagem: i === 3 ? 'Formato de data inválido' : undefined,
    }))
    const sem_conta = lancamentos.filter(l => l.status === 'sem_conta').length
    const erros = lancamentos.filter(l => l.status === 'erro').length
    return HttpResponse.json({
      lancamentos,
      resumo: { total: lancamentos.length, ok: lancamentos.length - sem_conta - erros, fora_periodo: 0, sem_conta, erros },
      erros: lancamentos.filter(l => l.status === 'erro').map(l => ({ linha: l.linha, campo: 'data', mensagem: l.mensagem! })),
      contas_pendentes: sem_conta > 0 ? [
        { conta: 'PAGTO FORNECEDOR', tipo: 'debito', mapeamento_existente: undefined },
      ] : [],
    })
  }),
]
