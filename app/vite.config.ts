/**
 * Consome o código REAL do EducbankPay por alias, read-only.
 * A receita (alias + dedupe + fs.allow) é a mesma já provada no Storybook
 * standalone do DS (`../../../design-system/.storybook/main.ts`): os componentes
 * vivem FORA do root, então imports bare precisam ser resolvidos a partir daqui.
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJETO = path.resolve(dirname, '..')            // .../sistema-de-cores-educbank
// EducbankPay é um symlink NA RAIZ do projeto (mesmo padrão do Storybook standalone:
// `../design-system/EducbankPay` -> a mesma clonagem read-only) — resolvemos o
// caminho REAL pro alias e pro fs.allow (o Vite segue symlink -> precisa do realpath).
const logico = path.join(PROJETO, 'EducbankPay', 'webclient', 'src')
const EBP_SRC = (() => { try { return fs.realpathSync(logico) } catch { return logico } })()
const EBP_PUBLIC = path.join(path.dirname(EBP_SRC), 'public')

const dedupe = [
  '@clerk/vue', '@microsoft/signalr', '@vee-validate/i18n', '@vee-validate/rules',
  '@vuepic/vue-datepicker', 'axios', 'bootstrap', 'currency.js', 'date-fns',
  'json-formatter-js', 'luxon', 'maska', 'pinia', 'qrcode', 'qs', 'quill',
  'register-service-worker', 'sanitize-html', 'sweetalert2', 'tiny-emitter',
  'v-money', 'vee-validate', 'vue', 'vue-i18n', 'vue-router', 'vue3-tree',
]

/* O compiler-sfc precisa LER arquivos para resolver tipo importado
   (`defineProps<Partial<EbTippyProps>>()` no EbTippy.vue). Como o SFC vive fora
   do root e o import usa alias, ele não acha sozinho e o BUILD quebra. Damos um
   fs próprio que traduz o alias antes de ler. */
const fsComAlias = {
  fileExists(arquivo: string) {
    try { return fs.statSync(resolverAlias(arquivo)).isFile() } catch { return false }
  },
  readFile(arquivo: string) {
    try { return fs.readFileSync(resolverAlias(arquivo), 'utf-8') } catch { return undefined }
  },
  realpath(arquivo: string) {
    try { return fs.realpathSync(resolverAlias(arquivo)) } catch { return arquivo }
  },
}
function resolverAlias(p: string): string {
  if (p.startsWith('@ebp/')) return path.join(EBP_SRC, p.slice(5))
  if (p.startsWith('@/')) return path.join(EBP_SRC, p.slice(2))
  return p
}

/* Serve a fonte de ícones vendorizada em /phosphor-vendor (o publicDir já está
   ocupado pelo /public do webclient, e só se pode ter um). */
function fonteDeIcones() {
  return {
    name: 'fonte-de-icones',
    configureServer(server: any) {
      server.middlewares.use('/phosphor-vendor', (req: any, res: any, next: any) => {
        const arquivo = path.join(dirname, 'publico', (req.url || '').split('?')[0])
        if (fs.existsSync(arquivo) && fs.statSync(arquivo).isFile()) {
          res.setHeader('Content-Type', arquivo.endsWith('.css') ? 'text/css' : 'application/octet-stream')
          fs.createReadStream(arquivo).pipe(res)
        } else next()
      })
    },
    generateBundle() {
      // no build, a cópia vai junto (emitida abaixo em closeBundle)
    },
    closeBundle() {
      const destino = path.join(dirname, 'dist', 'phosphor-vendor')
      fs.mkdirSync(destino, { recursive: true })
      for (const f of fs.readdirSync(path.join(dirname, 'publico'))) {
        fs.copyFileSync(path.join(dirname, 'publico', f), path.join(destino, f))
      }
    },
  }
}

export default defineConfig({
  plugins: [vue({ script: { fs: fsComAlias } }), fonteDeIcones()],
  // /img/* e as fontes que o produto usa saem do public do webclient.
  // A fonte de ÍCONES (Phosphor) o produto carrega de um CDN no index.html; aqui
  // servimos a versão vendorizada (mesma do Storybook do DS), em `publico/`.
  publicDir: EBP_PUBLIC,
  resolve: {
    alias: {
      '@': EBP_SRC,          // como o webclient importa internamente
      '@ebp': EBP_SRC,       // intenção explícita no nosso código
      '@app': path.join(dirname, 'src'),
      // O SDK do Clerk exige plugin + chave de projeto; na documentação de cor
      // não existe sessão. O stub deixa os componentes de segurança montarem.
      '@clerk/vue': path.join(dirname, 'src/mock/clerk.ts'),
      vue: 'vue/dist/vue.esm-bundler.js',
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    dedupe,
  },
  server: {
    port: 5180,
    fs: { allow: [dirname, EBP_SRC, path.dirname(EBP_SRC)] },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import', 'legacy-js-api', 'global-builtin', 'mixed-decls', 'color-functions'],
      },
    },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
})
