'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Mesa } from '@/lib/types';
import { MesaCard } from '@/components/mesero/MesaCard';

export default function MeseroHome() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [abriendoLlevar, setAbriendoLlevar] = useState(false);

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

    const ok = window.confirm(`¿Abrir mesa ${mesa.numero}?`);
    if (!ok) return;

    setAbriendo(mesa.id);
    try {
      const visita = await api.mesas.abrir(mesa.id);
      toast.success(`Mesa ${mesa.numero} abierta`);
      router.push(`/mesero/mesa/${visita.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al abrir mesa');
    } finally {
      setAbriendo(null);
    }
  }

  async function handleParaLlevar() {
    setAbriendoLlevar(true);
    try {
      const visita = await api.visitas.abrirParaLlevar();
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

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Mesas</h2>
        <span className="text-sm text-muted-foreground">
          {libres} libre{libres !== 1 ? 's' : ''} · {mesas.length - libres} ocupada{mesas.length - libres !== 1 ? 's' : ''}
        </span>
      </div>

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
    </div>
  );
}
