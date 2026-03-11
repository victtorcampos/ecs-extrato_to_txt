# ============================================================
# TESTE END-TO-END — Tipos de Lançamento X / D / C / V
# teste_202603111655.ps1
#
# Cenários:
#   TC1 — Tipo X simples       (ex1_tipo_x_simples.xlsx)   3 lanç → 3x6000 + 3x6100
#   TC2 — Tipo D rateio        (ex2_tipo_d_rateio.xlsx)    3 lanç → 1x6000 + 3x6100
#   TC3 — Tipo C coleta        (ex3_tipo_c_coleta.xlsx)    3 lanç → 1x6000 + 3x6100
#   TC4 — Tipo V bilateral     (ex4_tipo_v_bilateral.xlsx) 4 lanç → 1x6000 + 4x6100
#   TC5 — Misto X+D            (ex5_misto_xd.xlsx)         4 lanç → 2x6000 + 4x6100
#
# Pré-requisitos:
#   • Backend rodando em http://localhost:8001
#   • Arquivo gerar_excels.py já executado (xlsx presentes)
# ============================================================
$ErrorActionPreference = "Stop"
$BASE_URL  = "http://localhost:8001/api/v1"
$CNPJ      = "01293422000165"
$NOME_USR  = "VICTOR_CAMPOS"
$COD_FIL   = "456"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

$global:PASSOU = 0
$global:FALHOU = 0

# ── utilidades ──────────────────────────────────────────────

function Log($msg) {
    Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] $msg"
}

function Fail($msg) {
    Write-Host "  [FALHA] $msg" -ForegroundColor Red
    $global:FALHOU++
}

function Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
    $global:PASSOU++
}

function CurlPost($path, $body) {
    $json = $body | ConvertTo-Json -Depth 10 -Compress
    $tmp  = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $json, [System.Text.Encoding]::UTF8)
    try {
        $res = curl.exe -s -X POST "$BASE_URL$path" `
            -H "Content-Type: application/json" `
            --data "@$tmp"
        if ($LASTEXITCODE -ne 0) { throw "curl POST $path falhou (exit $LASTEXITCODE)" }
        return $res | ConvertFrom-Json -AsHashtable
    } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
}

function CurlGet($path) {
    $res = curl.exe -s "$BASE_URL$path"
    if ($LASTEXITCODE -ne 0) { throw "curl GET $path falhou (exit $LASTEXITCODE)" }
    return $res | ConvertFrom-Json -AsHashtable
}

function XlsToBase64($file) {
    $bytes = [System.IO.File]::ReadAllBytes($file)
    return [Convert]::ToBase64String($bytes)
}

function AguardarLote($loteId) {
    for ($i = 1; $i -le 25; $i++) {
        Start-Sleep -Seconds 2
        $lote = CurlGet "/lotes/$loteId"
        $st   = $lote["status"]
        Log "  tentativa $i — status: $st"
        if ($st -in @("concluido","pendente","erro")) { return $lote }
    }
    throw "Timeout: lote $loteId nunca saiu de aguardando/processando"
}

function ResolverPendencias($loteId, $mapeamentos) {
    $pendencias = CurlGet "/lotes/$loteId/pendencias"
    $itens = $pendencias["pendencias"]
    foreach ($p in $itens) {
        if ($p["resolvida"]) { continue }
        $cc   = $p["conta_cliente"]
        $tipo = $p["tipo"]
        if ($mapeamentos.ContainsKey($cc)) {
            $body = @{ conta_mapeada = $mapeamentos[$cc] }
            CurlPost "/lotes/$loteId/pendencias/$($p['id'])/resolver" $body | Out-Null
            Log "  Resolvida pendencia: $cc → $($mapeamentos[$cc]) ($tipo)"
        } else {
            Fail "Conta pendente sem mapeamento: $cc ($tipo)"
        }
    }
    # Reprocessar
    CurlPost "/lotes/$loteId/reprocessar" @{} | Out-Null
    return AguardarLote $loteId
}

