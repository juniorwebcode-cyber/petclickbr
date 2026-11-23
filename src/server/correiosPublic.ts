import { normalizeCep } from '../lib/format';

export interface PublicCorreiosQuoteInput {
  originCep: string;
  destinationCep: string;
  destinationState?: string;
  weightKg: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
}

export interface PublicCorreiosQuoteOption {
  id: string;
  label: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  source: 'correios_public';
}

interface CepGeoInfo {
  uf: string;
  region: 'SUDESTE' | 'SUL' | 'CENTRO_OESTE' | 'NORDESTE' | 'NORTE';
  isMetroCapital: boolean;
}

type TariffZone =
  | 'LOCAL'
  | 'ESTADUAL'
  | 'REGIONAL'
  | 'NACIONAL_INTERMEDIARIA'
  | 'NACIONAL_LONGA'
  | 'NACIONAL_NORTE';

function resolveCepGeo(rawCep: string, explicitUf?: string): CepGeoInfo {
  const cep = normalizeCep(rawCep);
  const p3 = Number(cep.slice(0, 3)) || 10;
  const p2 = Number(cep.slice(0, 2)) || 1;

  if (p2 >= 1 && p2 <= 9) return { uf: 'SP', region: 'SUDESTE', isMetroCapital: true };
  if (p2 >= 11 && p2 <= 19) return { uf: 'SP', region: 'SUDESTE', isMetroCapital: p3 >= 110 && p3 <= 117 };
  if (p2 >= 20 && p2 <= 26) return { uf: 'RJ', region: 'SUDESTE', isMetroCapital: p3 <= 266 };
  if (p2 >= 27 && p2 <= 28) return { uf: 'RJ', region: 'SUDESTE', isMetroCapital: false };
  if (p2 === 29) return { uf: 'ES', region: 'SUDESTE', isMetroCapital: p3 <= 291 };
  if (p2 >= 30 && p2 <= 39) return { uf: 'MG', region: 'SUDESTE', isMetroCapital: p3 <= 349 };
  if (p2 >= 40 && p2 <= 48) return { uf: 'BA', region: 'NORDESTE', isMetroCapital: p3 <= 444 };
  if (p2 === 49) return { uf: 'SE', region: 'NORDESTE', isMetroCapital: p3 <= 491 };
  if (p2 >= 50 && p2 <= 56) return { uf: 'PE', region: 'NORDESTE', isMetroCapital: p3 <= 549 };
  if (p2 === 57) return { uf: 'AL', region: 'NORDESTE', isMetroCapital: p3 <= 571 };
  if (p2 === 58) return { uf: 'PB', region: 'NORDESTE', isMetroCapital: p3 <= 583 };
  if (p2 === 59) return { uf: 'RN', region: 'NORDESTE', isMetroCapital: p3 <= 592 };
  if (p2 >= 60 && p2 <= 63) return { uf: 'CE', region: 'NORDESTE', isMetroCapital: p3 <= 619 };
  if (p2 === 64) return { uf: 'PI', region: 'NORDESTE', isMetroCapital: p3 <= 641 };
  if (p2 === 65) return { uf: 'MA', region: 'NORDESTE', isMetroCapital: p3 <= 651 };
  if (p2 >= 66 && p2 <= 68) return { uf: 'PA', region: 'NORTE', isMetroCapital: p3 <= 679 };
  if (p3 === 689) return { uf: 'AP', region: 'NORTE', isMetroCapital: true };
  if (p3 === 693) return { uf: 'RR', region: 'NORTE', isMetroCapital: true };
  if (p3 === 699) return { uf: 'AC', region: 'NORTE', isMetroCapital: true };
  if (p2 === 69) return { uf: 'AM', region: 'NORTE', isMetroCapital: p3 <= 692 };
  if (p3 >= 700 && p3 <= 736) return { uf: 'DF', region: 'CENTRO_OESTE', isMetroCapital: true };
  if (p3 === 768 || p3 === 769) return { uf: 'RO', region: 'NORTE', isMetroCapital: p3 === 768 };
  if (p2 >= 72 && p2 <= 76) return { uf: 'GO', region: 'CENTRO_OESTE', isMetroCapital: p3 >= 740 && p3 <= 749 };
  if (p2 === 77) return { uf: 'TO', region: 'NORTE', isMetroCapital: p3 <= 772 };
  if (p2 === 78) return { uf: 'MT', region: 'CENTRO_OESTE', isMetroCapital: p3 <= 781 };
  if (p2 === 79) return { uf: 'MS', region: 'CENTRO_OESTE', isMetroCapital: p3 <= 791 };
  if (p2 >= 80 && p2 <= 87) return { uf: 'PR', region: 'SUL', isMetroCapital: p3 <= 838 };
  if (p2 >= 88 && p2 <= 89) return { uf: 'SC', region: 'SUL', isMetroCapital: p3 <= 882 };
  if (p2 >= 90 && p2 <= 99) return { uf: 'RS', region: 'SUL', isMetroCapital: p3 <= 949 };

  const fallbackUf = (explicitUf || 'SP').toUpperCase();
  return { uf: fallbackUf, region: 'SUDESTE', isMetroCapital: false };
}

