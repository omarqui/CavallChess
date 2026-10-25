import { Banner, Button } from './kit';

/** La biblioteca no cargó: el aviso y el botón para volver a intentarlo. */
export function LibraryError({ onRetry, className = '' }: { onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={className}>
      <Banner tone="bad">
        <p className="font-semibold">No se pudo cargar la biblioteca.</p>
        <p className="mt-1">Revisá la conexión y volvé a intentarlo.</p>
        <Button className="mt-3" onClick={onRetry}>
          Reintentar
        </Button>
      </Banner>
    </div>
  );
}
