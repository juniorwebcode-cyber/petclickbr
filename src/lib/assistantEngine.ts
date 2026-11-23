import { formatBRL } from './format';
import type { Category, Product, ShippingSettings, StorefrontSettings } from '../types/petclick';

export interface AssistantReply {
  text: string;
  recommendedProducts?: Product[];
  actionLink?: { label: string; path: string };
  externalLink?: { label: string; href: string };
}

export const ASSISTANT_PROFILE = {
  name: 'Mel',
  role: 'Atendimento PetClick',
  welcomeMessage:
    'Oi! Eu sou a Mel, assistente da PetClick. Posso tirar dúvidas sobre frete, pagamentos, trocas ou indicar produtos para seu pet!',
};

function normalizeText(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  cachorro: ['caes', 'cao', 'dog'],
  dog: ['caes', 'cao', 'cachorro'],
  felino: ['gatos', 'gato'],
  gato: ['gatos', 'felino'],
  gatinho: ['gatos', 'gato'],
  passaro: ['aves', 'calopsita', 'canario', 'gaiola'],
  calopsita: ['aves', 'calopsita'],
  hamster: ['roedores', 'hamster'],
  coelho: ['roedores', 'coelho', 'feno'],
  peixe: ['peixes', 'aquario'],
  aquario: ['peixes', 'aquario', 'filtro', 'termostato'],
  cama: ['caminhas', 'cama'],
  caminha: ['caminhas', 'cama'],
  banho: ['higiene', 'shampoo', 'tapete', 'areia'],
  pulga: ['antipulgas', 'bravecto', 'seresto'],
  carrapato: ['antipulgas', 'bravecto', 'seresto'],
};

