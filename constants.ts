
import { KeywordCategory } from './types';

// Keywords defined in the prompt for NovaGob
export const NOVAGOB_KEYWORDS: KeywordCategory[] = [
  {
    name: 'Temáticas Generales',
    keywords: [
      'Innovación pública', 'Gobierno abierto', 'Participación ciudadana', 
      'Transparencia', 'Transformación digital', 'Inteligencia artificial', 
      'Ciudades inteligentes', 'Smart city', 'Modernización', 'Gestión pública'
    ]
  },
  {
    name: 'Servicios y Productos',
    keywords: [
      'Consultoría', 'Formación', 'Plataformas colaborativas', 
      'Organización de eventos', 'Premios', 'Proyectos de innovación', 
      'Publicaciones', 'Informes', 'Comunicación', 'Divulgación'
    ]
  },
  {
    name: 'Metodologías',
    keywords: [
      'Laboratorio', 'Lab', 'Co-creación', 'Agile', 'Ágil', 
      'Innovación abierta', 'Prototipado', 'Experimentación', 
      'Datos', 'Data', 'Gestión del cambio'
    ]
  }
];

export const DEFAULT_KEYWORDS = NOVAGOB_KEYWORDS.flatMap(k => k.keywords);

// Placeholder for generic images if generation fails
export const PLACEHOLDER_IMAGE = "https://picsum.photos/800/600";
