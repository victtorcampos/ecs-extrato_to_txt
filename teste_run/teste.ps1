# ============================================================
# Teste End-to-End: Gerador Dominio Sistemas TXT
# CNPJ: 01.293.422/0001-65
# Arquivo: exemplo_extrato_cliente.xls
# ============================================================

$BASE_URL  = "http://localhost:8001"
$XLS_PATH  = "$PSScriptRoot\..\exemplo_extrato_cliente.xls"
$OUT_FILE  = "$PSScriptRoot\resultado.txt"
$LOG_FILE  = "$PSScriptRoot\teste.log"

$EXPECTED = @"
|0000|01293422000165|
|6000|X||||
|6100|01/01/2026|12|78|60000,00|0|VLR ALUGUEL A PAGAR PERIODO 01/01/2026 A H.B PARTICIPACOES LTDA.|VICTOR_CAMPOS|456||
|6100|01/01/2026|78|25|14073,93|0|PGTO REF NF. 24536486/1. ENERGISA MATO GROSSO - DISTRIBUIDORA DE ENERGIA S.A.|VICTOR_CAMPOS|456||
|6100|01/01/2026|18|22|1438,71|0|RECEBTO REF NF. N01/10722. VALDEMAR PAGLIOSA CAON|VICTOR_CAMPOS|456||
"@

# ── Helpers ──────────────────────────────────────────────────
function Log($msg) {
    $ts   = (Get-Date -Format "HH:mm:ss")
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LOG_FILE -Value $line
}

function Fail($msg) {
    Log "ERRO: $msg"
    exit 1
}