export function answerAssistantQuestion(
  question: string,
  context: {
    products: Product[];
    categories: Category[];
    settings: StorefrontSettings;
    shippingSettings: ShippingSettings;
  }
): AssistantReply {
  const q = normalizeText(question);
  const { products, categories, settings, shippingSettings } = context;
  const whatsappClean = (settings.whatsapp || '5511999999999').replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
    `Olá! Vim pelo atendimento da Mel na PetClick e tenho uma dúvida: ${question}`
  )}`;

  if (!q) {
    return {
      text: 'Pode escrever sua dúvida! Respondo sobre entregas, pagamento, trocas ou procuro um produto para seu pet.',
    };
  }

  // 1. Saudações / Identidade
  if (
    /^(oi|ola|opa|ei|hello|hi|bom dia|boa tarde|boa noite|tudo bem|td bem)/.test(q) ||
    q.includes('seu nome') ||
    q.includes('quem e voce')
  ) {
    return {
      text: `Olá! Eu sou a ${ASSISTANT_PROFILE.name}, assistente virtual da ${settings.storeName}. Como posso ajudar você e seu pet hoje?`,
      actionLink: { label: 'Explorar catálogo completo', path: '/produtos' },
    };
  }

  // 2. Frete, entrega, prazo, retirada e CEP
  if (
    q.includes('frete') ||
    q.includes('entrega') ||
    q.includes('prazo') ||
    q.includes('envio') ||
    q.includes('cep') ||
    q.includes('retira') ||
    q.includes('gratis')
  ) {
    const parts: string[] = [];
    if (shippingSettings.freeShippingEnabled) {
      parts.push(
        `Temos frete grátis em pedidos a partir de ${formatBRL(shippingSettings.freeShippingMinOrder)}.`
      );
    }
    if (shippingSettings.fixedShippingEnabled) {
      parts.push(
        `O envio padrão sai por ${formatBRL(shippingSettings.fixedShippingPrice)} com prazo estimado de ${shippingSettings.fixedShippingDays} dias úteis.`
      );
    }
    if (shippingSettings.pickupEnabled && shippingSettings.pickupAddress) {
      parts.push(`Você também pode retirar na loja: ${shippingSettings.pickupAddress}.`);
    }
    if (parts.length === 0) {
      parts.push('Você pode calcular o frete exato digitando seu CEP direto no carrinho ou checkout.');
    }
    return {
      text: parts.join(' '),
      actionLink: { label: 'Simular frete no carrinho', path: '/carrinho' },
    };
  }

  // 3. Pagamentos
  if (
    q.includes('pagar') ||
    q.includes('pagamento') ||
    q.includes('pix') ||
    q.includes('cartao') ||
    q.includes('credito') ||
    q.includes('debito') ||
    q.includes('parcel') ||
    q.includes('infinitepay') ||
    q.includes('boleto')
  ) {
    return {
      text: 'Aceitamos Pix (aprovação rápida) e Cartão de Crédito com pagamento processado com segurança pelo Checkout InfinitePay. Todo o fechamento é feito direto no checkout da loja.',
      actionLink: { label: 'Ir para o carrinho', path: '/carrinho' },
    };
  }

  // 4. Trocas e devoluções
  if (
    q.includes('troca') ||
    q.includes('devolu') ||
    q.includes('garantia') ||
    q.includes('reembolso') ||
    q.includes('estorno') ||
    q.includes('arrepend')
  ) {
    return {
      text: 'Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento (Código de Defesa do Consumidor, art. 49), mantendo o produto lacrado na embalagem original.',
      actionLink: { label: 'Ver política de trocas', path: '/trocas' },
    };
  }

  // 5. Acompanhar pedido
  if (
    q.includes('pedido') ||
    q.includes('rastrear') ||
    q.includes('rastreio') ||
    q.includes('acompanhar') ||
    q.includes('minha conta')
  ) {
    return {
      text: 'Para acompanhar o status do pagamento, código de rastreio e histórico completo, acesse sua área Meus Pedidos.',
      actionLink: { label: 'Acessar Meus Pedidos', path: '/meus-pedidos' },
    };
  }

  // 6. Horário, endereço, contato humano e WhatsApp
  if (
    q.includes('horario') ||
    q.includes('funciona') ||
    q.includes('aberto') ||
    q.includes('endereco') ||
    q.includes('loja fisica') ||
    q.includes('contato') ||
    q.includes('whatsapp') ||
    q.includes('telefone') ||
    q.includes('email') ||
    q.includes('humano') ||
    q.includes('atendente')
  ) {
    return {
      text: `Nosso atendimento funciona ${settings.businessHours}. Endereço: ${settings.address}. E-mail: ${settings.email}. Se preferir falar com nossa equipe humana, é só clicar no WhatsApp abaixo.`,
      externalLink: { label: 'Conversar no WhatsApp', href: whatsappHref },
    };
  }

  // 7. Promoções e ofertas
  if (q.includes('promo') || q.includes('oferta') || q.includes('desconto') || q.includes('barato')) {
    const promos = products
      .filter((p) => p.published && p.available && p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.price)
      .slice(0, 3);
    return {
      text:
        promos.length > 0
          ? `Separei ${promos.length} ofertas ativas hoje para você conferir:`
          : 'Confira todas as ofertas disponíveis na nossa página de promoções!',
      recommendedProducts: promos,
      actionLink: { label: 'Ver todas as promoções', path: '/promocoes' },
    };
  }

  // 8. Busca inteligente no catálogo real
  const stopWords = new Set([
    'tem',
    'voce',
    'voces',
    'queria',
    'quero',
    'procuro',
    'preciso',
    'para',
    'pra',
    'com',
    'sem',
    'qual',
    'quais',
    'valor',
    'preco',
    'quanto',
    'custa',
    'produto',
    'produtos',
    'meu',
    'minha',
    'um',
    'uma',
    'uns',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'no',
    'na',
    'que',
    'por',
    'favor',
  ]);

  const tokens = q
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));

  const expandedTokens = new Set<string>();
  for (const tok of tokens) {
    expandedTokens.add(tok);
    const syns = KEYWORD_SYNONYMS[tok];
    if (syns) syns.forEach((s) => expandedTokens.add(s));
  }

  if (expandedTokens.size > 0) {
    const scored = products
      .filter((p) => p.published && p.available)
      .map((p) => {
        const hay = normalizeText(`${p.name} ${p.brand} ${p.categoryName} ${p.description}`);
        let score = 0;
        for (const tok of expandedTokens) {
          if (normalizeText(p.name).includes(tok)) score += 4;
          else if (normalizeText(p.categoryName).includes(tok) || normalizeText(p.brand).includes(tok)) score += 3;
          else if (hay.includes(tok)) score += 1;
        }
        return { product: p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      const top = scored.slice(0, 3).map((x) => x.product);
      const matchedCat = categories.find((c) => expandedTokens.has(normalizeText(c.slug)) || expandedTokens.has(normalizeText(c.name)));
      return {
        text: `Encontrei ${scored.length} ${scored.length === 1 ? 'opção' : 'opções'} no catálogo! Veja algumas sugestões:`,
        recommendedProducts: top,
        actionLink: matchedCat
          ? { label: `Ver categoria ${matchedCat.name}`, path: `/${matchedCat.slug}` }
          : { label: 'Ver todos os produtos', path: '/produtos' },
      };
    }
  }

  // 9. Fallback cordial
  return {
    text: 'Ainda não entendi certinho essa pergunta, mas posso responder sobre frete, pagamento via Pix/Cartão, trocas, pedidos ou buscar rações e acessórios pelo nome! Se quiser, nossa equipe também atende pelo WhatsApp.',
    externalLink: { label: 'Falar com equipe no WhatsApp', href: whatsappHref },
  };
}
