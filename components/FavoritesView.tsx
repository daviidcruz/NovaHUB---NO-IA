import React from 'react';
import { Tender } from '../types';
import { TenderCard } from './TenderCard';

interface FavoritesViewProps {
  favorites: Tender[];
  toggleFavorite: (tender: Tender) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ favorites, toggleFavorite }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Licitaciones Guardadas</h2>
      <div className="space-y-4">
        {favorites.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-800">
             <p className="text-gray-500 dark:text-gray-400">No has guardado ninguna licitación todavía.</p>
          </div>
        ) : (
          favorites.map(tender => (
            <TenderCard 
              key={tender.id} 
              tender={tender} 
              isFavorite={true}
              onToggleFavorite={() => toggleFavorite(tender)}
            />
          ))
        )}
      </div>
    </div>
  );
};