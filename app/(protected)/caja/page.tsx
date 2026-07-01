'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, TurnoCaja, VisitaResumen, DetalleVisitaCaja } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Clock, Receipt, ChevronRight, X, Plus, Trash2, Search, ShoppingBag, Pencil } from 'lucide-react';
import { PlatoCarta } from '@/lib/types';

type MetodoPago = 'efectivo' | 'tarjeta' | 'yape_plin' | 'transferencia';
type LineaPago = { id: number; metodo: MetodoPago; monto: string };

const METODOS: Array<{ key: MetodoPago; label: string }> = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'yape_plin',     label: 'Yape / Plin' },
  { key: 'transferencia', label: 'Transferencia' },
];

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta',
  yape_plin: 'Yape/Plin', transferencia: 'Transf.',
};

const CATEGORIAS_CARTA = [
  { key: 'todos', label: 'Todos' },
  { key: 'pollo_a_la_brasa', label: 'Pollo a la brasa' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'platos_a_la_carta', label: 'Platos' },
  { key: 'parrillas', label: 'Parrillas' },
  { key: 'parrillas_familiares', label: 'Parrillas Fam.' },
  { key: 'pastas', label: 'Pastas' },
  { key: 'guarniciones', label: 'Guarniciones' },
  { key: 'refrescos_jugos', label: 'Refrescos' },
  { key: 'bebidas', label: 'Bebidas' },
  { key: 'cocteles', label: 'Cócteles' },
  { key: 'extras', label: 'Extras' },
];

type BasketItem = {
  plato: PlatoCarta;
  cantidad: number;
  notas: string;
};

// ─── Pantalla: sin turno abierto ──────────────────────────────────────────────

