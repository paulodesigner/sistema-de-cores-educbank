/**
 * i18n REAL do produto: a mesma instância que o app usa (`@/i18n`), com todos os
 * locales pt-BR do repositório carregados de uma vez.
 * Um `t` caseiro não serve: as chaves do produto usam interpolação nomeada
 * (`Há {days} dias sem retorno`), que só o vue-i18n resolve — sem isso a tela
 * mostraria a chave crua e não seria fiel.
 */
import i18n from '@/i18n'

const modulos = import.meta.glob('@ebp/locales/**/pt-BR.json', { eager: true })

const mensagens: Record<string, any> = {}
Object.values(modulos).forEach((m: any) => Object.assign(mensagens, m?.default ?? m))
i18n.global.setLocaleMessage('pt-BR', mensagens)

export default i18n
export const t = i18n.global.t as (chave: string, ...resto: any[]) => string
export const totalChaves = () => Object.keys(mensagens).length
