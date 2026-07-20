// Utility functions for Camaraza Pizzas app

/**
 * Format date or timestamp to 12-hour format with AM/PM
 */
export function formatTime12h(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

export function formatDateTime12h(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${formatTime12h(date)}`;
}

/**
 * Parses a 12h string like "9:00 AM" or "5:00 PM" into hours and minutes
 */
export function parse12hTime(timeStr: string): { hours: number, minutes: number } {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) {
    return { hours: 9, minutes: 0 };
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

/**
 * Check if the pizzeria is open and get status: "pre-pedidos", "servicio_activo", or "cerrado"
 * Rules:
 * Lunes a jueves 9:00 AM–5:00 PM: pre-pedidos
 * Viernes a domingo 2:00 PM–9:00 PM: servicio activo
 * Fuera de horario: cerrado
 */
export function getOpeningStatus(
  currentDate: Date,
  customConfig?: {
    lunes_jueves?: { open: string; close: string };
    viernes_domingo?: { open: string; close: string };
  }
): { status: 'pre-pedidos' | 'servicio-activo' | 'cerrado'; label: string; details: string } {
  const day = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHours = currentDate.getHours();
  const currentMinutes = currentDate.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Lunes a Jueves (1, 2, 3, 4)
  const isLunesJueves = day >= 1 && day <= 4;
  // Viernes a Domingo (5, 6, 0)
  const isViernesDomingo = day === 5 || day === 6 || day === 0;

  // Load custom or default times
  const lunJueOpenStr = customConfig?.lunes_jueves?.open || "9:00 AM";
  const lunJueCloseStr = customConfig?.lunes_jueves?.close || "5:00 PM";
  const vieDomOpenStr = customConfig?.viernes_domingo?.open || "2:00 PM";
  const vieDomCloseStr = customConfig?.viernes_domingo?.close || "9:00 PM";

  const lunJueOpen = parse12hTime(lunJueOpenStr);
  const lunJueClose = parse12hTime(lunJueCloseStr);
  const vieDomOpen = parse12hTime(vieDomOpenStr);
  const vieDomClose = parse12hTime(vieDomCloseStr);

  const lunJueOpenMin = lunJueOpen.hours * 60 + lunJueOpen.minutes;
  const lunJueCloseMin = lunJueClose.hours * 60 + lunJueClose.minutes;
  const vieDomOpenMin = vieDomOpen.hours * 60 + vieDomOpen.minutes;
  const vieDomCloseMin = vieDomClose.hours * 60 + vieDomClose.minutes;

  if (isLunesJueves) {
    if (currentTotalMinutes >= lunJueOpenMin && currentTotalMinutes <= lunJueCloseMin) {
      return {
        status: 'pre-pedidos',
        label: 'Pre-Pedidos',
        details: `Lunes a Jueves (${lunJueOpenStr} a ${lunJueCloseStr})`
      };
    }
  } else if (isViernesDomingo) {
    if (currentTotalMinutes >= vieDomOpenMin && currentTotalMinutes <= vieDomCloseMin) {
      return {
        status: 'servicio-activo',
        label: 'Servicio Activo',
        details: `Viernes a Domingo (${vieDomOpenStr} a ${vieDomCloseStr})`
      };
    }
  }

  // Closed
  return {
    status: 'cerrado',
    label: 'Cerrado',
    details: isLunesJueves
      ? `Abre Lunes a Jueves de ${lunJueOpenStr} a ${lunJueCloseStr} (Pre-pedidos)`
      : `Abre Viernes a Domingo de ${vieDomOpenStr} a ${vieDomCloseStr} (Servicio Activo)`
  };
}

/**
 * Format currency to CUP or USD
 */
export function formatCUP(amount: number): string {
  return `${amount.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (CUP)`;
}

export function formatUSD(amountInCUP: number, rate: number): string {
  const usd = rate > 0 ? amountInCUP / rate : 0;
  return `${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USD)`;
}

export function getPriceString(amountInCUP: number, rate: number): string {
  return `${formatCUP(amountInCUP)} | ${formatUSD(amountInCUP, rate)}`;
}

/**
 * Generate WhatsApp checkout link and message
 */
export function generateWhatsAppLink(pedido: any, rate: number): string {
  const phone = '5350000000'; // Placeholder cuban number or customizable, let's use a nice format
  
  let msg = `🍕 *CAMARAZA PIZZAS - NUEVO PEDIDO* 🍕\n\n`;
  msg += `👤 *Cliente:* ${pedido.cliente}\n`;
  msg += `🛵 *Tipo:* ${pedido.tipo_entrega === 'domicilio' ? '🛵 Domicilio' : '🛍️ Recogida en local'}\n`;
  msg += `⏰ *Hora:* ${pedido.hora}\n`;
  
  if (pedido.notas) {
    msg += `📝 *Notas generales:* ${pedido.notas}\n`;
  }
  
  msg += `\n🛒 *Detalle del Pedido:*\n`;
  
  pedido.items.forEach((item: any) => {
    msg += `- ${item.cantidad}x *${item.productoNombre}* (${item.tamanio === 'familiar' ? 'Familiar 30cm' : 'XXL 40cm'})\n`;
    if (item.notas) msg += `   _Nota: ${item.notas}_\n`;
    msg += `   Subtotal: ${formatCUP(item.subtotal)} / ${formatUSD(item.subtotal, rate)}\n`;
  });
  
  if (pedido.descuento_cup > 0) {
    msg += `\n🎟️ *Descuento Cupón:* -${formatCUP(pedido.descuento_cup)} / -${formatUSD(pedido.descuento_cup, rate)}`;
  }
  
  msg += `\n\n💰 *TOTAL A PAGAR:*\n`;
  msg += `👉 *${formatCUP(pedido.total)}*\n`;
  msg += `👉 *${formatUSD(pedido.total, rate)}*\n`;
  msg += `_Tasa de cambio: 1 USD = ${rate} CUP_\n\n`;
  msg += `¡Gracias por elegir Camaraza Pizzas! 👨‍🍳🍕`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}
