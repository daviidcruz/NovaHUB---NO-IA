import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FavoritesView } from './components/FavoritesView';
import { Tender } from './types';
import { DEFAULT_KEYWORDS } from './constants';

type View = 'dashboard' | 'favorites';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  const [favorites, setFavorites] = useState<Tender[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('novaHubFavorites');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                return []; 
            }
            return parsed;
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const favoriteIds = useMemo(() => new Set(favorites.map(t => t.id)), [favorites]);

  // Force light mode on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
        localStorage.removeItem('novaHubThemeMode');
    }
  }, []);

  const [customKeywords, setCustomKeywords] = useState<string[]>(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('novaHubKeywords');
          if (saved) return JSON.parse(saved);
      }
      return DEFAULT_KEYWORDS;
  });

  const addKeyword = (keyword: string) => {
      const trimmed = keyword.trim();
      if (trimmed && !customKeywords.includes(trimmed)) {
          setCustomKeywords(prev => [...prev, trimmed]);
      }
  };

  const removeKeyword = (keyword: string) => {
      setCustomKeywords(prev => prev.filter(k => k !== keyword));
  };

  const resetKeywords = () => {
      setCustomKeywords(DEFAULT_KEYWORDS);
  };

  useEffect(() => {
    localStorage.setItem('novaHubFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (tender: Tender) => {
    setFavorites(prev => {
      const exists = prev.some(t => t.id === tender.id);
      if (exists) {
        return prev.filter(t => t.id !== tender.id);
      } else {
        return [...prev, tender];
      }
    });
  };

  return (
    <Layout 
        currentView={currentView} 
        onViewChange={setCurrentView}
        keywords={customKeywords}
        onAddKeyword={addKeyword}
        onRemoveKeyword={removeKeyword}
        onResetKeywords={resetKeywords}
    >
      {currentView === 'dashboard' && (
        <Dashboard 
          favorites={favoriteIds} 
          toggleFavorite={toggleFavorite} 
          keywords={customKeywords}
        />
      )}
      {currentView === 'favorites' && (
        <FavoritesView 
          favorites={favorites} 
          toggleFavorite={toggleFavorite} 
        />
      )}
    </Layout>
  );
};

export default App;