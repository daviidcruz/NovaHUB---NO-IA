import React, { useEffect, useState } from 'react';
import { fetchTenders } from '../services/tenderService';
import { Tender } from '../types';
import { TenderCard } from './TenderCard';
import { Search, Loader2, ChevronLeft, ChevronRight, Filter, Layers, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  favorites: Set<string>;
  toggleFavorite: (tender: Tender) => void;
  keywords: string[];
}

type SortOption = 'newest' | 'oldest' | 'highest_budget' | 'lowest_budget';

export const Dashboard: React.FC<DashboardProps> = ({ favorites, toggleFavorite, keywords }) => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOption>('newest');
  
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(false); // Por defecto mostrar todas para ver que funciona
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

  // Cargar datos al montar y cuando cambian las keywords
  useEffect(() => {
    loadData();
  }, [keywords]);

  const handleRefresh = async () => {
    if (tenders.length > 0) {
        setLastViewedDate(tenders[0].updated); 
    }
    await loadData(true);
  };

  const parseAmount = (amountStr?: string): number => {
    if (!amountStr || amountStr === 'Consultar') return 0;
    const clean = amountStr.replace(/[^0-9,]/g, '');
    return parseFloat(clean.replace(',', '.')) || 0;
  };

  const filteredTenders = tenders.filter(t => {
    // Relevancia por palabras clave
    if (showOnlyRelevant && t.keywordsFound.length === 0) return false;
    
    // Búsqueda textual
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.organism && t.organism.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
  }, [searchTerm, sortOrder, showOnlyRelevant]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Panel de Licitaciones</h2>
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Conectado a Plataforma de Contratación (PLACSP)</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            {unreadCount > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 hidden sm:inline-block">
                        Nuevas
                    </span>
                    <span className="flex items-center justify-center bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] h-6 shadow-md">
                        {unreadCount}
                    </span>
                </div>
            )}

            <button 
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 font-medium text-sm border border-blue-100 dark:border-blue-900"
            >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Actualizando...' : 'Refrescar Feed'}
            </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
            <div className="w-full bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex items-center space-x-3 focus-within:ring-2 ring-blue-500/20 transition-all">
            <Search className="text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Filtrar por título, expediente, organismo..." 
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
                    showOnlyRelevant 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 dark:bg-slate-900 dark:text-gray-300 dark:border-slate-700 hover:bg-gray-50'
                }`}
             >
                <Layers size={16} />
                <span>{showOnlyRelevant ? 'Mostrando solo relevantes' : 'Mostrar todas'}</span>
             </button>

             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto xl:justify-end">
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline-block">
                    {sortedTenders.length} licitaciones encontradas
                </span>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Ordenar */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm transition-colors min-w-[140px]">
                        <Filter size={14} className="text-gray-400" />
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as SortOption)}
                            className="bg-transparent border-none text-gray-700 dark:text-gray-200 font-medium focus:ring-0 cursor-pointer outline-none text-sm w-full"
                        >
                            <option value="newest">Más recientes</option>
                            <option value="oldest">Más antiguas</option>
                            <option value="highest_budget">Mayor importe</option>
                            <option value="lowest_budget">Menor importe</option>
                        </select>
                    </div>
                </div>
             </div>
          </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-gray-900 dark:text-white font-medium">Obteniendo datos oficiales...</p>
          <p className="text-sm text-gray-500 mt-2">Conectando con contrataciondelestado.es</p>
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
                            <div className="flex items-center gap-4 py-4 opacity-75">
                                <div className="h-px bg-gray-300 dark:bg-slate-700 flex-1"></div>
                                <div className="px-3 py-1 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 size={12} />
                                    Leídas anteriormente
                                </div>
                                <div className="h-px bg-gray-300 dark:bg-slate-700 flex-1"></div>
                            </div>
                        )}
                        
                        <div className="relative group">
                            {isNewTender(tender.updated) && (
                                <div className="absolute -left-2 top-6 w-1 h-12 bg-blue-600 rounded-r-lg shadow-[0_0_10px_rgba(37,99,235,0.5)] z-10"></div>
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
                <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                    No se han encontrado licitaciones en este momento. Intenta cambiar los filtros o desactivar "Solo relevantes".
                </p>
                {showOnlyRelevant && (
                    <button 
                        onClick={() => setShowOnlyRelevant(false)}
                        className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm underline"
                    >
                        Ver todas las licitaciones
                    </button>
                )}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-6 border-t border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
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