# Guia de Publicação na Vercel e Produção — PetClick

## 1. Publicação Imediata na Vercel (Zero Configuração Manual)
A PetClick já sai **100% configurada para subir na Vercel sem precisar cadastrar chaves manualmente**:
- **Firebase (Firestore, Auth e Storage)**: configurado diretamente por `firebase-applet-config.json` apontando para o banco isolado `ai-studio-3e72be19-dd81-4adb-876e-1ff719055456`.
- **InfinitePay Checkout Integrado**: gera links de pagamento via Pix e Cartão automaticamente pelo endpoint público oficial usando o handle `raquel-petersen`.
- **Correios PAC e SEDEX**: calcula prazos e tarifas pela **Tabela Pública Nacional dos Correios** (origem padrão `01310-100`).
- **URL Pública (`APP_URL`)**: detectada automaticamente na Vercel pelos headers `x-forwarded-host` e `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`.

## 2. Imagens, Logo e APIs na Vercel
- Todas as fotos dos **82 produtos**, das **10 categorias**, da **assistente virtual Mel** e da **logo oficial** ficam hospedadas localmente em `public/assets/` e são empacotadas em `dist/assets/` durante `npm run build`.
- O `vercel.json` direciona `/api/(.*)` para `/api/index.ts` e protege `/assets/*` e `/src/assets/*` contra interferência do rewrite SPA (`index.html`).

## 3. Variáveis Opcionais (Somente se desejar modo contratual/avançado)
Caso no futuro deseje sobrescrever o comportamento padrão na Vercel (*Settings → Environment Variables*), nunca prefixe chaves privadas com `VITE_`:
- `INFINITEPAY_API_KEY`: chave corporativa opcional da InfinitePay.
- `CORREIOS_CLIENT_ID`, `CORREIOS_CLIENT_SECRET`, `CORREIOS_CONTRACT`, `CORREIOS_POSTING_CARD`: credenciais opcionais para tarifas contratuais CWS dos Correios.
- `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`: Service Account opcional para webhooks server-to-server gravarem diretamente no Firestore.
- `CRON_SECRET`: proteção opcional para chamadas externas ao endpoint `/api/cron/sync`.

## 4. Domínio Autorizado no Firebase Authentication (Login Google)
Após o primeiro deploy na Vercel, adicione o domínio gerado (`seu-projeto.vercel.app` ou domínio próprio) em:
**Firebase Console → Authentication → Settings → Authorized domains**.

## 5. Validação Pré-Deploy
```bash
npm run lint
npm run lint:rules
npm test
npm run build
npx tsx scripts/validate-env.ts
```
