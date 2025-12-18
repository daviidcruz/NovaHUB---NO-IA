import React, { useEffect, useState } from 'react';
import { fetchTenders } from '../services/tenderService';
import { Tender } from '../types';
import { TenderCard } from './TenderCard';
import { Search, Loader2, ChevronLeft, ChevronRight, Filter, Layers, Database, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  favorites: Set<string>;
  toggleFavorite: (tender: Tender) => void;
  keywords: string[];
}

type SortOption = 'newest' | 'oldest' | 'highest_budget' | 'lowest_budget';
type SourceFilter = 'all' | 'Perfiles Contratante' | 'Plataformas Agregadas' | 'Contratos Menores';

export const Dashboard: React.FC<DashboardProps> = ({ favorites, toggleFavorite, keywords }) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('newest');
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(true); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [lastViewedDate, setLastViewedDate] = useState<string>(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem('novaHubLastViewedDate') || new Date(0).toISOString();
      }
      return new Date(0).toISOString();
  });

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchTenders(keywords);
      setTenders(data);

      if (data.length > 0) {
          const newestFound = data[0].updated;
          const currentSaved = localStorage.getItem('novaHubLastViewedDate') || new Date(0).toISOString();
          if (new Date(newestFound) > new Date(currentSaved)) {
              localStorage.setItem('novaHubLastViewedDate', newestFound);
          }
      }
    } catch (e) {
      console.error("Failed to load tenders", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [keywords.length]);

  const handleRefresh = async () => {
    if (tenders.length > 0) {
        setLastViewedDate(tenders[0].updated); 
    }
    await loadData(true);
  };

  const parseAmount = (amountStr?: string): number => {
    if (!amountStr) return 0;
    const clean = amountStr.replace(/[^0-9,]/g, '');
    return parseFloat(clean.replace(',', '.')) || 0;
  };

  const filteredTenders = tenders.filter(t => {
    if (showOnlyRelevant && t.keywordsFound.length === 0) return false;
    if (selectedSource !== 'all' && t.sourceType !== selectedSource) return false;
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.keywordsFound.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const sortedTenders = [...filteredTenders].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':
        return new Date(a.updated).getTime() - new Date(b.updated).getTime();
      case 'highest_budget':
        return parseAmount(b.amount) - parseAmount(a.amount);
      case 'lowest_budget':
        return parseAmount(a.amount) - parseAmount(b.amount);
      case 'newest':
      default:
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    }
  });

  const totalPages = Math.ceil(sortedTenders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTenders = sortedTenders.slice(startIndex, startIndex + itemsPerPage);

  const isNewTender = (tenderDate: string) => {
      return new Date(tenderDate).getTime() > new Date(lastViewedDate).getTime();
  };

  const unreadCount = tenders.filter(t => isNewTender(t.updated)).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder, showOnlyRelevant, selectedSource]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Panel de Licitaciones</h2>
            <p className="text-gray-600 dark:text-gray-400">Consulta en tiempo real las ofertas públicas oficiales.</p>
        </div>
        
        <div className="flex items-center gap-4">
            {unreadCount > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline-block">
                        Nuevas hoy
                    </span>
                    <span className="flex items-center justify-center bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] h-6 shadow-md">
                        {unreadCount}
                    </span>
                </div>
            )}

            <button 
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 font-medium text-sm"
            >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
            <div className="w-full bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex items-center space-x-3">
            <Search className="text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar por título, organismo..." 
                className="flex-1 bg-transparent text-gray-900 dark:text-white outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
             <button
                onClick={() => setShowOnlyRelevant(!showOnlyRelevant)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                    !showOnlyRelevant 
                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' 
                        : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:border-slate-700'
                }`}
             >
                <Layers size={16} />
                <span>Todas las licitaciones</span>
             </button>

             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto xl:justify-end">
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline-block">{sortedTenders.length} resultados</span>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition-colors w-full sm:w-auto">
                        <Database size={14} className="text-gray-400" />
                        <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value as SourceFilter)}
                            className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer outline-none text-sm"
                        >
                            <option value="all">Orígenes</option>
                            <option value="Perfiles Contratante">Perfiles</option>
                            <option value="Plataformas Agregadas">Agregadas</option>
                            <option value="Contratos Menores">Menores</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition-colors w-full sm:w-auto">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as SortOption)}
                            className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer outline-none text-sm"
                        >
                            <option value="newest">Recientes</option>
                            <option value="oldest">Antiguas</option>
                            <option value="highest_budget">Presupuesto +</option>
                            <option value="lowest_budget">Presupuesto -</option>
                        </select>
                    </div>
                </div>
             </div>
          </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-gray-500 dark:text-gray-400">Accediendo a la Plataforma de Contratación...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {currentTenders.map((tender, index) => {
                const isOld = !isNewTender(tender.updated);
                const prevWasNew = index > 0 ? isNewTender(currentTenders[index-1].updated) : false;
                const showDivider = (index > 0 && prevWasNew && isOld);

                return (
                    <React.Fragment key={tender.id}>
                        {showDivider && (
                            <div className="flex items-center gap-4 py-4">
                                <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></div>
                                <div className="px-4 py-1 bg-gray-50 dark:bg-slate-900 text-gray-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 size={12} />
                                    Anteriores
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-slate-800 flex-1"></div>
                            </div>
                        )}
                        
                        <div className="relative">
                            {isNewTender(tender.updated) && (
                                <div className="absolute -left-2 top-6 w-1 h-12 bg-blue-500 rounded-r-lg shadow-sm"></div>
                            )}
                            <TenderCard 
                                tender={tender} 
                                isFavorite={favorites.has(tender.id)}
                                onToggleFavorite={() => toggleFavorite(tender)}
                            />
                        </div>
                    </React.Fragment>
                );
            })}
            
            {currentTenders.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sin resultados</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    No se han encontrado licitaciones que coincidan con tus filtros.
                </p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-6 border-t border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};