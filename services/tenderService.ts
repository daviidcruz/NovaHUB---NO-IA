import { Tender } from '../types';

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const findKeywords = (text: string, keywordsList: string[]): string[] => {
  const normalizedText = normalizeString(text);
  const matches = new Set<string>();
  keywordsList.forEach(k => {
    const normalizedKeyword = normalizeString(k);
    if (normalizedText.includes(normalizedKeyword)) {
        matches.add(k);
    }
  });
  return Array.from(matches);
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const extractAmount = (text: string): string | undefined => {
    const labelRegex = /(?:Importe|Valor estimado|Presupuesto base|Importe total)(?:.*?):\s*([\d\.,]+)/i;
    const labelMatch = text.match(labelRegex);
    if (labelMatch) return normalizeAndFormatAmount(labelMatch[1]);
    const currencyRegex = /([\d\.,]+)\s?(?:€|EUR|euros)/i;
    const currencyMatch = text.match(currencyRegex);
    if (currencyMatch) return normalizeAndFormatAmount(currencyMatch[1]);
    return undefined;
};

const normalizeAndFormatAmount = (raw: string): string | undefined => {
    let clean = raw.trim();
    if (clean.includes('.') && !clean.includes(',')) {
        if (clean.indexOf('.') === clean.length - 3) {
             const num = parseFloat(clean);
             if (!isNaN(num)) return formatCurrency(num);
        }
    }
    if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    const num = parseFloat(clean);
    if (!isNaN(num)) return formatCurrency(num);
    return undefined;
};

const extractOrganism = (text: string): string | undefined => {
    const regex = /Órgano de Contratación:\s*(.*?)(?:;|,|\. |$)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
};

const extractStatus = (text: string): string | undefined => {
    // Actualizado para detenerse en etiquetas HTML (<)
    const regex = /Estado:\s*(.*?)(?:<|;|,|\. |$)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
};

const cleanSummary = (text: string): string => {
    let clean = text.replace(/<[^>]*>?/gm, '');
    return clean;
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

const fetchFeedContent = async (targetUrl: string): Promise<string | null> => {
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {}
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {}
    return null;
};

export const fetchTenders = async (keywords: string[]): Promise<Tender[]> => {
  const allTendersMap = new Map<string, Tender>();
  const MAX_PAGES_PER_FEED = 5;

  const promises = FEED_CONFIG.map(async (feed) => {
    let currentUrl: string | null = feed.url;
    let pagesProcessed = 0;

    while (currentUrl && pagesProcessed < MAX_PAGES_PER_FEED) {
      try {
        const xmlContent = await fetchFeedContent(currentUrl);
        if (xmlContent && xmlContent.trim().startsWith("<")) {
          const { tenders, nextUrl } = parseAtomFeed(xmlContent, feed.sourceType, keywords);
          
          tenders.forEach(t => {
            if (!allTendersMap.has(t.id)) {
              allTendersMap.set(t.id, t);
            }
          });

          currentUrl = nextUrl;
          pagesProcessed++;
        } else {
          currentUrl = null;
        }
      } catch (error) {
        console.error(`Error processing feed ${feed.sourceType} at ${currentUrl}:`, error);
        currentUrl = null;
      }
    }
  });

  await Promise.all(promises);
  
  return Array.from(allTendersMap.values()).sort((a, b) => 
    new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
};

export const parseAtomFeed = (
  xmlString: string, 
  sourceType: string, 
  keywordsList: string[]
): { tenders: Tender[], nextUrl: string | null } => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  
  // Extraer URL de la siguiente página (next link)
  let nextUrl: string | null = null;
  const links = xmlDoc.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (link.getAttribute("rel") === "next") {
      nextUrl = link.getAttribute("href");
      break;
    }
  }

  const entries = xmlDoc.getElementsByTagName("entry");
  const results: Tender[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
    const contentNode = entry.getElementsByTagName("content")[0] || entry.getElementsByTagName("summary")[0];
    const rawDescription = contentNode?.textContent || "";
    
    const amount = extractAmount(rawDescription);
    const organism = extractOrganism(rawDescription);
    const status = extractStatus(rawDescription);
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
      status,
      amount,
      organism
    });
  }
  
  return {
    tenders: results,
    nextUrl
  };
};