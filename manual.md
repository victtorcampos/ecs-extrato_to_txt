# Manual de Instalação e Execução Local

## Sistema Contábil - Windows 11 + PowerShell 7.5

---

## 📁 Estrutura de Pastas Completa

```
C:\App\python\app1.tech.vcinf\
│
├── backend\
│   ├── src\
│   │   ├── domain\
│   │   │   ├── entities\
│   │   │   │   ├── __init__.py
│   │   │   │   └── entities.py
│   │   │   ├── exceptions\
│   │   │   │   ├── __init__.py
│   │   │   │   └── domain_exceptions.py
│   │   │   ├── value_objects\
│   │   │   │   ├── __init__.py
│   │   │   │   └── value_objects.py
│   │   │   └── __init__.py
│   │   ├── application\
│   │   │   ├── ports\
│   │   │   │   ├── repositories\
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   └── repository_ports.py
│   │   │   │   ├── services\
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   └── service_ports.py
│   │   │   │   └── __init__.py
│   │   │   ├── usecases\
│   │   │   │   ├── __init__.py
│   │   │   │   ├── usecases.py
│   │   │   │   └── mapeamento_usecases.py   ⚠️ NOVO!
│   │   │   └── __init__.py
│   │   ├── adapters\
│   │   │   ├── inbound\
│   │   │   │   ├── rest\
│   │   │   │   │   ├── controllers\
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   ├── lote_controller.py
│   │   │   │   │   │   └── account_mapping_controller.py  ⚠️ NOVO!
│   │   │   │   │   ├── dto\
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   └── dtos.py
│   │   │   │   │   └── __init__.py
│   │   │   │   └── __init__.py
│   │   │   ├── outbound\
│   │   │   │   ├── repositories\
│   │   │   │   │   ├── sqlalchemy\
│   │   │   │   │   │   ├── __init__.py
│   │   │   │   │   │   └── repositories.py
│   │   │   │   │   └── __init__.py
│   │   │   │   ├── excel_parser\
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   └── excel_parser.py
│   │   │   │   ├── txt_generator\
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   └── txt_generator.py
│   │   │   │   ├── email\
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   └── email_sender.py
│   │   │   │   └── __init__.py
│   │   │   └── __init__.py
│   │   ├── config\
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   └── __init__.py
│   ├── server.py
│   ├── requirements.txt
│   └── .env
│
└── frontend\
    ├── public\
    │   └── index.html
    ├── src\
    │   ├── components\
    │   │   ├── ui\
    │   │   │   ├── Badge.jsx
    │   │   │   ├── Button.jsx
    │   │   │   ├── Card.jsx
    │   │   │   ├── Input.jsx
    │   │   │   ├── Loading.jsx
    │   │   │   └── index.js
    │   │   ├── layout\
    │   │   │   ├── Layout.jsx
    │   │   │   └── index.js
    │   │   ├── dashboard\
    │   │   │   ├── Dashboard.jsx
    │   │   │   └── index.js
    │   │   ├── upload\
    │   │   │   ├── UploadForm.jsx
    │   │   │   └── index.js
    │   │   ├── lotes\
    │   │   │   ├── LotesList.jsx
    │   │   │   ├── LoteDetail.jsx
    │   │   │   └── index.js
    │   │   ├── pendencias\
    │   │   │   ├── PendenciasResolver.jsx
    │   │   │   └── index.js
    │   │   └── mapeamentos\             ⚠️ NOVO!
    │   │       ├── MapeamentosList.jsx  ⚠️ NOVO!
    │   │       └── index.js             ⚠️ NOVO!
    │   ├── lib\                    ⚠️ IMPORTANTE!
    │   │   └── utils.js            ⚠️ ESTE ARQUIVO É OBRIGATÓRIO!
    │   ├── services\
    │   │   └── api.js
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── .env
```

---

## ⚠️ ERRO COMUM: "Module not found: Can't resolve '../../lib/utils'"

### Causa
A pasta `frontend/src/lib/` não foi copiada corretamente.

### Solução

**1. Verifique se a pasta existe:**
```powershell
Test-Path "C:\App\python\app1.tech.vcinf\frontend\src\lib\utils.js"
```

**2. Se retornar `False`, crie a pasta e o arquivo:**

```powershell
# Criar pasta lib
New-Item -ItemType Directory -Path "C:\App\python\app1.tech.vcinf\frontend\src\lib" -Force
```

**3. Crie o arquivo `utils.js`:**

```powershell
# Criar arquivo utils.js
New-Item -ItemType File -Path "C:\App\python\app1.tech.vcinf\frontend\src\lib\utils.js"
```

**4. Cole o conteúdo abaixo no arquivo `frontend\src\lib\utils.js`:**

```javascript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getStatusConfig(status) {
  const configs = {
    aguardando: {
      label: 'Aguardando',
      className: 'status-aguardando',
      color: '#64748B',
    },
    processando: {
      label: 'Processando',
      className: 'status-processando',
      color: '#3B82F6',
    },
    pendente: {
      label: 'Pendente',
      className: 'status-pendente',
      color: '#F59E0B',
    },
    concluido: {
      label: 'Concluído',
      className: 'status-concluido',
      color: '#10B981',
    },
    erro: {
      label: 'Erro',
      className: 'status-erro',
      color: '#EF4444',
    },
  };
  return configs[status] || configs.aguardando;
}
```

