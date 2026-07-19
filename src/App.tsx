import { useState, useEffect } from 'react';
import { dbService, isRealFirebase } from './db';
import { Configuracion } from './types';
import ClientView from './components/ClientView';
import KitchenView from './components/KitchenView';
import AdminView from './components/AdminView';
import LoginView from './components/LoginView';
import InstallPrompt from './components/InstallPrompt';
import { 
  Pizza, 
  ChefHat, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Lock,
  Globe
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'client' | 'kitchen' | 'admin' | 'login'>('client');
  const [currentUser, setCurrentUser] = useState<{ nombre: string; rol: 'ceo' | 'staff' | 'vip' } | null>(null);
  
  // App-wide configuration
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(350); // Default fallback rate

  // Mobile menu open
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync configuration in real time
  useEffect(() => {
    const unsub = dbService.onCollectionSnapshot<Configuracion>('configuracion', (data) => {
      const globalConfig = data.find(c => c.id === 'global');
      if (globalConfig) {
        setConfig(globalConfig);
        setExchangeRate(globalConfig.tasa_cambio_cup_usd || 350);
      } else {
        // Initialize default if database is empty (no seeding required, just default)
        const defaultConfig: Configuracion = {
          id: 'global',
          tasa_cambio_cup_usd: 350,
          horarios_apertura: {
            lunes_jueves: { open: '9:00 AM', close: '5:00 PM' },
            viernes_domingo: { open: '2:00 PM', close: '9:00 PM' }
          }
        };
        dbService.setItem('configuracion', 'global', defaultConfig);
        setConfig(defaultConfig);
        setExchangeRate(350);
      }
    });

    return unsub;
  }, []);

  const handleLoginSuccess = (user: { nombre: string; rol: 'ceo' | 'staff' | 'vip' }) => {
    setCurrentUser(user);
    
    // Redirect based on role
    if (user.rol === 'ceo') {
      setCurrentView('admin');
    } else if (user.rol === 'staff') {
      setCurrentView('kitchen');
    } else {
      // VIP users are clients, but logged in
      setCurrentView('client');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('client');
  };

  // Safe view checks
  const canAccessKitchen = currentUser && (currentUser.rol === 'ceo' || currentUser.rol === 'staff');
  const canAccessAdmin = currentUser && (currentUser.rol === 'ceo' || currentUser.rol === 'staff');

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* PWA INSTALL BANNER */}
      <InstallPrompt />

      {/* DESKTOP SIDEBAR (Clean Minimalism) */}
      <nav className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0 justify-between">
        <div className="p-6">
          {/* Brand block */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-sm font-bold text-sm">
              CP
            </div>
            <div>
              <h1 className="text-base font-bold leading-none tracking-tight text-slate-900">Camaraza</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">EST. 2026</span>
            </div>
          </div>
          
          {/* Navigation Links */}
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setCurrentView('client')}
                className={`w-full flex items-center px-4 py-3 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                  currentView === 'client'
                    ? 'bg-slate-100 text-orange-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Pizza className="w-4 h-4 mr-3" />
                Menú Digital
              </button>
            </li>

            {canAccessKitchen && (
              <li>
                <button
                  onClick={() => setCurrentView('kitchen')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                    currentView === 'kitchen'
                      ? 'bg-slate-100 text-orange-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <ChefHat className="w-4 h-4 mr-3" />
                  Cocina en Vivo
                </button>
              </li>
            )}

            {canAccessAdmin && (
              <li>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-slate-100 text-orange-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Administración
                </button>
              </li>
            )}

            {!currentUser && (
              <li>
                <button
                  onClick={() => setCurrentView('login')}
                  className={`w-full flex items-center px-4 py-3 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                    currentView === 'login'
                      ? 'bg-slate-100 text-orange-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-4 h-4 mr-3" />
                  Acceso Personal
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Sidebar Footer block */}
        <div className="p-6 border-t border-slate-100 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tasa de Cambio</span>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-slate-600">1 USD =</span>
              <span className="text-base font-extrabold text-slate-900">
                {exchangeRate} <span className="text-[10px] font-normal text-slate-500">CUP</span>
              </span>
            </div>
          </div>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </nav>

      {/* MOBILE TOP NAVIGATION BAR */}
      <nav className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm flex flex-col shrink-0">
        <div className="px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => setCurrentView('client')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs">CP</div>
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">Camaraza</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 text-[10px] font-mono text-slate-600 px-2.5 py-1 rounded-lg">
              $1 = {exchangeRate} CUP
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 pt-2 pb-4 space-y-2 shadow-inner">
            <button
              onClick={() => { setCurrentView('client'); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-700"
            >
              <Pizza className="w-4 h-4 text-slate-400" />
              Menú Digital
            </button>

            {canAccessKitchen && (
              <button
                onClick={() => { setCurrentView('kitchen'); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-700"
              >
                <ChefHat className="w-4 h-4 text-slate-400" />
                Cocina en Vivo
              </button>
            )}

            {canAccessAdmin && (
              <button
                onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-700"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Administración
              </button>
            )}

            {currentUser ? (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-4">
                <div>
                  <span className="block text-xs font-bold text-slate-800 leading-tight">{currentUser.nombre}</span>
                  <span className="block text-[10px] text-slate-400 capitalize">{currentUser.rol}</span>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setCurrentView('login'); setMobileMenuOpen(false); }}
                className="w-full mt-2 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Acceso Personal
              </button>
            )}
          </div>
        )}
      </nav>

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* DESKTOP TOP BAR */}
        <header className="hidden md:flex h-20 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            {isRealFirebase ? (
              <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Servicio Activo</span>
              </div>
            ) : (
              <div className="flex items-center bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Base de Datos Desconectada</span>
              </div>
            )}
            <span className="text-slate-300 font-light">|</span>
            <span className="text-xs text-slate-500 font-medium">Conexión Segura Real-Time</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{currentUser ? currentUser.nombre : 'Invitado'}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser ? currentUser.rol : 'Cliente'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 shadow-sm flex items-center justify-center font-bold text-slate-600 text-sm">
              {currentUser ? currentUser.nombre[0].toUpperCase() : 'C'}
            </div>
          </div>
        </header>

        {/* COMPONENT COMPARTMENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {!isRealFirebase && (
            <div className="bg-red-50 border-b border-red-250 p-6 text-center animate-scaleUp">
              <div className="max-w-2xl mx-auto flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl">⚠️</div>
                <h2 className="text-base font-extrabold text-red-950">Persistencia Desactivada (Sin Conexión a Base de Datos)</h2>
                <p className="text-xs text-red-700 leading-relaxed">
                  Firestore no está configurado o no se pudo inicializar. Se han eliminado todos los motores de persistencia local o simulada para garantizar la integridad de los datos. Por favor, asegúrese de agregar las credenciales correctas en su configuración o en las variables de entorno.
                </p>
                <div className="bg-white/60 p-3 rounded-xl border border-red-100 font-mono text-[10px] text-red-800 text-left w-full">
                  <strong>Estado:</strong> Sin credenciales válidas en <code className="bg-red-50 px-1 py-0.5 rounded">firebase-applet-config.json</code> ni en variables de entorno.
                </div>
              </div>
            </div>
          )}

          {currentView === 'client' && (
            <ClientView 
              rate={exchangeRate} 
              config={config} 
              onGoToLogin={() => setCurrentView('login')} 
            />
          )}

          {currentView === 'kitchen' && canAccessKitchen && (
            <KitchenView rate={exchangeRate} />
          )}

          {currentView === 'admin' && canAccessAdmin && (
            <AdminView 
              rate={exchangeRate} 
              config={config} 
              onUpdateRate={(newRate) => setExchangeRate(newRate)}
              onUpdateConfig={(newConfig) => setConfig(newConfig)}
              currentUser={currentUser!}
            />
          )}

          {currentView === 'login' && (
            <LoginView 
              onLoginSuccess={handleLoginSuccess} 
              onGoBack={() => setCurrentView('client')} 
            />
          )}
        </div>

        {/* STATUS FOOTER BAR */}
        <footer className="h-12 bg-slate-900 text-white/70 px-6 md:px-8 flex items-center justify-between text-[10px] font-mono shrink-0">
          <div className="flex space-x-4 md:space-x-6">
            <span className="flex items-center">
              <div className={`w-1.5 h-1.5 rounded-full ${isRealFirebase ? 'bg-blue-400' : 'bg-red-500 animate-pulse'} mr-2`}></div> 
              Cloud Firestore: {isRealFirebase ? 'Conectado' : 'Error de Configuración'}
            </span>
            <span className="hidden sm:flex items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2"></div> 
              Auth: {currentUser ? currentUser.nombre : 'Público'}
            </span>
          </div>
          <div className="flex space-x-4 uppercase tracking-wider text-[9px] font-bold">
            <span>PWA: Instalable</span>
            <span className="hidden md:inline">Camaraza Pizzas © 2026</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
