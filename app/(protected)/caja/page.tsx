'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, TurnoCaja, VisitaResumen, DetalleVisitaCaja } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Clock, Receipt, ChevronRight, X, Plus, Trash2 } from 'lucide-react';

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
  const totalVisita = parseFloat(detalle?.total ?? visita.total);
  const [lineas, setLineas] = useState<LineaPago[]>([
    { id: 0, metodo: 'efectivo', monto: visita.total },
  ]);
  const [cargando, setCargando] = useState(false);
  let nextId = lineas.length;

  const totalLineas = lineas.reduce((s, l) => s + parseFloat(l.monto || '0'), 0);
  const pendiente = totalVisita - totalLineas;
  const cuadrado = Math.abs(pendiente) < 0.01;

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

  async function handleCobrar() {
    if (!cuadrado) { toast.error('Los pagos no suman el total'); return; }
    setCargando(true);
    try {
      await api.caja.registrarPago(
        visita.visitaId,
        lineas.map((l) => ({ metodoPago: l.metodo, monto: parseFloat(l.monto) })),
      );
      toast.success(`Mesa ${visita.mesaNumero} cobrada · S/${totalVisita.toFixed(2)}`);
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
          <h3 className="font-bold text-lg text-[var(--carbon)]">Mesa {visita.mesaNumero}</h3>
          <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Detalle de consumo */}
          <div className="p-5 space-y-2">
            {detalle ? (
              <ul className="space-y-1.5">
                {detalle.resumen.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.cantidad}× {item.nombre}</span>
                    <span className="font-medium">S/{(parseFloat(item.precioUnitario) * item.cantidad).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Cargando detalle…</p>
            )}
            <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-[var(--carbon)]">S/{(detalle?.total ?? visita.total)}</span>
            </div>
          </div>

          {/* Líneas de pago */}
          <div className="px-5 pb-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Forma de pago</p>

            <div className="space-y-2">
              {lineas.map((linea) => (
                <div key={linea.id} className="flex items-center gap-2">
                  <select
                    value={linea.metodo}
                    onChange={(e) => updateLinea(linea.id, 'metodo', e.target.value)}
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
              <span>S/{totalLineas.toFixed(2)} / S/{totalVisita.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botón cobrar */}
        <div className="px-5 pb-5 pt-2 shrink-0 border-t border-border">
          <Button
            className="w-full h-12 text-base bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-bold disabled:opacity-50"
            onClick={handleCobrar} disabled={cargando || !cuadrado}
          >
            {cargando ? 'Registrando…' : `Cobrar S/${totalVisita.toFixed(2)}`}
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
          <div className="rounded-xl bg-[#fdf3d8] px-4 py-3 space-y-1.5 text-sm">
            <p className="text-xs font-semibold text-[var(--dorado)] uppercase tracking-widest">Efectivo en caja</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Apertura</span><span>S/{turno.montoApertura}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ventas efectivo</span><span>S/{canal.efectivo}</span></div>
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CajaPage() {
  const [turno, setTurno] = useState<TurnoCaja | null | undefined>(undefined);
  const [visitas, setVisitas] = useState<VisitaResumen[]>([]);
  const [visitaSeleccionada, setVisitaSeleccionada] = useState<VisitaResumen | null>(null);
  const [detalle, setDetalle] = useState<DetalleVisitaCaja | null>(null);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [cargando, setCargando] = useState(true);

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

  useEffect(() => {
    fetchDatos();
    const id = setInterval(fetchDatos, 8000);
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

  if (turno === undefined || cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando…</div>;
  }

  if (!turno) {
    return <AbrirTurno onAbierto={(t) => { setTurno(t); fetchDatos(); }} />;
  }

  const horaApertura = new Date(turno.fechaApertura).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <div className="p-5 space-y-5 max-w-2xl mx-auto">
      {/* Estado del turno */}
      <div className="rounded-2xl bg-[var(--carbon)] text-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-widest">Turno activo</p>
            <p className="text-sm text-white/80 flex items-center gap-1 mt-0.5">
              <Clock size={13} /> Desde {horaApertura}
            </p>
          </div>
          <button
            onClick={() => setMostrarCierre(true)}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            Cerrar turno
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Apertura</p>
            <p className="font-bold">S/{turno.montoApertura}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Ventas</p>
            <p className="font-bold text-[var(--dorado)]">S/{turno.totalTurno ?? '0.00'}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 space-y-0.5">
            <p className="text-xs text-white/60">Efectivo caja</p>
            <p className="font-bold text-[var(--dorado)]">S/{turno.montoCierreTeorico ?? turno.montoApertura}</p>
          </div>
        </div>
      </div>

      {/* Mesas para cobrar */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-[var(--carbon)]">Para cobrar</h2>
          <span className="text-sm text-muted-foreground">{visitas.length} mesa{visitas.length !== 1 ? 's' : ''}</span>
        </div>

        {visitas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
            <Receipt size={36} className="opacity-30" />
            <p className="font-medium">Sin mesas pendientes de cobro</p>
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
                    <p className="font-bold text-lg text-[var(--carbon)]">Mesa {v.mesaNumero}</p>
                    <p className="text-xs text-muted-foreground">
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

      {/* Historial de cobros del turno */}
      {turno.pagos && turno.pagos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Cobros de este turno ({turno.pagos.length})
          </h3>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {turno.pagos.map((p) => {
              const hora = new Date(p.fechaPago).toLocaleTimeString('es-PE', {
                hour: '2-digit', minute: '2-digit', hour12: false,
              });
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--carbon)]">
                      {p.mesaNumero != null ? `Mesa ${p.mesaNumero}` : '—'}
                    </span>
                    <span className="text-muted-foreground">{hora}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 font-medium">
                      {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                    </span>
                    <span className="font-bold text-[var(--carbon)]">S/{p.montoTotal}</span>
                  </div>
                </div>
              );
            })}
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
    </div>
  );
}