function DownloadSaida($loteId) {
    Write-Host $loteId
    $info = CurlGet "/lotes/$loteId"
   
    $arqId = $info["caminho_arquivo_saida"]
   # if (-not $arqId) { throw "Lote $loteId sem caminho_arquivo_saida" }
    # Extrai apenas o nome do arquivo do caminho
    $nomeArq = [System.IO.Path]::GetFileName($arqId)
    $raw = curl.exe -s "$BASE_URL/lotes/$loteId/download"
    if ($LASTEXITCODE -ne 0) { throw "Download falhou para lote $loteId" }
    return $raw
}

function CriarPerfilSaida() {
    $body = @{
        nome            = "Dominio-TC-$(Get-Date -Format 'yyyyMMddHHmmss')"
        sistema_destino = "dominio_sistemas"
        formato         = "txt_delimitado"
        config          = @{
            delimitador                    = "|"
            codificacao                    = "ANSI"
            incluir_delimitador_inicio_fim = $true
            tipo_lancamento_padrao         = "X"
            nome_usuario                   = $NOME_USR
            codigo_filial                  = $COD_FIL
            codigo_historico_padrao        = "0"
        }
    }
    $r = CurlPost "/output-profiles" $body
    if (-not $r["id"]) { throw "Perfil nao criado — resposta: $($r | ConvertTo-Json)" }
    return $r["id"]
}

function CriarMapeamentos($layoutId, $mapa) {
    foreach ($kv in $mapa.GetEnumerator()) {
        $body = @{
            cnpj            = $CNPJ
            conta_cliente   = $kv.Key
            conta_padrao    = $kv.Value
            layout_id       = $layoutId
        }
        CurlPost "/account-mappings" $body | Out-Null
    }
}

function CriarLote($base64, $layoutId, $perfilId) {
    $body = @{
        cnpj                = $CNPJ
        periodo_mes         = 1
        periodo_ano         = 2026
        layout_id           = $layoutId
        perfil_saida_id     = $perfilId
        arquivo_base64      = $base64
        nome_arquivo        = "teste.xlsx"
    }
    $r = CurlPost "/lotes" $body
    return $r["id"]
}

function ValidarSaida($titulo, $saida, $esperado) {
    $linhasSaida    = ($saida.Trim() -split "`r?`n") | Where-Object { $_ -ne "" }
    $linhasEsperado = ($esperado.Trim() -split "`r?`n") | Where-Object { $_ -ne "" }

    Write-Host ""
    Write-Host "  --- SAIDA OBTIDA ---"
    $linhasSaida | ForEach-Object { Write-Host "  $_" }
    Write-Host "  --- SAIDA ESPERADA ---"
    $linhasEsperado | ForEach-Object { Write-Host "  $_" }
    Write-Host ""

    if ($linhasSaida.Count -ne $linhasEsperado.Count) {
        Fail "$titulo — numero de linhas: obtido=$($linhasSaida.Count) esperado=$($linhasEsperado.Count)"
        return
    }
    $ok = $true
    for ($i = 0; $i -lt $linhasEsperado.Count; $i++) {
        if ($linhasSaida[$i] -ne $linhasEsperado[$i]) {
            Fail "$titulo — linha $($i+1):`n    obtido  : '$($linhasSaida[$i])'`n    esperado: '$($linhasEsperado[$i])'"
            $ok = $false
        }
    }
    if ($ok) { Ok $titulo }
}

# ── perfil compartilhado ─────────────────────────────────────

Log "=============================================="
Log "TESTE END-TO-END — Tipos de Lancamento X/D/C/V"
Log "=============================================="
Log ""
Log "Criando perfil de saida compartilhado..."
$PERFIL_ID = CriarPerfilSaida
Log "Perfil criado: $PERFIL_ID"
Log ""

