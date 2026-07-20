import { useState, useEffect, useRef } from 'react';
import { dbService } from '../db';
import { Pedido } from '../types';
import { formatCUP, formatUSD } from '../utils';
import { 
  Clipboard, 
  MapPin, 
  Store, 
  Trash2, 
  CheckCircle2, 
  Play, 
  Check, 
  Calendar, 
  Hourglass,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface KitchenViewProps {
  rate: number;
}

export default function KitchenView({ rate }: KitchenViewProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'recibido' | 'preparacion' | 'listo' | 'entregado'>('todos');
  
  // Keep track of the last order count to trigger notification
  const prevOrdersCount = useRef<number>(0);

  // Play audio chime using Web Audio API (Synthesizer)
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Note 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.6);

      // Note 2 slightly offset
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 120);
    } catch (e) {
      console.error('Web Audio API not supported or blocked by user gesture:', e);
    }
  };

  // Ask for notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load and listen to orders in real-time
  useEffect(() => {
    const unsub = dbService.onCollectionSnapshot<Pedido>('pedidos', (data) => {
      // Sort by timestamp ascending (oldest first for queue flow)
      const sorted = data.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      // Filter current new orders
      const currentNewOrders = sorted.filter(p => p.estado === 'recibido');
      
      // If we have more new orders than before, trigger notification!
      if (prevOrdersCount.current !== undefined && currentNewOrders.length > prevOrdersCount.current) {
        playChime();
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🍕 ¡Nuevo Pedido Recibido!', {
              body: `Se ha recibido un nuevo pedido en Camaraza Pizzas.`,
              icon: '/icon-192.png'
            });
          } catch (err) {
            console.error('Error displaying Notification:', err);
          }
        }
      }
      
      prevOrdersCount.current = currentNewOrders.length;
      setPedidos(sorted);
    });
    return unsub;
  }, []);

  const updateOrderStatus = async (id: string, newStatus: Pedido['estado']) => {
    try {
      await dbService.updateItem('pedidos', id, { estado: newStatus });
    } catch (err) {
      console.error('Error updating order status: ', err);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este pedido de forma permanente?')) return;
    try {
      await dbService.deleteItem('pedidos', id);
    } catch (err) {
      console.error('Error deleting order: ', err);
    }
  };

  const filteredPedidos = pedidos.filter(p => activeFilter === 'todos' || p.estado === activeFilter);

  // Status badges helper
  const getStatusBadge = (status: Pedido['estado']) => {
    switch (status) {
      case 'recibido':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200">Recibido</span>;
      case 'preparacion':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">En Cocina</span>;
      case 'listo':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">¡Listo!</span>;
      case 'entregado':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">Entregado</span>;
      default:
        return null;
    }
  };

  return (
    <div id="kitchen-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            👨‍🍳 Cola de Cocina
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gestión de pedidos en tiempo real • Camaraza Pizzas</p>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-wrap gap-2">
          {['todos', 'recibido', 'preparacion', 'listo', 'entregado'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                activeFilter === filter
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'todos' ? 'Todos' : filter === 'preparacion' ? 'En Cocina' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredPedidos.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-150 shadow-sm max-w-xl mx-auto px-6">
          <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-800 text-base">No hay pedidos registrados</h3>
          <p className="text-xs text-slate-500 mt-1">Cuando los clientes realicen pedidos de pizzas, aparecerán aquí automáticamente en tiempo real.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPedidos.map((pedido) => (
            <div 
              key={pedido.id} 
              className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                pedido.estado === 'preparacion' ? 'ring-2 ring-amber-400 border-transparent' : 'border-slate-150'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    {pedido.tipo_entrega === 'domicilio' ? (
                      <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100" title="Domicilio">
                        <MapPin className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 bg-orange-50 text-orange-600 rounded-xl border border-orange-100" title="Recogida en Local">
                        <Store className="w-4 h-4" />
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{pedido.cliente}</h4>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar className="w-3 h-3" />
                        {pedido.hora}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(pedido.estado)}
                </div>

                {/* Items detail list */}
                <div className="space-y-3 mb-6">
                  {pedido.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <div className="flex justify-between font-bold">
                        <span>{item.cantidad}x {item.productoNombre}</span>
                        <span className="text-slate-500 font-normal">
                          {item.tamanio === 'familiar' ? 'Fam. 30cm' : 'XXL 40cm'}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-red-600 font-semibold mt-1 bg-red-50 border-l-2 border-red-500 pl-1.5 py-0.5 rounded-r">
                          Nota: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {pedido.notas && (
                    <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl text-xs text-blue-800">
                      <p className="font-bold text-[10px] uppercase tracking-wide text-blue-600 mb-0.5">Notas generales:</p>
                      <p>{pedido.notas}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer & Actions */}
              <div className="border-t border-slate-100 pt-4 mt-auto">
                {/* Total indicators */}
                <div className="flex justify-between items-baseline mb-4 text-xs">
                  <span className="text-slate-400 font-medium">Total:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 font-mono block text-sm">
                      {formatCUP(pedido.total)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {formatUSD(pedido.total, rate)}
                    </span>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-2">
                  {pedido.estado === 'recibido' && (
                    <button
                      onClick={() => updateOrderStatus(pedido.id!, 'preparacion')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Cocinar
                    </button>
                  )}

                  {pedido.estado === 'preparacion' && (
                    <button
                      onClick={() => updateOrderStatus(pedido.id!, 'listo')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terminar
                    </button>
                  )}

                  {pedido.estado === 'listo' && (
                    <button
                      onClick={() => updateOrderStatus(pedido.id!, 'entregado')}
                      className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Entregar
                    </button>
                  )}

                  {/* Red/Trash button */}
                  <button
                    onClick={() => deleteOrder(pedido.id!)}
                    className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl transition cursor-pointer"
                    title="Eliminar Pedido"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
