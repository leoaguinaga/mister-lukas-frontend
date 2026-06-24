'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, TurnoResumen, MonitorItem } from '@/lib/api';
import { Mesa } from '@/lib/types';

export default function AdminInicio() {
  const [mesas, setMesas]     = useState<Mesa[]>([]);
  const [monitor, setMonitor] = useState<MonitorItem[]>([]);
  const [turnos, setTurnos]   = useState<TurnoResumen[]>([]);

  const fetchDatos = useCallback(async () => {
    const [m, mo, t] = await Promise.allSettled([
      api.mesas.list(),
      api.monitor.get(),
      api.admin.turnosHoy(),
    ]);
    if (m.status  === 'fulfilled') setMesas(m.value);
    if (mo.status === 'fulfilled') setMonitor(mo.value);
    if (t.status  === 'fulfilled') setTurnos(t.value);
  }, []);

  useEffect(() => {
    fetchDatos();
    const id = setInterval(fetchDatos, 10000);
    return () => clearInterval(id);
  }, [fetchDatos]);

  const ocupadas   = mesas.filter((m) => m.estado === 'ocupada').length;
  const libres     = mesas.filter((m) => m.estado === 'libre').length;
  const activas    = monitor.filter((r) => r.estado !== 'entregado').length;
  const enAlerta   = monitor.filter((r) => r.minutosEspera >= 15 && r.estado !== 'entregado').length;
  const ventasHoy  = turnos.reduce((s, t) => s + parseFloat(t.totalTurno), 0);
  const turnoAbierto = turnos.find((t) => t.estado === 'abierto');

  return (
    <div className="p-5 space-y-6 max-w-3xl mx-auto">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Mesas ocupadas" value={ocupadas} color="terracota" />
        <StatCard label="Mesas libres"   value={libres}   color="salvia" />
        <StatCard label="Rondas activas" value={activas}  color={enAlerta > 0 ? 'terracota' : 'carbon'} badge={enAlerta > 0 ? `${enAlerta} en alerta` : undefined} />
        <StatCard label="Ventas hoy"     value={`S/${ventasHoy.toFixed(2)}`} color="dorado" />
      </div>

      {/* Turno activo */}
      {turnoAbierto && (
        <div className="rounded-2xl border border-border bg-white p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Turno abierto</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--carbon)]">{turnoAbierto.cajeroNombre}</p>
              <p className="text-xs text-muted-foreground">
                Desde {new Date(turnoAbierto.fechaApertura).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[var(--dorado)]">S/{turnoAbierto.totalTurno}</p>
              <p className="text-xs text-muted-foreground">{turnoAbierto.cobros} cobro{turnoAbierto.cobros !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {Object.entries(turnoAbierto.porCanal).map(([canal, monto]) => (
              parseFloat(monto) > 0 && (
                <div key={canal} className="rounded-lg bg-muted/50 p-2 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{canal.replace('_', '/')}</p>
                  <p className="text-sm font-semibold">S/{monto}</p>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Grid de mesas */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Mesas</p>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {mesas.map((mesa) => (
            <div
              key={mesa.id}
              className={[
                'aspect-square rounded-xl flex flex-col items-center justify-center text-center',
                mesa.estado === 'ocupada'
                  ? 'bg-[var(--terracota)]/15 border border-[var(--terracota)]/40'
                  : 'bg-white border border-border',
              ].join(' ')}
            >
              <span className={['font-bold text-lg leading-none', mesa.estado === 'ocupada' ? 'text-[var(--terracota)]' : 'text-[var(--carbon)]'].join(' ')}>
                {mesa.numero}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rondas activas */}
      {activas > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Rondas en cocina ({activas})
          </p>
          <div className="space-y-2">
            {monitor
              .filter((r) => r.estado !== 'entregado')
              .sort((a, b) => b.minutosEspera - a.minutosEspera)
              .map((r) => (
                <div key={r.pedidoId} className="flex items-center justify-between rounded-xl bg-white border border-border px-4 py-3 text-sm">
                  <span className="font-semibold text-[var(--carbon)]">Mesa {r.mesaNumero}</span>
                  <span className="text-muted-foreground capitalize">{r.estado.replace('_', ' ')}</span>
                  <span className={[
                    'text-xs font-bold px-2.5 py-1 rounded-full',
                    r.minutosEspera >= 15 ? 'bg-[var(--terracota)] text-white animate-pulse' : 'bg-muted text-muted-foreground',
                  ].join(' ')}>
                    {r.minutosEspera} min
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, badge }: {
  label: string;
  value: string | number;
  color: 'terracota' | 'salvia' | 'carbon' | 'dorado';
  badge?: string;
}) {
  const colors = {
    terracota: 'text-[var(--terracota)]',
    salvia:    'text-[var(--salvia)]',
    carbon:    'text-[var(--carbon)]',
    dorado:    'text-[var(--dorado)]',
  };
  return (
    <div className="rounded-2xl bg-white border border-border p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={['text-2xl font-bold', colors[color]].join(' ')}>{value}</p>
      {badge && <p className="text-xs font-medium text-[var(--terracota)]">{badge}</p>}
    </div>
  );
}
