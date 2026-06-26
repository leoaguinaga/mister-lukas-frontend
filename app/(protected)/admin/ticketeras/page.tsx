'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, PrinterInfo } from '@/lib/api';

const TIPO_ICON: Record<string, string> = {
  cocina:  '🍳',
  recibos: '🧾',
};

export default function AdminTicketerasPage() {
  const [ticketeras, setTicketeras] = useState<PrinterInfo[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [probando, setProbando]     = useState<string | null>(null);

  const fetchTicketeras = useCallback(async () => {
    try {
      const data = await api.ticketeras.list();
      setTicketeras(data);
    } catch {
      /* silencioso */
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchTicketeras();
    const id = setInterval(fetchTicketeras, 10000);
    return () => clearInterval(id);
  }, [fetchTicketeras]);

  async function handleTestPrint(tipo: 'cocina' | 'recibos', label: string) {
    setProbando(tipo);
    try {
      await api.ticketeras.testPrint(tipo);
      toast.success(`Prueba enviada a ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al imprimir');
    } finally {
      setProbando(null);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Detectando ticketeras…
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--carbon)]">Ticketeras en red</h2>
        <button
          onClick={fetchTicketeras}
          className="text-xs text-muted-foreground hover:text-[var(--carbon)] px-3 py-1.5 rounded-lg hover:bg-white border border-border transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="space-y-4">
        {ticketeras.map((t) => (
          <div
            key={t.tipo}
            className="rounded-2xl border border-border bg-white p-5 flex items-center gap-5"
          >
            {/* Icono */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--crema)] flex items-center justify-center text-2xl">
              {TIPO_ICON[t.tipo] ?? '🖨️'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--carbon)]">{t.label}</p>
                <StatusBadge online={t.online} />
              </div>

              {t.ip ? (
                <p className="text-sm text-muted-foreground font-mono">
                  {t.ip}:{t.port}
                  {t.online && t.latencyMs !== undefined && (
                    <span className="ml-2 text-[var(--salvia)]">{t.latencyMs} ms</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-[var(--terracota)]">Sin IP configurada en el servidor</p>
              )}
            </div>

            {/* Prueba */}
            <button
              onClick={() => handleTestPrint(t.tipo as 'cocina' | 'recibos', t.label)}
              disabled={!t.ip || probando === t.tipo}
              className="shrink-0 text-sm font-semibold px-4 py-2 rounded-xl bg-[var(--dorado)] hover:bg-[#c49238] text-[var(--carbon)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {probando === t.tipo ? 'Enviando…' : 'Prueba'}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white border border-border p-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--carbon)]">Configuración</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Las IPs se configuran en el archivo <code className="bg-[var(--crema)] px-1 py-0.5 rounded">.env</code> del servidor:
        </p>
        <pre className="text-xs bg-[var(--crema)] rounded-lg p-3 overflow-x-auto text-[var(--carbon)]">{`PRINTER_KITCHEN_IP=192.168.1.100
PRINTER_KITCHEN_PORT=9100
PRINTER_RECEIPT_IP=192.168.1.101
PRINTER_RECEIPT_PORT=9100
PRINTER_MODE=real`}</pre>
        <p className="text-xs text-muted-foreground">
          Puerto estándar ESC/POS LAN: <strong>9100</strong>. Reiniciar el servidor tras cambiar las vars.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      className={[
        'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
        online
          ? 'bg-[var(--salvia)]/15 text-[var(--salvia)]'
          : 'bg-[var(--terracota)]/15 text-[var(--terracota)]',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          online ? 'bg-[var(--salvia)]' : 'bg-[var(--terracota)]',
        ].join(' ')}
      />
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  );
}
