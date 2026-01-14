// Este archivo ya no se utiliza.
// La lógica de fetch se ha movido a services/tenderService.ts usando un proxy público
// para evitar problemas de configuración de servidor (error 404) y CORS.

export default function handler(req, res) {
  res.status(200).json({ message: "Endpoint deprecado. Usa el cliente directamente." });
}