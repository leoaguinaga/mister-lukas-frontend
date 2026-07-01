'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, TurnoResumen, TurnoDetalle } from '@/lib/api';

const CANALES: Array<{ key: keyof TurnoResumen['porCanal']; label: string }> = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'yape_plin',     label: 'Yape/Plin' },
  { key: 'transferencia', label: 'Transf.' },
];

export default function AdminTurnosPage() {
  const [activeTab, setActiveTab] = useState<'hoy' | 'historial'>('hoy');
  const [turnos, setTurnos] = useState<TurnoResumen[]>([]);
  const [historial, setHistorial] = useState<TurnoResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros de historial
  const [filtroCajero, setFiltroCajero] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'abierto' | 'cerrado'>('todos');

  // Modal de Detalle
  const [selectedTurnoId, setSelectedTurnoId] = useState<string | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleTurno, setDetalleTurno] = useState<TurnoDetalle | null>(null);

  const fetchTurnos = useCallback(async () => {
    try {
      const data = await api.admin.turnosHoy();
      setTurnos(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  const fetchHistorial = useCallback(async () => {
    try {
      const data = await api.admin.turnosHistorial();
      setHistorial(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetchTurnos();
    fetchHistorial();
    const id = setInterval(fetchTurnos, 15000);
    return () => clearInterval(id);
  }, [fetchTurnos, fetchHistorial]);

  const handleVerDetalle = async (id: string) => {
    setSelectedTurnoId(id);
    setDetalleCargando(true);
    setDetalleTurno(null);
    try {
      const detail = await api.admin.turnoDetalle(id);
      setDetalleTurno(detail);
    } catch {
      toast.error('No se pudo cargar el detalle del turno');
      setSelectedTurnoId(null);
    } finally {
      setDetalleCargando(false);
    }
  };

  const totalDia = turnos.reduce((s, t) => s + parseFloat(t.totalTurno), 0);
  const porCanalDia = CANALES.map(({ key, label }) => ({
    label,
    monto: turnos.reduce((s, t) => s + parseFloat(t.porCanal[key]), 0),
  }));

  const turnosFiltrados = (activeTab === 'hoy' ? turnos : historial).filter((t) => {
    if (activeTab === 'hoy') return true;
    const matchesCajero = t.cajeroNombre.toLowerCase().includes(filtroCajero.toLowerCase());
    const matchesEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
    return matchesCajero && matchesEstado;
  });

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando turnos…</div>;
  }

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Control de Caja</h2>
        <p className="text-xs text-muted-foreground">Visualiza y supervisa los turnos de caja en tiempo real y el histórico.</p>
      </div>

      {/* Pestañas (Tabs) */}
      <div className="flex border border-border bg-white rounded-2xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('hoy')}
          className={[
            'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors',
            activeTab === 'hoy'
              ? 'bg-[var(--dorado)] text-[var(--carbon)]'
              : 'text-muted-foreground hover:text-[var(--carbon)] hover:bg-black/5',
          ].join(' ')}
        >
          Turnos de Hoy
        </button>
        <button
          onClick={() => {
            setActiveTab('historial');
            fetchHistorial(); // Refrescar historial al cambiar
          }}
          className={[
            'flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors',
            activeTab === 'historial'
              ? 'bg-[var(--dorado)] text-[var(--carbon)]'
              : 'text-muted-foreground hover:text-[var(--carbon)] hover:bg-black/5',
          ].join(' ')}
        >
          Historial de Turnos
        </button>
      </div>

      {/* Resumen del día (solo en pestaña Hoy) */}
      {activeTab === 'hoy' && turnos.length > 0 && (
        <div className="rounded-2xl bg-[var(--carbon)] text-white p-5 space-y-3 shadow-sm">
          <p className="text-xs text-white/60 uppercase tracking-widest">Total del día</p>
          <p className="text-3xl font-bold text-[var(--dorado)]">S/{totalDia.toFixed(2)}</p>
          <div className="grid grid-cols-4 gap-2">
            {porCanalDia.filter(({ monto }) => monto > 0).map(({ label, monto }) => (
              <div key={label} className="rounded-xl bg-white/10 p-2.5 text-center">
                <p className="text-xs text-white/60">{label}</p>
                <p className="font-semibold text-sm">S/{monto.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de historial */}
      {activeTab === 'historial' && (
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-border shadow-sm">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por cajero..."
              value={filtroCajero}
              onChange={(e) => setFiltroCajero(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)]"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white"
            >
              <option value="todos">Todos los estados</option>
              <option value="abierto">Abiertos</option>
              <option value="cerrado">Cerrados</option>
            </select>
          </div>
        </div>
      )}

      {/* Lista de turnos */}
      {turnosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <p className="font-medium">Sin turnos que mostrar</p>
          <p className="text-sm">
            {activeTab === 'hoy'
              ? 'El primer turno aparecerá aquí cuando el cajero lo abra.'
              : 'Prueba a cambiar los filtros de búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {turnosFiltrados.map((turno) => {
            const horaApertura = new Date(turno.fechaApertura).toLocaleTimeString('es-PE', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            });
            const horaCierre = turno.fechaCierre
              ? new Date(turno.fechaCierre).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
              : null;

            const fechaLabel = new Date(turno.fechaApertura).toLocaleDateString('es-PE', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            });

            const diferencia = turno.diferencia ? parseFloat(turno.diferencia) : null;

            return (
              <div key={turno.id} className="rounded-2xl bg-white border border-border overflow-hidden shadow-sm hover:border-[var(--dorado)]/30 transition-colors">
                {/* Header del turno */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[var(--carbon)] flex items-center gap-2">
                      {turno.cajeroNombre}
                      {activeTab === 'historial' && (
                        <span className="text-[10px] bg-black/5 text-muted-foreground px-2 py-0.5 rounded-md font-normal">
                          {fechaLabel}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {horaApertura}{horaCierre ? ` → ${horaCierre}` : ' → ahora'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVerDetalle(turno.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border hover:bg-black/5 hover:border-black/20 transition-all text-[var(--carbon)] bg-white"
                    >
                      Ver Detalle
                    </button>
                    <span className={[
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      turno.estado === 'abierto'
                        ? 'bg-[var(--salvia)]/15 text-[var(--salvia)]'
                        : 'bg-muted text-muted-foreground',
                    ].join(' ')}>
                      {turno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                    </span>
                    <span className="text-xl font-bold text-[var(--carbon)]">S/{turno.totalTurno}</span>
                  </div>
                </div>

                {/* Desglose por canal */}
                <div className="grid grid-cols-4 divide-x divide-border bg-[var(--crema)]/30">
                  {CANALES.map(({ key, label }) => {
                    const monto = parseFloat(turno.porCanal[key]);
                    return (
                      <div key={key} className="px-3 py-3 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={['text-sm font-semibold mt-0.5', monto > 0 ? 'text-[var(--carbon)]' : 'text-muted-foreground/35'].join(' ')}>
                          S/{turno.porCanal[key]}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Cuadre (si está cerrado) */}
                {turno.estado === 'cerrado' && turno.montoCierreReal && (
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between text-sm bg-muted/20">
                    <div className="flex gap-4 text-muted-foreground">
                      <span>Teórico <strong className="text-[var(--carbon)]">S/{turno.montoCierreTeorico}</strong></span>
                      <span>Real <strong className="text-[var(--carbon)]">S/{turno.montoCierreReal}</strong></span>
                    </div>
                    {diferencia !== null && (
                      <span className={[
                        'text-xs font-bold px-2.5 py-1 rounded-full',
                        Math.abs(diferencia) < 0.01 ? 'bg-[#e8f0d8] text-[var(--salvia)]'
                          : diferencia > 0 ? 'bg-blue-50 text-blue-600'
                          : 'bg-[#fde8e4] text-[var(--terracota)]',
                      ].join(' ')}>
                        {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalles de Turno */}
      {selectedTurnoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="bg-white rounded-2xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[var(--crema)]">
              <div>
                <h3 className="font-semibold text-lg text-[var(--carbon)]">Detalles del Turno</h3>
                {detalleTurno && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Responsable: <strong className="text-[var(--carbon)]">{detalleTurno.cajeroNombre}</strong>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTurnoId(null)}
                className="text-muted-foreground hover:text-[var(--carbon)] transition-colors text-xs font-semibold px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10"
              >
                Cerrar
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detalleCargando ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <div className="animate-spin h-6 w-6 border-2 border-[var(--dorado)] border-t-transparent rounded-full"></div>
                  <p className="text-sm">Cargando transacciones…</p>
                </div>
              ) : !detalleTurno ? (
                <div className="text-center py-12 text-[var(--terracota)] font-medium">
                  Error al cargar el detalle del turno.
                </div>
              ) : (
                <>
                  {/* Resumen del Turno */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Estado</p>
                      <span className={[
                        'text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1',
                        detalleTurno.estado === 'abierto'
                          ? 'bg-[var(--salvia)]/15 text-[var(--salvia)]'
                          : 'bg-muted text-muted-foreground',
                      ].join(' ')}>
                        {detalleTurno.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Monto Apertura</p>
                      <p className="font-bold text-sm text-[var(--carbon)] mt-1">S/{parseFloat(detalleTurno.montoApertura).toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Gastos</p>
                      <p className="font-bold text-sm text-[var(--terracota)] mt-1">S/{parseFloat(detalleTurno.totalGastos ?? '0').toFixed(2)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Cierre Teórico</p>
                      <p className="font-bold text-sm text-[var(--dorado)] mt-1">S/{parseFloat(detalleTurno.montoCierreTeorico ?? '0').toFixed(2)}</p>
                    </div>
                    {detalleTurno.estado === 'cerrado' && (
                      <>
                        <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Cierre Real</p>
                          <p className="font-bold text-sm text-[var(--carbon)] mt-1">S/{parseFloat(detalleTurno.montoCierreReal ?? '0').toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-[var(--crema)]/30 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Diferencia</p>
                          {(() => {
                            const diff = parseFloat(detalleTurno.diferencia ?? '0');
                            return (
                              <span className={[
                                'text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1',
                                Math.abs(diff) < 0.01 ? 'bg-[#e8f0d8] text-[var(--salvia)]'
                                  : diff > 0 ? 'bg-blue-50 text-blue-600'
                                  : 'bg-[#fde8e4] text-[var(--terracota)]',
                              ].join(' ')}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                              </span>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Fechas y Duración */}
                  <div className="rounded-xl border border-border p-4 text-xs space-y-2 bg-white shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Fecha y Hora Apertura:</span>
                      <span className="font-semibold text-[var(--carbon)]">
                        {new Date(detalleTurno.fechaApertura).toLocaleString('es-PE')}
                      </span>
                    </div>
                    {detalleTurno.fechaCierre && (
                      <div className="flex justify-between items-center border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">Fecha y Hora Cierre:</span>
                        <span className="font-semibold text-[var(--carbon)]">
                          {new Date(detalleTurno.fechaCierre).toLocaleString('es-PE')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Canales de Pago */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Desglose de Canales</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      {CANALES.map(({ key, label }) => {
                        const monto = parseFloat(detalleTurno.porCanal[key]);
                        return (
                          <div key={key} className="rounded-xl border border-border p-3 text-center bg-white shadow-sm">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className={['font-bold text-sm mt-1', monto > 0 ? 'text-[var(--carbon)]' : 'text-muted-foreground/35'].join(' ')}>
                              S/{monto.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Listado de Pagos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Transacciones Realizadas ({detalleTurno.pagos.length})</h4>
                      <span className="text-sm font-bold text-[var(--carbon)]">Total Turno: S/{parseFloat(detalleTurno.totalTurno).toFixed(2)}</span>
                    </div>

                    {detalleTurno.pagos.length === 0 ? (
                      <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        No se registraron cobros durante este turno.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border overflow-hidden bg-white divide-y divide-border shadow-sm">
                        {detalleTurno.pagos.map((p) => {
                          const horaPago = new Date(p.fechaPago).toLocaleTimeString('es-PE', {
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          });

                          const labelVisita = p.visitaTipo === 'mesa'
                            ? `Mesa ${p.mesaNumero}`
                            : p.visitaTipo === 'llevar'
                            ? `Para Llevar ${p.clienteNombre ? `(${p.clienteNombre})` : ''}`
                            : `Delivery ${p.clienteNombre ? `(${p.clienteNombre})` : ''}`;

                          return (
                            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/10 transition-colors">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-[var(--carbon)]">{labelVisita}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">
                                  {horaPago} · <span className="font-medium text-[var(--carbon)]">{p.metodoPago.replace('_', ' / ')}</span>
                                </p>
                              </div>
                              <span className="font-bold text-sm text-[var(--carbon)]">S/{parseFloat(p.montoTotal).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Listado de Gastos */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Gastos Registrados ({detalleTurno.gastos?.length ?? 0})</h4>
                      <span className="text-sm font-bold text-[var(--terracota)]">Total Gastos: S/{parseFloat(detalleTurno.totalGastos ?? '0').toFixed(2)}</span>
                    </div>

                    {!detalleTurno.gastos || detalleTurno.gastos.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                        No se registraron gastos durante este turno.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border overflow-hidden bg-white divide-y divide-border shadow-sm">
                        {detalleTurno.gastos.map((g) => {
                          const horaGasto = new Date(g.createdAt).toLocaleTimeString('es-PE', {
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          });
                          return (
                            <div key={g.id} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/10 transition-colors">
                              <div className="space-y-0.5">
                                <p className="font-semibold text-[var(--carbon)]">{g.motivo}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">
                                  {horaGasto}
                                </p>
                              </div>
                              <span className="font-bold text-sm text-[var(--terracota)]">S/{parseFloat(g.monto).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

