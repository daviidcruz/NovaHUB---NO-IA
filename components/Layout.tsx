import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, Bookmark, Settings, Tag, Plus, RotateCcw } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'favorites';
  onViewChange: (view: 'dashboard' | 'favorites') => void;
  keywords: string[];
  onAddKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
  onResetKeywords: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    currentView, 
    onViewChange,
    keywords,
    onAddKeyword,
    onRemoveKeyword,
    onResetKeywords
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const handleAddKeyword = () => {
      if (newKeyword.trim()) {
          onAddKeyword(newKeyword);
          setNewKeyword('');
      }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: 'dashboard' | 'favorites', icon: any, label: string }) => (
    <button
      onClick={() => {
        onViewChange(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row transition-colors duration-200">
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-20 transition-colors">
        <div className="flex items-center gap-2">
            <img src="https://novagob.org/wp-content/uploads/2025/12/favicon-NovaHUB.png" alt="NovaHUB Logo" className="w-8 h-8 object-contain" />
            <div className="font-bold text-xl text-blue-800">NovaHUB</div>
        </div>
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-700"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b hidden md:block">
          <div className="flex items-center gap-3">
            <img src="https://novagob.org/wp-content/uploads/2025/12/logoNovaHUB-scaled.png" alt="NovaHUB Logo" className="w-full h-auto object-contain max-h-12" />
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Licitaciones" />
          <NavItem view="favorites" icon={Bookmark} label="Favoritos" />
        </nav>

        <div className="absolute bottom-0 w-full border-t bg-gray-50 p-4">
             {isSettingsOpen && (
                <div className="absolute bottom-full left-0 w-full px-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-3">
                         <button 
                            onClick={() => {
                                setIsKeywordsModalOpen(true);
                                setIsSettingsOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
                        >
                            <div className="flex items-center gap-3">
                                <Tag size={18} />
                                <span>Palabras Clave</span>
                            </div>
                        </button>
                    </div>
                </div>
             )}

             <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isSettingsOpen
                    ? 'bg-gray-200 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
             >
                <Settings size={20} />
                <span className="font-medium">Ajustes</span>
             </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen relative">
        {children}
      </main>

      {isKeywordsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Tag size={20} />
                        Gestión de Palabras Clave
                    </h3>
                    <button onClick={() => setIsKeywordsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-500 mb-4">
                        Define las palabras clave para filtrar automáticamente las licitaciones.
                    </p>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                            placeholder="Añadir palabra..."
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                        <button 
                            onClick={handleAddKeyword}
                            disabled={!newKeyword.trim()}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 bg-white border border-gray-200 rounded-lg">
                        {keywords.length === 0 ? (
                            <span className="text-sm text-gray-400 italic p-2">No hay filtros configurados.</span>
                        ) : (
                            keywords.map(k => (
                                <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                                    {k}
                                    <button 
                                        onClick={() => onRemoveKeyword(k)}
                                        className="hover:text-blue-900 ml-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-white flex justify-between">
                    <button 
                        onClick={onResetKeywords}
                        className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
                    >
                        <RotateCcw size={14} /> Restaurar por defecto
                    </button>
                    <button 
                        onClick={() => setIsKeywordsModalOpen(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};