# ══════════════════════════════════════════════════════════════
# TC1 — Tipo X simples
# Excel: A=data  B=conta_deb  C=conta_cred  D=valor  E=historico
# Esperado: 3x (|6000|X||||  +  |6100|...|)
# ══════════════════════════════════════════════════════════════
Log "══════════════════════════════════════════════"
Log "TC1 — Tipo X simples (ex1_tipo_x_simples.xlsx)"
Log "══════════════════════════════════════════════"

$b64 = XlsToBase64 "$SCRIPT_DIR\ex1_tipo_x_simples.xlsx"

$layoutBody = @{
    cnpj             = $CNPJ
    nome             = "TC1-TipoX-$(Get-Random)"
    config_planilha  = @{ linha_cabecalho = 0; linha_inicio_dados = 1 }
    colunas          = @(
        @{ campo_destino="data";          coluna_excel="A"; tipo_dado="data" }
        @{ campo_destino="conta_debito";  coluna_excel="B"; tipo_dado="string" }
        @{ campo_destino="conta_credito"; coluna_excel="C"; tipo_dado="string" }
        @{ campo_destino="valor";         coluna_excel="D"; tipo_dado="decimal" }
        @{ campo_destino="historico";     coluna_excel="E"; tipo_dado="string" }
    )
    config_valor = @{ tipo_sinal = "sinal_valor" }
}
$layoutTC1 = CurlPost "/import-layouts" $layoutBody
$LID1 = $layoutTC1["id"]
Log "Layout TC1: $LID1"

CriarMapeamentos $LID1 @{ "3145"="12"; "2004"="78"; "1130"="25" }
$idLote1 = CriarLote $b64 $LID1 $PERFIL_ID
Log "Lote TC1: $idLote1 — aguardando..."

$resTC1 = AguardarLote $idLote1
if ($resTC1["status"] -eq "pendente") {
    $resTC1 = ResolverPendencias $idLote1 @{ "3145"="12"; "2004"="78"; "1130"="25" }
}
if ($resTC1["status"] -ne "concluido") {
    Fail "TC1 — Lote nao concluido: $($resTC1['status']) — $($resTC1['mensagem_erro'])"
} else {
    $saida1 = DownloadSaida $idLote1
    $esp1 = @"
|0000|01293422000165|
|6000|X||||
|6100|01/01/2026|12|78|60000,00|0|VLR ALUGUEL JAN 2026 H.B PARTICIPACOES LTDA|VICTOR_CAMPOS|456||
|6000|X||||
|6100|02/01/2026|12|25|14073,93|0|PGTO REF NF. 24536486/1. ENERGISA MATO GROSSO|VICTOR_CAMPOS|456||
|6000|X||||
|6100|03/01/2026|12|78|1438,71|0|PAGAMENTO FORNECEDOR ABC SERVICOS|VICTOR_CAMPOS|456||
"@
    ValidarSaida "TC1 — Tipo X simples" $saida1 $esp1
}

# ══════════════════════════════════════════════════════════════
# TC2 — Tipo D rateio (1 débito + 2 créditos)
# Excel: A=historico  B=valor  C=data  D=conta_deb  E=conta_cred  F=tipo  G=grupo
# Esperado: 1x6000|D  + 3x6100
# ══════════════════════════════════════════════════════════════
Log ""
Log "══════════════════════════════════════════════"
Log "TC2 — Tipo D rateio (ex2_tipo_d_rateio.xlsx)"
Log "══════════════════════════════════════════════"

$b64 = XlsToBase64 "$SCRIPT_DIR\ex2_tipo_d_rateio.xlsx"

