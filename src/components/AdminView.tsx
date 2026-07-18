import { useState, useEffect, FormEvent } from 'react';
import { dbService } from '../db';
import { Producto, Cupon, UsuarioAcceso, Configuracion } from '../types';
import { hashString } from '../lib/crypto';
import { formatCUP, formatUSD } from '../utils';
import { 
  Pizza, 
  Ticket, 
  Users, 
  Sliders, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Clock, 
  DollarSign, 
  X, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  Save,
  Lock,
  UserCheck
} from 'lucide-react';

interface AdminViewProps {
  rate: number;
  config: Configuracion | null;
  onUpdateRate: (newRate: number) => void;
  onUpdateConfig: (newConfig: Configuracion) => void;
  currentUser: { nombre: string; rol: 'ceo' | 'staff' | 'vip' };
}

export default function AdminView({ rate, config, onUpdateRate, onUpdateConfig, currentUser }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'productos' | 'cupones' | 'usuarios' | 'configuracion'>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAcceso[]>([]);

  // Form states for Products
  const [showProductForm, setShowProductForm] = useState(false);
  const [prodId, setProdId] = useState('');
  const [prodNombre, setProdNombre] = useState('');
  const [prodPrecioFam, setProdPrecioFam] = useState<number>(0);
  const [prodPrecioXXL, setProdPrecioXXL] = useState<number>(0);
  const [prodDispo, setProdDispo] = useState(true);

  // Form states for Coupons
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [cupId, setCupId] = useState('');
  const [cupCodigo, setCupCodigo] = useState('');
  const [cupDescuento, setCupDescuento] = useState<number>(0);
  const [cupVigente, setCupVigente] = useState(true);

  // Form states for Access Codes (Staff & VIP)
  const [showUserForm, setShowUserForm] = useState(false);
  const [userNombre, setUserNombre] = useState('');
  const [userRol, setUserRol] = useState<'staff' | 'vip'>('staff');
  const [generatedCode, setGeneratedCode] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Form states for Configuration
  const [tasaCambio, setTasaCambio] = useState<number>(rate);
  const [lunJueOpen, setLunJueOpen] = useState('9:00 AM');
  const [lunJueClose, setLunJueClose] = useState('5:00 PM');
  const [vieDomOpen, setVieDomOpen] = useState('2:00 PM');
  const [vieDomClose, setVieDomClose] = useState('9:00 PM');
  const [savingConfig, setSavingConfig] = useState(false);

  // Sync databases in real time
  useEffect(() => {
    const unsubProducts = dbService.onCollectionSnapshot<Producto>('productos', setProductos);
    const unsubCoupons = dbService.onCollectionSnapshot<Cupon>('cupones', setCupones);
    const unsubUsers = dbService.onCollectionSnapshot<UsuarioAcceso>('usuarios_acceso', setUsuarios);

    return () => {
      unsubProducts();
      unsubCoupons();
      unsubUsers();
    };
  }, []);

  // Update config state when config loads
  useEffect(() => {
    if (config) {
      setTasaCambio(config.tasa_cambio_cup_usd || rate);
      if (config.horarios_apertura) {
        setLunJueOpen(config.horarios_apertura.lunes_jueves?.open || '9:00 AM');
        setLunJueClose(config.horarios_apertura.lunes_jueves?.close || '5:00 PM');
        setVieDomOpen(config.horarios_apertura.viernes_domingo?.open || '2:00 PM');
        setVieDomClose(config.horarios_apertura.viernes_domingo?.close || '9:00 PM');
      }
    }
  }, [config]);

  // Product CRUD
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim() || prodPrecioFam <= 0 || prodPrecioXXL <= 0) return;

    try {
      const payload: Producto = {
        nombre: prodNombre.trim(),
        precio_familiar_cup: prodPrecioFam,
        precio_xxl_cup: prodPrecioXXL,
        disponibilidad: prodDispo
      };

      if (prodId) {
        await dbService.updateItem('productos', prodId, payload);
      } else {
        const newId = Math.random().toString(36).substring(2, 15);
        await dbService.setItem('productos', newId, { id: newId, ...payload });
      }

      resetProductForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el producto.');
    }
  };

  const editProduct = (p: Producto) => {
    setProdId(p.id || '');
    setProdNombre(p.nombre);
    setProdPrecioFam(p.precio_familiar_cup);
    setProdPrecioXXL(p.precio_xxl_cup);
    setProdDispo(p.disponibilidad);
    setShowProductForm(true);
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await dbService.deleteItem('productos', id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleProductDispo = async (p: Producto) => {
    try {
      await dbService.updateItem('productos', p.id!, { disponibilidad: !p.disponibilidad });
    } catch (err) {
      console.error(err);
    }
  };

  const resetProductForm = () => {
    setProdId('');
    setProdNombre('');
    setProdPrecioFam(0);
    setProdPrecioXXL(0);
    setProdDispo(true);
    setShowProductForm(false);
  };

  // Coupon CRUD
  const handleSaveCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!cupCodigo.trim() || cupDescuento <= 0 || cupDescuento > 100) return;

    try {
      const payload: Cupon = {
        código: cupCodigo.trim().toUpperCase(),
        descuento: cupDescuento,
        vigencia: cupVigente
      };

      if (cupId) {
        await dbService.updateItem('cupones', cupId, payload);
      } else {
        const newId = Math.random().toString(36).substring(2, 15);
        await dbService.setItem('cupones', newId, { id: newId, ...payload });
      }

      resetCouponForm();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el cupón.');
    }
  };

  const editCoupon = (c: Cupon) => {
    setCupId(c.id || '');
    setCupCodigo(c.código);
    setCupDescuento(c.descuento);
    setCupVigente(c.vigencia);
    setShowCouponForm(true);
  };

  const deleteCoupon = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cupón?')) return;
    try {
      await dbService.deleteItem('cupones', id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCouponVigente = async (c: Cupon) => {
    try {
      await dbService.updateItem('cupones', c.id!, { vigencia: !c.vigencia });
    } catch (err) {
      console.error(err);
    }
  };

  const resetCouponForm = () => {
    setCupId('');
    setCupCodigo('');
    setCupDescuento(0);
    setCupVigente(true);
    setShowCouponForm(false);
  };

  // Staff and VIP Access Management
  const generateRandomCode = () => {
    // Generate a secure, easy to read code: 5 digits
    const digits = Math.floor(10000 + Math.random() * 90000).toString();
    setGeneratedCode(digits);
  };

  const handleCreateUserCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!userNombre.trim() || !generatedCode) return;

    setSavingUser(true);
    try {
      // Hash the plain text generated code
      const codeHash = await hashString(generatedCode);
      const userId = Math.random().toString(36).substring(2, 15);

      await dbService.setItem<UsuarioAcceso>('usuarios_acceso', userId, {
        id: userId,
        nombre: userNombre.trim(),
        código_acceso_cifrado: codeHash,
        rol: userRol,
        activo: true
      });

      // Show success modal or alert with the code
      alert(`Código creado para ${userNombre}: "${generatedCode}". Copia este código ahora, ya que no se podrá recuperar de la base de datos (se almacena cifrado de forma segura).`);

      setUserNombre('');
      setGeneratedCode('');
      setShowUserForm(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el código de acceso.');
    } finally {
      setSavingUser(false);
    }
  };

  const revokeUserAccess = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas revocar este acceso? El usuario ya no podrá ingresar al sistema.')) return;
    try {
      await dbService.updateItem('usuarios_acceso', id, { activo: false });
    } catch (err) {
      console.error(err);
    }
  };

  const reactivateUserAccess = async (id: string) => {
    try {
      await dbService.updateItem('usuarios_acceso', id, { activo: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUserAccess = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta credencial?')) return;
    try {
      await dbService.deleteItem('usuarios_acceso', id);
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings (Rate + Horarios)
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (tasaCambio <= 0) return;

    setSavingConfig(true);
    try {
      const updatedConfig: Configuracion = {
        tasa_cambio_cup_usd: tasaCambio,
        horarios_apertura: {
          lunes_jueves: { open: lunJueOpen, close: lunJueClose },
          viernes_domingo: { open: vieDomOpen, close: vieDomClose }
        }
      };

      await dbService.setItem('configuracion', 'global', updatedConfig);
      
      onUpdateRate(tasaCambio);
      onUpdateConfig(updatedConfig);
      
      alert('Configuraciones guardadas correctamente en Firestore.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Split users lists
  const staffList = usuarios.filter(u => u.rol === 'staff');
  const vipList = usuarios.filter(u => u.rol === 'vip');
  const ceoList = usuarios.filter(u => u.rol === 'ceo');

  // Strict constraint check: Only CEO can access Users and Configuration tabs
  const isCeo = currentUser.rol === 'ceo';

  return (
    <div id="admin-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            ⚙️ Panel de Administración
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sesión iniciada como: <span className="font-bold text-orange-600">{currentUser.nombre}</span> ({currentUser.rol.toUpperCase()})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('productos')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'productos'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Pizza className="w-4 h-4" />
            Productos
          </button>
          <button
            onClick={() => setActiveTab('cupones')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'cupones'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Cupones
          </button>

          {/* CEO Only Tabs */}
          {isCeo && (
            <>
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Staff / VIPs
              </button>
              <button
                onClick={() => setActiveTab('configuracion')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'configuracion'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Configuración
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. PRODUCTOS TAB */}
      {activeTab === 'productos' && (
        <div id="tab-productos" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Catálogo de Productos</h3>
            <button
              onClick={() => { resetProductForm(); setShowProductForm(true); }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agregar Pizza
            </button>
          </div>

          {/* Product form modal */}
          {showProductForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <form onSubmit={handleSaveProduct} className="bg-white rounded-3xl p-6 max-w-md w-full border border-orange-100 shadow-2xl animate-scaleUp space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-base">{prodId ? 'Editar Pizza' : 'Agregar Nueva Pizza'}</h4>
                  <button type="button" onClick={resetProductForm} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre de la Pizza</label>
                  <input
                    type="text"
                    required
                    value={prodNombre}
                    onChange={(e) => setProdNombre(e.target.value)}
                    placeholder="Ej. Margarita, Hawaiana"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Familiar 30cm (CUP)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={prodPrecioFam || ''}
                      onChange={(e) => setProdPrecioFam(parseFloat(e.target.value) || 0)}
                      placeholder="Precio en CUP"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Equiv: {formatUSD(prodPrecioFam, rate)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">XXL 40cm (CUP)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={prodPrecioXXL || ''}
                      onChange={(e) => setProdPrecioXXL(parseFloat(e.target.value) || 0)}
                      placeholder="Precio en CUP"
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Equiv: {formatUSD(prodPrecioXXL, rate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="prodDispo"
                    checked={prodDispo}
                    onChange={(e) => setProdDispo(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="prodDispo" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                    Disponible para venta inmediata
                  </label>
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    {prodId ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products List Table */}
          {productos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <Pizza className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No hay pizzas creadas</p>
              <p className="text-xs text-slate-400 mt-1">Presiona "Agregar Pizza" para crear tu primer producto en CUP.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-left">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Precio Familiar (30cm)</th>
                    <th className="px-6 py-4">Precio XXL (40cm)</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {productos.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 font-bold text-slate-900">{p.nombre}</td>
                      <td className="px-6 py-4 font-mono">
                        <span className="block font-bold">{formatCUP(p.precio_familiar_cup)}</span>
                        <span className="text-[10px] text-slate-500">{formatUSD(p.precio_familiar_cup, rate)}</span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        <span className="block font-bold">{formatCUP(p.precio_xxl_cup)}</span>
                        <span className="text-[10px] text-slate-500">{formatUSD(p.precio_xxl_cup, rate)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleProductDispo(p)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-[10px] transition cursor-pointer ${
                            p.disponibilidad
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.disponibilidad ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {p.disponibilidad ? 'Activo' : 'Pausado'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => editProduct(p)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id!)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. CUPONES TAB */}
      {activeTab === 'cupones' && (
        <div id="tab-cupones" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Cupones de Descuento</h3>
            <button
              onClick={() => { resetCouponForm(); setShowCouponForm(true); }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cupón
            </button>
          </div>

          {/* Coupon form modal */}
          {showCouponForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <form onSubmit={handleSaveCoupon} className="bg-white rounded-3xl p-6 max-w-sm w-full border border-orange-100 shadow-2xl animate-scaleUp space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-base">{cupId ? 'Editar Cupón' : 'Nuevo Cupón'}</h4>
                  <button type="button" onClick={resetCouponForm} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Código del Cupón</label>
                  <input
                    type="text"
                    required
                    value={cupCodigo}
                    onChange={(e) => setCupCodigo(e.target.value)}
                    placeholder="Ej. PIZZALOVER10"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={cupDescuento || ''}
                    onChange={(e) => setCupDescuento(parseInt(e.target.value) || 0)}
                    placeholder="Ej. 10 para 10% de descuento"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="cupVigente"
                    checked={cupVigente}
                    onChange={(e) => setCupVigente(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="cupVigente" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                    Cupón vigente y activo
                  </label>
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={resetCouponForm}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    {cupId ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Coupons List */}
          {cupones.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
              <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">No hay cupones activos</p>
              <p className="text-xs text-slate-400 mt-1">Presiona "Nuevo Cupón" para crear códigos de descuento.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-left">
                  <tr>
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Descuento</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {cupones.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 font-bold text-slate-900 tracking-wider font-mono">{c.código}</td>
                      <td className="px-6 py-4 font-bold text-orange-600 text-sm font-mono">{c.descuento}% OFF</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCouponVigente(c)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-[10px] transition cursor-pointer ${
                            c.vigencia
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.vigencia ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {c.vigencia ? 'Vigente' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => editCoupon(c)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteCoupon(c.id!)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. STAFF Y VIPS TAB (CEO Only) */}
      {activeTab === 'usuarios' && isCeo && (
        <div id="tab-usuarios" className="space-y-8">
          
          {/* Section Staff */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                  <UserCheck className="w-5 h-5 text-orange-600" />
                  Gestionar Staff (Cocina)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Genera códigos de acceso únicos para el personal de la pizzería.</p>
              </div>
              <button
                onClick={() => { setUserRol('staff'); setGeneratedCode(''); setUserNombre(''); setShowUserForm(true); }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo Staff
              </button>
            </div>

            {staffList.length === 0 ? (
              <p className="text-xs text-slate-500 bg-white p-6 border border-slate-150 rounded-2xl text-center">
                No hay personal registrado en la base de datos.
              </p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-left">
                    <tr>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {staffList.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-bold text-slate-900">{u.nombre}</td>
                        <td className="px-6 py-4 capitalize font-mono text-slate-500">Staff Cocina</td>
                        <td className="px-6 py-4 text-slate-400 italic">
                          <span>[Cifrado SHA-256]</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.activo ? 'Activo' : 'Revocado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {u.activo ? (
                            <button
                              onClick={() => revokeUserAccess(u.id!)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Revocar
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateUserAccess(u.id!)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Reactivar
                            </button>
                          )}
                          <button
                            onClick={() => deleteUserAccess(u.id!)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section VIP */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5">
                  <Lock className="w-5 h-5 text-orange-600" />
                  Gestionar Clientes VIP
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Genera códigos de acceso exclusivos para tus clientes VIP.</p>
              </div>
              <button
                onClick={() => { setUserRol('vip'); setGeneratedCode(''); setUserNombre(''); setShowUserForm(true); }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente VIP
              </button>
            </div>

            {vipList.length === 0 ? (
              <p className="text-xs text-slate-500 bg-white p-6 border border-slate-150 rounded-2xl text-center">
                No hay clientes VIP registrados en la base de datos.
              </p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-left">
                    <tr>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {vipList.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-bold text-slate-900">{u.nombre}</td>
                        <td className="px-6 py-4 capitalize font-mono text-slate-500">Cliente VIP</td>
                        <td className="px-6 py-4 text-slate-400 italic">
                          <span>[Cifrado SHA-256]</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.activo ? 'Activo' : 'Revocado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {u.activo ? (
                            <button
                              onClick={() => revokeUserAccess(u.id!)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Revocar
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateUserAccess(u.id!)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                            >
                              Reactivar
                            </button>
                          )}
                          <button
                            onClick={() => deleteUserAccess(u.id!)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 px-3 rounded-lg cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User code form modal */}
          {showUserForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateUserCode} className="bg-white rounded-3xl p-6 max-w-sm w-full border border-orange-100 shadow-2xl animate-scaleUp space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-base">Generar Código de Acceso</h4>
                  <button type="button" onClick={() => setShowUserForm(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={userNombre}
                    onChange={(e) => setUserNombre(e.target.value)}
                    placeholder="Ej. María González"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Rol</label>
                  <select
                    value={userRol}
                    onChange={(e) => setUserRol(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800"
                  >
                    <option value="staff">Personal Cocina (Staff)</option>
                    <option value="vip">Cliente VIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Código Único Auto-Generado</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      required
                      value={generatedCode}
                      placeholder="Haz clic en Generar"
                      className="block flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-800 font-mono text-center font-bold"
                    />
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                      Generar
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser || !generatedCode}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    {savingUser ? 'Guardando...' : 'Crear Acceso'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 4. CONFIGURACION TAB (CEO Only) */}
      {activeTab === 'configuracion' && isCeo && (
        <form onSubmit={handleSaveSettings} id="tab-configuracion" className="space-y-6 max-w-2xl bg-white border border-slate-150 p-6 rounded-3xl shadow-sm">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Sliders className="w-5 h-5 text-orange-600" />
            Configuraciones de la Pizzería
          </h3>

          {/* Tasa de cambio */}
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-orange-600" />
              Tasa de Cambio (CUP a USD)
            </h4>
            <p className="text-xs text-slate-500">Define a cuántos CUP equivale 1 USD. Esto recalculará de forma automática el valor en USD de cada pizza en la carta.</p>
            
            <div className="flex items-center gap-3 pt-2">
              <div className="relative max-w-[200px]">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-mono text-xs">
                  $1 USD =
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  value={tasaCambio || ''}
                  onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 0)}
                  className="block w-full pl-20 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 text-xs font-semibold">
                  CUP
                </span>
              </div>
            </div>
          </div>

          {/* Horarios de apertura */}
          <div className="space-y-4 border-b border-slate-100 pb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" />
              Horarios de Apertura
            </h4>
            <p className="text-xs text-slate-500">Especifica los horarios de atención de la pizzería en formato 12h AM/PM.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Lunes a Jueves (Pre-pedidos) */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Lunes a Jueves (Pre-Pedidos)</h5>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Apertura</label>
                    <input
                      type="text"
                      required
                      value={lunJueOpen}
                      onChange={(e) => setLunJueOpen(e.target.value)}
                      placeholder="9:00 AM"
                      className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Cierre</label>
                    <input
                      type="text"
                      required
                      value={lunJueClose}
                      onChange={(e) => setLunJueClose(e.target.value)}
                      placeholder="5:00 PM"
                      className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Viernes a Domingo (Servicio Activo) */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Viernes a Domingo (Activo)</h5>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Apertura</label>
                    <input
                      type="text"
                      required
                      value={vieDomOpen}
                      onChange={(e) => setVieDomOpen(e.target.value)}
                      placeholder="2:00 PM"
                      className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Cierre</label>
                    <input
                      type="text"
                      required
                      value={vieDomClose}
                      onChange={(e) => setVieDomClose(e.target.value)}
                      placeholder="9:00 PM"
                      className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Guardando...' : 'Guardar Todo en Firestore'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
