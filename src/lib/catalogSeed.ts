import { slugify } from './format';
import { STOREFRONT_CATEGORIES_BLUEPRINT } from './defaults';
import type { Product } from '../types/petclick';

type SeedCategorySlug =
  | 'caes'
  | 'gatos'
  | 'alimentacao'
  | 'brinquedos'
  | 'caminhas'
  | 'higiene'
  | 'acessorios'
  | 'aves'
  | 'roedores'
  | 'peixes';

interface RawCatalogItem {
  num: number;
  name: string;
  currentPrice: number;
  originalPrice?: number;
  imageUrl: string;
  categoryId: SeedCategorySlug;
  brand: string;
  description: string;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  stockOwn: number;
  featured?: boolean;
  bestSeller?: boolean;
}

const CATEGORY_NAME_MAP: Record<SeedCategorySlug, string> = STOREFRONT_CATEGORIES_BLUEPRINT.reduce(
  (acc, c) => {
    acc[c.id as SeedCategorySlug] = c.name;
    return acc;
  },
  {} as Record<SeedCategorySlug, string>
);

const RAW_NUPETHUB_CATALOG: RawCatalogItem[] = [
  {
    num: 1,
    name: 'Ração Natural Fresh Cães Adultos 10kg',
    currentPrice: 189.9,
    originalPrice: 229.9,
    imageUrl: '/assets/products/01-p-racao-caes-0euanrge.jpg',
    categoryId: 'alimentacao',
    brand: 'Natural Fresh',
    description:
      'Alimento completo e balanceado para cães adultos de todas as raças. Formulada com proteínas selecionadas, prebióticos naturais, ômega 3 e 6 para pelagem brilhante e digestão saudável. Livre de corantes e aromatizantes artificiais.',
    weightKg: 10,
    heightCm: 58,
    widthCm: 38,
    lengthCm: 14,
    stockOwn: 24,
    featured: true,
    bestSeller: true,
  },
  {
    num: 2,
    name: 'Bola Mordedora com Corda',
    currentPrice: 39.9,
    originalPrice: 59.9,
    imageUrl: '/assets/products/02-p-brinquedo-bola-c_z4kojh.jpg',
    categoryId: 'brinquedos',
    brand: 'PetClick',
    description:
      'Brinquedo resistente que combina bola de borracha texturizada com corda trançada de algodão. Ideal para brincadeiras de buscar, cabo de guerra, gasto de energia e auxílio na limpeza mecânica dos dentes.',
    weightKg: 0.35,
    heightCm: 10,
    widthCm: 10,
    lengthCm: 28,
    stockOwn: 35,
    featured: true,
  },
  {
    num: 3,
    name: 'Petisco Osso Natural para Cães (pacote 6un)',
    currentPrice: 34.9,
    imageUrl: '/assets/products/03-p-petisco-caes-djgfovha.jpg',
    categoryId: 'alimentacao',
    brand: 'Natural Pet',
    description:
      'Pacote econômico com 6 ossinhos naturais desidratados para cães. Sabor irresistível que auxilia no controle do tártaro, satisfaz o instinto natural de mastigação e funciona como recompensa em treinos.',
    weightKg: 0.45,
    heightCm: 22,
    widthCm: 16,
    lengthCm: 8,
    stockOwn: 40,
  },
  {
    num: 4,
    name: 'Tapete Higiênico para Cães 30 unidades',
    currentPrice: 64.9,
    imageUrl: '/assets/products/04-tapete-higienico-myhug-tradicional.webp',
    categoryId: 'higiene',
    brand: 'MyHug',
    description:
      'Pacote com 30 tapetes higiênicos de alta absorção com gel bloqueador de odores, barreiras antivazamento e fitas adesivas para fixação no piso ou parede. Mantém as patinhas secas e o ambiente limpo.',
    weightKg: 1.4,
    heightCm: 26,
    widthCm: 20,
    lengthCm: 18,
    stockOwn: 32,
    bestSeller: true,
  },
  {
    num: 5,
    name: 'Ração Premium Gatos Salmão 3kg',
    currentPrice: 129.9,
    originalPrice: 149.9,
    imageUrl: '/assets/products/05-p-racao-gatos-tzteoyl1.jpg',
    categoryId: 'alimentacao',
    brand: 'PetClick Seleção',
    description:
      'Ração premium sabor salmão desenvolvida para gatos adultos. Enriquecida com taurina, ácidos graxos essenciais e minerais equilibrados que promovem saúde urinária, visão nítida e pelos sedosos.',
    weightKg: 3.0,
    heightCm: 36,
    widthCm: 24,
    lengthCm: 12,
    stockOwn: 28,
    featured: true,
  },
  {
    num: 6,
    name: 'Arranhador Torre Zen para Gatos',
    currentPrice: 245.0,
    imageUrl: '/assets/products/06-p-arranhador-dfktoguj.jpg',
    categoryId: 'acessorios',
    brand: 'ZenCat',
    description:
      'Torre arranhadora multi-nível revestida em sisal natural e pelúcia macia. Estimula o alongamento diário, reduz o estresse felino e protege sofás e móveis mantendo as garras saudáveis.',
    weightKg: 4.8,
    heightCm: 75,
    widthCm: 40,
    lengthCm: 40,
    stockOwn: 12,
    featured: true,
  },
  {
    num: 7,
    name: 'Areia Higiênica Premium Gatos 12kg',
    currentPrice: 78.5,
    imageUrl: '/assets/products/07-p-areia-gatos-cz28o0dp.jpg',
    categoryId: 'higiene',
    brand: 'CleanCat',
    description:
      'Areia sanitária granulada de alto rendimento em embalagem econômica de 12kg. Forma torrões firmes rapidamente, neutraliza odores amoniacais e possui baixo índice de poeira.',
    weightKg: 12.0,
    heightCm: 44,
    widthCm: 32,
    lengthCm: 14,
    stockOwn: 25,
    bestSeller: true,
  },
  {
    num: 8,
    name: 'Fonte de Água Automática AquaPure',
    currentPrice: 219.0,
    originalPrice: 279.0,
    imageUrl: '/assets/products/08-p-fonte-agua-cekpqxlb.jpg',
    categoryId: 'acessorios',
    brand: 'AquaPure',
    description:
      'Bebedouro automático silencioso com sistema de filtragem em carvão ativado que oxigena e mantém a água sempre fresca em movimento contínuo, incentivando a hidratação diária de cães e gatos.',
    weightKg: 1.2,
    heightCm: 18,
    widthCm: 22,
    lengthCm: 22,
    stockOwn: 18,
    featured: true,
  },
  {
    num: 9,
    name: 'Mix de Sementes Premium para Aves 1kg',
    currentPrice: 29.9,
    imageUrl: '/assets/products/09-p-racao-aves-cas-cpjl.jpg',
    categoryId: 'aves',
    brand: 'NutriAves',
    description:
      'Mistura rigorosamente limpa e selecionada de painço, alpiste, aveia e sementes nobres para canários, periquitos e calopsitas. Fornece energia, vitalidade e plumagem brilhante.',
    weightKg: 1.0,
    heightCm: 24,
    widthCm: 16,
    lengthCm: 8,
    stockOwn: 30,
  },
  {
    num: 10,
    name: 'Gaiola Luxo para Aves Médias',
    currentPrice: 349.0,
    originalPrice: 419.0,
    imageUrl: '/assets/products/10-p-gaiola-aves-xmwpridi.jpg',
    categoryId: 'aves',
    brand: 'Habitat Aves',
    description:
      'Gaiola espaçosa de acabamento reforçado indicada para calopsitas, agapornis e periquitos. Acompanha poleiros naturais, comedouros práticos e bandeja removível para higienização rápida.',
    weightKg: 3.5,
    heightCm: 62,
    widthCm: 42,
    lengthCm: 36,
    stockOwn: 10,
    featured: true,
  },
  {
    num: 11,
    name: 'Ração Premium para Hamster 500g',
    currentPrice: 27.9,
    imageUrl: '/assets/products/11-p-racao-roedores-bky9bns1.jpg',
    categoryId: 'roedores',
    brand: 'RoedMix',
    description:
      'Alimento balanceado com partículas extrusadas, grãos e fibras vegetais especialmente formulado para hamsters sírios e anões russos. Favorece o desgaste saudável dos dentes e a nutrição diária.',
    weightKg: 0.5,
    heightCm: 20,
    widthCm: 14,
    lengthCm: 7,
    stockOwn: 28,
  },
  {
    num: 12,
    name: 'Gaiola Aventura para Hamster',
    currentPrice: 259.0,
    originalPrice: 319.0,
    imageUrl: '/assets/products/12-p-gaiola-hamster-bp1gvqw-.jpg',
    categoryId: 'roedores',
    brand: 'HamsterFun',
    description:
      'Gaiola interativa com tubos de circuito, plataforma superior, rodinha de exercícios e casinha acoplada. Proporciona estímulo físico, segurança e fácil limpeza diária.',
    weightKg: 2.4,
    heightCm: 38,
    widthCm: 30,
    lengthCm: 42,
    stockOwn: 14,
    featured: true,
  },
  {
    num: 13,
    name: 'Ração Flocos Peixes Tropicais 100g',
    currentPrice: 21.9,
    imageUrl: '/assets/products/13-p-racao-peixes-ik-abzkz.jpg',
    categoryId: 'peixes',
    brand: 'AquaFlakes',
    description:
      'Flocos nutritivos de alta digestibilidade que não turvam a água do aquário. Formulada para realçar as cores naturais e fortalecer a imunidade de peixes ornamentais tropicais.',
    weightKg: 0.12,
    heightCm: 14,
    widthCm: 8,
    lengthCm: 8,
    stockOwn: 34,
  },
  {
    num: 14,
    name: 'Aquário Kit Completo 20L com LED',
    currentPrice: 389.0,
    originalPrice: 459.0,
    imageUrl: '/assets/products/14-p-aquario-dfmyi_gj.jpg',
    categoryId: 'peixes',
    brand: 'AquaDesign',
    description:
      'Aquário em vidro cristalino de 20 litros equipado com tampa, luminária LED de alto brilho e sistema de filtragem acoplado. Pronto para iniciar seu aquário comunitário ou plantado com elegância.',
    weightKg: 4.5,
    heightCm: 32,
    widthCm: 24,
    lengthCm: 40,
    stockOwn: 10,
    featured: true,
  },
  {
    num: 15,
    name: 'Royal Canin Mini Adultos 10kg',
    currentPrice: 329.9,
    originalPrice: 369.9,
    imageUrl: '/assets/products/15-racao-royal-canin-mini-adult-caes-adultos.png',
    categoryId: 'caes',
    brand: 'Royal Canin',
    description:
      'Nutrição super premium específica para cães adultos de porte pequeno (até 10kg) a partir de 10 meses. Croquete adaptado para fácil apreensão, ajuda na manutenção do peso ideal e saúde da pelagem com EPA/DHA.',
    weightKg: 10.0,
    heightCm: 60,
    widthCm: 38,
    lengthCm: 14,
    stockOwn: 20,
    bestSeller: true,
  },
  {
    num: 16,
    name: 'Premier Fórmula Cães Adultos Frango 15kg',
    currentPrice: 259.9,
    originalPrice: 299.9,
    imageUrl: '/assets/products/16-acao-premier-formula-caes-adultos-racas-medias-frango-15kg-frente.webp',
    categoryId: 'caes',
    brand: 'Premier Pet',
    description:
      'Alimento super premium sabor frango para cães adultos de raças médias. Contém proteína de alta absorção, fibras especiais para redução do volume e odor das fezes e suporte articular.',
    weightKg: 15.0,
    heightCm: 66,
    widthCm: 42,
    lengthCm: 15,
    stockOwn: 18,
    bestSeller: true,
  },
  {
    num: 17,
    name: 'Golden Special Cães Adultos 15kg',
    currentPrice: 199.9,
    imageUrl: '/assets/products/17-racao-golden-special-para-caes-adultos-frango-e-carne-15-1.webp',
    categoryId: 'alimentacao',
    brand: 'Golden',
    description:
      'Ração premium especial com blend sabor frango e carne para cães adultos. Sem corantes nem aromatizantes artificiais, garante músculos fortes, fezes firmes e alta palatabilidade no saco de 15kg.',
    weightKg: 15.0,
    heightCm: 66,
    widthCm: 42,
    lengthCm: 15,
    stockOwn: 26,
    bestSeller: true,
  },
  {
    num: 18,
    name: 'Pedigree Cães Adultos Carne 10kg',
    currentPrice: 149.9,
    imageUrl: '/assets/products/18-pedigree-caes-adultos-racas-medias-e-grandes-carne-e-vegetais-900g.png',
    categoryId: 'alimentacao',
    brand: 'Pedigree',
    description:
      'Nutrição completa sabor carne para cães adultos com vitamina E, fibras naturais e proteínas de qualidade que apoiam a digestão equilibrada, pele saudável e disposição diária.',
    weightKg: 10.0,
    heightCm: 58,
    widthCm: 38,
    lengthCm: 14,
    stockOwn: 22,
  },
  {
    num: 19,
    name: 'Pedigree Dentastix Cães Médios',
    currentPrice: 24.9,
    imageUrl: '/assets/products/19-7896029052341_1_pedigree_759180.jpg',
    categoryId: 'alimentacao',
    brand: 'Pedigree',
    description:
      'Snack funcional em formato de X desenvolvido clinicamente para reduzir em até 80% a formação de tártaro em cães de porte médio (10kg a 25kg). Baixo teor de gordura e sem adição de açúcar.',
    weightKg: 0.25,
    heightCm: 20,
    widthCm: 14,
    lengthCm: 4,
    stockOwn: 45,
  },
  {
    num: 20,
    name: 'Coleira Zee.Dog Neopro Laranja',
    currentPrice: 99.9,
    imageUrl: '/assets/products/20-peitoral-h-mesh-para-caes-toh-fiji.webp',
    categoryId: 'acessorios',
    brand: 'Zee.Dog',
    description:
      'Coleira equipada com tecnologia Neopro impermeável resistente à água, lama e raios UV. Fivela de engate rápido com trava de segurança de 4 pontos e regulagem confortável para passeios seguros.',
    weightKg: 0.2,
    heightCm: 4,
    widthCm: 22,
    lengthCm: 14,
    stockOwn: 20,
    featured: true,
  },
  {
    num: 21,
    name: 'Whiskas Gatos Adultos Carne 10,1kg',
    currentPrice: 189.9,
    originalPrice: 219.9,
    imageUrl: '/assets/products/21-0-whiskas-adulto-frango-2kg.png',
    categoryId: 'gatos',
    brand: 'Whiskas',
    description:
      'Ração seca completa para gatos adultos com deliciosos nuggets recheados sabor carne. Ajuda no controle mineral do trato urinário e mantém pele, pelos e visão saudáveis no pacote econômico de 10,1kg.',
    weightKg: 10.1,
    heightCm: 56,
    widthCm: 36,
    lengthCm: 14,
    stockOwn: 22,
    bestSeller: true,
  },
  {
    num: 22,
    name: 'Sachê Whiskas Gatos Adultos Frango 85g',
    currentPrice: 3.99,
    imageUrl: '/assets/products/22-0-whiskas-adulto-carne-2kg.png',
    categoryId: 'gatos',
    brand: 'Whiskas',
    description:
      'Alimento úmido completo com suculentos pedaços de frango cozidos ao vapor. Rico em água para auxiliar na hidratação diária e saúde renal dos felinos adultos.',
    weightKg: 0.09,
    heightCm: 14,
    widthCm: 9,
    lengthCm: 2,
    stockOwn: 120,
  },
  {
    num: 23,
    name: 'GranPlus Gatos Castrados Salmão 10kg',
    currentPrice: 239.9,
    imageUrl: '/assets/products/23-castrado-salmao-e-arroz.png',
    categoryId: 'gatos',
    brand: 'GranPlus',
    description:
      'Ração High Premium formulada especialmente para gatos castrados. Contém L-carnitina para controle de peso, salmão nobre e pH urinário balanceado, sem corantes ou aromas artificiais.',
    weightKg: 10.0,
    heightCm: 58,
    widthCm: 36,
    lengthCm: 14,
    stockOwn: 18,
    bestSeller: true,
  },
  {
    num: 24,
    name: 'Royal Canin Gatos Castrados 7,5kg',
    currentPrice: 399.9,
    originalPrice: 449.9,
    imageUrl: '/assets/products/05-p-racao-gatos-tzteoyl1.jpg',
    categoryId: 'gatos',
    brand: 'Royal Canin',
    description:
      'Alimento super premium desenvolvido para gatos adultos castrados de 1 a 7 anos. Teor calórico moderado, proteínas altamente digestíveis e equilíbrio mineral para proteção do sistema urinário.',
    weightKg: 7.5,
    heightCm: 52,
    widthCm: 34,
    lengthCm: 13,
    stockOwn: 14,
    featured: true,
  },
  {
    num: 25,
    name: 'Areia Higiênica Pipicat Classic 12kg',
    currentPrice: 39.9,
    imageUrl: '/assets/products/24-frente.jpg',
    categoryId: 'higiene',
    brand: 'Pipicat',
    description:
      'Areia sanitária mineral natural com excelente custo-benefício em pacote de 12kg. Retém líquidos com eficiência, reduz odores na caixa de areia e possui grãos confortáveis para as patas.',
    weightKg: 12.0,
    heightCm: 44,
    widthCm: 32,
    lengthCm: 14,
    stockOwn: 35,
    bestSeller: true,
  },
  {
    num: 26,
    name: 'Nutrópica Calopsita Natural 300g',
    currentPrice: 44.9,
    imageUrl: '/assets/products/09-p-racao-aves-cas-cpjl.jpg',
    categoryId: 'aves',
    brand: 'Nutrópica',
    description:
      'Alimento extrusado super premium completo e balanceado para calopsitas, agapornis e periquitos australianos. Formulado com ingredientes naturais para máxima longevidade e saúde das penas.',
    weightKg: 0.3,
    heightCm: 19,
    widthCm: 13,
    lengthCm: 7,
    stockOwn: 25,
  },
  {
    num: 27,
    name: 'Nutrópica Hamster 300g',
    currentPrice: 39.9,
    imageUrl: '/assets/products/25-733440-hamster-300g.webp',
    categoryId: 'roedores',
    brand: 'Nutrópica',
    description:
      'Nutrição extrusada super premium para hamsters e gerbils que evita a seleção de grãos, assegurando ingestão completa de vitaminas, proteínas nobres e minerais em cada mordida.',
    weightKg: 0.3,
    heightCm: 19,
    widthCm: 13,
    lengthCm: 7,
    stockOwn: 24,
  },
  {
    num: 28,
    name: 'Tetra Color Peixes Ornamentais 100g',
    currentPrice: 54.9,
    imageUrl: '/assets/products/26-color-flakes-tetra-20g.jpg',
    categoryId: 'peixes',
    brand: 'Tetra',
    description:
      'Ração em flocos de padrão internacional enriquecida com intensificadores naturais de cor e complexo vitamínico ProCare para saúde, vitalidade e pigmentação vibrante dos peixes.',
    weightKg: 0.12,
    heightCm: 14,
    widthCm: 8,
    lengthCm: 8,
    stockOwn: 26,
  },
  {
    num: 29,
    name: "Hill's Science Diet Cães Adultos 12kg",
    currentPrice: 459.9,
    originalPrice: 519.9,
    imageUrl: '/assets/products/01-p-racao-caes-0euanrge.jpg',
    categoryId: 'caes',
    brand: "Hill's",
    description:
      'Nutrição clinicamente comprovada para cães adultos de 1 a 6 anos. Contém antioxidantes vitamina C + E para sistema imunológico forte, proteínas de frango de alta digestibilidade e energia equilibrada.',
    weightKg: 12.0,
    heightCm: 62,
    widthCm: 40,
    lengthCm: 14,
    stockOwn: 14,
    featured: true,
  },
  {
    num: 30,
    name: 'Premier Ambientes Internos Gatos 7,5kg',
    currentPrice: 279.9,
    originalPrice: 319.9,
    imageUrl: '/assets/products/27-cao-premier-formula-caes-adultos-racas-pequenas-frango-1kg-frente.webp',
    categoryId: 'gatos',
    brand: 'Premier Pet',
    description:
      'Desenvolvida para gatos adultos que vivem em apartamentos e ambientes internos. Auxilia no controle de bolas de pelo, reduz o odor das fezes com extrato de Yucca e controla calorias.',
    weightKg: 7.5,
    heightCm: 52,
    widthCm: 34,
    lengthCm: 13,
    stockOwn: 16,
  },
  {
    num: 31,
    name: 'Bravecto Cães 10-20kg (1 comprimido)',
    currentPrice: 169.9,
    imageUrl: '/assets/products/28-bravecto-caes-comp-500mg-2.png',
    categoryId: 'caes',
    brand: 'MSD Bravecto',
    description:
      'Comprimido mastigável altamente palatável para cães de 10kg a 20kg. Protege por até 12 semanas contínuas contra carrapatos e pulgas com ação rápida a partir de 2 horas após a administração.',
    weightKg: 0.08,
    heightCm: 11,
    widthCm: 9,
    lengthCm: 3,
    stockOwn: 30,
    bestSeller: true,
  },
  {
    num: 32,
    name: 'Coleira Seresto Cães Grandes',
    currentPrice: 269.9,
    originalPrice: 319.9,
    imageUrl: '/assets/products/29-seresto-maior-que-8.webp',
    categoryId: 'caes',
    brand: 'Elanco Seresto',
    description:
      'Coleira antiparasitária sem odor para cães acima de 8kg. Liberação controlada e contínua por até 8 meses protegendo contra pulgas, carrapatos e auxiliando na prevenção da leishmaniose.',
    weightKg: 0.15,
    heightCm: 12,
    widthCm: 12,
    lengthCm: 4,
    stockOwn: 20,
    bestSeller: true,
  },
  {
    num: 33,
    name: 'Tapete Higiênico Petix 30 unidades',
    currentPrice: 89.9,
    originalPrice: 109.9,
    imageUrl: '/assets/products/04-tapete-higienico-myhug-tradicional.webp',
    categoryId: 'higiene',
    brand: 'Petix',
    description:
      'Tapete higiênico super absorvente com atrativo canino natural, camadas ultra finas de celulose e proteção antifungos e odores para maior conforto e higiene dentro de casa.',
    weightKg: 1.5,
    heightCm: 28,
    widthCm: 22,
    lengthCm: 18,
    stockOwn: 28,
  },
  {
    num: 34,
    name: 'KONG Classic Médio',
    currentPrice: 119.9,
    imageUrl: '/assets/products/30-brinquedo-mordedor-kong-classic-1.png',
    categoryId: 'brinquedos',
    brand: 'KONG',
    description:
      'O icônico brinquedo de borracha natural vermelha da KONG no tamanho Médio (cães de 7kg a 16kg). Pula de forma imprevisível e possui cavidade interna para rechear com pastas e petiscos, combatendo ansiedade.',
    weightKg: 0.25,
    heightCm: 15,
    widthCm: 8,
    lengthCm: 8,
    stockOwn: 24,
    bestSeller: true,
  },
  {
    num: 35,
    name: 'Whiskas Sachês Sortidos 12 unidades',
    currentPrice: 39.9,
    originalPrice: 47.9,
    imageUrl: '/assets/products/22-0-whiskas-adulto-carne-2kg.png',
    categoryId: 'gatos',
    brand: 'Whiskas',
    description:
      'Caixa promocional com 12 sachês de 85g em sabores sortidos (carne, frango, salmão e cordeiro). Refeições suculentas com vitaminas e minerais essenciais para variar o cardápio do seu gato.',
    weightKg: 1.1,
    heightCm: 16,
    widthCm: 14,
    lengthCm: 18,
    stockOwn: 35,
  },
  {
    num: 36,
    name: 'Caixa de Areia Fechada Furacão Pet',
    currentPrice: 159.9,
    imageUrl: '/assets/products/31-banheiro-cat-toalete-furacao-pet-azul.jpg',
    categoryId: 'higiene',
    brand: 'Furacão Pet',
    description:
      'Banheiro fechado privativo para gatos com porta basculante, alça de transporte e filtro superior para controle de odores. Evita que o gato espalhe areia para fora da bandeja.',
    weightKg: 2.1,
    heightCm: 40,
    widthCm: 42,
    lengthCm: 54,
    stockOwn: 15,
  },
  {
    num: 37,
    name: 'Dreamies Petisco Gatos Frango 40g',
    currentPrice: 8.9,
    imageUrl: '/assets/products/32-hero_petisco-dreamies-frango-para-gatos.webp',
    categoryId: 'gatos',
    brand: 'Dreamies',
    description:
      'Petisco crocante por fora e cremoso por dentro sabor frango irresistível para gatos. Menos de 2 kcal por unidade e enriquecido com vitaminas e minerais.',
    weightKg: 0.05,
    heightCm: 16,
    widthCm: 11,
    lengthCm: 3,
    stockOwn: 60,
  },
  {
    num: 38,
    name: 'Megazoo Extrusada Papagaios 350g',
    currentPrice: 49.9,
    imageUrl: '/assets/products/33-7898401960398.jpg',
    categoryId: 'aves',
    brand: 'Megazoo',
    description:
      'Ração extrusada super premium para papagaios, cacatuas e araras de pequeno porte. Enriquecida com probióticos, ácidos graxos e frações de frutas e vegetais desidratados.',
    weightKg: 0.35,
    heightCm: 21,
    widthCm: 14,
    lengthCm: 8,
    stockOwn: 22,
  },
  {
    num: 39,
    name: 'Peitoral Zee.Dog H-Harness Neopro',
    currentPrice: 169.9,
    originalPrice: 199.9,
    imageUrl: '/assets/products/34-peitoral-h-mesh-para-caes-toh-preto.webp',
    categoryId: 'acessorios',
    brand: 'Zee.Dog',
    description:
      'Peitoral modelo H confeccionado em poliéster revestido com tecnologia Neopro resistente à água e de fácil limpeza. Duas posições de D-ring nas costas e fivela anatômica com trava segura.',
    weightKg: 0.3,
    heightCm: 5,
    widthCm: 20,
    lengthCm: 24,
    stockOwn: 18,
    featured: true,
  },
  {
    num: 40,
    name: 'Cama Pet Nuvem Soft',
    currentPrice: 159.0,
    imageUrl: '/assets/products/35-p-cama-pet-ghtrxisd.jpg',
    categoryId: 'caminhas',
    brand: 'PetClick Conforto',
    description:
      'Cama redonda ultra macia com enchimento antialérgico de fibra siliconada e pelúcia aconchegante que acolhe o pet reduzindo tensões articulares. Base antiderrapante e lavável.',
    weightKg: 1.6,
    heightCm: 20,
    widthCm: 60,
    lengthCm: 60,
    stockOwn: 16,
    featured: true,
  },
  {
    num: 41,
    name: 'Coleira de Couro Sunset',
    currentPrice: 89.9,
    imageUrl: '/assets/products/36-p-coleira-b-psqmhh.jpg',
    categoryId: 'acessorios',
    brand: 'Sunset Pet',
    description:
      'Coleira elegante produzida em couro legítimo macio com costura reforçada e ferragens metálicas inoxidáveis. Confortável para o pescoço do cão com visual atemporal.',
    weightKg: 0.2,
    heightCm: 4,
    widthCm: 18,
    lengthCm: 14,
    stockOwn: 22,
  },
  {
    num: 42,
    name: 'Shampoo Hipoalergênico 500ml',
    currentPrice: 49.9,
    imageUrl: '/assets/products/37-p-shampoo-bf-d5byh.jpg',
    categoryId: 'higiene',
    brand: 'Botanic Pet',
    description:
      'Fórmula dermatológica suave com extratos de camomila e aveia coloidal, pH balanceado para pele sensível de cães e gatos. Limpa delicadamente sem ressecar e reduz coceiras.',
    weightKg: 0.55,
    heightCm: 22,
    widthCm: 7,
    lengthCm: 7,
    stockOwn: 30,
  },
  {
    num: 43,
    name: 'Guia Retrátil 5m até 25kg',
    currentPrice: 79.9,
    originalPrice: 99.9,
    imageUrl: '/assets/products/36-p-coleira-b-psqmhh.jpg',
    categoryId: 'acessorios',
    brand: 'WalkFree',
    description:
      'Guia retrátil ergonômica com fita resistente de 5 metros e sistema de freio e trava instantânea com um toque. Ideal para cães de até 25kg explorarem passeios com liberdade controlada.',
    weightKg: 0.4,
    heightCm: 12,
    widthCm: 5,
    lengthCm: 18,
    stockOwn: 24,
  },
  {
    num: 44,
    name: 'Varinha com Pena Interativa',
    currentPrice: 24.9,
    imageUrl: '/assets/products/38-p-brinquedo-gatos-dhfm6xaq.jpg',
    categoryId: 'brinquedos',
    brand: 'CatPlay',
    description:
      'Brinquedo clássico com haste flexível, guizo suave e penas naturais coloridas para despertar o instinto caçador do gato, promovendo exercício físico e interação com o tutor.',
    weightKg: 0.12,
    heightCm: 48,
    widthCm: 6,
    lengthCm: 6,
    stockOwn: 40,
  },
  {
    num: 45,
    name: 'Caixa de Transporte Comfort',
    currentPrice: 189.0,
    imageUrl: '/assets/products/39-p-caixa-transporte-dc9rs6g7.jpg',
    categoryId: 'caminhas',
    brand: 'PetTravel',
    description:
      'Caixa de transporte rígida em polipropileno virgem com ampla ventilação lateral, porta metálica com trava dupla de segurança e alça ergonômica. Prática para consultas veterinárias e viagens.',
    weightKg: 2.4,
    heightCm: 35,
    widthCm: 36,
    lengthCm: 52,
    stockOwn: 14,
  },
  {
    num: 46,
    name: 'Shampoo Suave para Gatos 300ml',
    currentPrice: 42.9,
    imageUrl: '/assets/products/37-p-shampoo-bf-d5byh.jpg',
    categoryId: 'higiene',
    brand: 'CatCare',
    description:
      'Shampoo desenvolvido com fragrância leve e baixa formação de espuma para facilitar o enxágue rápido nos banhos felinos. Hidrata os pelos deixando toque macio e brilho natural.',
    weightKg: 0.35,
    heightCm: 19,
    widthCm: 6,
    lengthCm: 6,
    stockOwn: 25,
  },
  {
    num: 47,
    name: 'Bebedouro Automático para Aves 200ml',
    currentPrice: 19.9,
    imageUrl: '/assets/products/10-p-gaiola-aves-xmwpridi.jpg',
    categoryId: 'aves',
    brand: 'Habitat Aves',
    description:
      'Bebedouro prático em acrílico atóxico de 200ml com trava para malha de gaiola. Mantém a água limpa protegida contra impurezas e facilita o reabastecimento diário.',
    weightKg: 0.15,
    heightCm: 16,
    widthCm: 6,
    lengthCm: 8,
    stockOwn: 40,
  },
  {
    num: 48,
    name: 'Balanço Colorido com Sininho',
    currentPrice: 22.5,
    imageUrl: '/assets/products/10-p-gaiola-aves-xmwpridi.jpg',
    categoryId: 'aves',
    brand: 'BirdPlay',
    description:
      'Brinquedo suspenso com argolas coloridas seguras, poleiro de madeira e sininho metálico suave para entreter periquitos, agapornis e calopsitas dentro da gaiola.',
    weightKg: 0.15,
    heightCm: 22,
    widthCm: 14,
    lengthCm: 4,
    stockOwn: 35,
  },
  {
    num: 49,
    name: 'Farinhada Premium para Canários 500g',
    currentPrice: 34.9,
    imageUrl: '/assets/products/09-p-racao-aves-cas-cpjl.jpg',
    categoryId: 'aves',
    brand: 'NutriAves',
    description:
      'Complemento nutricional úmido-macio com ovo integral, mel e aminoácidos essenciais, ideal para períodos de reprodução, muda de penas e crescimento saudável de canários.',
    weightKg: 0.5,
    heightCm: 20,
    widthCm: 14,
    lengthCm: 7,
    stockOwn: 26,
  },
  {
    num: 50,
    name: 'Feno Premium para Coelhos e Porquinhos 1kg',
    currentPrice: 32.9,
    imageUrl: '/assets/products/40-feno-premium-belas-aves-e-roedores-500g.webp',
    categoryId: 'roedores',
    brand: 'Belas Aves e Roedores',
    description:
      'Feno natural de alta palatabilidade rico em fibras longas indispensáveis para a digestão contínua e desgaste dentário natural de coelhos, porquinhos-da-índia e chinchilas.',
    weightKg: 1.0,
    heightCm: 36,
    widthCm: 24,
    lengthCm: 16,
    stockOwn: 25,
  },
  {
    num: 51,
    name: 'Casinha de Madeira para Roedores',
    currentPrice: 39.9,
    imageUrl: '/assets/products/12-p-gaiola-hamster-bp1gvqw-.jpg',
    categoryId: 'roedores',
    brand: 'RoedHouse',
    description:
      'Abrigo em madeira natural pinus sem verniz ou tintas tóxicas, oferecendo toca segura e confortável para descanso de hamsters, gerbils e camundongos.',
    weightKg: 0.5,
    heightCm: 12,
    widthCm: 14,
    lengthCm: 16,
    stockOwn: 20,
  },
  {
    num: 52,
    name: 'Bebedouro para Roedores 250ml',
    currentPrice: 18.9,
    imageUrl: '/assets/products/12-p-gaiola-hamster-bp1gvqw-.jpg',
    categoryId: 'roedores',
    brand: 'RoedCare',
    description:
      'Bebedouro com bico em aço inoxidável e esfera antivazamento de 250ml. Mantém a maravalha seca e fornece água limpa sempre disponível para hamsters, porquinhos e coelhos.',
    weightKg: 0.15,
    heightCm: 18,
    widthCm: 6,
    lengthCm: 6,
    stockOwn: 35,
  },
  {
    num: 53,
    name: 'Condicionador de Água para Aquário 100ml',
    currentPrice: 24.9,
    imageUrl: '/assets/products/13-p-racao-peixes-ik-abzkz.jpg',
    categoryId: 'peixes',
    brand: 'AquaSafe',
    description:
      'Tratamento instantâneo que neutraliza cloro, cloramina e metais pesados da água da torneira, além de proteger a mucosa natural dos peixes em trocas parciais ou montagens.',
    weightKg: 0.14,
    heightCm: 14,
    widthCm: 5,
    lengthCm: 5,
    stockOwn: 32,
  },
  {
    num: 54,
    name: 'Substrato Cascalho Natural 1kg',
    currentPrice: 19.9,
    imageUrl: '/assets/products/14-p-aquario-dfmyi_gj.jpg',
    categoryId: 'peixes',
    brand: 'AquaDesign',
    description:
      'Cascalho de rio lavado e selecionado de granulometria média e pH neutro, ideal para compor o fundo natural do aquário sem alterar os parâmetros da água.',
    weightKg: 1.0,
    heightCm: 20,
    widthCm: 14,
    lengthCm: 6,
    stockOwn: 40,
  },
  {
    num: 55,
    name: 'Termostato com Aquecedor 50W',
    currentPrice: 89.9,
    imageUrl: '/assets/products/41-termostato-roxin-ht-1900-220v-50w.jpg',
    categoryId: 'peixes',
    brand: 'Roxin',
    description:
      'Aquecedor submersível de 50W com termostato automático ajustável de 20°C a 34°C e ventosas de fixação, indicado para aquários de até 50 litros.',
    weightKg: 0.35,
    heightCm: 26,
    widthCm: 6,
    lengthCm: 6,
    stockOwn: 18,
  },
  {
    num: 56,
    name: 'Brinquedo Pet Games Recheável',
    currentPrice: 69.9,
    imageUrl: '/assets/products/02-p-brinquedo-bola-c_z4kojh.jpg',
    categoryId: 'brinquedos',
    brand: 'Pet Games',
    description:
      'Brinquedo interativo atóxico que libera ração ou petiscos gradualmente conforme o cão interage. Estimula o raciocínio, desacelera a alimentação e combate o tédio.',
    weightKg: 0.3,
    heightCm: 12,
    widthCm: 12,
    lengthCm: 12,
    stockOwn: 25,
  },
  {
    num: 57,
    name: 'Shampoo Sanol Dog Neutro 500ml',
    currentPrice: 32.9,
    imageUrl: '/assets/products/42-shampoo-neutro-caes-e-gatos-sanol.png',
    categoryId: 'higiene',
    brand: 'Sanol Dog',
    description:
      'Shampoo neutro biodegradável indicado para uso frequente em cães e gatos de todas as idades. Proporciona limpeza suave, espuma cremosa e perfume agradável.',
    weightKg: 0.55,
    heightCm: 22,
    widthCm: 8,
    lengthCm: 6,
    stockOwn: 35,
  },
  {
    num: 58,
    name: 'Areia Viva Verde Gatos 4kg',
    currentPrice: 59.9,
    imageUrl: '/assets/products/43-areia-higienica-biodegradavel-graos-grossos-viva-verde-4kg-1.png',
    categoryId: 'higiene',
    brand: 'Viva Verde',
    description:
      'Areia higiênica 100% vegetal à base de milho e mandioca, livre de poeira e com formação imediata de torrões firmes que não desmancham e neutralizam odores instantaneamente.',
    weightKg: 4.0,
    heightCm: 36,
    widthCm: 26,
    lengthCm: 12,
    stockOwn: 24,
    featured: true,
  },
  {
    num: 59,
    name: 'Varinha Chalesco para Gatos',
    currentPrice: 19.9,
    imageUrl: '/assets/products/38-p-brinquedo-gatos-dhfm6xaq.jpg',
    categoryId: 'brinquedos',
    brand: 'Chalesco',
    description:
      'Varinha leve com pompom e fitas vibrantes para estimular saltos, perseguições e gasto energético diário do seu felino com muita diversão.',
    weightKg: 0.1,
    heightCm: 45,
    widthCm: 5,
    lengthCm: 5,
    stockOwn: 38,
  },
  {
    num: 60,
    name: 'Alcon Club Periquito 500g',
    currentPrice: 24.9,
    imageUrl: '/assets/products/44-racao-para-canario-club-alcon.jpg',
    categoryId: 'aves',
    brand: 'Alcon',
    description:
      'Alimento completo extrusado para periquitos australianos e pequenos psitacídeos. Fórmula com prebiótico, frutas e vegetais desidratados que assegura nutrição equilibrada sem desperdício de cascas.',
    weightKg: 0.5,
    heightCm: 22,
    widthCm: 15,
    lengthCm: 7,
    stockOwn: 28,
  },
  {
    num: 61,
    name: 'Feno Alcon Club Roedores 500g',
    currentPrice: 29.9,
    imageUrl: '/assets/products/40-feno-premium-belas-aves-e-roedores-500g.webp',
    categoryId: 'roedores',
    brand: 'Alcon',
    description:
      'Feno selecionado rico em fibras naturais e aroma fresco para roedores e lagomorfos. Essencial na dieta diária de coelhos, porquinhos-da-índia e chinchilas.',
    weightKg: 0.5,
    heightCm: 28,
    widthCm: 20,
    lengthCm: 12,
    stockOwn: 25,
  },
  {
    num: 62,
    name: 'Alcon Basic Peixes 50g',
    currentPrice: 18.9,
    imageUrl: '/assets/products/13-p-racao-peixes-ik-abzkz.jpg',
    categoryId: 'peixes',
    brand: 'Alcon',
    description:
      'Alimento básico em flocos com espirulina e enzimas digestivas para peixes ornamentais de água doce. Garante nutrição completa e água limpa por mais tempo.',
    weightKg: 0.08,
    heightCm: 12,
    widthCm: 7,
    lengthCm: 7,
    stockOwn: 34,
  },
  {
    num: 63,
    name: 'N&D Ancestral Grain Cães Frango e Romã 12kg',
    currentPrice: 549.9,
    imageUrl: '/assets/products/45-racao-nd-ancestral-grain-caes-adulto-maxi-frango-1.webp',
    categoryId: 'caes',
    brand: 'N&D Farmina',
    description:
      'Alimento super premium Farmina com cereais ancestrais (aveia e espelta), alta inclusão de carne fresca de frango, romã e baixo índice glicêmico para cães adultos exigentes.',
    weightKg: 12.0,
    heightCm: 64,
    widthCm: 40,
    lengthCm: 15,
    stockOwn: 12,
    featured: true,
  },
  {
    num: 64,
    name: 'Magnus Todo Dia Cães Adultos 15kg',
    currentPrice: 119.9,
    imageUrl: '/assets/products/46-racao-magnus-todo-dia-caes-adultos-carne-frente.png',
    categoryId: 'alimentacao',
    brand: 'Magnus',
    description:
      'Ração sabor carne com excelente rendimento em saco de 15kg para cães adultos. Formulada com bio complexo de vitaminas, minerais quelatados e prebióticos para saúde intestinal.',
    weightKg: 15.0,
    heightCm: 66,
    widthCm: 42,
    lengthCm: 15,
    stockOwn: 24,
  },
  {
    num: 65,
    name: 'Frontline Spray 250ml',
    currentPrice: 139.9,
    imageUrl: '/assets/products/47-bravecto-caes-transdermal-500mg-2.png',
    categoryId: 'caes',
    brand: 'Frontline',
    description:
      'Antipulgas e carrapaticida tópico em spray de 250ml com ação imediata, seguro para aplicação inclusive em filhotes a partir de 2 dias de vida sob orientação veterinária.',
    weightKg: 0.3,
    heightCm: 20,
    widthCm: 7,
    lengthCm: 7,
    stockOwn: 18,
  },
  {
    num: 66,
    name: 'Vermífugo Drontal Plus Cães',
    currentPrice: 24.9,
    imageUrl: '/assets/products/48-drontal_plus-sabor_35kg_1.webp',
    categoryId: 'caes',
    brand: 'Drontal',
    description:
      'Vermífugo de amplo espectro sabor carne que atua contra vermes redondos, vermes chatos e giárdia em cães. Dose prática de alta aceitação.',
    weightKg: 0.05,
    heightCm: 10,
    widthCm: 8,
    lengthCm: 2,
    stockOwn: 40,
  },
  {
    num: 67,
    name: 'Bifinho Spin Pet Carne 300g',
    currentPrice: 12.9,
    imageUrl: '/assets/products/49-petisco-bifinho-de-carne-para-caes-bilisko-65g.jpg',
    categoryId: 'alimentacao',
    brand: 'Spin Pet',
    description:
      'Bifinho macio sabor carne em embalagem de 300g. Rico em proteínas, textura fácil de fracionar para recompensas diárias e adestramento positivo de cães.',
    weightKg: 0.3,
    heightCm: 22,
    widthCm: 15,
    lengthCm: 4,
    stockOwn: 50,
  },
  {
    num: 68,
    name: 'Areia Pipicat Clumping 4kg',
    currentPrice: 24.9,
    imageUrl: '/assets/products/24-frente.jpg',
    categoryId: 'higiene',
    brand: 'Pipicat',
    description:
      'Areia higiênica aglomerante com grânulos finos de alta absorção que formam torrões concentrados e facilitam a remoção diária com pá higienizadora.',
    weightKg: 4.0,
    heightCm: 34,
    widthCm: 24,
    lengthCm: 10,
    stockOwn: 32,
  },
  {
    num: 69,
    name: 'Arranhador Pet Society Poste 50cm',
    currentPrice: 89.9,
    imageUrl: '/assets/products/06-p-arranhador-dfktoguj.jpg',
    categoryId: 'acessorios',
    brand: 'Pet Society',
    description:
      'Poste arranhador vertical de 50cm envolto em corda de sisal natural sobre base firme revestida. Excelente para apartamentos e estimulação diária dos gatos.',
    weightKg: 2.1,
    heightCm: 52,
    widthCm: 32,
    lengthCm: 32,
    stockOwn: 16,
  },
  {
    num: 70,
    name: 'Equilíbrio Gatos Castrados 7,5kg',
    currentPrice: 219.9,
    imageUrl: '/assets/products/50-acao-guabi-natural-grain-free-gatos-castrados-salmao-e-lentilha-1.webp',
    categoryId: 'gatos',
    brand: 'Equilíbrio',
    description:
      'Alimento super premium desenvolvido para gatos castrados de 1 a 7 anos. Auxilia na prevenção de cálculos urinários, controle de peso e redução na formação de bolas de pelo.',
    weightKg: 7.5,
    heightCm: 52,
    widthCm: 34,
    lengthCm: 13,
    stockOwn: 18,
  },
  {
    num: 71,
    name: 'Casinha de Madeira Cães Médios',
    currentPrice: 449.9,
    imageUrl: '/assets/products/35-p-cama-pet-ghtrxisd.jpg',
    categoryId: 'caminhas',
    brand: 'PetClick Habitat',
    description:
      'Casa resistente em madeira tratada para cães de porte médio com telhado inclinado contra chuva e piso elevado para isolamento térmico e proteção contra umidade.',
    weightKg: 14.0,
    heightCm: 72,
    widthCm: 62,
    lengthCm: 76,
    stockOwn: 8,
    featured: true,
  },
  {
    num: 72,
    name: 'Fonte Aqualimp Cats 2L',
    currentPrice: 189.9,
    imageUrl: '/assets/products/08-p-fonte-agua-cekpqxlb.jpg',
    categoryId: 'acessorios',
    brand: 'Aqualimp',
    description:
      'Bebedouro fonte com reservatório de 2 litros, bomba silenciosa de baixo consumo e filtragem tripla que remove pelos e impurezas mantendo água pura para seu gato.',
    weightKg: 1.0,
    heightCm: 16,
    widthCm: 20,
    lengthCm: 20,
    stockOwn: 18,
  },
  {
    num: 73,
    name: 'Pet Clean Shampoo Gatos 500ml',
    currentPrice: 28.9,
    imageUrl: '/assets/products/37-p-shampoo-bf-d5byh.jpg',
    categoryId: 'higiene',
    brand: 'Pet Clean',
    description:
      'Shampoo neutro suave com extrato natural de aloe vera desenvolvido especialmente para felinos, promovendo brilho intenso e facilitando o desembaraço dos pelos.',
    weightKg: 0.55,
    heightCm: 22,
    widthCm: 7,
    lengthCm: 7,
    stockOwn: 28,
  },
  {
    num: 74,
    name: 'Gaiola Alcon Club Calopsita',
    currentPrice: 469.9,
    imageUrl: '/assets/products/10-p-gaiola-aves-xmwpridi.jpg',
    categoryId: 'aves',
    brand: 'Alcon',
    description:
      'Viveiro gaiola amplo e reforçado para calopsitas e aves de porte médio com pintura atóxica, teto articulado para interação, poleiros e bandejas deslizantes.',
    weightKg: 4.2,
    heightCm: 70,
    widthCm: 44,
    lengthCm: 44,
    stockOwn: 9,
  },
  {
    num: 75,
    name: 'Ninho de Côco para Canários',
    currentPrice: 19.9,
    imageUrl: '/assets/products/51-7898274760323_edt.jpg',
    categoryId: 'aves',
    brand: 'CanaryNest',
    description:
      'Ninho natural artesanal em casca de coco com gancho metálico de fixação firme, proporcionando aconchego térmico e conforto seguro para pássaros ornamentais.',
    weightKg: 0.2,
    heightCm: 14,
    widthCm: 14,
    lengthCm: 14,
    stockOwn: 28,
  },
  {
    num: 76,
    name: 'Supra Coelho 500g',
    currentPrice: 22.9,
    imageUrl: '/assets/products/52-racao-funny-bunny-500g.png',
    categoryId: 'roedores',
    brand: 'Supra',
    description:
      'Ração peletizada completa enriquecida com alfafa, vitaminas e minerais para coelhos de estimação de todas as idades, favorecendo digestão saudável e pelagem macia.',
    weightKg: 0.5,
    heightCm: 22,
    widthCm: 14,
    lengthCm: 7,
    stockOwn: 30,
  },
  {
    num: 77,
    name: 'Roda Silenciosa para Hamster 20cm',
    currentPrice: 49.9,
    imageUrl: '/assets/products/12-p-gaiola-hamster-bp1gvqw-.jpg',
    categoryId: 'roedores',
    brand: 'HamsterFun',
    description:
      'Roda de exercícios com 20cm de diâmetro e rolamento silencioso sem frestas perigosas para as patinhas, ideal para hamsters sírios manterem a atividade noturna sem ruído.',
    weightKg: 0.35,
    heightCm: 22,
    widthCm: 22,
    lengthCm: 10,
    stockOwn: 22,
  },
  {
    num: 78,
    name: 'Termostato Roxin com Aquecedor 100W',
    currentPrice: 129.9,
    imageUrl: '/assets/products/41-termostato-roxin-ht-1900-220v-50w.jpg',
    categoryId: 'peixes',
    brand: 'Roxin',
    description:
      'Termostato submersível automático de 100W em tubo de quartzo resistente, indicado para manter temperatura estável em aquários tropicais de até 100 litros.',
    weightKg: 0.4,
    heightCm: 28,
    widthCm: 6,
    lengthCm: 6,
    stockOwn: 16,
  },
  {
    num: 79,
    name: 'Filtro Externo JAD 103 300L/h',
    currentPrice: 109.9,
    imageUrl: '/assets/products/53-ltro-externo-fe-100-127v-789828144188-8-fe-100-220v-789828144192-5.jpg',
    categoryId: 'peixes',
    brand: 'JAD',
    description:
      'Filtro externo tipo hang-on com vazão de 300 litros/hora que realiza filtragem mecânica, química e biológica silenciosa mantendo a água cristalina e oxigenada.',
    weightKg: 0.65,
    heightCm: 18,
    widthCm: 14,
    lengthCm: 16,
    stockOwn: 18,
  },
  {
    num: 80,
    name: 'Aquário Betta Vidro 3L',
    currentPrice: 79.9,
    imageUrl: '/assets/products/54-7899526805168-edt.jpg',
    categoryId: 'peixes',
    brand: 'BettaGlass',
    description:
      'Aquário compacto de 3 litros confeccionado em vidro cristalino com acabamento em silicone transparente, ideal para montagem minimalista de peixe Betta.',
    weightKg: 1.5,
    heightCm: 20,
    widthCm: 14,
    lengthCm: 18,
    stockOwn: 20,
  },
  {
    num: 81,
    name: 'Omega Sea Betta 20g',
    currentPrice: 39.9,
    imageUrl: '/assets/products/55-606529237332.jpg',
    categoryId: 'peixes',
    brand: 'Omega Sea',
    description:
      'Alimento super premium em microgrânulos flutuantes com ingredientes marinhos frescos (salmão e arenque) que respeitam a dieta carnívora e realçam as cores do peixe Betta.',
    weightKg: 0.05,
    heightCm: 9,
    widthCm: 5,
    lengthCm: 5,
    stockOwn: 32,
  },
  {
    num: 82,
    name: 'Guia Zee.Dog Air Mesh Laranja',
    currentPrice: 89.9,
    imageUrl: '/assets/products/20-peitoral-h-mesh-para-caes-toh-fiji.webp',
    categoryId: 'acessorios',
    brand: 'Zee.Dog',
    description:
      'Guia leve e respirável com pegada macia e mosquetão giratório de zinco com trava roscada de segurança 360 graus para passeios confortáveis em qualquer clima.',
    weightKg: 0.25,
    heightCm: 5,
    widthCm: 16,
    lengthCm: 20,
    stockOwn: 24,
  },
];

