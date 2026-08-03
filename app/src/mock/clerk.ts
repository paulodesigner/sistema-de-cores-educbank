/** Stub do @clerk/vue.
 *  Dois componentes de segurança usam o SDK do Clerk (`useUser`, `useAuth`), que
 *  exige o plugin instalado com uma chave real de projeto. Na documentação de
 *  cor não há sessão nem autenticação: o stub devolve um usuário de exemplo para
 *  o componente montar e mostrar as cores. Nada aqui fala com a rede. */
import { ref, computed } from 'vue'

const usuario = {
  id: 'user_exemplo',
  firstName: 'Ana',
  lastName: 'Souza',
  fullName: 'Ana Souza',
  primaryEmailAddress: { emailAddress: 'ana.souza@exemplo.com.br' },
  emailAddresses: [{ emailAddress: 'ana.souza@exemplo.com.br', id: 'email_1' }],
  primaryPhoneNumber: { phoneNumber: '+5511999990000' },
  phoneNumbers: [{ phoneNumber: '+5511999990000', id: 'phone_1', verification: { status: 'verified' } }],
  passwordEnabled: true,
  twoFactorEnabled: false,
  totpEnabled: false,
  backupCodeEnabled: false,
  externalAccounts: [],
  createBackupCode: async () => ({ codes: ['111111', '222222', '333333', '444444', '555555', '666666'] }),
  createTOTP: async () => ({ secret: 'ABC', uri: 'otpauth://totp/exemplo' }),
  verifyTOTP: async () => ({ verified: true }),
  update: async () => usuario,
  updatePassword: async () => usuario,
  createPhoneNumber: async () => usuario.phoneNumbers[0],
  reload: async () => usuario,
}

export const useUser = () => ({ isLoaded: ref(true), isSignedIn: ref(true), user: ref(usuario) })
export const useAuth = () => ({
  isLoaded: ref(true), isSignedIn: ref(true), userId: ref(usuario.id),
  sessionId: ref('sess_exemplo'), getToken: async () => 'token-de-exemplo', signOut: async () => {},
})
export const useClerk = () => ({ user: usuario, signOut: async () => {}, openUserProfile: () => {} })
export const useSession = () => ({ isLoaded: ref(true), session: ref({ id: 'sess_exemplo', user: usuario }) })
export const useSessionList = () => ({ isLoaded: ref(true), sessions: ref([]) })
export const useSignIn = () => ({ isLoaded: ref(true), signIn: ref({}) })
export const useSignUp = () => ({ isLoaded: ref(true), signUp: ref({}) })
export const useOrganization = () => ({ isLoaded: ref(true), organization: ref(null) })
export const clerkPlugin = { install: () => {} }
export const UserButton = { name: 'UserButtonStub', template: '<span />' }
export const SignedIn = { name: 'SignedInStub', template: '<slot />' }
export const SignedOut = { name: 'SignedOutStub', template: '<span />' }
export default { clerkPlugin, useUser, useAuth, useClerk, useSession }