function classifyTariffZone(originCep: string, destCep: string, origin: CepGeoInfo, dest: CepGeoInfo): TariffZone {
  if (originCep.slice(0, 3) === destCep.slice(0, 3) || (origin.uf === dest.uf && origin.isMetroCapital && dest.isMetroCapital)) {
    return 'LOCAL';
  }
  if (origin.uf === dest.uf) {
    return 'ESTADUAL';
  }
  if (origin.region === dest.region && (origin.region === 'SUDESTE' || origin.region === 'SUL')) {
    return 'REGIONAL';
  }
  if (
    (origin.region === 'SUDESTE' && (dest.region === 'SUL' || dest.region === 'CENTRO_OESTE')) ||
    (origin.region === 'SUL' && (dest.region === 'SUDESTE' || dest.region === 'CENTRO_OESTE')) ||
    (origin.region === 'CENTRO_OESTE' && (dest.region === 'SUDESTE' || dest.region === 'SUL'))
  ) {
    return 'NACIONAL_INTERMEDIARIA';
  }
  if (dest.region === 'NORTE' || origin.region === 'NORTE') {
    return 'NACIONAL_NORTE';
  }
  return 'NACIONAL_LONGA';
}

const ZONE_BASE_RATES: Record<
  TariffZone,
  {
    pacBase: number;
    pacPerKg: number;
    pacDays: number;
    sedexBase: number;
    sedexPerKg: number;
    sedexDays: number;
  }
> = {
  LOCAL: {
    pacBase: 16.9,
    pacPerKg: 1.4,
    pacDays: 3,
    sedexBase: 21.5,
    sedexPerKg: 2.1,
    sedexDays: 1,
  },
  ESTADUAL: {
    pacBase: 19.9,
    pacPerKg: 1.85,
    pacDays: 4,
    sedexBase: 27.9,
    sedexPerKg: 3.1,
    sedexDays: 2,
  },
  REGIONAL: {
    pacBase: 23.9,
    pacPerKg: 2.45,
    pacDays: 5,
    sedexBase: 36.9,
    sedexPerKg: 4.3,
    sedexDays: 2,
  },
  NACIONAL_INTERMEDIARIA: {
    pacBase: 27.9,
    pacPerKg: 3.25,
    pacDays: 7,
    sedexBase: 46.9,
    sedexPerKg: 6.1,
    sedexDays: 3,
  },
  NACIONAL_LONGA: {
    pacBase: 34.9,
    pacPerKg: 4.5,
    pacDays: 9,
    sedexBase: 62.9,
    sedexPerKg: 8.6,
    sedexDays: 4,
  },
  NACIONAL_NORTE: {
    pacBase: 42.9,
    pacPerKg: 5.9,
    pacDays: 12,
    sedexBase: 79.9,
    sedexPerKg: 11.4,
    sedexDays: 5,
  },
};

function roundCommercialCents(val: number): number {
  const rounded = Math.round(val * 10) / 10;
  return Number((Math.floor(rounded) + 0.9).toFixed(2));
}

export function calculatePublicCorreiosQuotes(input: PublicCorreiosQuoteInput): {
  zone: TariffZone;
  originUf: string;
  destinationUf: string;
  billableWeightKg: number;
  options: PublicCorreiosQuoteOption[];
} {
  const originCep = normalizeCep(input.originCep || '01310100').padEnd(8, '0').slice(0, 8);
  const destinationCep = normalizeCep(input.destinationCep).padEnd(8, '0').slice(0, 8);

  const originGeo = resolveCepGeo(originCep);
  const destGeo = resolveCepGeo(destinationCep, input.destinationState);
  const zone = classifyTariffZone(originCep, destinationCep, originGeo, destGeo);
  const rates = ZONE_BASE_RATES[zone];

  const physicalWeight = Math.max(0.3, Number(input.weightKg) || 0.5);
  const h = Math.max(2, Number(input.heightCm) || 12);
  const w = Math.max(11, Number(input.widthCm) || 16);
  const l = Math.max(16, Number(input.lengthCm) || 20);
  const cubicWeight = (h * w * l) / 6000;
  // Regra oficial dos Correios: peso cúbico só se aplica acima de 5 kg quando supera o peso físico
  const billableWeightKg = Math.max(physicalWeight, cubicWeight > 5 ? cubicWeight : 0);

  const extraKg = Math.max(0, billableWeightKg - 0.5);
  const interiorFactor = destGeo.isMetroCapital ? 1 : 1.09;
  const extraInteriorDays = destGeo.isMetroCapital ? 0 : zone === 'LOCAL' ? 1 : 2;

  const pacRaw = (rates.pacBase + extraKg * rates.pacPerKg) * interiorFactor;
  const sedexRaw = (rates.sedexBase + extraKg * rates.sedexPerKg) * interiorFactor;

  const pacPrice = roundCommercialCents(pacRaw);
  const sedexPrice = Math.max(Number((pacPrice + 6).toFixed(2)), roundCommercialCents(sedexRaw));

  const pacDays = rates.pacDays + extraInteriorDays;
  const sedexDays = rates.sedexDays + (destGeo.isMetroCapital ? 0 : 1);

  return {
    zone,
    originUf: originGeo.uf,
    destinationUf: destGeo.uf,
    billableWeightKg: Number(billableWeightKg.toFixed(2)),
    options: [
      {
        id: 'correios_pac',
        label: `Correios PAC (${originGeo.uf} → ${destGeo.uf})`,
        carrier: 'Correios · Encomenda Econômica Nacional',
        price: pacPrice,
        estimatedDays: pacDays,
        source: 'correios_public',
      },
      {
        id: 'correios_sedex',
        label: `Correios SEDEX (${originGeo.uf} → ${destGeo.uf})`,
        carrier: 'Correios · Entrega Expressa Nacional',
        price: sedexPrice,
        estimatedDays: sedexDays,
        source: 'correios_public',
      },
    ],
  };
}
