export interface ParsedSupplierRow {
  externalSku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  costPrice: number;
  stockSupplier: number;
  imageUrl: string;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  barcode?: string;
}

export function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

export function parseNumericBR(raw: string | number | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  const cleaned = raw
    .toString()
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .trim();

  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    return Number(cleaned.replace(',', '.')) || 0;
  }
  return Number(cleaned) || 0;
}

export function parseSupplierCsv(csvText: string): ParsedSupplierRow[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());

  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));

  const skuIdx = idx(['sku', 'external_sku', 'codigo', 'código', 'ref']);
  const nameIdx = idx(['name', 'nome', 'produto', 'title', 'titulo']);
  const brandIdx = idx(['brand', 'marca']);
  const categoryIdx = idx(['category', 'categoria']);
  const descIdx = idx(['description', 'descricao', 'descrição']);
  const costIdx = idx(['cost', 'cost_price', 'custo', 'preco_custo', 'preço_custo', 'price']);
  const stockIdx = idx(['stock', 'estoque', 'quantity', 'quantidade']);
  const imgIdx = idx(['image', 'image_url', 'imagem', 'foto']);
  const weightIdx = idx(['weight', 'weight_kg', 'peso', 'peso_kg']);
  const heightIdx = idx(['height', 'height_cm', 'altura']);
  const widthIdx = idx(['width', 'width_cm', 'largura']);
  const lengthIdx = idx(['length', 'length_cm', 'comprimento']);
  const barcodeIdx = idx(['barcode', 'ean', 'gtin', 'codigo_barras']);

  const rows: ParsedSupplierRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    const name = nameIdx >= 0 ? cols[nameIdx] : '';
    const externalSku = skuIdx >= 0 ? cols[skuIdx] : `CSV-${i}`;
    const costPrice = costIdx >= 0 ? parseNumericBR(cols[costIdx]) : 0;

    if (!name || name.length < 2) continue;

    rows.push({
      externalSku: externalSku || `CSV-${i}`,
      name,
      brand: brandIdx >= 0 && cols[brandIdx] ? cols[brandIdx] : 'Marca Autorizada',
      category: categoryIdx >= 0 && cols[categoryIdx] ? cols[categoryIdx] : 'Acessórios',
      description: descIdx >= 0 && cols[descIdx] ? cols[descIdx] : name,
      costPrice: Math.max(0, costPrice),
      stockSupplier: stockIdx >= 0 ? Math.max(0, Math.floor(parseNumericBR(cols[stockIdx]))) : 0,
      imageUrl: imgIdx >= 0 && cols[imgIdx] ? cols[imgIdx] : '',
      weightKg: weightIdx >= 0 ? Math.max(0.1, parseNumericBR(cols[weightIdx])) : 0.5,
      heightCm: heightIdx >= 0 ? Math.max(2, parseNumericBR(cols[heightIdx])) : 10,
      widthCm: widthIdx >= 0 ? Math.max(2, parseNumericBR(cols[widthIdx])) : 15,
      lengthCm: lengthIdx >= 0 ? Math.max(2, parseNumericBR(cols[lengthIdx])) : 20,
      barcode: barcodeIdx >= 0 ? cols[barcodeIdx] : undefined,
    });
  }

  return rows;
}

export function parseSupplierXml(xmlText: string): ParsedSupplierRow[] {
  const itemMatches = xmlText.match(/<(?:product|produto|item)>[\s\S]*?<\/(?:product|produto|item)>/gi) || [];
  const getTag = (block: string, tags: string[]): string => {
    for (const tag of tags) {
      const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = block.match(re);
      if (match && match[1]) {
        return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      }
    }
    return '';
  };

  const rows: ParsedSupplierRow[] = [];
  itemMatches.forEach((block, i) => {
    const name = getTag(block, ['name', 'nome', 'title', 'titulo']);
    if (!name) return;
    rows.push({
      externalSku: getTag(block, ['sku', 'codigo', 'id']) || `XML-${i + 1}`,
      name,
      brand: getTag(block, ['brand', 'marca']) || 'Marca Autorizada',
      category: getTag(block, ['category', 'categoria']) || 'Acessórios',
      description: getTag(block, ['description', 'descricao']) || name,
      costPrice: Math.max(0, parseNumericBR(getTag(block, ['cost', 'custo', 'price', 'preco']))),
      stockSupplier: Math.max(0, Math.floor(parseNumericBR(getTag(block, ['stock', 'estoque', 'quantity'])))),
      imageUrl: getTag(block, ['image', 'image_url', 'imagem']),
      weightKg: Math.max(0.1, parseNumericBR(getTag(block, ['weight', 'peso'])) || 0.5),
      heightCm: Math.max(2, parseNumericBR(getTag(block, ['height', 'altura'])) || 10),
      widthCm: Math.max(2, parseNumericBR(getTag(block, ['width', 'largura'])) || 15),
      lengthCm: Math.max(2, parseNumericBR(getTag(block, ['length', 'comprimento'])) || 20),
      barcode: getTag(block, ['barcode', 'ean']) || undefined,
    });
  });

  return rows;
}

export function exportRowsToCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const escapeCell = (cell: string | number | boolean): string => {
    const s = String(cell ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [
    headers.map(escapeCell).join(';'),
    ...rows.map((r) => r.map(escapeCell).join(';')),
  ].join('\n');
}

export function generateSupplierCsvTemplate(): string {
  return [
    'sku;name;brand;category;description;cost_price;stock;weight_kg;height_cm;width_cm;length_cm;barcode;image_url',
    'PET-RAC-001;Racao Natural Premium Caes Adultos 15kg;PetNature;Alimentacao;Racao super premium sem transgenicos para caes adultos.;120.00;25;15.0;45;35;18;7891234560011;/assets/images/petclick_dog_nutrition_1795448307002.jpg',
    'PET-CAM-002;Cama Trancada Algodao Conforto Gatos;CasaPet;Caminhas;Cama macia em corda de algodao organico com almofada lavavel.;89.50;14;1.8;20;48;48;7891234560028;/assets/images/petclick_cat_accessories_1795448305897.jpg',
    'PET-BRQ-003;Kit Brinquedos Interativos Corda e Borracha;BrincaPet;Brinquedos;Combo com osso de borracha natural e corda trancada resistente.;32.00;40;0.6;12;24;18;7891234560035;/assets/images/petclick_toys_bundle_1795448305805.jpg',
    'PET-HIG-004;Shampoo Botanico Neutro e Escova Bambu;BioPet;Higiene;Kit higiene com shampoo botanico suave 250ml e escova de bambu.;38.00;30;0.7;18;16;10;7891234560042;/assets/images/petclick_hygiene_grooming_1795448305609.jpg',
  ].join('\n');
}
