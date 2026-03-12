# Manual — FrontendV2 (Angular 21)
> Instalação e execução no Windows com PowerShell

---

## Pré-requisitos

| Requisito     | Versão mínima | Verificar                    |
|---------------|---------------|------------------------------|
| Node.js       | 20 LTS        | `node --version`             |
| npm           | 10+           | `npm --version`              |
| Angular CLI   | 21+           | `ng version`                 |
| Backend ECS   | rodando       | `http://localhost:8000/api/health` |

### Instalar Node.js (se necessário)

```powershell
# Via winget (Windows 11)
winget install OpenJS.NodeJS.LTS

# Ou baixe em: https://nodejs.org/
```

### Instalar Angular CLI globalmente

```powershell
npm install -g @angular/cli
```

---

## Instalação

### 1. Abrir PowerShell na pasta do projeto

```powershell
cd "C:\App\python\ECS\ecs-extrato_to_txt\frontendV2"
```

### 2. Instalar dependências

```powershell
npm install
```

> A instalação pode levar alguns minutos na primeira vez.

---

## Execução em Desenvolvimento

### Passo 1 — Garantir que o backend está rodando

Em outro terminal PowerShell:

```powershell
cd "C:\App\python\ECS\ecs-extrato_to_txt\backend"
# Ativar ambiente virtual
.\.venv\Scripts\Activate.ps1
# Iniciar servidor
uvicorn server:app --reload --port 8000
```

Confirme que o backend responde:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

### Passo 2 — Iniciar o frontend

```powershell
cd "C:\App\python\ECS\ecs-extrato_to_txt\frontendV2"
npm start
```

O servidor de desenvolvimento iniciará em:

```
http://localhost:4200
```

> O proxy está configurado em `proxy.conf.json` para redirecionar `/api/**` para `http://localhost:8000`. Nenhuma configuração adicional é necessária.

---

## Configuração do Proxy (já inclusa)

O arquivo `proxy.conf.json` na raiz de `frontendV2/` já está configurado:

```json
{
  "/api": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Se o backend rodar em outra porta, edite este arquivo e altere `"target"`.

---

## Build de Produção

```powershell
npm run build
```

Os arquivos serão gerados em `dist/frontend-v2/browser/`.

### Servir o build localmente (opcional)

```powershell
# Instalar servidor estático (uma vez)
npm install -g serve

# Servir
serve dist/frontend-v2/browser -p 4200
```

---

## Primeiros passos na interface

1. Abra `http://localhost:4200` no navegador.
2. Na **topbar** (topo), clique em **"Selecionar CNPJ"**.
3. Escolha o CNPJ desejado na lista (carregada do backend).
4. Navegue até **Extrato to TXT** no menu lateral.
5. Use a aba **Upload** para enviar um arquivo Excel.
6. Acompanhe o processamento na aba **Lotes**.
7. Acesse **Configurações (⚙)** para gerenciar Mapeamentos, Layouts de Importação e de Saída.

> A sessão do CNPJ selecionado fica salva no `localStorage` do navegador e persiste entre recarregamentos.

---

## Solução de Problemas

### Erro `ng: comando não encontrado`

```powershell
npm install -g @angular/cli
# Reabrir o PowerShell após a instalação
```

### Erro de política de execução no PowerShell

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Porta 4200 em uso

```powershell
# Usar outra porta
npx ng serve --port 4300
```

### Backend inacessível (erro 502 no proxy)

- Verifique se o backend está rodando na porta 8000.
- Confirme com: `Invoke-RestMethod http://localhost:8000/api/health`
- Se necessário, edite a porta em `proxy.conf.json`.

### Erros de CORS

O proxy do Angular CLI elimina problemas de CORS em desenvolvimento. Em produção, configure o CORS no backend para aceitar a origem do servidor de produção.

---

## Scripts disponíveis

| Comando            | Descrição                              |
|--------------------|----------------------------------------|
| `npm start`        | Servidor de desenvolvimento (porta 4200) |
| `npm run build`    | Build de produção                      |
| `npm run watch`    | Build em modo watch (desenvolvimento)  |
| `npm test`         | Executa os testes unitários            |

---

## Estrutura do Projeto

```
frontendV2/
├── src/
│   ├── app/
│   │   ├── core/            # Services, models, interceptors, guards
│   │   ├── shared/          # Componentes e pipes reutilizáveis
│   │   └── features/
│   │       ├── dashboard/   # Página Dashboard
│   │       └── extrato/     # Módulo Extrato to TXT
│   ├── index.html
│   └── styles.css
├── proxy.conf.json           # Proxy para o backend
├── angular.json
└── package.json
```