$layoutBody = @{
    cnpj                    = $CNPJ
    nome                    = "TC2-TipoD-$(Get-Random)"
    config_planilha         = @{ linha_cabecalho = 0; linha_inicio_dados = 1 }
    coluna_tipo_lancamento  = "F"
    coluna_grupo_lancamento = "G"
    colunas                 = @(
        @{ campo_destino="historico";     coluna_excel="A"; tipo_dado="string" }
        @{ campo_destino="valor";         coluna_excel="B"; tipo_dado="decimal" }
        @{ campo_destino="data";          coluna_excel="C"; tipo_dado="data" }
        @{ campo_destino="conta_debito";  coluna_excel="D"; tipo_dado="string" }
        @{ campo_destino="conta_credito"; coluna_excel="E"; tipo_dado="string" }
    )
    config_valor = @{ tipo_sinal = "sinal_valor" }
}
$layoutTC2 = CurlPost "/import-layouts" $layoutBody
$LID2 = $layoutTC2["id"]
Log "Layout TC2: $LID2 (coluna_tipo=F, coluna_grupo=G)"

CriarMapeamentos $LID2 @{ "3145"="12"; "2004"="78" }
$idLote2 = CriarLote $b64 $LID2 $PERFIL_ID
Log "Lote TC2: $idLote2 — aguardando..."

$resTC2 = AguardarLote $idLote2
if ($resTC2["status"] -eq "pendente") {
    $resTC2 = ResolverPendencias $idLote2 @{ "3145"="12"; "2004"="78" }
}
if ($resTC2["status"] -ne "concluido") {
    Fail "TC2 — Lote nao concluido: $($resTC2['status']) — $($resTC2['mensagem_erro'])"
} else {
    $saida2 = DownloadSaida $idLote2
    $esp2 = @"
|0000|01293422000165|
|6000|D||||
|6100|03/01/2026|12||500,00|0|RATEIO DESPESA ADM JAN|VICTOR_CAMPOS|456||
|6100|03/01/2026||78|200,00|0|RATEIO TELECOM PARTE 1|VICTOR_CAMPOS|456||
|6100|03/01/2026||78|300,00|0|RATEIO TELECOM PARTE 2|VICTOR_CAMPOS|456||
"@
    ValidarSaida "TC2 — Tipo D rateio" $saida2 $esp2
}

# ══════════════════════════════════════════════════════════════
# TC3 — Tipo C coleta (2 débitos + 1 crédito)
# Excel: A=valor  B=conta_cred  C=conta_deb  D=data  E=historico  F=tipo  G=grupo
# Esperado: 1x6000|C  + 3x6100
# ══════════════════════════════════════════════════════════════
Log ""
Log "══════════════════════════════════════════════"
Log "TC3 — Tipo C coleta (ex3_tipo_c_coleta.xlsx)"
Log "══════════════════════════════════════════════"

$b64 = XlsToBase64 "$SCRIPT_DIR\ex3_tipo_c_coleta.xlsx"

$layoutBody = @{
    cnpj                    = $CNPJ
    nome                    = "TC3-TipoC-$(Get-Random)"
    config_planilha         = @{ linha_cabecalho = 0; linha_inicio_dados = 1 }
    coluna_tipo_lancamento  = "F"
    coluna_grupo_lancamento = "G"
    colunas                 = @(
        @{ campo_destino="valor";         coluna_excel="A"; tipo_dado="decimal" }
        @{ campo_destino="conta_credito"; coluna_excel="B"; tipo_dado="string" }
        @{ campo_destino="conta_debito";  coluna_excel="C"; tipo_dado="string" }
        @{ campo_destino="data";          coluna_excel="D"; tipo_dado="data" }
        @{ campo_destino="historico";     coluna_excel="E"; tipo_dado="string" }
    )
    config_valor = @{ tipo_sinal = "sinal_valor" }
}
$layoutTC3 = CurlPost "/import-layouts" $layoutBody
$LID3 = $layoutTC3["id"]
Log "Layout TC3: $LID3 (coluna_tipo=F, coluna_grupo=G)"

CriarMapeamentos $LID3 @{ "3145"="12"; "2004"="78" }
$idLote3 = CriarLote $b64 $LID3 $PERFIL_ID
Log "Lote TC3: $idLote3 — aguardando..."