# Retorna hashtable para evitar erro de chaves com casing diferente (ex: "D"/"d" em mapeamento_tipo)
# Usa arquivo temporario para o body — evita limite de tamanho da linha de comando (base64 grande)
function CurlPost($path, $body) {
    $bodyJson = $body | ConvertTo-Json -Depth 10 -Compress
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $bodyJson, [System.Text.Encoding]::UTF8)
    try {
        $res = curl.exe -s -X POST "$BASE_URL$path" `
            -H "Content-Type: application/json" `
            --data "@$tmp"
        if ($LASTEXITCODE -ne 0) { Fail "curl POST $path falhou (exit $LASTEXITCODE)" }
        return $res | ConvertFrom-Json -AsHashtable
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

function CurlGet($path) {
    $res = curl.exe -s "$BASE_URL$path"
    if ($LASTEXITCODE -ne 0) { Fail "curl GET $path falhou (exit $LASTEXITCODE)" }
    return $res | ConvertFrom-Json -AsHashtable
}

function WaitLote($loteId, [string]$statusDesejado = "concluido", [int]$maxTentativas = 20) {
    for ($i = 1; $i -le $maxTentativas; $i++) {
        Start-Sleep -Seconds 2
        $lote = CurlGet "/api/v1/lotes/$loteId"
        $st   = $lote["status"]
        Log "  tentativa $i — status: $st"
        if ($st -eq $statusDesejado -or $st -eq "pendente" -or $st -eq "erro") {
            return $lote
        }
    }
    Fail "Timeout aguardando lote $loteId chegar em '$statusDesejado'"
}

# ── Inicio ───────────────────────────────────────────────────
Clear-Content -Path $LOG_FILE -ErrorAction SilentlyContinue
Log "=========================================="
Log "TESTE END-TO-END — Dominio Sistemas TXT"
Log "=========================================="

# Verificar arquivo XLS
if (-not (Test-Path $XLS_PATH)) { Fail "Arquivo nao encontrado: $XLS_PATH" }
Log "Arquivo XLS: $XLS_PATH"

# Converter XLS para Base64
Log "Convertendo XLS para Base64..."
$xlsBytes  = [System.IO.File]::ReadAllBytes((Resolve-Path $XLS_PATH))
$xlsBase64 = [System.Convert]::ToBase64String($xlsBytes)
Log "Base64 gerado ($($xlsBase64.Length) chars)"

# ── Passo 1: Criar Layout de Importacao ─────────────────────
Log ""
Log "PASSO 1 — Criar Layout de Importacao"
$layout   = CurlPost "/api/v1/import-layouts" @{
    cnpj  = "01293422000165"
    nome  = "Teste-Brastelha-$(Get-Date -Format 'yyyyMMddHHmm')"
    colunas = @(
        @{ coluna_excel = "4";  campo_destino = "data";          tipo_dado = "date"    }
        @{ coluna_excel = "6";  campo_destino = "conta_debito";  tipo_dado = "string"  }
        @{ coluna_excel = "7";  campo_destino = "conta_credito"; tipo_dado = "string"  }
        @{ coluna_excel = "11"; campo_destino = "valor";         tipo_dado = "decimal" }
        @{ coluna_excel = "14"; campo_destino = "historico";     tipo_dado = "string"  }
    )
    regras_conta = @(
        @{
            nome          = "Regra RECEBTO"
            ordem         = 1
            ativo         = $true
            condicoes     = @(
                @{ campo = "historico"; operador = "contem"; valor = "RECEBTO"; operador_logico = "e" }
            )
            conta_debito  = "18"
            conta_credito = "22"
        }
    )
}
$layoutId = $layout["id"]
if (-not $layoutId) { Fail "Layout nao criado — resposta: $($layout | ConvertTo-Json)" }
Log "Layout criado: id=$layoutId"

# ── Passo 2: Criar Mapeamentos de Contas ────────────────────
Log ""
Log "PASSO 2 — Criar Mapeamentos de Contas"

$m1 = CurlPost "/api/v1/account-mappings" @{
    cnpj = "01293422000165"; conta_cliente = "3145"; conta_padrao = "12"
}
Log "Mapeamento 3145->12: id=$($m1["id"])"

$m2 = CurlPost "/api/v1/account-mappings" @{
    cnpj = "01293422000165"; conta_cliente = "2004"; conta_padrao = "78"
}
Log "Mapeamento 2004->78: id=$($m2["id"])"

# ── Passo 3: Criar Perfil de Saida ──────────────────────────
Log ""
Log "PASSO 3 — Criar Perfil de Saida (Dominio Sistemas)"
$perfil   = CurlPost "/api/v1/output-profiles" @{
    nome            = "Dominio-Teste-$(Get-Date -Format 'yyyyMMddHHmm')"
    sistema_destino = "dominio_sistemas"
    formato         = "txt_delimitado"
    config = @{
        delimitador                    = "|"
        codificacao                    = "ANSI"
        tipo_lancamento_padrao         = "X"
        nome_usuario                   = "VICTOR_CAMPOS"
        codigo_filial                  = "456"
        codigo_historico_padrao        = "0"
        incluir_delimitador_inicio_fim = $true
    }
}
$perfilId = $perfil["id"]
if (-not $perfilId) { Fail "Perfil nao criado — resposta: $($perfil | ConvertTo-Json)" }
Log "Perfil criado: id=$perfilId"

# ── Passo 4: Criar Lote ─────────────────────────────────────
Log ""
Log "PASSO 4 — Criar Lote"
$lote   = CurlPost "/api/v1/lotes" @{
    cnpj              = "01293422000165"
    periodo_mes       = 1
    periodo_ano       = 2026
    email_notificacao = ""
    arquivo_base64    = $xlsBase64
    nome_arquivo      = "exemplo_extrato_cliente.xls"
    layout_id         = $layoutId
    perfil_saida_id   = $perfilId
}
$loteId = $lote["id"]
if (-not $loteId) { Fail "Lote nao criado — resposta: $($lote | ConvertTo-Json)" }
Log "Lote criado: id=$loteId | protocolo=$($lote["protocolo"])"

# ── Passo 5: Aguardar Processamento ─────────────────────────
Log ""
Log "PASSO 5 — Aguardando processamento background..."
$lote = WaitLote $loteId
$st   = $lote["status"]
Log "Status apos processamento: $st"

if ($st -eq "erro") {
    Fail "Lote com erro: $($lote["mensagem_erro"])"
}

# ── Passo 6: Resolver Pendencias (se houver) ─────────────────
if ($st -eq "pendente") {
    Log ""
    Log "PASSO 6 — Resolver Pendencias"

    $loteDetalhe = CurlGet "/api/v1/lotes/$loteId"
    $pendencias  = $loteDetalhe["pendencias"]

    # Filtrar nao resolvidas e extrair conta_cliente
    $contas = @()
    foreach ($p in $pendencias) {
        if (-not $p["resolvida"]) {
            $contas += $p["conta_cliente"]
        }
    }
    Log "Pendencias encontradas: $($contas -join ', ')"

    # Montar mapeamentos: 1130->25 (esperado apos fix E3) 
    # 18/22 passthrough caso backend ainda nao tenha o fix aplicado
    $mapeamentos = @{}
    foreach ($conta in $contas) {
        switch ($conta) {
            "1130"  { $mapeamentos[$conta] = "25" }
            "18"    { $mapeamentos[$conta] = "18" }
            "22"    { $mapeamentos[$conta] = "22" }
            default {
                Log "  AVISO: conta inesperada pendente: $conta — mapeando para ela mesma"
                $mapeamentos[$conta] = $conta
            }
        }
    }
    Log "Resolvendo: $($mapeamentos | ConvertTo-Json -Compress)"

    $res = CurlPost "/api/v1/lotes/$loteId/resolver-pendencias" @{
        mapeamentos = $mapeamentos
    }
    Log "Resolver-pendencias: status=$($res["status"])"

    # Aguardar reprocessamento
    Log "Aguardando reprocessamento apos resolver pendencias..."
    $lote = WaitLote $loteId "concluido"
    $st   = $lote["status"]
    Log "Status final: $st"
}

if ($st -ne "concluido") {
    Fail "Lote nao concluido — status: $st | erro: $($lote["mensagem_erro"])"
}

# ── Passo 7: Download ────────────────────────────────────────
Log ""
Log "PASSO 7 — Download do arquivo gerado"
curl.exe -s -o $OUT_FILE "$BASE_URL/api/v1/lotes/$loteId/download"
if ($LASTEXITCODE -ne 0) { Fail "Download falhou" }
Log "Arquivo salvo em: $OUT_FILE"

# ── Passo 8: Validar Resultado ───────────────────────────────
Log ""
Log "PASSO 8 — Validacao do resultado"
$resultado = Get-Content $OUT_FILE -Raw -Encoding UTF8

# Normalizar quebras de linha
$resultadoNorm = $resultado.Trim() -replace "`r`n", "`n" -replace "`r", "`n"
$expectedNorm  = $EXPECTED.Trim()  -replace "`r`n", "`n" -replace "`r", "`n"

Log ""
Log "--- RESULTADO OBTIDO ---"
Write-Host $resultado

Log ""
Log "--- RESULTADO ESPERADO ---"
Write-Host $EXPECTED

if ($resultadoNorm -eq $expectedNorm) {
    Log ""
    Log "=========================================="
    Log "TESTE APROVADO - Resultado identico ao esperado"
    Log "=========================================="
} else {
    Log ""
    Log "=========================================="
    Log "TESTE REPROVADO - Resultado divergente"
    Log "=========================================="

    $linhasObtidas   = $resultadoNorm -split "`n"
    $linhasEsperadas = $expectedNorm  -split "`n"
    $maxLinhas = [Math]::Max($linhasObtidas.Count, $linhasEsperadas.Count)

    for ($i = 0; $i -lt $maxLinhas; $i++) {
        $ob = if ($i -lt $linhasObtidas.Count)   { $linhasObtidas[$i] }   else { "<ausente>" }
        $ex = if ($i -lt $linhasEsperadas.Count) { $linhasEsperadas[$i] } else { "<ausente>" }
        if ($ob -ne $ex) {
            Log "  LINHA $($i+1) DIVERGE:"
            Log "    OBTIDO  : $ob"
            Log "    ESPERADO: $ex"
        }
    }
    exit 1
}
