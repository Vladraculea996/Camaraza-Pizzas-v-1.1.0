export interface Producto {
  id?: string;
  nombre: string;
  precio_familiar_cup: number;
  precio_xxl_cup: number;
  disponibilidad: boolean;
  imagen_url?: string;
}

export interface ItemPedido {
  productoId: string;
  productoNombre: string;
  tamanio: 'familiar' | 'xxl';
  cantidad: number;
  notas: string;
  subtotal: number;
}

export interface Pedido {
  id?: string;
  cliente: string;
  tipo_entrega: 'domicilio' | 'recogida';
  estado: 'recibido' | 'preparacion' | 'listo' | 'entregado';
  hora: string; // 12h formatted time
  timestamp: number; // For sorting
  total: number; // in CUP
  total_usd: number; // in USD
  notas?: string;
  items: ItemPedido[];
  descuento_cup?: number;
}

export interface Cupon {
  id?: string;
  código: string;
  descuento: number; // percentage or fixed amount, let's use percentage or CUP value. Let's make it CUP value or percentage (e.g. 10 for 10% or fixed). Let's make it simple: percentage discount!
  vigencia: boolean;
}

export interface UsuarioAcceso {
  id?: string;
  nombre: string;
  código_acceso_cifrado: string;
  rol: 'ceo' | 'staff' | 'vip';
  activo: boolean;
}

export interface Configuracion {
  id?: string;
  tasa_cambio_cup_usd: number;
  horarios_apertura?: {
    lunes_jueves?: { open: string; close: string };
    viernes_domingo?: { open: string; close: string };
  };
}
