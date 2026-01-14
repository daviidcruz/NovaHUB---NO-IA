import { Tender } from '../types';

const TARGET_URL = 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom';
// Cambiamos a corsproxy.io que maneja mejor archivos grandes y tiempos de respuesta que allorigins
const PROXY_URL = 'https://corsproxy.io/?';

// Utility: Normalize strings for search
const normalizeString = (str: string): string => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

// Utility: Clean HTML
const cleanHtml = (html: string): string => {
    return html.replace(/<[^>]*>?/gm, '');
};

export const fetchTenders = async (keywords: string[]): Promise<Tender[]> => {
  try {
    // Construimos la URL del proxy. 
    // Nota: corsproxy.io funciona concatenando la URL codificada o cruda. 
    // Usamos encodeURIComponent para asegurar caracteres especiales.
    const finalUrl = `${PROXY_URL}${encodeURIComponent(TARGET_URL)}`;
    
    console.log("Fetching tenders from:", finalUrl);

    const response = await fetch(finalUrl);
    
    if (!response.ok) {
        throw new Error(`Error HTTP al obtener feed: ${response.status} ${response.statusText}`);
    }
    
    // 2. Obtener texto y parsear XML nativamente
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const entries = Array.from(xmlDoc.getElementsByTagName("entry"));
    
    if (entries.length === 0) {
        console.warn("No entries found in XML. Raw XML preview:", xmlText.substring(0, 200));
    }

    return entries.map(entry => {
        // Helpers para extracción XML ignorando namespaces (cac:, cbc:, etc.)
        const getText = (node: Element | null): string => node ? node.textContent || "" : "";
        
        // Busca un nodo descendiente por su nombre local (sin prefijo)
        // Esto es crucial para la PLACSP que usa muchos namespaces
        const findNode = (parent: Element, localName: string): Element | null => {
            const children = parent.getElementsByTagName("*");
            for (let i = 0; i < children.length; i++) {
                if (children[i].localName === localName) return children[i];
            }
            return null;
        };
        
        // Datos básicos
        const title = getText(findNode(entry, "title")) || "Sin título";
        const summaryHtml = getText(findNode(entry, "summary"));
        const summary = cleanHtml(summaryHtml);
        const id = getText(findNode(entry, "id"));
        const updated = getText(findNode(entry, "updated"));

        // Link (buscar rel="alternate" o usar el primero)
        let link = "";
        const links = entry.getElementsByTagName("link");
        for (let i=0; i<links.length; i++) {
            const rel = links[i].getAttribute("rel");
            const href = links[i].getAttribute("href");
            if (rel === "alternate" || !rel) {
                link = href || "";
                if (rel === "alternate") break;
            }
        }

        // Extracción profunda de datos específicos (Organismo, Importe, Estado)
        // Navegamos buscando por nombre de etiqueta sin importar el namespace
        const folder = findNode(entry, "ContractFolderStatus");
        
        let organism = "Organismo Desconocido";
        let amount = "Consultar";
        let status = "Publicada";

        if (folder) {
            // Organismo: Buscamos 'PartyName' dentro de la estructura
            const party = findNode(folder, "PartyName"); // Búsqueda profunda simplificada
            if (party) {
                const name = getText(findNode(party, "Name"));
                if (name) organism = name;
            }

            // Importe: Buscamos 'BudgetAmount'
            const budget = findNode(folder, "BudgetAmount");
            if (budget) {
                const val = getText(findNode(budget, "TaxExclusiveAmount")) || getText(findNode(budget, "EstimatedOverallContractAmount"));
                if (val) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                         amount = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
                    }
                }
            }
            
            // Estado: Buscamos 'TenderResult' -> 'ResultCode'
            const result = findNode(folder, "TenderResult");
            if (result) {
                const code = getText(findNode(result, "ResultCode"));
                if (code === '8') status = 'Adjudicada';
                if (code === '9') status = 'Formalizada';
            }
        }

        // Fallback: Si no detectamos estado por código, intentamos sacarlo del resumen
        if (status === "Publicada") {
            const match = summary.match(/Estado:\s*(.*?)(?:<|;|,|\. |$)/i);
            if (match) status = match[1].trim();
        }

        // Keywords & Categorización
        const fullText = `${title} ${summary} ${organism}`;
        const matchedKeywords = findKeywords(fullText, keywords);
        
        let contractType = "Otros";
        const lower = fullText.toLowerCase();
        if (lower.includes("servicios")) contractType = "Servicios";
        else if (lower.includes("suministros")) contractType = "Suministros";
        else if (lower.includes("obras")) contractType = "Obras";

        return {
            id: id || Math.random().toString(),
            title,
            summary: summary.length > 300 ? summary.substring(0, 300) + "..." : summary,
            link,
            updated: updated || new Date().toISOString(),
            amount,
            organism,
            contractType,
            sourceType: "PLACSP",
            status,
            keywordsFound: matchedKeywords,
            isRead: false
        };
    }).sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

  } catch (e) {
    console.error("Fallo crítico obteniendo licitaciones:", e);
    // Retornamos array vacío para no romper la UI, pero el error ya fue logueado
    return [];
  }
};