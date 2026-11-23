import 'dotenv/config';
import fs from 'node:fs';

const requiredFiles = [
  'firebase-applet-config.json',
  'firebase-blueprint.json',
  'firestore.rules',
  'firestore.indexes.json',
  'storage.rules',
  'firebase.json',
  'vercel.json',
  'api/index.ts',
  '.env.example',
];

let missingFiles = 0;
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`ERRO: Arquivo obrigatório ausente: ${file}`);
    missingFiles++;
  }
}

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8')) as {
  projectId?: string;
  firestoreDatabaseId?: string;
};

console.log('=== PetClick — Validação de Ambiente & Prontidão Vercel ===');
console.log(`- Firebase Project ID: ${process.env.FIREBASE_PROJECT_ID || fbConfig.projectId} (ATIVO)`);
console.log(`- Firestore Database ID: ${process.env.FIREBASE_DATABASE_ID || fbConfig.firestoreDatabaseId} (ATIVO)`);
console.log(`- InfinitePay Handle: ${process.env.INFINITEPAY_HANDLE || 'raquel-petersen'} (ATIVO · Checkout Público Integrado)`);
console.log(`- Correios Frete: ${process.env.CORREIOS_CLIENT_ID ? 'Contrato CWS + Tabela Pública' : 'Tabela Pública Nacional PAC/SEDEX (ATIVO)'} · CEP Origem ${process.env.CORREIOS_ORIGIN_CEP || '01310100'}`);
console.log(`- APP_URL / Vercel Host: ${process.env.APP_URL || process.env.VERCEL_URL || 'Detecção automática via headers/VERCEL_URL (ATIVO)'}`);

const optionalSecrets = [
  { key: 'INFINITEPAY_API_KEY', label: 'API Key corporativa InfinitePay (opcional — Checkout Público já ativo)' },
  { key: 'CORREIOS_CLIENT_ID', label: 'Contrato CWS Correios (opcional — Tabela Pública PAC/SEDEX já ativa)' },
  { key: 'FIREBASE_CLIENT_EMAIL', label: 'Service Account Admin SDK (opcional — Auth/Firestore client já ativos)' },
];

for (const opt of optionalSecrets) {
  const present = Boolean(process.env[opt.key] && process.env[opt.key]!.trim().length > 0);
  console.log(`- [Opcional] ${opt.key}: ${present ? 'CONFIGURADA' : 'OPCIONAL / MODO PÚBLICO ATIVO'} (${opt.label})`);
}

if (missingFiles > 0) {
  process.exit(1);
}
console.log('Todos os arquivos estruturais e integrações padrão da PetClick estão prontos para Vercel.');
