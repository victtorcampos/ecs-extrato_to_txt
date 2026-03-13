import { http, HttpResponse, delay } from 'msw'
import { db, uuid, now } from '../db'
import { SEED_CREDENTIALS } from '../seed/seed-data'

const SECRET = 'ecs-mock-secret-key'

function makeToken(userId: string): string {
  // Simple base64 JWT-like token (not cryptographically signed — mock only)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const user = db.users.find(u => u.id === userId)!
  const payload = btoa(JSON.stringify({
    sub: userId,
    email: user.email,
    papel: user.papel,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8h
    iat: Math.floor(Date.now() / 1000),
    _secret: SECRET,
  }))
  const sig = btoa(`${header}.${payload}`)
  return `${header}.${payload}.${sig}`
}

function verifyToken(token: string): { sub: string; email: string; papel: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]!)) as Record<string, unknown>
    if ((payload['exp'] as number) < Math.floor(Date.now() / 1000)) return null
    if (payload['_secret'] !== SECRET) return null
    return payload as { sub: string; email: string; papel: string }
  } catch {
    return null
  }
}

function getCurrentUser(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const claims = verifyToken(token)
  if (!claims) return null
  return db.users.find(u => u.id === claims.sub) ?? null
}

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { email: string; senha: string }
    const user = db.users.find(u => u.email === body.email && u.ativo)
    if (!user || SEED_CREDENTIALS[user.email] !== body.senha) {
      return HttpResponse.json({ detail: 'Credenciais inválidas' }, { status: 401 })
    }
    return HttpResponse.json({ access_token: makeToken(user.id), user })
  }),

  http.post('/api/v1/auth/logout', async () => {
    await delay(100)
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/v1/auth/me', async ({ request }) => {
    await delay(100)
    const user = getCurrentUser(request)
    if (!user) return HttpResponse.json({ detail: 'Não autorizado' }, { status: 401 })
    return HttpResponse.json(user)
  }),

  http.get('/api/v1/users', async ({ request }) => {
    await delay(200)
    const user = getCurrentUser(request)
    if (!user || user.papel !== 'admin') {
      return HttpResponse.json({ detail: 'Acesso negado' }, { status: 403 })
    }
    return HttpResponse.json({ items: db.users, total: db.users.length })
  }),

  http.post('/api/v1/users', async ({ request }) => {
    await delay(300)
    const admin = getCurrentUser(request)
    if (!admin || admin.papel !== 'admin') {
      return HttpResponse.json({ detail: 'Acesso negado' }, { status: 403 })
    }
    const body = await request.json() as Record<string, unknown>
    const newUser = {
      id: uuid(),
      nome: body['nome'] as string,
      email: body['email'] as string,
      papel: body['papel'] as 'admin' | 'operador' | 'visualizador',
      ativo: true,
      criado_em: now(),
    }
    db.users.push(newUser)
    if (body['senha']) SEED_CREDENTIALS[newUser.email] = body['senha'] as string
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.put('/api/v1/users/:id', async ({ request, params }) => {
    await delay(300)
    const admin = getCurrentUser(request)
    if (!admin || admin.papel !== 'admin') {
      return HttpResponse.json({ detail: 'Acesso negado' }, { status: 403 })
    }
    const idx = db.users.findIndex(u => u.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    const body = await request.json() as Partial<(typeof db.users)[0]>
    db.users[idx] = { ...db.users[idx]!, ...body, id: db.users[idx]!.id }
    return HttpResponse.json(db.users[idx])
  }),

  http.delete('/api/v1/users/:id', async ({ request, params }) => {
    await delay(300)
    const admin = getCurrentUser(request)
    if (!admin || admin.papel !== 'admin') {
      return HttpResponse.json({ detail: 'Acesso negado' }, { status: 403 })
    }
    const idx = db.users.findIndex(u => u.id === params['id'])
    if (idx === -1) return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 })
    db.users.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
