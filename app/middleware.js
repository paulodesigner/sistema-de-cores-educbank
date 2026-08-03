/**
 * middleware.js — portão de senha do Sistema de Cores (Vercel Edge Middleware).
 *
 * Porta a mesma lógica do `auth.js` (padrão do Hub, usado no Rulebook /
 * regras de negócio — ver templates/tela-de-login/): 1 senha compartilhada,
 * nunca guardada no código; sessão via cookie HttpOnly assinado (HMAC-SHA256,
 * Web Crypto — igual no Cloudflare Worker e no Vercel Edge Runtime).
 *
 * A diferença de plataforma: Cloudflare lê `env.SITE_PASSWORD` (secret do
 * Worker); aqui lê `process.env.SITE_PASSWORD` (Environment Variable do
 * projeto, configurada no dashboard do Vercel — Settings → Environment
 * Variables). Configure com a MESMA senha usada no Rulebook.
 *
 * Sem a env var: fecha por padrão (503), nunca abre desprotegido.
 */
import { next } from '@vercel/edge'

const SESSION_COOKIE = 'hub_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export const config = { matcher: '/(.*)' }

export default async function middleware(request) {
  const secret = process.env.SITE_PASSWORD
  if (!secret) {
    return new Response(
      'Portaria ainda sem senha. Configure SITE_PASSWORD nas Environment Variables do projeto, no dashboard do Vercel.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const url = new URL(request.url)

  if (url.pathname === '/__login' && request.method === 'POST') {
    return handleLoginSubmit(request, secret)
  }
  if (url.pathname === '/__logout') {
    return new Response(null, { status: 302, headers: { Location: '/', 'Set-Cookie': clearCookie() } })
  }

  const cookie = getCookie(request, SESSION_COOKIE)
  if (await verifySession(secret, cookie)) return next()

  return renderLogin({ error: false })
}

async function handleLoginSubmit(request, secret) {
  let password = ''
  try {
    const form = await request.formData()
    password = String(form.get('password') || '')
  } catch (_) { /* corpo inválido → trata como senha errada */ }

  if (!safeEqual(password, secret)) {
    return renderLogin({ error: true })
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  const token = await signSession(secret, exp)
  return new Response(null, {
    status: 302,
    headers: { Location: '/', 'Set-Cookie': setCookie(token) },
  })
}

/* ---------------- Sessão (cookie assinado, sem estado no servidor) ---------------- */
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  )
}
async function signSession(secret, expTs) {
  const key = await hmacKey(secret)
  const payload = String(expTs)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${b64urlEncode(new Uint8Array(sig))}`
}
async function verifySession(secret, token) {
  if (!token) return false
  const [payload, sigB64] = token.split('.')
  if (!payload || !sigB64) return false
  const exp = Number(payload)
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return false
  try {
    const key = await hmacKey(secret)
    const sig = b64urlDecode(sigB64)
    return await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(payload))
  } catch (_) { return false }
}
function b64urlEncode(bytes) {
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function safeEqual(a, b) { // comparação em tempo constante (evita timing attack na senha)
  const ea = new TextEncoder().encode(a)
  const eb = new TextEncoder().encode(b)
  if (ea.length !== eb.length) return false
  let diff = 0
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}
function getCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  const found = header.split(/;\s*/).find((c) => c.startsWith(name + '='))
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null
}
function setCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
}
function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}

/* ---------------- Tela de login ----------------
   Copy DE PROPÓSITO não menciona o conteúdo protegido — só "Acesso interno",
   mesma convenção do template do Hub. Logo oficial Educbank (SVG inline). */
const LOGO_SVG = `<svg width="120" height="18" viewBox="0 0 138 21" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="educbank"><path d="M94.7239 4.55661C90.084 4.55661 86.6206 8.04559 86.6206 12.7343C86.6206 17.423 89.8092 20.934 94.4162 20.934C97 20.934 98.8802 19.7453 99.7597 17.8632H99.8808C99.8476 18.1384 99.8476 18.5566 99.8476 19.228V20.5377H103.19V13.6368C103.19 8.01257 99.9688 4.55661 94.7239 4.55661ZM94.9658 17.8082C92.1732 17.8082 90.1058 15.6179 90.1058 12.6682C90.1058 9.71856 92.1732 7.6824 94.9658 7.6824C97.7587 7.6824 99.7047 9.75157 99.7047 12.6682C99.7047 15.5849 97.7366 17.8082 94.9658 17.8082Z" fill="#6B55D8"/><path d="M126.203 14.2201L133.064 20.5377H137.825L129.304 12.6352L137.253 5.01888H132.669L126.258 11.1824H126.324V0.06604H122.839V20.5377H126.324V14.2201H126.203Z" fill="#6B55D8"/><path d="M116.934 11.8207V20.5377H120.398V11.8207C120.398 7.35221 117.572 4.55661 113.053 4.55661C108.776 4.55661 105.763 7.56133 105.763 11.8207V20.5377H109.161V11.8207C109.161 9.47641 110.744 7.86951 113.042 7.86951C115.505 7.86951 116.923 9.33332 116.923 11.8207H116.934Z" fill="#6B55D8"/><path d="M47.3896 13.6698C47.3896 15.8931 45.6302 17.6541 43.442 17.6541C41.2541 17.6541 39.4069 15.8601 39.4069 13.6698V5.01886H36.1304V13.6808C36.1304 17.7201 39.374 20.978 43.442 20.978C47.5104 20.978 50.7319 17.6981 50.7319 13.6808V5.01886H47.3896V13.6808V13.6698Z" fill="#6B55D8"/><path d="M30.4677 0V6.2846C30.4677 6.85691 30.4677 7.28615 30.5009 7.64937H30.3797C29.4673 5.73428 27.62 4.61163 25.0691 4.61163C20.4841 4.61163 17.2405 7.97956 17.2405 12.7233C17.2405 17.467 20.704 20.956 25.3769 20.956C30.6327 20.956 33.8763 17.467 33.8763 11.8428V0H30.4787H30.4677ZM25.5529 17.8962C22.7931 17.8962 20.759 15.739 20.759 12.7893C20.759 9.83961 22.7931 7.74842 25.5529 7.74842C28.3127 7.74842 30.3139 9.83961 30.3139 12.7893C30.3139 15.739 28.3457 17.8962 25.5529 17.8962Z" fill="#6B55D8"/><path d="M77.4285 4.64463C74.9105 4.64463 73.0303 5.83332 72.1507 7.68237H72.0299C72.0628 7.28614 72.0628 6.98896 72.0628 6.31757V0.0329895H68.6323V11.9088C68.6323 17.533 71.8759 20.989 77.1315 20.989C81.7496 20.989 85.1801 17.5 85.1801 12.7893C85.1801 8.0786 81.9915 4.64463 77.4396 4.64463H77.4285ZM76.9446 17.9182C74.152 17.9182 72.1507 15.794 72.1507 12.8113C72.1507 9.8286 74.152 7.77042 76.9446 7.77042C79.7375 7.77042 81.6835 9.92765 81.6835 12.8113C81.6835 15.6949 79.6496 17.9182 76.9446 17.9182Z" fill="#6B55D8"/><path d="M64.9271 9.93868L67.1482 7.78145C65.7516 5.71225 63.4426 4.55661 60.7708 4.55661C56.0977 4.55661 52.5464 8.07863 52.5464 12.7343C52.5464 17.3899 56.0319 20.934 60.7708 20.934C63.4758 20.934 65.9056 19.6572 67.115 17.5L65.0479 15.3758C64.1355 16.9277 62.6181 17.8082 60.7708 17.8082C58.0111 17.8082 56.0648 15.684 56.0648 12.6682C56.0648 9.65252 58.0111 7.6824 60.7708 7.6824C62.563 7.6824 63.9593 8.44181 64.9271 9.92768V9.93868Z" fill="#6B55D8"/><path d="M8.22445 4.55661C3.46351 4.55661 0 7.99058 0 12.7343C0 17.478 3.48549 20.934 8.25744 20.934C10.9623 20.934 13.1723 19.8663 14.6566 17.8082L12.5016 15.6179C11.556 17.0818 10.1926 17.8082 8.27942 17.8082C5.81647 17.8082 4.03525 16.3443 3.63942 14.044H15.7232V13.3726C15.7562 13.1635 15.7562 12.9214 15.7562 12.7343C15.7562 7.99058 12.6005 4.55661 8.22445 4.55661ZM3.63942 11.4576C4.03525 9.1132 5.72851 7.6934 8.13647 7.6934C10.5444 7.6934 12.0838 9.21225 12.3257 11.4576H3.63942Z" fill="#6B55D8"/></svg>`

function renderLogin({ error }) {
  const html = LOGIN_HTML.replace('__ERROR_DISPLAY__', error ? 'block' : 'none')
  return new Response(html, {
    status: error ? 401 : 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const LOGIN_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acesso interno</title>
<style>
  :root { --bg:#fcfcfb; --card:#ffffff; --ln:#e7e7e3; --tx:#16171a; --tx2:#54585e; --ac:#6b55d8; --err:#b70000; --err-bg:#fde8e8; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#101113; --card:#181a1c; --ln:#292b2f; --tx:#eef0f2; --tx2:#a8aeb5; --err:#ffabab; --err-bg:#3d1414; }
  }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:var(--bg); color:var(--tx); font-family:ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  .card { width:min(360px, calc(100vw - 48px)); background:var(--card); border:1px solid var(--ln);
    border-radius:16px; padding:36px 32px; box-shadow:0 20px 44px rgba(0,0,0,.10); }
  .logo { display:block; margin-bottom:28px; }
  h1 { font-size:16px; font-weight:600; margin:0 0 4px; }
  p.sub { font-size:13.5px; color:var(--tx2); margin:0 0 24px; }
  label { display:block; font-size:12.5px; font-weight:600; color:var(--tx2); margin-bottom:6px; }
  input[type="password"] { width:100%; padding:11px 13px; border:1.5px solid var(--ln); border-radius:9px;
    background:var(--bg); color:var(--tx); font-size:14.5px; font-family:inherit; }
  input[type="password"]:focus { outline:2px solid var(--ac); outline-offset:1px; border-color:var(--ac); }
  button { width:100%; margin-top:18px; padding:11px 0; border:none; border-radius:9px; background:var(--ac);
    color:#fff; font-size:14.5px; font-weight:600; font-family:inherit; cursor:pointer; }
  button:hover { opacity:.92; }
  .erro { display:__ERROR_DISPLAY__; margin-top:14px; padding:9px 12px; border-radius:8px;
    background:var(--err-bg); color:var(--err); font-size:13px; font-weight:600; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/__login" autocomplete="off">
    <span class="logo">${LOGO_SVG}</span>
    <h1>Acesso interno</h1>
    <p class="sub">Digite a senha para continuar.</p>
    <label for="password">Senha</label>
    <input type="password" name="password" id="password" autofocus required>
    <button type="submit">Entrar</button>
    <div class="erro">Senha incorreta. Tenta de novo.</div>
  </form>
</body>
</html>`
