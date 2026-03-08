# Manual de Instalação e Execução Local

## Sistema Contábil - Windows 11 + PowerShell 7.5

---

## 📁 Estrutura de Pastas

```
C:\App\python\app1.tech.vcinf\
├── backend\
│   ├── src\
│   ├── server.py
│   ├── requirements.txt
│   └── .env
└── frontend\
    ├── src\
    ├── package.json
    └── .env
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

Copie os arquivos do projeto para esta pasta.

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

### 3.1 Instalar dependências

```powershell
# Navegar para pasta frontend
cd C:\App\python\app1.tech.vcinf\frontend

# Instalar pacotes
npm install
```

### 3.2 Configurar variáveis de ambiente

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

### Erro: "Execution Policy"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro: "python não reconhecido"

Adicione Python ao PATH do Windows ou use o caminho completo:
```powershell
C:\Users\SEU_USUARIO\AppData\Local\Programs\Python\Python311\python.exe
```

### Porta já em uso

```powershell
# Ver processos na porta 8001
netstat -ano | findstr :8001

# Encerrar processo (substitua PID pelo número)
taskkill /PID <PID> /F
```

---

## 📞 Suporte

- Documentação da API: `http://localhost:8001/docs`
- Health Check: `http://localhost:8001/api/health`
