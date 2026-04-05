import { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight, Settings, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigStatus {
  supabaseConfigured: boolean;
  geminiConfigured: boolean;
}

export default function ConfigStatusBanner() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/config-status');
        const contentType = response.headers.get('content-type');
        
        if (response.ok && contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStatus(data);
        } else {
          const text = await response.text();
          console.error('Failed to fetch config status. Expected JSON but got:', contentType, text.substring(0, 100));
        }
      } catch (error) {
        console.error('Failed to fetch config status:', error);
      }
    };

    fetchStatus();
    // Poll every 10 seconds to detect changes
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!status || (status.supabaseConfigured && status.geminiConfigured)) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-orange-50 border-b border-orange-100 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-sm font-medium text-orange-800">
                  <span className="hidden md:inline">
                    偵測到尚未完成的系統設定：
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1 md:mt-0 md:inline-flex md:ml-2">
                    {!status.supabaseConfigured && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
                        Supabase
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <span className="font-bold">設定教學：</span>
                  <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-orange-200">
                    <Settings className="w-3.5 h-3.5" />
                    <span>點擊左下角「設定」</span>
                    <ChevronRight className="w-3 h-3" />
                    <Key className="w-3.5 h-3.5" />
                    <span>選擇「Secrets」</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-orange-400 hover:text-orange-600 text-xs font-medium"
                >
                  暫時隱藏
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
