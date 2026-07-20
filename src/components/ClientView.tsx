import { useState, useEffect, useRef, FormEvent } from 'react';
import { dbService } from '../db';
import { Producto, Cupon, Pedido, ItemPedido, Configuracion } from '../types';
import { getOpeningStatus, formatCUP, formatUSD, getPriceString, generateWhatsAppLink, formatTime12h } from '../utils';
import { 
  ShoppingBag, 
  MapPin, 
  Store, 
  Clock, 
  Ticket, 
  MessageSquare, 
  Plus, 
  Minus, 
  Trash2, 
  Lock, 
  Sparkles, 
  CheckCircle,
  AlertTriangle,
  Info,
  Pizza,
  X
} from 'lucide-react';

interface ClientViewProps {
  rate: number;
  config: Configuracion | null;
  onGoToLogin: () => void;
  currentUser?: { nombre: string; rol: 'ceo' | 'staff' | 'vip' } | null;
}

export default function ClientView({ rate, config, onGoToLogin, currentUser }: ClientViewProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [cart, setCart] = useState<ItemPedido[]>([]);
  
  // Checkout form state
  const [cliente, setCliente] = useState(currentUser ? currentUser.nombre : '');
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'recogida'>('domicilio');
  const [notasGenerales, setNotasGenerales] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Cupon | null>(null);
  
  // App open status
  const [openStatus, setOpenStatus] = useState<any>({ status: 'cerrado', label: 'Cerrado', details: '' });
  const [timeStr, setTimeStr] = useState('');
  
  // Statuses
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<Pedido | null>(null);
  const [couponError, setCouponError] = useState('');

  // Active Order Tracking & Push Notification Support
  const [activeOrder, setActiveOrder] = useState<Pedido | null>(null);
  const activeOrderPrevStatus = useRef<string | null>(null);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.5, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch (err) {
      console.error('Audio play error: ', err);
    }
  };

  const triggerClientNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'camaraza-pizza-client-update'
      });
    }
  };

  const translateStatus = (status: string) => {
    switch(status) {
      case 'recibido': return 'Recibido 📥';
      case 'preparacion': return 'En preparación 👨‍🍳';
      case 'listo': return '¡Listo para entregar! 📦';
      case 'entregado': return 'Entregado 🎉';
      default: return status;
    }
  };

  const dismissActiveOrder = () => {
    localStorage.removeItem('camaraza_active_order_id');
    setActiveOrder(null);
    activeOrderPrevStatus.current = null;
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setCliente(currentUser.nombre);
    } else {
      setCliente('');
    }
  }, [currentUser]);

  useEffect(() => {
    const savedOrderId = localStorage.getItem('camaraza_active_order_id');
    if (!savedOrderId) {
      setActiveOrder(null);
      return;
    }

    const unsub = dbService.onCollectionSnapshot<Pedido>('pedidos', (allOrders) => {
      const myOrder = allOrders.find(o => o.id === savedOrderId);
      if (myOrder) {
        if (activeOrderPrevStatus.current && activeOrderPrevStatus.current !== myOrder.estado) {
          triggerClientNotification(
            'Actualización de tu Pedido 🍕',
            `Tu pedido ahora está: ${translateStatus(myOrder.estado)}`
          );
          playNotificationSound();
        }
        activeOrderPrevStatus.current = myOrder.estado;
        setActiveOrder(myOrder);
      } else {
        setActiveOrder(null);
        localStorage.removeItem('camaraza_active_order_id');
        activeOrderPrevStatus.current = null;
      }
    });

    return unsub;
  }, []);

  // Sync products and coupons in real time
  useEffect(() => {
    const unsubProducts = dbService.onCollectionSnapshot<Producto>('productos', (data) => {
      setProductos(data.filter(p => p.disponibilidad));
    });

    const unsubCupones = dbService.onCollectionSnapshot<Cupon>('cupones', (data) => {
      setCupones(data);
    });

    return () => {
      unsubProducts();
      unsubCupones();
    };
  }, []);

  // Update opening hours status every second
  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      setTimeStr(formatTime12h(now));
      setOpenStatus(getOpeningStatus(now, config?.horarios_apertura));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [config]);

  // Handle Cart Operations
  const addToCart = (producto: Producto, size: 'familiar' | 'xxl') => {
    const price = size === 'familiar' ? producto.precio_familiar_cup : producto.precio_xxl_cup;
    const existingIndex = cart.findIndex(
      item => item.productoId === producto.id && item.tamanio === size
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].cantidad += 1;
      newCart[existingIndex].subtotal = newCart[existingIndex].cantidad * price;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          productoId: producto.id || '',
          productoNombre: producto.nombre,
          tamanio: size,
          cantidad: 1,
          notas: '',
          subtotal: price
        }
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const product = productos.find(p => p.id === item.productoId);
    if (!product) return;

    const price = item.tamanio === 'familiar' ? product.precio_familiar_cup : product.precio_xxl_cup;
    item.cantidad += delta;

    if (item.cantidad <= 0) {
      newCart.splice(index, 1);
    } else {
      item.subtotal = item.cantidad * price;
    }
    setCart(newCart);
  };

  const updateItemNotes = (index: number, notes: string) => {
    const newCart = [...cart];
    newCart[index].notas = notes;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const getSubtotal = () => cart.reduce((acc, item) => acc + item.subtotal, 0);
  
  const getDiscount = () => {
    if (!appliedCoupon) return 0;
    // We treat coupon.descuento as a percentage (e.g., 10 means 10% off)
    const subtotal = getSubtotal();
    return Math.round((subtotal * appliedCoupon.descuento) / 100);
  };

  const getTotal = () => {
    const total = getSubtotal() - getDiscount();
    return total < 0 ? 0 : total;
  };

  // Validate coupon
  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return;

    const coupon = cupones.find(
      c => c.código.toLowerCase().trim() === couponCode.toLowerCase().trim() && c.vigencia
    );

    if (coupon) {
      setAppliedCoupon(coupon);
    } else {
      setCouponError('Cupón inválido o expirado.');
      setAppliedCoupon(null);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  // Submit Order
  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!cliente.trim()) return;
    if (cart.length === 0) return;
    if (openStatus.status === 'cerrado') return;

    setSubmittingOrder(true);
    try {
      const orderId = Math.random().toString(36).substring(2, 15);
      const totalCup = getTotal();
      const totalUsd = totalCup / (rate || 1);

      const orderData: Pedido = {
        id: orderId,
        cliente: cliente.trim(),
        tipo_entrega: tipoEntrega,
        estado: 'recibido',
        hora: formatTime12h(new Date()),
        timestamp: Date.now(),
        total: totalCup,
        total_usd: totalUsd,
        items: cart,
        notas: notasGenerales.trim(),
        descuento_cup: getDiscount()
      };

      // Write to Firestore / local db
      await dbService.setItem<Pedido>('pedidos', orderId, orderData);

      localStorage.setItem('camaraza_active_order_id', orderId);

      setOrderSuccess(orderData);
      setCart([]);
      setCliente('');
      setNotasGenerales('');
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (err) {
      console.error('Error placing order: ', err);
      alert('Error al enviar el pedido. Intente nuevamente.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div id="client-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <img 
            src="/icon-192.png" 
            alt="Camaraza Pizzas Logo" 
            className="h-16 w-16 rounded-full shadow object-cover border border-orange-100"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Camaraza Pizzas</h1>
            <p className="text-xs text-slate-500">Exquisitez italiana, sabor único • Est. 2026</p>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
            Hora actual: {timeStr || '12:00 AM'}
          </div>

          {openStatus.status === 'servicio-activo' && (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {openStatus.label}
            </span>
          )}
          {openStatus.status === 'pre-pedidos' && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {openStatus.label}
            </span>
          )}
          {openStatus.status === 'cerrado' && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {openStatus.label}
            </span>
          )}

          <button
            onClick={onGoToLogin}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 px-3 py-1.5 rounded-xl transition cursor-pointer font-semibold ml-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            Acceso Personal
          </button>
        </div>
      </div>

      {/* Info Notice */}
      {openStatus.status === 'cerrado' ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-800 text-sm">Los pedidos están cerrados temporalmente</h4>
            <p className="text-xs text-red-700 mt-1">{openStatus.details}</p>
          </div>
        </div>
      ) : openStatus.status === 'pre-pedidos' ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">Modo Pre-Pedidos Activo</h4>
            <p className="text-xs text-amber-700 mt-1">Registra tu pedido ahora y lo recibes al iniciar el servicio el fin de semana. {openStatus.details}</p>
          </div>
        </div>
      ) : null}

      {activeOrder && (
        <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500 text-white rounded-2xl">
              <Pizza className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tu Pedido está Activo</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Estado actual: <span className="font-extrabold text-orange-600">{translateStatus(activeOrder.estado)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 border-t border-orange-100 pt-3 md:border-0 md:pt-0">
            <div className="text-left md:text-right font-mono">
              <span className="block text-slate-400 text-[9px] uppercase font-bold font-sans">Total del Pedido</span>
              <span className="font-extrabold text-slate-800 text-sm">{formatCUP(activeOrder.total)}</span>
            </div>
            <button
              onClick={dismissActiveOrder}
              className="p-1.5 hover:bg-orange-100 text-orange-600 rounded-xl transition cursor-pointer"
              title="Quitar de la pantalla"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Order Success Modal/Banner */}
      {orderSuccess && (
        <div id="order-success-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-orange-100 shadow-2xl animate-scaleUp">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                <CheckCircle className="h-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">¡Pedido Recibido!</h3>
              <p className="text-xs text-slate-500 mt-1">Tu pedido se registró con éxito en el sistema.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 my-6 text-xs text-slate-600 space-y-1 border border-slate-100">
              <p><strong>Cliente:</strong> {orderSuccess.cliente}</p>
              <p><strong>Tipo:</strong> {orderSuccess.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🛍️ Recogida en local'}</p>
              <p><strong>Hora:</strong> {orderSuccess.hora}</p>
              <p><strong>Total:</strong> {formatCUP(orderSuccess.total)} ({formatUSD(orderSuccess.total, rate)})</p>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={generateWhatsAppLink(orderSuccess, rate)}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3 px-4 rounded-2xl text-center flex items-center justify-center gap-2 text-sm transition shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Enviar resumen por WhatsApp
              </a>
              <button
                onClick={() => setOrderSuccess(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-2xl text-center text-sm transition cursor-pointer"
              >
                Entendido / Hacer otro pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Catalog + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Catalog Section */}
        <div className="lg:col-span-7">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            🍕 Nuestra Carta
          </h2>

          {productos.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-2xl p-12 text-center shadow-sm">
              <Info className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">La carta está vacía temporalmente</p>
              <p className="text-xs text-slate-500 mt-1">Nuestros chefs están preparando nuevos sabores. Por favor, vuelve pronto o accede con tu código de staff para agregar productos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productos.map((producto) => (
                <div key={producto.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition hover:shadow-md">
                  <div>
                    {producto.imagen_url && (
                      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3">
                        <img 
                          src={producto.imagen_url} 
                          alt={producto.nombre} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h3 className="font-bold text-slate-900 text-base">{producto.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-1 italic">Ingredientes frescos y masa artesanal</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {/* Familiar 30cm */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-semibold block text-slate-800">Familiar 30cm</span>
                        <span className="text-orange-600 font-bold font-mono">{getPriceString(producto.precio_familiar_cup, rate)}</span>
                      </div>
                      <button
                        onClick={() => addToCart(producto, 'familiar')}
                        disabled={openStatus.status === 'cerrado'}
                        className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                        title="Agregar Familiar"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* XXL 40cm */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-semibold block text-slate-800">XXL 40cm</span>
                        <span className="text-orange-600 font-bold font-mono">{getPriceString(producto.precio_xxl_cup, rate)}</span>
                      </div>
                      <button
                        onClick={() => addToCart(producto, 'xxl')}
                        disabled={openStatus.status === 'cerrado'}
                        className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                        title="Agregar XXL"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              Tu Pedido
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold">Tu carrito está vacío</p>
                <p className="text-xs text-slate-500 mt-1">Haz clic en (+) sobre la carta para seleccionar tus pizzas.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Cart Items List */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item, index) => (
                    <div key={`${item.productoId}-${item.tamanio}`} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {item.productoNombre}
                          </h4>
                          <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5">
                            {item.tamanio === 'familiar' ? 'Familiar 30cm' : 'XXL 40cm'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800 font-mono block">
                            {formatCUP(item.subtotal)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {formatUSD(item.subtotal, rate)}
                          </span>
                        </div>
                      </div>

                      {/* Item Quantity and Notes */}
                      <div className="flex items-center justify-between mt-3 gap-2">
                        <input
                          type="text"
                          placeholder="Nota (ej. Sin cebolla, extra queso)"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-1/2"
                        />

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold w-6 text-center text-slate-800">{item.cantidad}</span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(index)}
                            className="p-1 text-red-500 hover:text-red-700 rounded-lg transition ml-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Type Selector */}
                <div className="bg-slate-50 p-2.5 rounded-2xl flex border border-slate-150">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('domicilio')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      tipoEntrega === 'domicilio' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Domicilio
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('recogida')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      tipoEntrega === 'recogida' 
                        ? 'bg-white text-orange-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    Recogida Local
                  </button>
                </div>

                {/* Coupon Code Input */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Ticket className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Código de cupón"
                        disabled={appliedCoupon !== null}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 uppercase disabled:opacity-70"
                      />
                    </div>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p className="text-[10px] text-red-500 mt-1 font-semibold">{couponError}</p>
                  )}
                  {appliedCoupon && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                      ✓ Cupón aplicado con éxito! Descuento de {appliedCoupon.descuento}%
                    </p>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCUP(getSubtotal())}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Descuento ({appliedCoupon.descuento}%):</span>
                      <span className="font-mono">-{formatCUP(getDiscount())}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-100 pt-2">
                    <span>TOTAL:</span>
                    <div className="text-right">
                      <span className="font-mono text-orange-600 block">{formatCUP(getTotal())}</span>
                      <span className="text-xs font-mono text-slate-500 block font-normal">{formatUSD(getTotal(), rate)}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Form */}
                <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      disabled={!!currentUser}
                      className={`block w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 ${
                        currentUser ? 'bg-slate-100 border-slate-300 font-semibold text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Notas del Pedido
                    </label>
                    <textarea
                      placeholder="Ej. Dirección de envío, timbre malo..."
                      value={notasGenerales}
                      onChange={(e) => setNotasGenerales(e.target.value)}
                      rows={2}
                      className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOrder || openStatus.status === 'cerrado'}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm transition shadow-md disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {submittingOrder ? 'Enviando...' : 'Confirmar Pedido'}
                  </button>
                </form>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
