'use client';

import { useSession } from '@/lib/auth-client';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useSession();

  if (isPending || !data?.user) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </main>
    );
  }

  return <>{children}</>;
}
