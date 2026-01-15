import { Tender } from '../types';

// Configuración para usar nuestra propia API interna
const FEED_ENDPOINTS = [
  { sourceType: 'Perfiles Contratante', param: 'perfiles' },
  { sourceType: 'Plataformas Agregadas', param: 'agregadas' },
  { sourceType: 'Contratos Menores', param: 'menores' }
];

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
    return html.replace(/<[^>]*>?/gm, '').trim();
};

export const fetchTenders = async (keywords: string[]): Promise<Tender[]> => {
  const allTenders: Tender[] = [];
  const processedIds = new Set<string>();

  // Fetch all feeds in parallel using our internal API
  const promises = FEED_ENDPOINTS.map(async (endpoint) => {
      try {
          const url = `/api/estado-atom?feed=${endpoint.param}`;
          console.log(`Fetching ${endpoint.sourceType} from ${url}`);
          
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Status: ${response.status}`);
          
          const xmlText = await response.text();
          const tenders = parseAtomXML(xmlText, endpoint.sourceType, keywords);
          
          tenders.forEach(t => {
              if (!processedIds.has(t.id)) {
                  processedIds.add(t.id);
                  allTenders.push(t);
              }
          });
      } catch (e) {
          console.error(`Error fetching ${endpoint.sourceType}:`, e);
      }
  });

  await Promise.all(promises);
  
  return allTenders.sort((a, b) => 
      new Date(b.updated).getTime() - new Date(a.updated).getTime()
  );
};

// Parser robusto usando DOMParser nativo (mucho mejor que Regex para XML complejo)
const parseAtomXML = (xmlString: string, sourceType: string, keywordsList: string[]): Tender[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const entries = Array.from(xmlDoc.getElementsByTagName("entry"));

    return entries.map(entry => {
        // --- Helpers para navegar XML ignorando namespaces (cac:, cbc:, ns1:) ---
        const findChild = (parent: Element, localName: string): Element | null => {
            const children = parent.children;
            for (let i = 0; i < children.length; i++) {
                if (children[i].localName === localName || children[i].nodeName.endsWith(`:${localName}`)) {
                    return children[i];
                }
            }
            return null;
        };

        const getText = (node: Element | null): string => node ? node.textContent || "" : "";

        // --- Extracción de Datos Básicos ---
        const title = getText(findChild(entry, "title")) || "Sin título";
        const summaryHtml = getText(findChild(entry, "summary"));
        const summary = cleanHtml(summaryHtml);
        const id = getText(findChild(entry, "id"));
        const updated = getText(findChild(entry, "updated"));
        
        // Link
        let link = "";
        const links = entry.getElementsByTagName("link");
        for(let i=0; i<links.length; i++) {
             if(links[i].getAttribute("rel") === "alternate") {
                 link = links[i].getAttribute("href") || "";
                 break;
             }
             if (!link) link = links[i].getAttribute("href") || "";
        }

        // --- Extracción Profunda (ContractFolderStatus) ---
        const folder = findChild(entry, "ContractFolderStatus");
        
        let organism = "Órgano de Contratación";
        let amount = "";
        let status = "Publicada";
        
        if (folder) {
            // Organismo
            const locatedParty = findChild(folder, "LocatedContractingParty");
            if (locatedParty) {
                const party = findChild(locatedParty, "Party");
                if (party) {
                    const partyName = findChild(party, "PartyName");
                    if (partyName) {
                        organism = getText(findChild(partyName, "Name")) || organism;
                    }
                }
            }

            // Importe
            const project = findChild(folder, "ProcurementProject");
            if (project) {
                const budget = findChild(project, "BudgetAmount");
                if (budget) {
                    const amountNode = findChild(budget, "EstimatedOverallContractAmount") || 
                                     findChild(budget, "TaxExclusiveAmount") ||
                                     findChild(budget, "TotalAmount");
                    const val = getText(amountNode);
                    if (val) {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                             amount = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
                        }
                    }
                }
            }

            // Estado
            const tenderResult = findChild(folder, "TenderResult");
            if (tenderResult) {
                const resultCode = getText(findChild(tenderResult, "ResultCode"));
                if (resultCode === '8') status = 'Adjudicada';
                else if (resultCode === '9') status = 'Formalizada';
                else if (resultCode === '10') status = 'Desierta';
                else if (resultCode === '4') status = 'Anulada';
            }
        }

        // Fallback de estado desde el resumen
        if (status === "Publicada") {
             if (summary.includes("Estado: Adjudicada")) status = "Adjudicada";
             else if (summary.includes("Estado: Resuelta")) status = "Formalizada";
             else if (summary.includes("Estado: Desierta")) status = "Desierta";
        }

        // Fallback de importe si no se extrajo del XML estructurado
        if (!amount) {
             const amountMatch = summary.match(/Importe(?:.*?):\s*([\d\.,]+)/i);
             if (amountMatch) amount = amountMatch[1] + " €";
        }

        // Categorización
        const fullText = `${title} ${summary} ${organism}`;
        const matchedKeywords = findKeywords(fullText, keywordsList);
        
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
            amount: amount || "Consultar",
            organism,
            contractType,
            sourceType,
            status,
            keywordsFound: matchedKeywords,
            isRead: false
        };
    });
};
