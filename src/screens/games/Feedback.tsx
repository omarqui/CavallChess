import { Banner } from '../../ui/kit';

/**
 * Resultado y error de una tarea (actualizar, cargar el historial, recalcular). Las dos regiones vivas quedan
 * montadas y solo cambia su contenido, así el lector de pantalla anuncia cada mensaje nuevo.
 */
export function Feedback({ result, error, note }: { result: string | null; error: string | null; note?: string }) {
  return (
    <>
      <div role="status">{result && <p className="mt-2 text-[15px] text-muted">{result}</p>}</div>
      <div role="alert">
        {error && (
          <div className="mt-3">
            <Banner tone="bad">
              <p>{error}</p>
              {note && <p className="mt-1">{note}</p>}
            </Banner>
          </div>
        )}
      </div>
    </>
  );
}
