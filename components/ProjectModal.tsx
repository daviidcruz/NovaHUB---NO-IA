import React, { useState } from 'react';
import { Tender, ProjectDraft } from '../types';
import { generateProjectPDF } from '../utils/pdfGenerator';
import { X, Download, FileText } from 'lucide-react';

interface ProjectModalProps {
  tender: Tender;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ tender, onClose }) => {
  const [draft, setDraft] = useState<ProjectDraft>({
    tenderId: tender.id,
    introduction: `A la atención del órgano de contratación:\n\nPresentamos nuestra propuesta técnica para el expediente "${tender.title}".\n\nEste documento detalla una solución integral diseñada para satisfacer plenamente los requerimientos del pliego, garantizando eficiencia, transparencia y resultados medibles. Nuestra propuesta se alinea con los estándares más exigentes de la administración pública.`,
    objectives: `Objetivos Generales:\n1. Ejecutar el objeto del contrato (${tender.title}) con máxima calidad.\n2. Cumplir estrictamente con los plazos establecidos.\n\nObjetivos Específicos:\n- Optimización de recursos y costes.\n- Implementación de mejoras innovadoras en la prestación del servicio.\n- Garantía de sostenibilidad y responsabilidad social en la ejecución.`,
    methodology: `Metodología de Trabajo Propuesta:\n\nFase 1: Análisis y Planificación Inicial\n- Reunión de lanzamiento (Kick-off).\n- Definición detallada del cronograma.\n\nFase 2: Ejecución y Desarrollo\n- Despliegue de recursos técnicos y humanos.\n- Desarrollo de actividades según pliego.\n\nFase 3: Control y Seguimiento\n- Reuniones periódicas de seguimiento.\n- Informes de avance y gestión de incidencias.\n\nFase 4: Cierre y Entrega\n- Documentación final y transferencia de conocimiento.`,
    resources: `Equipo de Trabajo:\n- Director de Proyecto (Senior).\n- Equipo técnico especializado.\n\nMedios Materiales:\n- Infraestructura tecnológica necesaria.\n- Herramientas de gestión y comunicación.`,
    evaluation: `Plan de Aseguramiento de la Calidad:\n\nSe establecerán los siguientes Indicadores (KPIs):\n- Índice de cumplimiento de plazos.\n- Grado de satisfacción del responsable del contrato.\n- Tiempo de respuesta ante incidencias.\n\nSe entregarán informes mensuales de seguimiento para garantizar la correcta ejecución del servicio.`
  });

  const handleChange = (field: keyof ProjectDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800 transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Proyecto de Licitación</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl truncate">Expediente: {tender.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 p-6 md:p-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 rounded-xl p-8 min-h-full transition-colors">
                <div className="mb-8 border-b dark:border-slate-800 pb-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{tender.title}</h1>
                    <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Fecha: {new Date().toLocaleDateString()}</span>
                        <span>Referencia: {tender.id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">1. Introducción y Contexto</label>
                        <textarea 
                            className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg p-4 text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[150px]" 
                            value={draft.introduction}
                            onChange={(e) => handleChange('introduction', e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">2. Objetivos del Proyecto</label>
                        <textarea 
                            className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg p-4 text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[150px]" 
                            value={draft.objectives}
                            onChange={(e) => handleChange('objectives', e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">3. Metodología</label>
                        <textarea 
                            className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg p-4 text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[200px]" 
                            value={draft.methodology}
                            onChange={(e) => handleChange('methodology', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">4. Recursos</label>
                            <textarea 
                                className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg p-4 text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[150px]" 
                                value={draft.resources}
                                onChange={(e) => handleChange('resources', e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">5. Evaluación y Calidad</label>
                            <textarea 
                                className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-lg p-4 text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y min-h-[150px]" 
                                value={draft.evaluation}
                                onChange={(e) => handleChange('evaluation', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center transition-colors">
            <div className="text-sm text-gray-500 dark:text-gray-400 italic hidden md:block">
                * Revise el contenido antes de generar el documento final.
            </div>
            <div className="flex gap-3 ml-auto">
                <button onClick={onClose} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button 
                    onClick={() => generateProjectPDF(tender, draft)}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-100"
                >
                    <Download size={18} />
                    Descargar PDF
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};