$resTC3 = AguardarLote $idLote3
if ($resTC3["status"] -eq "pendente") {
    $resTC3 = ResolverPendencias $idLote3 @{ "3145"="12"; "2004"="78" }
}
if ($resTC3["status"] -ne "concluido") {
    Fail "TC3 — Lote nao concluido: $($resTC3['status']) — $($resTC3['mensagem_erro'])"
} else {
    $saida3 = DownloadSaida $idLote3
    $esp3 = @"
|0000|01293422000165|
|6000|C||||
|6100|06/01/2026|12||200,00|0|RECEBIMENTO CLIENTE A|VICTOR_CAMPOS|456||
|6100|06/01/2026|12||300,00|0|RECEBIMENTO CLIENTE B|VICTOR_CAMPOS|456||
|6100|06/01/2026||78|500,00|0|RECEITA CONSOLIDADA|VICTOR_CAMPOS|456||
"@
    ValidarSaida "TC3 — Tipo C coleta" $saida3 $esp3
}

# ══════════════════════════════════════════════════════════════
# TC4 — Tipo V bilateral (2 débitos + 2 créditos balanceados)
# Excel: A=data  B=tipo  C=grupo  D=valor  E=conta_deb  F=conta_cred  G=historico
# Esperado: 1x6000|V  + 4x6100
# ══════════════════════════════════════════════════════════════
Log ""
Log "══════════════════════════════════════════════"
Log "TC4 — Tipo V bilateral (ex4_tipo_v_bilateral.xlsx)"
Log "══════════════════════════════════════════════"

$b64 = XlsToBase64 "$SCRIPT_DIR\ex4_tipo_v_bilateral.xlsx"

$layoutBody = @{
    cnpj                    = $CNPJ
    nome                    = "TC4-TipoV-$(Get-Random)"
    config_planilha         = @{ linha_cabecalho = 0; linha_inicio_dados = 1 }
    coluna_tipo_lancamento  = "B"
    coluna_grupo_lancamento = "C"
    colunas                 = @(
        @{ campo_destino="data";          coluna_excel="A"; tipo_dado="data" }
        @{ campo_destino="valor";         coluna_excel="D"; tipo_dado="decimal" }
        @{ campo_destino="conta_debito";  coluna_excel="E"; tipo_dado="string" }
        @{ campo_destino="conta_credito"; coluna_excel="F"; tipo_dado="string" }
        @{ campo_destino="historico";     coluna_excel="G"; tipo_dado="string" }
    )
    config_valor = @{ tipo_sinal = "sinal_valor" }
}
$layoutTC4 = CurlPost "/import-layouts" $layoutBody
$LID4 = $layoutTC4["id"]
Log "Layout TC4: $LID4 (coluna_tipo=B, coluna_grupo=C)"

CriarMapeamentos $LID4 @{ "3145"="12"; "2004"="78" }
$idLote4 = CriarLote $b64 $LID4 $PERFIL_ID
Log "Lote TC4: $idLote4 — aguardando..."

$resTC4 = AguardarLote $idLote4
if ($resTC4["status"] -eq "pendente") {
    $resTC4 = ResolverPendencias $idLote4 @{ "3145"="12"; "2004"="78" }
}
if ($resTC4["status"] -ne "concluido") {
    Fail "TC4 — Lote nao concluido: $($resTC4['status']) — $($resTC4['mensagem_erro'])"
} else {
    $saida4 = DownloadSaida $idLote4
    $esp4 = @"
|0000|01293422000165|
|6000|V||||
|6100|02/01/2026|12||101,00|0|DEBITO 1 BILATERAL|VICTOR_CAMPOS|456||
|6100|02/01/2026||78|101,00|0|CREDITO 1 BILATERAL|VICTOR_CAMPOS|456||
|6100|02/01/2026|12||100,00|0|DEBITO 2 BILATERAL|VICTOR_CAMPOS|456||
|6100|02/01/2026||78|100,00|0|CREDITO 2 BILATERAL|VICTOR_CAMPOS|456||
"@
    ValidarSaida "TC4 — Tipo V bilateral" $saida4 $esp4
}

