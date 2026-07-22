import { useState, type ReactNode } from 'react';
import { trpc } from '../lib/trpc';

export function PinGate({ children }: { children: ReactNode }) {
  const status = trpc.auth.status.useQuery();
  const unlock = trpc.auth.unlock.useMutation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (status.isLoading) {
    return (
      <div className="sa-pin-screen">
        <p className="sa-pin-loading">Powering up scouter…</p>
      </div>
    );
  }

  if (!status.data?.pinRequired || status.data.unlocked) {
    return <>{children}</>;
  }

  const submit = async (): Promise<void> => {
    setError(null);
    try {
      await unlock.mutateAsync({ pin });
      setPin('');
      await status.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wrong PIN');
      setPin('');
    }
  };

  return (
    <div className="sa-pin-screen">
      <div className="sa-pin-card">
        <div className="sa-pin-brand">SAIYAN ARCHIVE</div>
        <p className="sa-pin-label">ENTER PIN</p>
        <input
          className="sa-pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && pin.length >= 4) void submit();
          }}
          autoFocus
        />
        {error && <p className="sa-pin-error">{error}</p>}
        <button
          type="button"
          className="sa-pin-unlock"
          disabled={pin.length < 4 || unlock.isPending}
          onClick={() => void submit()}
        >
          {unlock.isPending ? '…' : 'UNLOCK'}
        </button>
      </div>
    </div>
  );
}
