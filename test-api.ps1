$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$pass = 0; $fail = 0
function Check($name, $cond) {
  if ($cond) { Write-Host "PASS: $name"; $script:pass++ }
  else { Write-Host "FAIL: $name"; $script:fail++ }
}
function PostJson($url, $obj, $token) {
  return Req 'POST' $url $token $obj
}
function Req($method, $url, $token, $obj) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  $params = @{ UseBasicParsing = $true; Method = $method; Uri = $url; Headers = $headers }
  if ($null -ne $obj) { $params['ContentType'] = 'application/json'; $params['Body'] = ($obj | ConvertTo-Json) }
  try {
    $r = Invoke-WebRequest @params
    $body = if ($r.Content) { $r.Content | ConvertFrom-Json } else { $null }
    return @{ status = $r.StatusCode; body = $body }
  } catch {
    # PS 5.1: corpo do erro fica em $_.ErrorDetails.Message (o stream ja foi consumido)
    $txt = $null
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $txt = $_.ErrorDetails.Message }
    elseif ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $txt = $reader.ReadToEnd()
    }
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $body = if ($txt) { $txt | ConvertFrom-Json } else { $null }
    return @{ status = $status; body = $body }
  }
}

# 1. login admin
$login = PostJson "$base/auth/login" @{ email='admin@test.com'; password='admin123' }
Check 'login admin retorna 200 + token' ($login.status -eq 200 -and $login.body.accessToken)
$adminToken = $login.body.accessToken

# 2. login errado -> 401
$bad = PostJson "$base/auth/login" @{ email='admin@test.com'; password='senhaerrada' }
Check 'login invalido retorna 401' ($bad.status -eq 401)

# 3. sem token -> 401
$noauth = Req GET "$base/products" $null
Check 'GET /products sem token retorna 401' ($noauth.status -eq 401)

# 4. token invalido -> 401
$badtok = Req GET "$base/products" 'token-lixo'
Check 'GET /products token invalido retorna 401' ($badtok.status -eq 401)

# 5. criar produto valido -> 201
$p = Req POST "$base/products" $adminToken @{ name='Teclado Mecanico'; sku='TEC-001'; price=199.9; quantity=10; category='perifericos'; description='RGB' }
Check 'POST /products valido retorna 201' ($p.status -eq 201 -and $p.body.id)
$pid1 = $p.body.id

# 6. SKU duplicado -> 409
$dup = Req POST "$base/products" $adminToken @{ name='Outro'; sku='TEC-001'; price=10 }
Check 'POST SKU duplicado retorna 409' ($dup.status -eq 409)

# 7. validacao: preco negativo e sku curto -> 400
$inv = Req POST "$base/products" $adminToken @{ name='Produto X'; sku='a'; price=-5 }
Check 'POST invalido retorna 400 com details' ($inv.status -eq 400 -and @($inv.body.details).Count -ge 2)

# 8. GET por id -> 200
$g = Req GET "$base/products/$pid1" $adminToken
Check 'GET /products/:id retorna 200' ($g.status -eq 200 -and $g.body.sku -eq 'TEC-001')

# 9. PUT atualiza -> 200
$u = Req PUT "$base/products/$pid1" $adminToken @{ price=179.5; quantity=25 }
Check 'PUT atualiza preco/quantidade' ($u.status -eq 200 -and $u.body.price -eq 179.5)

# 10. listagem com filtro
$l = Req GET "$base/products?search=Teclado&active=true" $adminToken
Check 'GET lista com filtro retorna 1 item' ($l.status -eq 200 -and $l.body.data.Count -eq 1)

# 11. user comum nao ve produto do admin
$ulogin = PostJson "$base/auth/login" @{ email='user@test.com'; password='user123' }
$userToken = $ulogin.body.accessToken
Check 'login user retorna token' ($ulogin.status -eq 200 -and $userToken)
$gu = Req GET "$base/products/$pid1" $userToken
Check 'user comum acessando produto alheio retorna 403' ($gu.status -eq 403)
$lu = Req GET "$base/products" $userToken
Check 'user comum lista apenas os proprios (0)' ($lu.status -eq 200 -and $lu.body.data.Count -eq 0)

# 12. user comum tenta deletar -> 403
$du = Req DELETE "$base/products/$pid1" $userToken
Check 'user comum DELETE retorna 403' ($du.status -eq 403)

# 13. admin deleta -> 204, depois GET -> 404
$da = Req DELETE "$base/products/$pid1" $adminToken
Check 'admin DELETE retorna 204' ($da.status -eq 204)
$g404 = Req GET "$base/products/$pid1" $adminToken
Check 'GET apos delete retorna 404' ($g404.status -eq 404)

# 14. register novo usuario -> 201, duplicado -> 409
$email = "novo$(Get-Random -Maximum 99999)@test.com"
$r = PostJson "$base/auth/register" @{ name='Novo'; email=$email; password='senha123' }
Check 'register novo retorna 201' ($r.status -eq 201)
$rdup = PostJson "$base/auth/register" @{ name='Novo'; email=$email; password='senha123' }
Check 'register duplicado retorna 409' ($rdup.status -eq 409)

# 15. register invalido -> 400
$rinv = PostJson "$base/auth/register" @{ name='A'; email='x'; password='12' }
Check 'register invalido retorna 400 com details' ($rinv.status -eq 400 -and @($rinv.body.details).Count -ge 3)

# 16. swagger: UI e spec abertos, com todos os endpoints documentados
$docs = Invoke-WebRequest -UseBasicParsing "$base/docs/"
Check 'GET /docs (Swagger UI) retorna 200' ($docs.StatusCode -eq 200)
$spec = (Invoke-WebRequest -UseBasicParsing "$base/docs.json").Content | ConvertFrom-Json
$pathsOk = $spec.paths.'/auth/login'.post -and $spec.paths.'/auth/register'.post -and
  $spec.paths.'/products'.get -and $spec.paths.'/products'.post -and
  $spec.paths.'/products/{id}'.get -and $spec.paths.'/products/{id}'.put -and $spec.paths.'/products/{id}'.delete
Check 'spec OpenAPI documenta os 7 endpoints' ($spec.openapi -eq '3.0.3' -and $pathsOk)
$secOk = ($null -ne $spec.paths.'/products'.get.security[0].'bearerAuth') -and $spec.components.securitySchemes.bearerAuth.scheme -eq 'bearer'
Check 'spec declara seguranca bearer JWT nos products' ($secOk)

Write-Host "`nResultado: $pass passaram, $fail falharam"
if ($fail -gt 0) { exit 1 }