# ══════════════════════════════════════════════════════════════
# TC5 — Misto X + D (1 X + 3 D)
# Excel: A=data  B=conta_deb  C=conta_cred  D=valor  E=historico  F=tipo  G=grupo
# Esperado: 1x6000|X + 1x6100, depois 1x6000|D + 3x6100
# ══════════════════════════════════════════════════════════════
Log ""
Log "══════════════════════════════════════════════"
Log "TC5 — Misto X+D (ex5_misto_xd.xlsx)"
Log "══════════════════════════════════════════════"

$b64 = XlsToBase64 "$SCRIPT_DIR\ex5_misto_xd.xlsx"

$layoutBody = @{
    cnpj                    = $CNPJ
    nome                    = "TC5-MistoXD-$(Get-Random)"
    config_planilha         = @{ linha_cabecalho = 0; linha_inicio_dados = 1 }
    coluna_tipo_lancamento  = "F"
    coluna_grupo_lancamento = "G"
    colunas                 = @(
        @{ campo_destino="data";          coluna_excel="A"; tipo_dado="data" }
        @{ campo_destino="conta_debito";  coluna_excel="B"; tipo_dado="string" }
        @{ campo_destino="conta_credito"; coluna_excel="C"; tipo_dado="string" }
        @{ campo_destino="valor";         coluna_excel="D"; tipo_dado="decimal" }
        @{ campo_destino="historico";     coluna_excel="E"; tipo_dado="string" }
    )
    config_valor = @{ tipo_sinal = "sinal_valor" }
}
$layoutTC5 = CurlPost "/import-layouts" $layoutBody
$LID5 = $layoutTC5["id"]
Log "Layout TC5: $LID5 (coluna_tipo=F, coluna_grupo=G)"

CriarMapeamentos $LID5 @{ "3145"="12"; "2004"="78" }
$idLote5 = CriarLote $b64 $LID5 $PERFIL_ID
Log "Lote TC5: $idLote5 — aguardando..."

$resTC5 = AguardarLote $idLote5
if ($resTC5["status"] -eq "pendente") {
    $resTC5 = ResolverPendencias $idLote5 @{ "3145"="12"; "2004"="78" }
}
if ($resTC5["status"] -ne "concluido") {
    Fail "TC5 — Lote nao concluido: $($resTC5['status']) — $($resTC5['mensagem_erro'])"
} else {
    $saida5 = DownloadSaida $idLote5
    $esp5 = @"
|0000|01293422000165|
|6000|X||||
|6100|01/01/2026|12|78|60000,00|0|ALUGUEL JAN 2026|VICTOR_CAMPOS|456||
|6000|D||||
|6100|02/01/2026|12||500,00|0|RATEIO TELECOM DEBITO|VICTOR_CAMPOS|456||
|6100|02/01/2026||78|200,00|0|RATEIO TELECOM CREDITO 1|VICTOR_CAMPOS|456||
|6100|02/01/2026||78|300,00|0|RATEIO TELECOM CREDITO 2|VICTOR_CAMPOS|456||
"@
    ValidarSaida "TC5 — Misto X+D" $saida5 $esp5
}

# ══════════════════════════════════════════════════════════════
# Resumo final
# ══════════════════════════════════════════════════════════════
Log ""
Log "════════════════════════════════════════════════════════"
$total = $global:PASSOU + $global:FALHOU
if ($global:FALHOU -eq 0) {
    Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] TODOS OS TESTES APROVADOS ($($global:PASSOU)/$total)" -ForegroundColor Green
} else {
    Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] $($global:FALHOU) TESTE(S) FALHARAM — $($global:PASSOU)/$total aprovados" -ForegroundColor Red
}
Log "════════════════════════════════════════════════════════"
