/**
 * Mock do provider HTTP para o Storybook.
 *
 * No app, `provider.core/identity/...` são instâncias axios injetadas na inicialização.
 * No Storybook standalone elas ficam `undefined` → os selects `Ath*Select*` que buscam
 * dados (via services → `provider.<gw>.get(url)`) quebram no mount e renderizam vazios.
 *
 * Aqui inicializamos cada gateway com um axios-like que devolve uma LISTA genérica.
 * A resposta cobre os dois acessos usados no código: `response.data` (a maioria) e
 * `response.data.items`/`.result`/`.groups`/... (espelhamos o array nessas chaves).
 * Cada item traz vários campos de rótulo (name/label/description/...) p/ o rótulo aparecer.
 *
 * NÃO é dado real — é showcase. As stories dos selects declaram isso (dados mock).
 */
import provider from '@/provider'

const GATEWAYS = [
  'core', 'identity', 'gatewaytransfer', 'public', 'invoiceview',
  'cession', 'credit', 'pagarme', 'courier',
] as const

const LABELS = ['Opção A', 'Opção B', 'Opção C', 'Opção D', 'Opção E', 'Opção F']

function mockList(n = LABELS.length): any[] {
  const arr: any[] = Array.from({ length: n }, (_, i) => {
    const L = LABELS[i % LABELS.length]
    return {
      id: i + 1,
      value: i + 1,
      key: `opt-${i + 1}`,
      code: String(i + 1).padStart(3, '0'),
      document: String(i + 1).padStart(14, '0'),
      schoolId: i + 1,
      // campos de rótulo realmente usados como label-prop nos selects (name/label/displayName/…)
      name: L,
      label: L,
      displayName: L,
      legalName: L,
      studentName: L,
      inputName: L,
      description: L,
      text: L,
      title: L,
      status: 'active',
      enabled: true,
      // alguns selects (escolas) acessam arrays aninhados — evita TypeError no mount
      companies: [{ document: String(i + 1).padStart(14, '0'), legalName: L, name: L }],
      areas: [{ id: i + 1, name: L }],
    }
  })
  // Muitos services fazem response.data.<chave>; espelhamos o array nas chaves comuns
  // (o array é objeto — dá pra pendurar props) e ele continua iterável p/ .map/.filter.
  ;['items', 'data', 'result', 'content', 'list', 'value', 'groups', 'records', 'rows'].forEach(
    (k) => {
      ;(arr as any)[k] = arr
    }
  )
  return arr
}

function makeGateway() {
  const respond = async () => ({ data: mockList(), status: 200, headers: {}, config: {} })
  return {
    get: respond,
    post: respond,
    put: respond,
    patch: respond,
    delete: respond,
    request: respond,
    defaults: { baseURL: '/mock', headers: {} },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  }
}

export function installProviderMock(): void {
  for (const gw of GATEWAYS) {
    try {
      provider.addProvider(gw as any, makeGateway())
    } catch {
      /* noop */
    }
  }
}