function buildEan13(indexNumber: number): string {
  const base = `7899001${String(indexNumber).padStart(5, '0')}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return `${base}${check}`;
}

export const CATALOG_SEED_PRODUCTS: Product[] = RAW_NUPETHUB_CATALOG.map((item) => {
  const numStr = String(item.num).padStart(2, '0');
  const slug = slugify(item.name);
  const id = `nupet-${numStr}-${slug}`.slice(0, 64).replace(/-+$/, '');
  const sku = `NUP-${String(item.num).padStart(3, '0')}`;
  const hasPromo = Boolean(item.originalPrice && item.originalPrice > item.currentPrice);
  const regularPrice = Number((hasPromo ? item.originalPrice! : item.currentPrice).toFixed(2));
  const promoPrice = hasPromo ? Number(item.currentPrice.toFixed(2)) : 0;
  const costPrice = Number((item.currentPrice * 0.62).toFixed(2));
  const markupPercent = Number((((regularPrice - costPrice) / costPrice) * 100).toFixed(1));

  return {
    id,
    sku,
    barcode: buildEan13(item.num),
    name: item.name,
    slug,
    description: item.description,
    brand: item.brand,
    categoryId: item.categoryId,
    categoryName: CATEGORY_NAME_MAP[item.categoryId],
    supplierId: '',
    sourceType: 'own_stock',
    costPrice,
    markupPercent,
    price: regularPrice,
    promoPrice,
    manualPriceLocked: true,
    stockOwn: item.stockOwn,
    stockSupplier: 25,
    stockReserved: 0,
    minStockAlert: 5,
    available: true,
    published: true,
    featured: Boolean(item.featured),
    bestSeller: Boolean(item.bestSeller),
    weightKg: item.weightKg,
    heightCm: item.heightCm,
    widthCm: item.widthCm,
    lengthCm: item.lengthCm,
    images: [item.imageUrl],
    variants: [],
    priceHistory: [],
  };
});

/**
 * Allows department routes like /caes, /gatos, /alimentacao, /higiene, /brinquedos, etc.
 * to show both primary category products and closely related cross-department items.
 */
export function matchesDepartmentSlug(product: Product, departmentSlug: string): boolean {
  const slug = departmentSlug.toLowerCase();
  const catSlug = product.categoryId?.toLowerCase();
  const catNameSlug = product.categoryName
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (catSlug === slug || catNameSlug === slug) return true;

  const text = `${product.name} ${product.brand} ${product.description}`.toLowerCase();

  if (slug === 'caes') {
    return (
      /\bc[aã]es\b|\bc[aã]o\b|\bdog\b|pedigree|golden|dentastix|bravecto|seresto|drontal|frontline|zee\.dog|kong|tapete higi[eê]nico|bifinho|guia retr[aá]til|coleira de couro|cama pet|caixa de transporte|pet games|shampoo hipoalerg[eê]nico|n&d|magnus|royal canin mini|premier f[oó]rmula|hill's/i.test(
        text
      ) && !/\bgatos\b/i.test(product.name)
    );
  }

  if (slug === 'gatos') {
    return /\bgatos\b|\bgato\b|\bcat\b|\bcats\b|\bfelinos?\b|whiskas|granplus|dreamies|pipicat|viva verde|equil[ií]brio|arranhador|varinha|areia|caixa de areia|fonte aqualimp|fonte de [aá]gua|cama pet|caixa de transporte/i.test(
      text
    );
  }

  if (slug === 'alimentacao') {
    return /\bra[cç][aã]o\b|petisco|sach[eê]|bifinho|dentastix|sementes|farinhada|feno|supra coelho|nutr[oó]pica|megazoo|alcon club|alcon basic|omega sea|tetra color|dreamies|royal canin|premier|golden|pedigree|whiskas|granplus|hill's|n&d|magnus|equil[ií]brio/i.test(
      text
    );
  }

  if (slug === 'brinquedos') {
    return /brinquedo|bola|mordedor|kong|varinha|roda silenciosa|balan[cç]o colorido/i.test(text);
  }

  if (slug === 'caminhas') {
    return /cama|casinha|caixa de transporte|ninho/i.test(text);
  }

  if (slug === 'higiene') {
    return /tapete higi[eê]nico|areia|caixa de areia|shampoo|bravecto|seresto|frontline|drontal|condicionador de [aá]gua/i.test(
      text
    );
  }

  if (slug === 'acessorios') {
    return /coleira|peitoral|guia|fonte|arranhador|gaiola|bebedouro|aqu[aá]rio|filtro|termostato|substrato|caixa de transporte/i.test(
      text
    );
  }

  return false;
}
