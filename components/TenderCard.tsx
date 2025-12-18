import React from 'react';
import { Tender } from '../types';
import { Calendar, Bookmark, Building2, Euro, ExternalLink, Activity } from 'lucide-react';

interface TenderCardProps {
  tender: Tender;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({ tender, isFavorite, onToggleFavorite }) => {
  const hasLink = tender.link && tender.link !== '#' && tender.link.trim() !== '';

  const getStatusStyles = (status?: string) => {
      if (!status) return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400';
      const s = status.toLowerCase();
      if (s.includes('publicada') || s.includes('anuncio previo') || s.includes('creada')) {
          return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300';
      }
      if (s.includes('formalizada') || s.includes('resuelta')) {
          return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
      }
      if (s.includes('anulada') || s.includes('desierto')) {
          return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300';
      }
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
                {tender.status && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-bold border flex items-center gap-1 uppercase tracking-wider ${getStatusStyles(tender.status)}`}>
                        <Activity size={10} />
                        {tender.status}
                    </span>
                )}
                
                {tender.sourceType && (
                     <span className={`px-2 py-0.5 text-xs rounded-full font-medium border ${
                         tender.sourceType === 'Contratos Menores' 
                            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300'
                     }`}>
                        {tender.sourceType}
                    </span>
                )}
                {tender.contractType && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 text-xs rounded-full border border-gray-200 dark:border-slate-700">
                        {tender.contractType}
                    </span>
                )}
                {tender.keywordsFound.map(k => (
                    <span key={k} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs rounded-full font-medium">
                        {k}
                    </span>
                ))}
            </div>
          
            {tender.organism && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    <Building2 size={14} />
                    <span className="uppercase tracking-tight truncate">{tender.organism}</span>
                </div>
            )}

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                {tender.title}
            </h3>

            <div className="mb-4">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
                    {tender.summary}
                </p>
            </div>
          
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4 border-t dark:border-slate-800 pt-3">
                <span className="flex items-center gap-1.5">
                    <Calendar size={15} />
                    {new Date(tender.updated).toLocaleDateString()}
                </span>
                
                {tender.amount && (
                    <span className="flex items-center gap-1.5 font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md">
                        <Euro size={15} />
                        {tender.amount}
                    </span>
                )}
            </div>

            {hasLink && (
                <a 
                    href={tender.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                >
                    <ExternalLink size={16} />
                    Ver en Plataforma
                </a>
            )}
        </div>
        
        <div className="flex-shrink-0">
            <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-300 dark:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
            >
                <Bookmark fill={isFavorite ? "currentColor" : "none"} size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};