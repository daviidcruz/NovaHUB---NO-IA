
const FEEDS: Record<string, string> = {
  perfiles: 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
  agregadas: 'https://contrataciondelestado.es/sindicacion/sindicacion_1044/PlataformasAgregadasSinMenores.atom',
  menores: 'https://contrataciondelestado.es/sindicacion/sindicacion_1143/contratosMenoresPerfilesContratantes.atom'
};

// Usamos tipos 'any' para evitar dependencia estricta de @vercel/node si no está instalado
export default async function handler(req: any, res: any) {
  const feed = req.query.feed as string;

  if (!feed || !FEEDS[feed]) {
    return res.status(400).json({ error: 'Feed no válido' });
  }

  try {
    const response = await fetch(FEEDS[feed]);
    if (!response.ok) {
      throw new Error(`Error al obtener el feed: ${response.statusText}`);
    }

    const xml = await response.text();

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error en proxy:", error);
    res.status(500).json({ error: 'No se pudo acceder al feed' });
  }
}
