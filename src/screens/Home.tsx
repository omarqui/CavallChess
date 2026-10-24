import { useEffect, useMemo } from 'react';
import { displaySquares, epdFromNodeId, INITIAL_EPD } from '../chess/position';
import { markDayComplete } from '../db/repo';
import { useCards, useDays, useEvents, useGraphs, useSettings } from '../db/hooks';
import { buildDailyQueue } from '../srs/queue';
import { streak } from '../srs/stats';
import { Board } from '../ui/Board';
import { Banner, Button, Screen } from '../ui/kit';
import { openingName, useEco } from '../ui/opening';
import { navigate } from '../ui/router';

const WEEK = 7 * 86400_000;

export function HomeScreen() {
  const graphs = useGraphs();
  const cards = useCards();
  const events = useEvents();
  const days = useDays();
  const settings = useSettings();
  const eco = useEco();

  const queue = useMemo(
    () =>
      graphs && cards && events && settings
        ? buildDailyQueue([graphs.white, graphs.black], cards, events, new Date(), settings.newPerDay)
        : null,
    [graphs, cards, events, settings],
  );
  const totalCards = graphs ? graphs.white.trainableCardIds().length + graphs.black.trainableCardIds().length : 0;

  // Un día cuenta para la racha cuando los vencidos quedan en cero.
  useEffect(() => {
    if (queue && totalCards > 0 && queue.due.length === 0 && (events?.length ?? 0) > 0) void markDayComplete();
  }, [queue, totalCards, events?.length]);

  if (!graphs || !queue || !days || !settings) return null;

  const nextId = queue.due[0] ?? queue.fresh[0];
  const nextEdge = nextId ? (graphs.white.edges.get(nextId) ?? graphs.black.edges.get(nextId)) : undefined;
  const preview = nextEdge
    ? {
        epd: epdFromNodeId(nextEdge.fromId),
        side: nextEdge.side,
        name: openingName(graphs[nextEdge.side], nextEdge.fromId, eco),
        last: graphs[nextEdge.side].pathFromRoot(nextEdge.fromId)?.at(-1),
      }
    : null;
  const days_ = streak(days, new Date());
  const pending = queue.due.length + queue.fresh.length;
  const backupDue = totalCards > 0 && (!settings.lastBackupAt || Date.now() - settings.lastBackupAt > WEEK);

  return (
    <Screen>
      <header className="flex items-baseline justify-between pb-4 pt-4">
        <h1 className="font-book text-2xl font-semibold tracking-tight">CavallChess</h1>
        <span className="text-sm text-muted">
          {days_ > 0 ? `Racha de ${days_} ${days_ === 1 ? 'día' : 'días'}` : 'Sin racha todavía'}
        </span>
      </header>

      {totalCards === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="mx-auto max-w-sm">
            <Board
              epd={preview?.epd ?? INITIAL_EPD}
              orientation={preview?.side ?? 'white'}
              lastMove={
                preview?.last ? displaySquares(epdFromNodeId(preview.last.fromId), preview.last.uci) : undefined
              }
              coordinates={false}
            />
          </div>
          <div className="mt-5 text-center">
            {pending > 0 ? (
              <>
                <p className="font-book text-[22px] leading-snug">
                  {queue.due.length > 0 && `${queue.due.length} ${queue.due.length === 1 ? 'posición vence' : 'posiciones vencen'} hoy`}
                  {queue.due.length > 0 && queue.fresh.length > 0 && ' y '}
                  {queue.due.length === 0 && queue.fresh.length > 0 && 'Hoy toca aprender '}
                  {queue.fresh.length > 0 && `${queue.fresh.length} ${queue.fresh.length === 1 ? 'nueva' : 'nuevas'}`}
                </p>
                {preview?.name && <p className="mt-1 text-sm text-muted">Empezás por {preview.name}</p>}
                <Button variant="primary" className="mt-5 w-full text-base" onClick={() => navigate('/train')}>
                  Estudiar
                </Button>
              </>
            ) : (
              <>
                <p className="font-book text-[22px]">Estás al día.</p>
                <p className="mt-1 text-sm text-muted">
                  {queue.freshWaiting > 0
                    ? `Mañana entran ${Math.min(queue.freshWaiting, settings.newPerDay)} posiciones nuevas.`
                    : 'Volvé mañana o practicá una apertura.'}
                </p>
                <Button className="mt-5 w-full" onClick={() => navigate('/repertoire/white')}>
                  Practicar una apertura
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {backupDue && (
        <div className="mt-8">
          <Banner>
            Tu progreso vive solo en este dispositivo.{' '}
            <button className="font-semibold underline underline-offset-2" onClick={() => navigate('/settings')}>
              Hacé un respaldo
            </button>{' '}
            para no perderlo.
          </Banner>
        </div>
      )}
    </Screen>
  );
}

function Empty() {
  return (
    <div className="pt-10 text-center">
      <div className="mx-auto max-w-[220px] opacity-90">
        <Board epd={INITIAL_EPD} orientation="white" coordinates={false} />
      </div>
      <p className="mt-6 font-book text-[22px]">Tu repertorio está vacío.</p>
      <p className="mx-auto mt-2 max-w-sm text-muted">
        Importá un estudio de Lichess o un PGN con tus líneas, o armalas jugando en el tablero.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Button variant="primary" onClick={() => navigate('/import')}>
          Importar un repertorio
        </Button>
        <Button onClick={() => navigate('/repertoire/white')}>Armarlo en el tablero</Button>
      </div>
    </div>
  );
}
