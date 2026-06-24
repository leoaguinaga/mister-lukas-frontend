'use client';

import { signOut, useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Toaster } from 'react-hot-toast';

export default function CajaLayout({ children }: { children: React.ReactNode }) {
  const { data } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--crema)]">
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 bg-[var(--carbon)] text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dorado)] text-sm font-bold select-none text-[var(--carbon)]">
            ML
          </div>
          <span className="font-semibold tracking-wide">Caja · Mister Luka</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{data?.user?.name}</span>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
            onClick={async () => { await signOut(); router.push('/login'); }}
          >
            Salir
          </Button>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#2B211C', color: '#FBF3E7', borderRadius: '10px' },
          success: { iconTheme: { primary: '#D9A441', secondary: '#2B211C' } },
          error:   { iconTheme: { primary: '#B5402E', secondary: '#FBF3E7' } },
        }}
      />
    </div>
  );
}
