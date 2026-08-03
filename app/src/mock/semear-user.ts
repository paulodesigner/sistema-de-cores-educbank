/**
 * Semeia o userStore com um usuário de exemplo.
 *
 * Existia só dentro do `PaginaCheia.vue`, para a top bar não montar vazia. Só
 * que a MESMA store alimenta componentes isolados: o `NavSelectTenant` lê
 * `userStore.allTenants` e, sem ela, mostra "Nenhuma rede encontrada" na página
 * de documentação dele — o componente parece quebrado quando o que falta é dado.
 *
 * Chamado pelas duas telas (página cheia e palco de componente), por isso vive
 * aqui e não dentro de uma delas.
 */
export async function semearUsuario() {
  const { useUserStore } = await import('@ebp/modules/users/store/userStore')
  const userStore: any = useUserStore()
  userStore.isAuthenticated = true
  userStore.userName = 'Ana Souza'
  userStore.email = 'ana.souza@exemplo.com.br'
  userStore.id = 'user-exemplo'
  userStore.tenant = { id: 1, name: 'Colégio Horizonte' }
  userStore.tenantSelected = { id: 1, name: 'Colégio Horizonte', displayName: 'Colégio Horizonte' }
  /* Mais de uma rede de propósito: com uma só, o seletor não tem o que mostrar
     na lista e o componente continua parecendo vazio. */
  userStore.allTenants = {
    items: [
      { id: 1, name: 'colegio-horizonte', displayName: 'Colégio Horizonte' },
      { id: 2, name: 'colegio-aurora', displayName: 'Colégio Aurora' },
      { id: 3, name: 'instituto-viana', displayName: 'Instituto Viana' },
    ],
    totalCount: 3,
  }
  return userStore
}
