import { Tender } from '../types';

// Utility: Normalize strings for search
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Utility: Find keyword matches
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

// Utility: Format currency to EU standard
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Logic: Parse and normalize amount string (e.g., "1.500,50")
const normalizeAndFormatAmount = (raw: string): string | undefined => {
    let clean = raw.trim();
    // Remove currency symbols if attached
    clean = clean.replace(/[^\d.,-]/g, '');

    // Handle European format: Dots for thousands, Comma for decimals
    if (clean.includes(',') && clean.includes('.')) {
        // e.g. 1.000,50 -> remove dots, replace comma with dot
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        // e.g. 1000,50 -> replace comma with dot
        clean = clean.replace(',', '.');
    } else if (clean.includes('.')) {
         // e.g. 1.000 (ambiguous, but usually thousands in ES context if 3 digits follow)
         // or 1000.50 (less common in this specific feed, but possible)
         // Safest bet for this feed: Remove dots as thousands separators
         const parts = clean.split('.');
         if (parts.length > 1 && parts[parts.length - 1].length === 2) {
             // It's likely a decimal (1000.50)
         } else {
             clean = clean.replace(/\./g, '');
         }
    }

    const num = parseFloat(clean);
    if (!isNaN(num)) return formatCurrency(num);
    return undefined;
};

// Logic: Robust extraction prioritizing labels
const extractAmount = (text: string): string | undefined => {
    // Priority 1: Look for explicit labels to avoid CPV codes or zips
    // Captures: "Valor estimado del contrato: 1.500,00"
    const labelRegex = /(?:Valor estimado|Presupuesto base|Importe total|Importe)\s*(?:del contrato|de licitación)?(?:.*?):\s*([\d\.,]+)/i;
    const labelMatch = text.match(labelRegex);
    if (labelMatch) return normalizeAndFormatAmount(labelMatch[1]);

    // Priority 2: Look for currency suffix if label fails
    const currencyRegex = /([\d\.,]+)\s?(?:€|EUR|euros)/i;
    const currencyMatch = text.match(currencyRegex);
    if (currencyMatch) return normalizeAndFormatAmount(currencyMatch[1]);

    return undefined;
};

const extractOrganism = (text: string): string | undefined => {
    const regex = /Órgano de Contratación:\s*(.*?)(?:;|<|,|\. |$)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
};

const extractStatus = (text: string): string | undefined => {
    const regex = /Estado:\s*(.*?)(?:<|;|,|\. |$)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
};

// Logic: Remove HTML tags to get clean text
const cleanHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

// Official Feed Configuration
const FEED_CONFIG = [
    {
        url: 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
        sourceType: 'Perfiles Contratante'
    }
];

// Helper to fetch text handling CORS via proxies
const fetchTextSafe = async (targetUrl: string): Promise<string | null> => {
    const cb = Date.now();
    const encodedUrl = encodeURIComponent(targetUrl);
    
    // Updated Proxy Strategy
    // Priority: 
    // 1. CodeTabs: Handles large files well.
    // 2. CorsProxy.io: Good availability.
    // 3. AllOrigins Raw: Backup.
    // 4. ThingProxy: Last resort.
    
    const strategies = [
        // 1. CodeTabs
        async () => {
            const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodedUrl}`);
            if (!response.ok) throw new Error(`CodeTabs error: ${response.status}`);
            return await response.text();
        },
        // 2. CorsProxy.io
        async () => {
            const response = await fetch(`https://corsproxy.io/?${encodedUrl}`);
            if (!response.ok) throw new Error(`CorsProxy error: ${response.status}`);
            return await response.text();
        },
        // 3. AllOrigins Raw
        async () => {
             const response = await fetch(`https://api.allorigins.win/raw?url=${encodedUrl}&cb=${cb}`);
             if (!response.ok) throw new Error(`AllOrigins Raw error: ${response.status}`);
             return await response.text();
        },
         // 4. ThingProxy
        async () => {
            const response = await fetch(`https://thingproxy.freeboard.io/fetch/${targetUrl}`);
            if (!response.ok) throw new Error(`ThingProxy error: ${response.status}`);
            return await response.text();
        }
    ];

    for (const [index, strategy] of strategies.entries()) {
        try {
            const text = await strategy();
            // Basic validation: must look like XML
            if (text && (text.trim().startsWith('<') || text.includes('<feed') || text.includes('<?xml'))) {
                return text;
            }
        } catch (e) {
            // Silently fail and try next proxy
            // console.warn(`Proxy ${index} failed for ${targetUrl}:`, e);
        }
    }

    console.error(`All proxies exhausted for ${targetUrl}. This is likely due to CORS restrictions or the feed file size being too large for the public proxies.`);
    return null;
};

