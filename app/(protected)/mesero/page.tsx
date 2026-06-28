'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Mesa } from '@/lib/types';
import { MesaCard } from '@/components/mesero/MesaCard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';

export default function MeseroHome() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [abriendoLlevar, setAbriendoLlevar] = useState(false);
  const [llevarDialogAbierto, setLlevarDialogAbierto] = useState(false);
  const [mesaPorAbrir, setMesaPorAbrir] = useState<Mesa | null>(null);

  const fetchMesas = useCallback(async () => {
    try {
      const data = await api.mesas.list();
      // Excluir la mesa virtual 0 (para llevar) de la vista de mesas
      setMesas(data.filter((m) => m.numero !== 0));
    } catch {
      // silencioso en polling
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    const interval = setInterval(fetchMesas, 5000);
    return () => clearInterval(interval);
  }, [fetchMesas]);

  async function handleMesaClick(mesa: Mesa) {
    if (mesa.estado === 'ocupada') {
      try {
        const visita = await api.mesas.visitaActiva(mesa.id);
        router.push(`/mesero/mesa/${visita.id}`);
      } catch {
        toast.error('No se encontró la visita activa');
      }
      return;
    }

    setMesaPorAbrir(mesa);
  }

  async function confirmarAbrirMesa() {
    if (!mesaPorAbrir) return;
    const mesa = mesaPorAbrir;
    setAbriendo(mesa.id);
    try {
      const visita = await api.mesas.abrir(mesa.id);
      toast.success(`Mesa ${mesa.numero} abierta`);
      setMesaPorAbrir(null);
      router.push(`/mesero/mesa/${visita.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al abrir mesa');
    } finally {
      setAbriendo(null);
    }
  }

  function handleParaLlevar() {
    setLlevarDialogAbierto(true);
  }

  async function confirmarParaLlevar(nombreCliente: string) {
    setLlevarDialogAbierto(false);
    setAbriendoLlevar(true);
    try {
      const visita = await api.visitas.abrirParaLlevar({ nombreCliente });
      toast.success('Pedido para llevar abierto');
      router.push(`/mesero/mesa/${visita.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al abrir pedido para llevar');
    } finally {
      setAbriendoLlevar(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cargando mesas…
      </div>
    );
  }

  const libres = mesas.filter((m) => m.estado === 'libre').length;

  // Si al menos una mesa tiene posición asignada, renderizamos la matriz
  // del salón. Si ninguna la tiene, caemos al grid responsive viejo.
  const conPosicion = mesas.filter((m) => m.filaPosicion !== null && m.colPosicion !== null);
  const sinPosicion = mesas.filter((m) => m.filaPosicion === null || m.colPosicion === null);
  const usarMatriz = conPosicion.length > 0;

  const filas = usarMatriz ? Math.max(...conPosicion.map((m) => m.filaPosicion!)) + 1 : 0;
  const cols = usarMatriz ? Math.max(...conPosicion.map((m) => m.colPosicion!)) + 1 : 0;
  const gridMap = new Map<string, typeof mesas[number]>();
  for (const m of conPosicion) gridMap.set(`${m.filaPosicion},${m.colPosicion}`, m);

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Mesas</h2>
        <span className="text-sm text-muted-foreground">
          {libres} libre{libres !== 1 ? 's' : ''} · {mesas.length - libres} ocupada{mesas.length - libres !== 1 ? 's' : ''}
        </span>
      </div>

      {usarMatriz ? (
        <div className="space-y-4">
          <div
            className="rounded-2xl bg-[var(--crema)] p-3"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: '0.75rem',
            }}
          >
            {Array.from({ length: filas * cols }).map((_, idx) => {
              const fila = Math.floor(idx / cols);
              const col = idx % cols;
              const mesa = gridMap.get(`${fila},${col}`);
              if (!mesa) {
                return <div key={`${fila}-${col}`} aria-hidden />;
              }
              return (
                <div
                  key={mesa.id}
                  className={abriendo === mesa.id ? 'opacity-50 pointer-events-none' : ''}
                >
                  <MesaCard mesa={mesa} onClick={() => handleMesaClick(mesa)} />
                </div>
              );
            })}
          </div>

          {/* Mesas sin posición — listado al final */}
          {sinPosicion.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sin ubicar</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {sinPosicion.map((mesa) => (
                  <div key={mesa.id} className={abriendo === mesa.id ? 'opacity-50 pointer-events-none' : ''}>
                    <MesaCard mesa={mesa} onClick={() => handleMesaClick(mesa)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleParaLlevar}
            disabled={abriendoLlevar}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--dorado)] bg-[var(--dorado)]/5 hover:bg-[var(--dorado)]/10 transition-colors p-4 min-h-[64px] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="text-2xl leading-none">🥡</span>
            <span className="text-sm font-semibold text-[var(--dorado)]">
              {abriendoLlevar ? 'Abriendo…' : 'Para llevar'}
            </span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {mesas.map((mesa) => (
            <div key={mesa.id} className={abriendo === mesa.id ? 'opacity-50 pointer-events-none' : ''}>
              <MesaCard mesa={mesa} onClick={() => handleMesaClick(mesa)} />
            </div>
          ))}

          {/* Botón Para llevar — siempre al final del grid */}
          <button
            onClick={handleParaLlevar}
            disabled={abriendoLlevar}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--dorado)] bg-[var(--dorado)]/5 hover:bg-[var(--dorado)]/10 transition-colors p-4 h-full min-h-[100px] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="text-2xl leading-none">🥡</span>
            <span className="text-sm font-semibold text-[var(--dorado)]">
              {abriendoLlevar ? 'Abriendo…' : 'Para llevar'}
            </span>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!mesaPorAbrir}
        title={mesaPorAbrir ? `Abrir mesa ${mesaPorAbrir.numero}` : ''}
        description="Se abrirá una nueva visita y la mesa quedará ocupada."
        confirmLabel="Abrir mesa"
        loading={!!abriendo}
        onConfirm={confirmarAbrirMesa}
        onCancel={() => setMesaPorAbrir(null)}
      />

      <NombreClienteDialog
        open={llevarDialogAbierto}
        loading={abriendoLlevar}
        onConfirm={confirmarParaLlevar}
        onCancel={() => setLlevarDialogAbierto(false)}
      />
    </div>
  );
}

interface NombreClienteDialogProps {
  open: boolean;
  loading: boolean;
  onConfirm: (nombre: string) => void;
  onCancel: () => void;
}

function NombreClienteDialog({ open, loading, onConfirm, onCancel }: NombreClienteDialogProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (open) setNombre('');
  }, [open]);

  if (!open) return null;

  const nombreLimpio = nombre.trim();
  const puedeConfirmar = nombreLimpio.length > 0 && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 className="font-bold text-[var(--carbon)] text-lg">Nuevo pedido para llevar</h2>
          <p className="text-xs text-muted-foreground">Por favor, ingresa el nombre del cliente para identificar el pedido.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Nombre del cliente *</label>
          <input
            type="text"
            placeholder="Ej: Juan Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={loading}
            autoFocus
            className="w-full h-10 px-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--dorado)] bg-white text-[var(--carbon)] font-medium"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <Button
            onClick={() => onConfirm(nombreLimpio)}
            disabled={!puedeConfirmar}
            className="bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] font-semibold disabled:opacity-40"
          >
            {loading ? 'Abriendo…' : 'Iniciar pedido'}
          </Button>
        </div>
      </div>
    </div>
  );
}
