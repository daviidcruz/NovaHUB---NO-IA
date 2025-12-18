
import { Tender } from '../types';

// Helper to remove accents and lowercase text for flexible matching
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Helper to check keywords in real data (Accent and Case Insensitive)
const findKeywords = (text: string, keywordsList: string[]): string[] => {
  const normalizedText = normalizeString(text);
  
  // Filter unique matches
  const matches = new Set<string>();
  keywordsList.forEach(k => {
    // Normalize the keyword too (e.g. "Tecnología" -> "tecnologia")
    const normalizedKeyword = normalizeString(k);
    if (normalizedText.includes(normalizedKeyword)) {
        matches.add(k); // Return the original formatted keyword
    }
  });
  return Array.from(matches);
};

// Helper for currency formatting
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Advanced Amount Extraction
const extractAmount = (text: string): string | undefined => {
    // 1. Try explicit labels "Importe: ...", "Valor estimado: ...", "Presupuesto base: ..."
    // Captures: 600000.00 (dot decimal), 100.000,00 (comma decimal), 100000
    const labelRegex = /(?:Importe|Valor estimado|Presupuesto base|Importe total)(?:.*?):\s*([\d\.,]+)/i;
    const labelMatch = text.match(labelRegex);
    
    if (labelMatch) {
        return normalizeAndFormatAmount(labelMatch[1]);
    }

    // 2. Fallback: Try patterns with currency symbol like "100.000,00 euros" or "EUR"
    const currencyRegex = /([\d\.,]+)\s?(?:€|EUR|euros)/i;
    const currencyMatch = text.match(currencyRegex);

    if (currencyMatch) {
        return normalizeAndFormatAmount(currencyMatch[1]);
    }

    return undefined;
};

// Helper to normalize number strings (handle 1.000,00 vs 1000.00)
const normalizeAndFormatAmount = (raw: string): string | undefined => {
    let clean = raw.trim();
    
    // Check if it looks like "600000.00" (Anglo style/Raw DB style)
    if (clean.includes('.') && !clean.includes(',')) {
        // If it has only one dot and it's near the end (2 decimals), treat as decimal separator
        if (clean.indexOf('.') === clean.length - 3) {
             const num = parseFloat(clean);
             if (!isNaN(num)) return formatCurrency(num);
        }
    }

    // Standard European cleanup: remove dots (thousands), replace comma with dot (decimal)
    // Be careful with "1.234" which could be 1234 or 1.234. Assume money is rarely < 10 with 3 decimals.
    // Usually tenders are > 1000.
    
    // Remove thousands separators (dots) if comma exists later
    if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }

    const num = parseFloat(clean);
    if (!isNaN(num)) {
        return formatCurrency(num);
    }
    return undefined;
};

const extractOrganism = (text: string): string | undefined => {
    // Look for "Órgano de Contratación: XXXXXX," or end of line
    const regex = /Órgano de Contratación:\s*(.*?)(?:;|,|\. |$)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
};

const cleanSummary = (text: string): string => {
    // If the summary is just a dump of fields, it's not very readable. 
    // We try to strip the administrative prefixes if they dominate the text.
    
    // Common pattern: "Id licitación: ...; Órgano: ...; Importe: ...; Estado: ..."
    // If it starts with Id licitación, it's likely a structured dump.
    if (text.trim().toLowerCase().startsWith("id licitación") || text.trim().toLowerCase().startsWith("expediente")) {
        // It's a structured dump. The user probably sees the title as the description of "what".
        // We can just return a shortened version or an empty string if we extracted everything else.
        // However, sometimes there is extra info.
        
        // Let's remove the specific extracted fields to reduce noise? 
        // Or just leave it as is but rely on the UI to show the important bits (Amount/Organism) separately.
        // Let's clean up HTML tags first.
        let clean = text.replace(/<[^>]*>?/gm, '');
        return clean;
    }

    return text.replace(/<[^>]*>?/gm, '');
};

const FEED_CONFIG = [
    {
        url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
        sourceType: 'Perfiles Contratante'
    },
    {
        url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
        sourceType: 'Plataformas Agregadas'
    },
    {
        url: 'https://contrataciondelsectorpublico.gob.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom',
        sourceType: 'Contratos Menores'
    }
];

// Helper to fetch text with fallback proxies
const fetchFeedContent = async (targetUrl: string): Promise<string | null> => {
    // Strategy 1: CorsProxy.io
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {
        console.warn(`Strategy 1 failed for ${targetUrl}`, e);
    }

    // Strategy 2: AllOrigins Raw
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {
        console.warn(`Strategy 2 failed for ${targetUrl}`, e);
    }

    // Strategy 3: CodeTabs
    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {
        console.warn(`Strategy 3 failed for ${targetUrl}`, e);
    }

    return null;
};

export const fetchTenders = async (keywords: string[]): Promise<Tender[]> => {
  const allTenders: Tender[] = [];

  const promises = FEED_CONFIG.map(async (feed) => {
    try {
        const xmlContent = await fetchFeedContent(feed.url);
        if (xmlContent && xmlContent.trim().startsWith("<")) {
            return parseAtomFeed(xmlContent, feed.sourceType, keywords);
        }
    } catch (error) {
        console.error(`Error processing feed ${feed.sourceType}:`, error);
    }
    return [];
  });

  try {
    const results = await Promise.all(promises);
    results.forEach(feedTenders => allTenders.push(...feedTenders));
  } catch (error) {
    console.error("Global fetch error:", error);
  }

  return allTenders.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
};

export const parseAtomFeed = (xmlString: string, sourceType: string, keywordsList: string[]): Tender[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const entries = xmlDoc.getElementsByTagName("entry");
  const results: Tender[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
    
    const summaryNode = entry.getElementsByTagName("summary")[0];
    const contentNode = entry.getElementsByTagName("content")[0];
    // Prefer content if available as it might have more details, or summary if not.
    const rawDescription = contentNode?.textContent || summaryNode?.textContent || "";
    
    // Extract Metadata from description
    const amount = extractAmount(rawDescription);
    const organism = extractOrganism(rawDescription);
    const summary = cleanSummary(rawDescription);

    const linkNode = entry.getElementsByTagName("link")[0];
    const link = linkNode ? (linkNode.getAttribute("href") || "") : "";

    const updated = entry.getElementsByTagName("updated")[0]?.textContent || new Date().toISOString();
    const id = entry.getElementsByTagName("id")[0]?.textContent || `gen-${Math.random()}`;

    const fullText = `${title} ${summary} ${organism || ''}`;
    const keywords = findKeywords(fullText, keywordsList);

    let contractType = "Otros";
    if (fullText.toLowerCase().includes("servicios")) contractType = "Servicios";
    else if (fullText.toLowerCase().includes("suministros")) contractType = "Suministros";
    else if (fullText.toLowerCase().includes("obras")) contractType = "Obras";

    results.push({
      id,
      title,
      summary: summary.length > 300 ? summary.substring(0, 300) + "..." : summary,
      link,
      updated,
      keywordsFound: keywords,
      isRead: false,
      sourceType,
      contractType,
      amount,
      organism
    });
  }
  return results;
};