---

## 🔧 Pré-requisitos

Instale antes de começar:

| Software | Versão | Download |
|----------|--------|----------|
| Python | 3.11+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| Git | Qualquer | https://git-scm.com/ |

---

## 📥 1. Clonar/Copiar o Projeto

```powershell
# Criar pasta do projeto
New-Item -ItemType Directory -Path "C:\App\python\app1.tech.vcinf" -Force

# Navegar para a pasta
cd C:\App\python\app1.tech.vcinf
```

Copie **TODOS** os arquivos do projeto para esta pasta, incluindo:
- ✅ Pasta `backend\` completa
- ✅ Pasta `frontend\` completa (incluindo `src\lib\`)

---

## ⚙️ 2. Configurar Backend

### 2.1 Criar ambiente virtual

```powershell
# Navegar para pasta backend
cd C:\App\python\app1.tech.vcinf\backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1
```

### 2.2 Instalar dependências

```powershell
# Com o ambiente virtual ativado
pip install -r requirements.txt
```

### 2.3 Configurar variáveis de ambiente

Edite o arquivo `backend\.env`:

```env
DATABASE_URL=sqlite+aiosqlite:///./contabil.db
RESEND_API_KEY=
SENDER_EMAIL=onboarding@resend.dev
```

---

## ⚙️ 3. Configurar Frontend

### 3.1 Verificar estrutura (IMPORTANTE!)

```powershell
# Verificar se lib/utils.js existe
cd C:\App\python\app1.tech.vcinf\frontend

# Listar arquivos em src/lib
Get-ChildItem -Path ".\src\lib" -Recurse
```

Se a pasta `lib` não existir, siga as instruções da seção **"ERRO COMUM"** acima.

### 3.2 Instalar dependências

```powershell
# Navegar para pasta frontend
cd C:\App\python\app1.tech.vcinf\frontend

# Instalar pacotes
npm install
```

### 3.3 Configurar variáveis de ambiente

Edite o arquivo `frontend\.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🚀 4. Executar o Projeto

### 4.1 Iniciar Backend (Terminal 1)

```powershell
# Navegar para backend
cd C:\App\python\app1.tech.vcinf\backend

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1

# Iniciar servidor
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend rodando em: `http://localhost:8001`

### 4.2 Iniciar Frontend (Terminal 2)

Abra um **novo terminal PowerShell**:

```powershell
# Navegar para frontend
cd C:\App\python\app1.tech.vcinf\frontend

# Iniciar servidor de desenvolvimento
npm start
```

✅ Frontend rodando em: `http://localhost:3000`

---

## 🧪 5. Testar

### Verificar Backend

```powershell
# Testar API
Invoke-RestMethod -Uri "http://localhost:8001/api/health"
```

Resposta esperada:
```json
{"status":"healthy","service":"contabil-backend"}
```

### Acessar Sistema

Abra no navegador: **http://localhost:3000**

---

## 📋 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `.\venv\Scripts\Activate.ps1` | Ativar ambiente virtual |
| `deactivate` | Desativar ambiente virtual |
| `pip freeze` | Listar pacotes instalados |
| `npm start` | Iniciar frontend |
| `npm run build` | Gerar build de produção |
| `Ctrl + C` | Parar servidor |

---

## 🛑 Parar os Servidores

Em cada terminal, pressione: **`Ctrl + C`**

---

## 🔄 Reiniciar do Zero

```powershell
# Backend - reinstalar dependências
cd C:\App\python\app1.tech.vcinf\backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Frontend - reinstalar dependências
cd C:\App\python\app1.tech.vcinf\frontend
Remove-Item -Recurse -Force node_modules
npm install
```

---

## ❓ Problemas Comuns

### Erro: "Module not found: Can't resolve '../../lib/utils'"

**Causa:** Pasta `frontend/src/lib/` não foi copiada.

**Solução:** Veja seção **"ERRO COMUM"** no início deste manual.

---

### Erro: "Execution Policy"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Erro: "python não reconhecido"

Adicione Python ao PATH do Windows ou use o caminho completo:
```powershell
C:\Users\SEU_USUARIO\AppData\Local\Programs\Python\Python311\python.exe
```

---

### Porta já em uso

```powershell
# Ver processos na porta 8001
netstat -ano | findstr :8001

# Encerrar processo (substitua PID pelo número)
taskkill /PID <PID> /F
```

---

## 📂 Checklist de Arquivos

Antes de executar, confirme que estes arquivos existem:

```powershell
# Verificar arquivos críticos
$arquivos = @(
    "C:\App\python\app1.tech.vcinf\backend\server.py",
    "C:\App\python\app1.tech.vcinf\backend\requirements.txt",
    "C:\App\python\app1.tech.vcinf\frontend\package.json",
    "C:\App\python\app1.tech.vcinf\frontend\src\lib\utils.js",
    "C:\App\python\app1.tech.vcinf\frontend\src\App.js"
)

foreach ($arquivo in $arquivos) {
    if (Test-Path $arquivo) {
        Write-Host "✅ $arquivo" -ForegroundColor Green
    } else {
        Write-Host "❌ $arquivo - FALTANDO!" -ForegroundColor Red
    }
}
```

---

## 📞 Suporte

- Documentação da API: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/api/health`
