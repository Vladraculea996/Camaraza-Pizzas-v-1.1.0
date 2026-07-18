import { useState, useEffect } from 'react';
import { Download, Sparkles } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  if (!showInstallBtn) return null;

  return (
    <div id="pwa-install-banner" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-white border border-orange-200 shadow-xl rounded-2xl p-4 flex items-center justify-between gap-4 z-50 animate-bounce md:animate-none">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-sm">Instalar Aplicación</h4>
          <p className="text-xs text-slate-500">Accede más rápido desde tu pantalla de inicio.</p>
        </div>
      </div>
      <button
        onClick={handleInstallClick}
        className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Instalar
      </button>
    </div>
  );
}