export const parseAtomFeed = (
  xmlString: string, 
  sourceType: string, 
  keywordsList: string[]
): { tenders: Tender[], nextUrl: string | null } => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Check for parse errors
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
        return { tenders: [], nextUrl: null };
    }
  
    // Pagination: Find <link rel="next" href="...">
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
      
      // 1. Basic Fields
      const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
      const id = entry.getElementsByTagName("id")[0]?.textContent || `gen-${Math.random()}`;
      const updated = entry.getElementsByTagName("updated")[0]?.textContent || new Date().toISOString();
      
      // 2. Link Mapping
      let link = "";
      const entryLinks = entry.getElementsByTagName("link");
      for(let j=0; j<entryLinks.length; j++) {
          // Usually the alternate link is the one to the HTML page
          if (entryLinks[j].getAttribute("rel") !== "self" && entryLinks[j].getAttribute("rel") !== "next") {
              link = entryLinks[j].getAttribute("href") || "";
              if (link) break;
          }
      }

      // 3. Content Cleaning and Extraction
      // Summary is often contained in <summary type="html"> or <content type="html">
      const summaryNode = entry.getElementsByTagName("summary")[0] || entry.getElementsByTagName("content")[0];
      const rawHtml = summaryNode?.textContent || "";
      const cleanText = cleanHtml(rawHtml);

      // Extract Metadata from the text content
      const amount = extractAmount(cleanText); // Uses robust regex
      const organism = extractOrganism(cleanText);
      const status = extractStatus(cleanText);

      // 4. Keyword Matching
      // Search in Title + Organism + Clean Summary
      const fullText = `${title} ${cleanText} ${organism || ''}`;
      const keywords = findKeywords(fullText, keywordsList);

      // 5. Categorization
      let contractType = "Otros";
      const lowerText = fullText.toLowerCase();
      if (lowerText.includes("servicios")) contractType = "Servicios";
      else if (lowerText.includes("suministros")) contractType = "Suministros";
      else if (lowerText.includes("obras")) contractType = "Obras";

      results.push({
        id,
        title,
        summary: cleanText.length > 400 ? cleanText.substring(0, 400) + "..." : cleanText,
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
  } catch (e) {
      console.error("Error parsing XML feed", e);
      return { tenders: [], nextUrl: null };
  }
};

export const fetchTenders = async (keywords: string[]): Promise<Tender[]> => {
  const allTendersMap = new Map<string, Tender>();
  // Reduced to 1 to prevent timeout on multi-page fetches given the proxy constraints
  const MAX_PAGES_PER_FEED = 1; 

  const promises = FEED_CONFIG.map(async (feed) => {
    let currentUrl: string | null = feed.url;
    let pagesProcessed = 0;

    while (currentUrl && pagesProcessed < MAX_PAGES_PER_FEED) {
      try {
        const xmlContent = await fetchTextSafe(currentUrl);
        
        if (xmlContent) {
          const { tenders, nextUrl } = parseAtomFeed(xmlContent, feed.sourceType, keywords);
          
          if (tenders.length > 0) {
              tenders.forEach(t => {
                if (!allTendersMap.has(t.id)) {
                  allTendersMap.set(t.id, t);
                }
              });
              
              if (nextUrl && nextUrl !== currentUrl) {
                  currentUrl = nextUrl;
              } else {
                  currentUrl = null;
              }
              pagesProcessed++;
          } else {
              currentUrl = null;
          }
        } else {
          currentUrl = null;
        }
      } catch (error) {
        console.warn(`Error processing feed ${feed.sourceType}`, error);
        currentUrl = null;
      }
    }
  });

  await Promise.all(promises);
  
  // Sort by date descending
  return Array.from(allTendersMap.values()).sort((a, b) => 
    new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
};