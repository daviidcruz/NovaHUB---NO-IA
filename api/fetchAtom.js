import fetch from "node-fetch";
import xml2js from "xml2js";

export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "Debes pasar la URL del feed ATOM como ?url=" });

    // Fetch al feed ATOM
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error al obtener el feed: ${response.status}`);
    const xml = await response.text();

    // Parse XML a JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsed = await parser.parseStringPromise(xml);

    // Extraer entries
    const entries = parsed.feed.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];

    // Mapear a JSON simplificado
    const result = entries.map(entry => {
      const contract = entry['cac-place-ext:ContractFolderStatus'] || {};
      const organismo = contract['cac-place-ext:LocatedContractingParty']?.['cac:Party']?.['cac:PartyName']?.['cbc:Name'] || "";
      const importe = contract?.['cac:ProcurementProject']?.['cac:BudgetAmount']?.['cbc:TaxExclusiveAmount'] || "";
      const tipo = entry.summary?.['_'] || entry.summary || "";

      return {
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        link: entry.link?.['$']?.href || entry.link,
        updated: entry.updated,
        organismo,
        importe,
        tipo
      };
    });

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