function AbrirTurno({ onAbierto }: { onAbierto: (t: TurnoCaja) => void }) {
  const [monto, setMonto] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleAbrir() {
    const valor = parseFloat(monto);
    if (isNaN(valor) || valor < 0) { toast.error('Ingresa un monto válido'); return; }
    setCargando(true);
    try {
      const turno = await api.caja.abrirTurno(valor);
      toast.success('Turno abierto');
      onAbierto(turno);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold text-[var(--carbon)]">Abrir turno</h2>
        <p className="text-muted-foreground text-sm">Ingresa el efectivo en caja al inicio del turno</p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">S/</span>
          <input
            type="number" min="0" step="0.50" placeholder="0.00"
            value={monto} onChange={(e) => setMonto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAbrir()}
            className="w-full pl-10 pr-4 h-14 text-xl font-semibold rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-center"
          />
        </div>
        <Button
          className="w-full h-12 text-base bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold"
          onClick={handleAbrir} disabled={cargando}
        >
          {cargando ? 'Abriendo…' : 'Abrir turno'}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal: detalle + cobro con pagos mixtos ──────────────────────────────────

function ModalCobro({
  visita, detalle, onCobrado, onCerrar,
}: {
  visita: VisitaResumen;
  detalle: DetalleVisitaCaja | null;
  onCobrado: () => void;
  onCerrar: () => void;
}) {
  const totalItems = parseFloat(detalle?.total ?? visita.total);

  const [ajusteAbierto, setAjusteAbierto] = useState(false);
  const [ajusteMonto, setAjusteMonto] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');

  const ajusteValor = parseFloat(ajusteMonto || '0');
  const tieneAjuste = Math.abs(ajusteValor) > 0.005;
  const totalACobrar = Math.max(0, totalItems + (tieneAjuste ? ajusteValor : 0));

  const [lineas, setLineas] = useState<LineaPago[]>([
    { id: 0, metodo: 'efectivo', monto: (detalle?.total ?? visita.total) },
  ]);
  const [cargando, setCargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  let nextId = lineas.length;

  // Reajustar el monto de la primera línea cuando el ajuste cambia y solo hay 1 línea
  useEffect(() => {
    if (lineas.length === 1) {
      setLineas([{ ...lineas[0], monto: totalACobrar.toFixed(2) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalACobrar]);

  const totalLineas = lineas.reduce((s, l) => s + parseFloat(l.monto || '0'), 0);
  const pendiente = totalACobrar - totalLineas;
  const cuadrado = Math.abs(pendiente) < 0.01;
  const ajusteValido = !tieneAjuste || ajusteMotivo.trim().length > 0;

  function agregarLinea() {
    const resto = Math.max(0, pendiente).toFixed(2);
    setLineas((prev) => [...prev, { id: nextId++, metodo: 'efectivo', monto: resto }]);
  }

  function quitarLinea(id: number) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLinea(id: number, field: 'metodo' | 'monto', value: string) {
    setLineas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }

  async function handleImprimirResumen() {
    setImprimiendo(true);
    try {
      await api.caja.imprimirPrecuenta(visita.visitaId);
      toast.success('Resumen enviado a impresora');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al imprimir resumen');
    } finally {
      setImprimiendo(false);
    }
  }

  async function handleCobrar() {
    if (!cuadrado) { toast.error('Los pagos no suman el total'); return; }
    if (!ajusteValido) { toast.error('El ajuste requiere un motivo'); return; }
    setCargando(true);
    try {
      await api.caja.registrarPago(
        visita.visitaId,
        lineas.map((l) => ({ metodoPago: l.metodo, monto: parseFloat(l.monto) })),
        tieneAjuste ? { monto: ajusteValor, motivo: ajusteMotivo.trim() } : undefined,
      );
      toast.success(`Pedido cobrado con éxito · S/${totalACobrar.toFixed(2)}`);
      onCobrado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-[var(--carbon)]">
            {visita.tipo === 'llevar' ? (
              `🥡 Llevar: ${visita.nombreCliente ?? 'Cliente'}`
            ) : visita.tipo === 'delivery' ? (
              `🛵 Delivery: ${visita.nombreCliente ?? 'Cliente'}`
            ) : (
              `Mesa ${visita.mesaNumero}`
            )}
          </h3>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Detalles del cliente para Delivery */}
          {visita.tipo === 'delivery' && (
            <div className="px-5 pt-4">
              <div className="text-xs text-muted-foreground bg-muted/60 rounded-xl p-3 space-y-1">
                <p><strong>Dirección:</strong> {visita.direccionDelivery ?? '—'}</p>
                {visita.telefonoCliente && <p><strong>Teléfono:</strong> {visita.telefonoCliente}</p>}
                {visita.costoEnvio && parseFloat(visita.costoEnvio) > 0 && (
                  <p><strong>Envío:</strong> S/{parseFloat(visita.costoEnvio).toFixed(2)}</p>
                )}
              </div>
            </div>
          )}

          {/* Detalle de consumo */}
          <div className="p-5 space-y-2">
            {detalle ? (
              <ul className="space-y-1.5">
                {detalle.resumen.map((item, i) => {
                  const descU = parseFloat(item.descuentoUnitario ?? '0');
                  const descTotal = descU * item.cantidad;
                  return (
                    <li key={i} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{item.cantidad}× {item.nombre}</span>
                        <span className="font-medium">S/{(parseFloat(item.precioUnitario) * item.cantidad).toFixed(2)}</span>
                      </div>
                      {descU > 0 && (
                        <div className="flex justify-between text-xs text-[var(--salvia)] pl-4">
                          <span>↳ promo aplicada</span>
                          <span>-S/{descTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Cargando detalle…</p>
            )}

            {/* Desglose de totales */}
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              {detalle && parseFloat(detalle.descuentoTotal ?? '0') > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Platos</span>
                    <span>S/{(parseFloat(detalle.total) - parseFloat(visita.costoEnvio || '0') + parseFloat(detalle.descuentoTotal!)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--salvia)] font-medium">
                    <span>Descuento</span>
                    <span>-S/{detalle.descuentoTotal}</span>
                  </div>
                </>
              )}
              {visita.tipo === 'delivery' && visita.costoEnvio && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Costo de Envío</span>
                  <span>S/{parseFloat(visita.costoEnvio).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
              <span>{tieneAjuste ? 'Subtotal' : 'Total'}</span>
              <span className="text-[var(--carbon)]">S/{totalItems.toFixed(2)}</span>
            </div>
            
            {tieneAjuste && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Ajuste{ajusteMotivo ? ` · ${ajusteMotivo}` : ''}
                  </span>
                  <span className={ajusteValor > 0 ? 'text-blue-600 font-medium' : 'text-[var(--terracota)] font-medium'}>
                    {ajusteValor > 0 ? '+' : ''}S/{ajusteValor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                  <span>Total a cobrar</span>
                  <span className="text-[var(--carbon)]">S/{totalACobrar.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          {/* Acciones secundarias: imprimir resumen + ajuste manual */}
          <div className="px-5 pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImprimirResumen}
                disabled={imprimiendo}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm text-[var(--carbon)] hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <Receipt size={15} /> {imprimiendo ? 'Imprimiendo…' : 'Imprimir resumen'}
              </button>
              <button
                type="button"
                onClick={() => setAjusteAbierto((v) => !v)}
                className={[
                  'flex-1 h-10 rounded-xl border text-sm transition-colors',
                  ajusteAbierto || tieneAjuste
                    ? 'border-[var(--dorado)] bg-[var(--dorado)]/10 text-[var(--carbon)]'
                    : 'border-border text-muted-foreground hover:bg-muted/50',
                ].join(' ')}
              >
                {tieneAjuste ? `Ajuste (${ajusteValor > 0 ? '+' : ''}S/${ajusteValor.toFixed(2)})` : 'Ajuste manual'}
              </button>
            </div>

            {ajusteAbierto && (
              <div className="rounded-xl border border-[var(--dorado)]/40 bg-[var(--dorado)]/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">S/</span>
                    <input
                      type="number"
                      step="0.10"
                      placeholder="0.00 (use - para descontar)"
                      value={ajusteMonto}
                      onChange={(e) => setAjusteMonto(e.target.value)}
                      className="w-full pl-8 pr-2 h-10 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-1 focus:ring-[var(--dorado)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAjusteMonto(''); setAjusteMotivo(''); setAjusteAbierto(false); }}
                    className="text-xs text-muted-foreground hover:text-[var(--terracota)] px-2"
                  >
                    Quitar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Motivo del ajuste (obligatorio)"
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--dorado)]"
                />
                {tieneAjuste && !ajusteMotivo.trim() && (
                  <p className="text-xs text-[var(--terracota)]">
                    Indica un motivo para registrar el ajuste.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Líneas de pago */}
          <div className="px-5 pb-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Forma de pago</p>

            <div className="space-y-2">
              {lineas.map((linea) => (
                <div key={linea.id} className="flex items-center gap-2">
                  <select
                    value={linea.metodo}
                    onChange={(e) => updateLinea(linea.id, 'metodo', e.target.value as MetodoPago)}
                    className="flex-1 h-11 rounded-xl border border-border bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
                  >
                    {METODOS.map(({ key, label }) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">S/</span>
                    <input
                      type="number" min="0" step="0.10"
                      value={linea.monto}
                      onChange={(e) => updateLinea(linea.id, 'monto', e.target.value)}
                      className="w-full pl-8 pr-2 h-11 text-sm font-semibold rounded-xl border border-border bg-[var(--crema)] focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-right"
                    />
                  </div>
                  {lineas.length > 1 && (
                    <button onClick={() => quitarLinea(linea.id)} className="text-muted-foreground hover:text-[var(--terracota)]">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={agregarLinea}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[var(--carbon)] transition-colors"
            >
              <Plus size={15} /> Agregar método
            </button>

            {/* Resumen de totales */}
            <div className={[
              'rounded-xl px-4 py-3 flex justify-between items-center text-sm font-medium',
              cuadrado ? 'bg-[#e8f0d8] text-[var(--salvia)]' : pendiente > 0 ? 'bg-[#fde8e4] text-[var(--terracota)]' : 'bg-blue-50 text-blue-600',
            ].join(' ')}>
              <span>{cuadrado ? 'Cuadrado ✓' : pendiente > 0 ? `Pendiente: S/${pendiente.toFixed(2)}` : `Excede: S/${Math.abs(pendiente).toFixed(2)}`}</span>
              <span>S/{totalLineas.toFixed(2)} / S/{totalACobrar.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botón cobrar */}
        <div className="px-5 pb-5 pt-2 shrink-0 border-t border-border">
          <Button
            className="w-full h-12 text-base bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-bold disabled:opacity-50"
            onClick={handleCobrar} disabled={cargando || !cuadrado || !ajusteValido}
          >
            {cargando ? 'Registrando…' : `Cobrar S/${totalACobrar.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: cerrar turno con desglose por canal ────────────────────────────────

function ModalCierreTurno({
  turno, onCerrado, onCancelar,
}: {
  turno: TurnoCaja;
  onCerrado: () => void;
  onCancelar: () => void;
}) {
  const [montoReal, setMontoReal] = useState('');
  const [cargando, setCargando] = useState(false);

  const canal = turno.porCanal ?? { efectivo: '0.00', tarjeta: '0.00', yape_plin: '0.00', transferencia: '0.00' };
  const totalTurno = parseFloat(turno.totalTurno ?? '0');
  const teorico = parseFloat(turno.montoCierreTeorico ?? turno.montoApertura);
  const real = parseFloat(montoReal || '0');
  const diferencia = real - teorico;

  const canalesConVentas = [
    { key: 'efectivo',      label: 'Efectivo',      monto: canal.efectivo },
    { key: 'tarjeta',       label: 'Tarjeta',       monto: canal.tarjeta },
    { key: 'yape_plin',     label: 'Yape / Plin',   monto: canal.yape_plin },
    { key: 'transferencia', label: 'Transferencia', monto: canal.transferencia },
  ];

  async function handleCerrar() {
    if (!montoReal || isNaN(real)) { toast.error('Monto inválido'); return; }
    setCargando(true);
    try {
      await api.caja.cerrarTurno(real);
      toast.success('Turno cerrado');
      onCerrado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-lg">Cerrar turno</h3>
          <button onClick={onCancelar} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Ventas por canal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Ventas del turno</p>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {canalesConVentas.map(({ key, label, monto }) => (
                <div key={key} className="flex justify-between items-center px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={parseFloat(monto) > 0 ? 'font-semibold text-[var(--carbon)]' : 'text-muted-foreground'}>
                    S/{monto}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-2.5 text-sm bg-muted/40">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-[var(--dorado)]">S/{totalTurno.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Efectivo en caja */}
          {/* Efectivo en caja */}
          <div className="rounded-xl bg-[#fdf3d8] px-4 py-3 space-y-1.5 text-sm">
            <p className="text-xs font-semibold text-[var(--dorado)] uppercase tracking-widest">Efectivo en caja</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Apertura</span><span>S/{turno.montoApertura}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ventas efectivo</span><span>S/{canal.efectivo}</span></div>
            {parseFloat(turno.totalGastos ?? '0') > 0 && (
              <div className="flex justify-between text-[var(--terracota)] font-medium">
                <span>Gastos del turno</span><span>-S/{turno.totalGastos}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-[var(--dorado)]/30 pt-1.5">
              <span>Teórico</span><span className="text-[var(--carbon)]">S/{teorico.toFixed(2)}</span>
            </div>
          </div>

          {/* Conteo físico */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Efectivo contado físicamente</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">S/</span>
              <input
                type="number" min="0" step="0.50" placeholder="0.00"
                value={montoReal} onChange={(e) => setMontoReal(e.target.value)}
                className="w-full pl-10 pr-4 h-12 text-lg font-semibold rounded-xl border border-border bg-[var(--crema)] focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-center"
              />
            </div>
          </div>

          {montoReal && (
            <div className={[
              'rounded-xl p-3 text-center',
              Math.abs(diferencia) < 0.01 ? 'bg-[#e8f0d8]' : diferencia > 0 ? 'bg-blue-50' : 'bg-[#fde8e4]',
            ].join(' ')}>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className={[
                'font-bold text-xl',
                Math.abs(diferencia) < 0.01 ? 'text-[var(--salvia)]' : diferencia > 0 ? 'text-blue-600' : 'text-[var(--terracota)]',
              ].join(' ')}>
                {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Math.abs(diferencia) < 0.01 ? 'Cuadre perfecto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
              </p>
            </div>
          )}

          <Button
            className="w-full h-12 bg-[var(--carbon)] hover:bg-[#1a1410] text-white font-semibold"
            onClick={handleCerrar} disabled={cargando || !montoReal}
          >
            {cargando ? 'Cerrando…' : 'Confirmar cierre'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: registrar gasto en efectivo ───────────────────────────────────────

function ModalRegistrarGasto({
  onRegistrado,
  onCancelar,
  gastoAEditar,
}: {
  onRegistrado: () => void;
  onCancelar: () => void;
  gastoAEditar?: { id: string; monto: string; motivo: string } | null;
}) {
  const [monto, setMonto] = useState(gastoAEditar ? gastoAEditar.monto : '');
  const [motivo, setMotivo] = useState(gastoAEditar ? gastoAEditar.motivo : '');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valMonto = parseFloat(monto);
    if (isNaN(valMonto) || valMonto <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }
    const valMotivo = motivo.trim();
    if (!valMotivo) {
      toast.error('Ingresa un motivo para el gasto');
      return;
    }

    setGuardando(true);
    try {
      if (gastoAEditar) {
        await api.caja.editarGasto(gastoAEditar.id, valMonto, valMotivo);
        toast.success('Gasto actualizado');
      } else {
        await api.caja.registrarGasto(valMonto, valMotivo);
        toast.success('Gasto registrado');
      }
      onRegistrado();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar gasto');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-border shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in duration-200">
        <div>
          <h3 className="font-bold text-lg text-[var(--carbon)]">
            {gastoAEditar ? 'Editar Gasto' : 'Registrar Gasto'}
          </h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            {gastoAEditar ? 'Modifica los datos del gasto seleccionado.' : 'El monto se retirará en efectivo de la caja activa.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Monto (S/)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">S/</span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full pl-8 pr-3 h-10 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-[var(--crema)] font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Motivo / Descripción</label>
            <input
              type="text"
              required
              placeholder="Ej: Compra de tuppers, gaseosas..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-[var(--crema)]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancelar}
              disabled={guardando}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-[var(--terracota)] hover:bg-[#9e3726] text-white rounded-xl"
            >
              {guardando ? 'Guardando…' : (gastoAEditar ? 'Guardar' : 'Registrar')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CajaPage() {
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined);
  const [visitas, setVisitas] = useState<VisitaResumen[]>([]);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaResumen | null>(null);
  const [detalle, setDetalle] = useState<DetalleVisitaCaja | null>(null);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [mostrarGasto, setMostrarGasto] = useState(false);
  const [gastoAEditar, setGastoAEditar] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const handleEliminarGasto = async (gastoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto? El monto volverá al efectivo teórico de la caja.')) {
      return;
    }
    try {
      await api.caja.eliminarGasto(gastoId);
      toast.success('Gasto eliminado');
      fetchDatos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el gasto');
    }
  };

  // Estados de navegación por tabs
  const [tabActivo, setTabActivo] = useState<'cobros' | 'llevar' | 'delivery'>('cobros');

  // Estados de carga de productos
  const [productos, setProductos] = useState<PlatoCarta[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para formulario "Para llevar"
  const [nombreLlevar, setNombreLlevar] = useState('');
  const [basketLlevar, setBasketLlevar] = useState<BasketItem[]>([]);
  const [guardandoLlevar, setGuardandoLlevar] = useState(false);

  // Estados para formulario "Delivery"
  const [nombreDelivery, setNombreDelivery] = useState('');
  const [telefonoDelivery, setTelefonoDelivery] = useState('');
  const [direccionDelivery, setDireccionDelivery] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('5.00');
  const [basketDelivery, setBasketDelivery] = useState<BasketItem[]>([]);
  const [guardandoDelivery, setGuardandoDelivery] = useState(false);

  const fetchDatos = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([
        api.caja.turnoActual(),
        api.caja.visitasParaCobrar(),
      ]);
      setTurno(t);
      setVisitas(v);
    } catch {
      setTurno(null);
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial y timer de polling
  useEffect(() => {
    fetchDatos();
    const id = setInterval(fetchDatos, 8000);

    // Cargar productos de la carta
    api.menu.list().then(setProductos).catch(() => {});

    return () => clearInterval(id);
  }, [fetchDatos]);

  async function handleSeleccionarVisita(v: VisitaResumen) {
    setVisitaSeleccionada(v);
    setDetalle(null);
    try {
      const d = await api.caja.detalleVisita(v.visitaId);
      setDetalle(d);
    } catch { /* silencioso */ }
  }

  function handleCobrado() {
    setVisitaSeleccionada(null);
    setDetalle(null);
    fetchDatos();
  }

  // Lógica del carrito
  function handleAgregar(plato: PlatoCarta, isDelivery: boolean) {
    const setBasket = isDelivery ? setBasketDelivery : setBasketLlevar;
    setBasket((prev) => {
      const idx = prev.findIndex((i) => i.plato.id === plato.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 };
        return next;
      }
      return [...prev, { plato, cantidad: 1, notas: '' }];
    });
    toast.success(`${plato.nombre} agregado`);
  }

  function handleUpdateQty(platoId: string, diff: number, isDelivery: boolean) {
    const setBasket = isDelivery ? setBasketDelivery : setBasketLlevar;
    setBasket((prev) =>
      prev.map((item) => {
        if (item.plato.id === platoId) {
          const newQty = Math.max(1, item.cantidad + diff);
          return { ...item, cantidad: newQty };
        }
        return item;
      })
    );
  }

  function handleUpdateNotas(platoId: string, notas: string, isDelivery: boolean) {
    const setBasket = isDelivery ? setBasketDelivery : setBasketLlevar;
    setBasket((prev) =>
      prev.map((item) => {
        if (item.plato.id === platoId) {
          return { ...item, notas };
        }
        return item;
      })
    );
  }

  function handleQuitar(platoId: string, isDelivery: boolean) {
    const setBasket = isDelivery ? setBasketDelivery : setBasketLlevar;
    setBasket((prev) => prev.filter((i) => i.plato.id !== platoId));
  }

  // Sumas de la cesta actual
  const sumBasket = (basketList: BasketItem[]) =>
    basketList.reduce((s, i) => s + parseFloat(i.plato.precio) * i.cantidad, 0);

  // Registro de pedidos rápidos
  async function submitPedidoLlevar(cobrarInmediatamente: boolean) {
    const nombre = nombreLlevar.trim();
    if (!nombre) { toast.error('Ingresa el nombre del cliente'); return; }
    if (!basketLlevar.length) { toast.error('La cesta está vacía'); return; }

    setGuardandoLlevar(true);
    try {
      const res = await api.caja.crearPedidoLlevar({
        nombreCliente: nombre,
        items: basketLlevar.map((i) => ({
          platoCartaId: i.plato.id,
          cantidad: i.cantidad,
          notas: i.notas || undefined,
        })),
      });

      toast.success('Pedido para llevar creado');
      const savedBasket = [...basketLlevar];
      setNombreLlevar('');
      setBasketLlevar([]);
      setTabActivo('cobros');
      await fetchDatos();

      if (cobrarInmediatamente && res.visitaId) {
        const totalVal = sumBasket(savedBasket);
        const tempVisita: VisitaResumen = {
          visitaId: res.visitaId,
          mesaNumero: null,
          tipo: 'llevar',
          nombreCliente: nombre,
          paraLlevar: true,
          fechaApertura: new Date().toISOString(),
          total: totalVal.toFixed(2),
          pedidos: 1,
        };
        handleSeleccionarVisita(tempVisita);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setGuardandoLlevar(false);
    }
  }

  async function submitPedidoDelivery(cobrarInmediatamente: boolean) {
    const nombre = nombreDelivery.trim();
    const direccion = direccionDelivery.trim();
    const costo = parseFloat(costoEnvio || '0');

    if (!nombre) { toast.error('Ingresa el nombre del cliente'); return; }
    if (!direccion) { toast.error('Ingresa la dirección de entrega'); return; }
    if (isNaN(costo) || costo < 0) { toast.error('Ingresa un costo de envío válido'); return; }
    if (!basketDelivery.length) { toast.error('La cesta está vacía'); return; }

    setGuardandoDelivery(true);
    try {
      const res = await api.caja.crearPedidoDelivery({
        nombreCliente: nombre,
        telefonoCliente: telefonoDelivery.trim() || undefined,
        direccionDelivery: direccion,
        costoEnvio: costo,
        items: basketDelivery.map((i) => ({
          platoCartaId: i.plato.id,
          cantidad: i.cantidad,
          notas: i.notas || undefined,
        })),
      });

      toast.success('Pedido delivery creado');
      const savedBasket = [...basketDelivery];
      setNombreDelivery('');
      setTelefonoDelivery('');
      setDireccionDelivery('');
      setCostoEnvio('5.00');
      setBasketDelivery([]);
      setTabActivo('cobros');
      await fetchDatos();

      if (cobrarInmediatamente && res.visitaId) {
        const totalVal = sumBasket(savedBasket) + costo;
        const tempVisita: VisitaResumen = {
          visitaId: res.visitaId,
          mesaNumero: null,
          tipo: 'delivery',
          nombreCliente: nombre,
          telefonoCliente: telefonoDelivery.trim() || null,
          direccionDelivery: direccion,
          costoEnvio: costo.toFixed(2),
          paraLlevar: true,
          fechaApertura: new Date().toISOString(),
          total: totalVal.toFixed(2),
          pedidos: 1,
        };
        handleSeleccionarVisita(tempVisita);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setGuardandoDelivery(false);
    }
  }

  if (turno === undefined || cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;
  }

  if (!turno) {
    return <AbrirTurno onAbierto={(t) => { setTurno(t); fetchDatos(); }} />;
  }

  const horaApertura = new Date(turno.fechaApertura).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  // Filtrado de catálogo
  const productosFiltrados = productos.filter((p) => {
    if (!p.activo) return false;
    const matchCat = catSeleccionada === 'todos' || p.categoria === catSeleccionada;
    const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 space-y-5 max-w-6xl mx-auto">
      {/* Header / Estado del Turno */}
      <div className="rounded-2xl bg-[var(--carbon)] text-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-widest">Turno activo</p>
            <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
              <Clock size={13} /> Desde {horaApertura}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarGasto(true)}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              Registrar gasto
            </button>
            <button
              onClick={() => setMostrarCierre(true)}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition-colors bg-white/5"
            >
              Cerrar turno
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Apertura</p>
            <p className="font-bold">S/{turno.montoApertura}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Ventas</p>
            <p className="font-bold text-[var(--dorado)]">S/{turno.totalTurno ?? '0.00'}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Gastos</p>
            <p className="font-bold text-[var(--terracota)]">S/{turno.totalGastos ?? '0.00'}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Efectivo caja</p>
            <p className="font-bold text-[var(--dorado)]">S/{turno.montoCierreTeorico ?? turno.montoApertura}</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTabActivo('cobros')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
            tabActivo === 'cobros'
              ? 'border-[var(--dorado)] text-[var(--carbon)] font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Cobrar mesa / comanda ({visitas.length})
        </button>
        <button
          onClick={() => setTabActivo('llevar')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
            tabActivo === 'llevar'
              ? 'border-[var(--dorado)] text-[var(--carbon)] font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🥡 Nuevo Para Llevar
        </button>
        <button
          onClick={() => setTabActivo('delivery')}
          className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-colors ${
            tabActivo === 'delivery'
              ? 'border-[var(--dorado)] text-[var(--carbon)] font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🛵 Nuevo Delivery
        </button>
      </div>

      {/* CONTENIDO TAB 1: COBROS */}
      {tabActivo === 'cobros' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado de cuentas para cobrar */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-[var(--carbon)]">Cuentas activas</h2>
              <span className="text-sm text-muted-foreground">{visitas.length} pedido{visitas.length !== 1 ? 's' : ''}</span>
            </div>

            {visitas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-border rounded-2xl text-center text-muted-foreground gap-2">
                <Receipt size={36} className="opacity-30" />
                <p className="font-medium">Sin pedidos pendientes de cobro</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visitas.map((v) => {
                  const hora = new Date(v.fechaApertura).toLocaleTimeString('es-PE', {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  });
                  return (
                    <button
                      key={v.visitaId}
                      onClick={() => handleSeleccionarVisita(v)}
                      className="w-full flex items-center justify-between rounded-xl border bg-white px-4 py-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-base text-[var(--carbon)] flex items-center gap-1.5">
                          {v.tipo === 'llevar' ? (
                            <>
                              <span className="bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full px-2 py-0.5">🥡 Llevar</span>
                              <span>{v.nombreCliente || 'Cliente'}</span>
                            </>
                          ) : v.tipo === 'delivery' ? (
                            <>
                              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full px-2 py-0.5">🛵 Delivery</span>
                              <span>{v.nombreCliente || 'Cliente'}</span>
                            </>
                          ) : (
                            <>
                              <span className="bg-green-100 text-green-800 text-[11px] font-bold rounded-full px-2 py-0.5">🍽️ Mesa {v.mesaNumero}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {v.tipo === 'delivery' && v.direccionDelivery && (
                            <span className="block truncate max-w-[280px] font-medium text-[var(--carbon)]">Dir: {v.direccionDelivery}</span>
                          )}
                          Desde {hora} · {v.pedidos} ronda{v.pedidos !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-[var(--carbon)]">S/{v.total}</span>
                        <ChevronRight size={18} className="text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historial de cobros */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Cobros de este turno ({turno.pagos?.length ?? 0})
            </h3>
            {turno.pagos && turno.pagos.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-white max-h-[400px] overflow-y-auto">
                {turno.pagos.map((p) => {
                  const hora = new Date(p.fechaPago).toLocaleTimeString('es-PE', {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  });
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--carbon)]">
                          {p.mesaNumero != null ? `Mesa ${p.mesaNumero}` : 'Rápido'}
                        </span>
                        <span className="text-muted-foreground text-xs">{hora}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 font-medium text-muted-foreground">
                          {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                        </span>
                        <span className="font-bold text-[var(--carbon)]">S/{p.montoTotal}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No se han registrado pagos en este turno.</p>
            )}
          </div>

          {/* Historial de gastos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Gastos de este turno ({turno.gastos?.length ?? 0})
            </h3>
            {turno.gastos && turno.gastos.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-white max-h-[250px] overflow-y-auto">
                {turno.gastos.map((g) => {
                  const hora = new Date(g.createdAt).toLocaleTimeString('es-PE', {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                  });
                  return (
                    <div key={g.id} className="flex items-center justify-between px-4 py-3 text-sm group hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--carbon)] truncate">{g.motivo}</p>
                        <p className="text-muted-foreground text-xs">{hora}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="font-bold text-[var(--terracota)]">S/{g.monto}</span>
                        {turno.estado !== 'cerrado' && (
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setGastoAEditar(g);
                                setMostrarGasto(true);
                              }}
                              className="text-muted-foreground hover:text-[var(--dorado)] p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="Editar gasto"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleEliminarGasto(g.id)}
                              className="text-muted-foreground hover:text-red-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No se han registrado gastos en este turno.</p>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 2 & 3: FORMULARIOS NUEVOS PEDIDOS (GRID COMPARTIDO) */}
      {(tabActivo === 'llevar' || tabActivo === 'delivery') && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda: Formulario + Cesta (Basket) */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white border border-border rounded-2xl p-4 space-y-4 shadow-sm">
              <h2 className="font-bold text-[var(--carbon)] text-base flex items-center gap-2">
                <ShoppingBag className="text-[var(--dorado)]" size={18} />
                {tabActivo === 'llevar' ? 'Datos del Cliente (Llevar)' : 'Datos de Entrega (Delivery)'}
              </h2>

              {/* Formulario de Cliente */}
              {tabActivo === 'llevar' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre del Cliente *</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={nombreLlevar}
                    onChange={(e) => setNombreLlevar(e.target.value)}
                    className="w-full h-11 px-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre del Cliente *</label>
                    <input
                      type="text"
                      placeholder="Ej. María Gómez"
                      value={nombreDelivery}
                      onChange={(e) => setNombreDelivery(e.target.value)}
                      className="w-full h-11 px-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Teléfono (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej. 987654321"
                        value={telefonoDelivery}
                        onChange={(e) => setTelefonoDelivery(e.target.value)}
                        className="w-full h-11 px-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Costo Envío *</label>
                      <input
                        type="number"
                        step="0.50"
                        value={costoEnvio}
                        onChange={(e) => setCostoEnvio(e.target.value)}
                        className="w-full h-11 px-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Dirección de Entrega *</label>
                    <input
                      type="text"
                      placeholder="Ej. Av. Larco 123, Dpto 402"
                      value={direccionDelivery}
                      onChange={(e) => setDireccionDelivery(e.target.value)}
                      className="w-full h-11 px-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Basket list */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Artículos en cesta</p>
                
                {(() => {
                  const basketList = tabActivo === 'llevar' ? basketLlevar : basketDelivery;
                  return basketList.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-4 text-center">La cesta está vacía. Selecciona productos a la derecha.</p>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {basketList.map((item) => (
                        <div key={item.plato.id} className="space-y-1.5 border-b border-dashed border-border pb-2.5">
                          <div className="flex justify-between items-start text-sm">
                            <div className="font-semibold text-[var(--carbon)] max-w-[180px] truncate">{item.plato.nombre}</div>
                            <div className="font-bold">S/{(parseFloat(item.plato.precio) * item.cantidad).toFixed(2)}</div>
                          </div>
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              placeholder="Agregar nota"
                              value={item.notas}
                              onChange={(e) => handleUpdateNotas(item.plato.id, e.target.value, tabActivo === 'delivery')}
                              className="h-7 px-2 border border-border rounded-lg text-xs w-[140px] focus:outline-none bg-gray-50"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQty(item.plato.id, -1, tabActivo === 'delivery')}
                                className="w-7 h-7 flex items-center justify-center border border-border rounded-lg text-sm bg-white hover:bg-muted font-bold"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.cantidad}</span>
                              <button
                                onClick={() => handleUpdateQty(item.plato.id, 1, tabActivo === 'delivery')}
                                className="w-7 h-7 flex items-center justify-center border border-border rounded-lg text-sm bg-white hover:bg-muted font-bold"
                              >
                                +
                              </button>
                              <button
                                onClick={() => handleQuitar(item.plato.id, tabActivo === 'delivery')}
                                className="text-muted-foreground hover:text-[var(--terracota)] ml-1"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Resumen de totales de cesta */}
              <div className="border-t border-border pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal Cesta</span>
                  <span>S/{sumBasket(tabActivo === 'llevar' ? basketLlevar : basketDelivery).toFixed(2)}</span>
                </div>
                {tabActivo === 'delivery' && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Costo de Envío</span>
                    <span>S/{parseFloat(costoEnvio || '0').toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-[var(--carbon)] border-t border-border pt-2">
                  <span>Total</span>
                  <span>S/{(sumBasket(tabActivo === 'llevar' ? basketLlevar : basketDelivery) + (tabActivo === 'delivery' ? parseFloat(costoEnvio || '0') : 0)).toFixed(2)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => tabActivo === 'llevar' ? submitPedidoLlevar(false) : submitPedidoDelivery(false)}
                  disabled={guardandoLlevar || guardandoDelivery || !(tabActivo === 'llevar' ? basketLlevar.length : basketDelivery.length)}
                  className="h-11 rounded-xl text-xs font-semibold text-[var(--carbon)]"
                >
                  Solo Guardar
                </Button>
                <Button
                  onClick={() => tabActivo === 'llevar' ? submitPedidoLlevar(true) : submitPedidoDelivery(true)}
                  disabled={guardandoLlevar || guardandoDelivery || !(tabActivo === 'llevar' ? basketLlevar.length : basketDelivery.length)}
                  className="h-11 rounded-xl bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] text-xs font-bold"
                >
                  Cobrar de Inmediato
                </Button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Catálogo de Platos para selección rápida */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Buscador + Categorías */}
            <div className="bg-white border border-border rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 h-10 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] text-sm bg-white"
                />
              </div>

              {/* Categorías (Scroll Horizontal) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {CATEGORIAS_CARTA.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCatSeleccionada(cat.key)}
                    className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      catSeleccionada === cat.key
                        ? 'bg-[var(--dorado)] text-[var(--carbon)]'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de platos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {productosFiltrados.length === 0 ? (
                <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
                  No se encontraron productos en esta sección.
                </div>
              ) : (
                productosFiltrados.map((plato) => (
                  <button
                    key={plato.id}
                    disabled={!plato.disponible}
                    onClick={() => handleAgregar(plato, tabActivo === 'delivery')}
                    className={`w-full text-left p-3 rounded-xl border transition-colors flex flex-col justify-between h-20 shadow-sm ${
                      plato.disponible
                        ? 'border-border bg-white hover:border-[var(--dorado)] hover:bg-[var(--dorado)]/5'
                        : 'border-border bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-semibold text-xs text-[var(--carbon)] line-clamp-1 pr-1">{plato.nombre}</span>
                      <span className="font-bold text-xs text-[var(--carbon)] shrink-0">S/{parseFloat(plato.precio).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-muted-foreground capitalize truncate max-w-[80px]">
                        {plato.categoria.replace(/_/g, ' ')}
                      </span>
                      {!plato.disponible ? (
                        <span className="text-[9px] bg-red-100 text-red-800 font-bold rounded-full px-2 py-0.5">Agotado</span>
                      ) : (
                        <span className="text-[9px] bg-[var(--dorado)]/20 text-[var(--carbon)] font-bold rounded-full px-2 py-0.5">
                          + Agregar
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      {visitaSeleccionada && (
        <ModalCobro
          visita={visitaSeleccionada}
          detalle={detalle}
          onCobrado={handleCobrado}
          onCerrar={() => setVisitaSeleccionada(null)}
        />
      )}

      {mostrarCierre && (
        <ModalCierreTurno
          turno={turno}
          onCerrado={() => { setMostrarCierre(false); setTurno(null); fetchDatos(); }}
          onCancelar={() => setMostrarCierre(false)}
        />
      )}

      {mostrarGasto && (
        <ModalRegistrarGasto
          gastoAEditar={gastoAEditar}
          onRegistrado={() => {
            setMostrarGasto(false);
            setGastoAEditar(null);
            fetchDatos();
          }}
          onCancelar={() => {
            setMostrarGasto(false);
            setGastoAEditar(null);
          }}
        />
      )}
    </div>
  );
}
