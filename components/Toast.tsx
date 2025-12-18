import React, { useEffect } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white'
  };

  const icons = {
    success: <Check size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl ${styles[type]} transform transition-all duration-300 ease-in-out hover:scale-105`}>
      {icons[type]}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};