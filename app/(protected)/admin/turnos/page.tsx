'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, TurnoResumen } from '@/lib/api';

const CANALES: Array<{ key: keyof TurnoResumen['porCanal']; label: string }> = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'yape_plin',     label: 'Yape/Plin' },
  { key: 'transferencia', label: 'Transf.' },
];

export default function AdminTurnosPage() {
  const [turnos, setTurnos]   = useState<TurnoResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  const fetchTurnos = useCallback(async () => {
    try {
      const data = await api.admin.turnosHoy();
      setTurnos(data);
    } catch { /* silencioso */ }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    fetchTurnos();
    const id = setInterval(fetchTurnos, 15000);
    return () => clearInterval(id);
  }, [fetchTurnos]);

  const totalDia = turnos.reduce((s, t) => s + parseFloat(t.totalTurno), 0);
  const porCanalDia = CANALES.map(({ key, label }) => ({
    label,
    monto: turnos.reduce((s, t) => s + parseFloat(t.porCanal[key]), 0),
  }));

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando turnos…</div>;
  }

  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-[var(--carbon)]">Turnos de hoy</h2>

      {/* Resumen del día */}
      {turnos.length > 0 && (
        <div className="rounded-2xl bg-[var(--carbon)] text-white p-5 space-y-3">
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

      {/* Lista de turnos */}
      {turnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-2">
          <p className="font-medium">Sin turnos hoy</p>
          <p className="text-sm">El primer turno aparecerá aquí cuando el cajero lo abra</p>
        </div>
      ) : (
        <div className="space-y-3">
          {turnos.map((turno) => {
            const horaApertura = new Date(turno.fechaApertura).toLocaleTimeString('es-PE', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            });
            const horaCierre = turno.fechaCierre
              ? new Date(turno.fechaCierre).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
              : null;

            const diferencia = turno.diferencia ? parseFloat(turno.diferencia) : null;

            return (
              <div key={turno.id} className="rounded-2xl bg-white border border-border overflow-hidden">
                {/* Header del turno */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <div>
                    <p className="font-semibold text-[var(--carbon)]">{turno.cajeroNombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {horaApertura}{horaCierre ? ` → ${horaCierre}` : ' → ahora'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
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
                <div className="grid grid-cols-4 divide-x divide-border">
                  {CANALES.map(({ key, label }) => {
                    const monto = parseFloat(turno.porCanal[key]);
                    return (
                      <div key={key} className="px-3 py-3 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={['text-sm font-semibold', monto > 0 ? 'text-[var(--carbon)]' : 'text-muted-foreground/40'].join(' ')}>
                          S/{turno.porCanal[key]}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Cuadre (si está cerrado) */}
                {turno.estado === 'cerrado' && turno.montoCierreReal && (
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between text-sm bg-muted/30">
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
    </div>
  );
}
