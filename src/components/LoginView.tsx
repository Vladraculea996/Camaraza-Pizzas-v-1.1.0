import { useState, useEffect, FormEvent } from 'react';
import { dbService } from '../db';
import { UsuarioAcceso, Configuracion } from '../types';
import { hashString } from '../lib/crypto';
import { Lock, User, Check, AlertCircle, Pizza } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: { nombre: string; rol: 'ceo' | 'staff' | 'vip' }) => void;
  onGoBack: () => void;
}

export default function LoginView({ onLoginSuccess, onGoBack }: LoginViewProps) {
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [username, setUsername] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if there are any CEOs registered in Firestore
    const checkCeoExists = async () => {
      try {
        const users = await dbService.getItems<UsuarioAcceso>('usuarios_acceso');
        const hasCeo = users.some(u => u.rol === 'ceo' && u.activo);
        setIsInitialSetup(!hasCeo);
      } catch (err) {
        console.error('Error checking CEO existence: ', err);
        // Fallback to initial setup if error to let the user create the first account
        setIsInitialSetup(true);
      } finally {
        setLoading(false);
      }
    };
    checkCeoExists();
  }, []);

  const handleInitialSetup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !accessCode.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (accessCode !== confirmCode) {
      setError('Los códigos de acceso no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Hash code
      const codeHash = await hashString(accessCode);

      // Create CEO user
      const ceoId = Math.random().toString(36).substring(2, 15);
      await dbService.setItem<UsuarioAcceso>('usuarios_acceso', ceoId, {
        nombre: username.trim(),
        código_acceso_cifrado: codeHash,
        rol: 'ceo',
        activo: true
      });

      // Initialize default configurations if not exists
      const configs = await dbService.getItems<Configuracion>('configuracion');
      if (configs.length === 0) {
        await dbService.setItem<Configuracion>('configuracion', 'global', {
          id: 'global',
          tasa_cambio_cup_usd: 350,
          horarios_apertura: {
            lunes_jueves: { open: '9:00 AM', close: '5:00 PM' },
            viernes_domingo: { open: '2:00 PM', close: '9:00 PM' }
          }
        });
      }

      // Success
      onLoginSuccess({
        nombre: username.trim(),
        rol: 'ceo'
      });
    } catch (err) {
      setError('Error al registrar el CEO. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !accessCode.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const users = await dbService.getItems<UsuarioAcceso>('usuarios_acceso');
      const inputHash = await hashString(accessCode);

      // Look for matching user (case insensitive username)
      const matchedUser = users.find(u => 
        u.nombre.toLowerCase() === username.trim().toLowerCase() && 
        u.código_acceso_cifrado === inputHash && 
        u.activo
      );

      if (matchedUser) {
        onLoginSuccess({
          nombre: matchedUser.nombre,
          rol: matchedUser.rol
        });
      } else {
        setError('Nombre de usuario o código de acceso incorrectos, o usuario inactivo.');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div id="login-loading" className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Pizza className="w-12 h-12 text-orange-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Verificando configuración de seguridad...</p>
      </div>
    );
  }

  return (
    <div id="login-view" className="flex flex-col justify-center min-h-screen bg-slate-50 py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Display PWA Icon */}
        <img 
          src="/icon-192.png" 
          alt="Camaraza Pizzas Logo" 
          className="mx-auto h-24 w-24 rounded-full shadow-md object-cover border border-orange-100 mb-4"
          referrerPolicy="no-referrer"
        />
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Camaraza Pizzas
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {isInitialSetup ? 'Configuración Inicial del CEO' : 'Acceso para Staff / VIP / CEO'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-xs rounded-r-lg flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isInitialSetup ? (
            /* CEO Register View */
            <form onSubmit={handleInitialSetup} className="space-y-4">
              <div className="bg-orange-50 border border-orange-100 text-orange-800 text-xs rounded-xl p-3 mb-4">
                ⚠️ <strong>No se detectó ningún CEO registrado.</strong> Registra la cuenta maestra del CEO. Esta pantalla no volverá a aparecer. El código de acceso se guardará cifrado de forma segura.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del CEO
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej. Carlos Camaraza"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Acceso Maestro
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Elige un código seguro"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmar Código Maestro
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="Repite el código"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
              >
                {isSubmitting ? 'Registrando...' : 'Establecer CEO e Iniciar Sesión'}
              </button>
            </form>
          ) : (
            /* Normal Login View */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu nombre de usuario"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Acceso
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Ingresa tu código"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
              >
                {isSubmitting ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={onGoBack}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Volver a la Carta (Clientes)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
