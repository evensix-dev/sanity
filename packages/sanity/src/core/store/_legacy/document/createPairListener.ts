/* eslint-disable @typescript-eslint/no-use-before-define */
import {type SanityClient} from '@sanity/client'
import {type SanityDocument} from '@sanity/types'
import {groupBy} from 'lodash'
import LRU from 'quick-lru'
import {defer, merge, type Observable, of as observableOf, skip, timer} from 'rxjs'
import {concatMap, delay, filter, map, mergeMap, scan, share, take, takeUntil} from 'rxjs/operators'

import {
  type IdPair,
  type MutationEvent,
  type PendingMutationsEvent,
  type ReconnectEvent,
  type WelcomeEvent,
} from './types'

interface Snapshots {
  draft: SanityDocument | null
  published: SanityDocument | null
}

/** @internal */
export interface InitialSnapshotEvent {
  type: 'snapshot'
  documentId: string
  document: SanityDocument | null
}

/** @internal */
export interface PairListenerOptions {
  tag?: string
}

/** @internal */
export type ListenerEvent =
  | MutationEvent
  | ReconnectEvent
  | InitialSnapshotEvent
  | PendingMutationsEvent

const PENDING_START: PendingMutationsEvent = {type: 'pending', phase: 'begin'}
const PENDING_END: PendingMutationsEvent = {type: 'pending', phase: 'end'}

function isMutationEvent(msg: ListenerEvent): msg is MutationEvent {
  return msg.type === 'mutation'
}
function isMultiTransactionEvent(msg: MutationEvent) {
  return msg.transactionTotalEvents > 1
}

function allPendingTransactionEventsReceived(listenerEvents: ListenerEvent[]) {
  const groupedMutations = groupBy(
    listenerEvents.filter((ev): ev is MutationEvent => ev.type === 'mutation'),
    (e) => e.transactionId,
  )
  // Note: we can't assume that the events come in order, so instead of checking the counter attributes we check that we have actually received all
  return Object.values(groupedMutations).every(
    (mutations) => mutations.length === mutations[0].transactionTotalEvents,
  )
}

/** How long to wait after the first connection is set up to start the exhange */
const EXCHANGE_WAIT_MIN = 1000 * 60 * 12
const EXCHANGE_WAIT_MAX = 1000 * 20 * 19

/** How long should the overlap between the two listeners be */
const EXCHANGE_OVERLAP_TIME = 1000 * 20

/** Add some randomness to the exchange delay to avoid thundering herd */
function getExhangeWait() {
  return Math.floor(Math.random() * (EXCHANGE_WAIT_MAX - EXCHANGE_WAIT_MIN) + EXCHANGE_WAIT_MIN)
}

/** @internal */
export function createPairListener(
  client: SanityClient,
  idPair: IdPair,
  options: PairListenerOptions = {},
): Observable<ListenerEvent> {
  const {publishedId, draftId} = idPair
  return _createRelayPairListener(client, idPair, options).pipe(
    concatMap((event) =>
      event.type === 'welcome'
        ? fetchInitialDocumentSnapshots().pipe(
            concatMap((snapshots) => [
              createSnapshotEvent(draftId, snapshots.draft),
              createSnapshotEvent(publishedId, snapshots.published),
            ]),
          )
        : observableOf(event),
    ),
    scan(
      (acc: {next: ListenerEvent[]; buffer: ListenerEvent[]}, msg) => {
        // we only care about mutation events
        if (!isMutationEvent(msg)) {
          return {next: [msg], buffer: []}
        }

        const isBuffering = acc.buffer.length > 0
        const isMulti = isMultiTransactionEvent(msg)
        if (!isMulti && !isBuffering) {
          // simple case, we have no buffer, and the event is a single-transaction event, so just pass it on
          return {next: [msg], buffer: []}
        }

        if (!isMulti) {
          // we have received a single transaction event while waiting for the rest of events from a multi transaction
          // put it in the buffer
          return {next: [], buffer: acc.buffer.concat(msg)}
        }

        const nextBuffer = acc.buffer.concat(msg)
        if (allPendingTransactionEventsReceived(nextBuffer)) {
          // we have received all pending transactions, emit the buffer, and signal end of buffer
          return {next: nextBuffer.concat(PENDING_END), buffer: []}
        }
        // if we get here, we are still waiting for more multi-transaction messages
        // if nextBuffer only has one element, we know we just started buffering
        return {next: nextBuffer.length === 1 ? [PENDING_START] : [], buffer: nextBuffer}
      },
      {next: [], buffer: []},
    ),
    // note: this flattens the array, and in the case of an empty array, no event will be pushed downstream
    mergeMap((v) => v.next),
  )

  function fetchInitialDocumentSnapshots(): Observable<Snapshots> {
    return client.observable
      .getDocuments<SanityDocument>([draftId, publishedId], {tag: 'document.snapshots'})
      .pipe(
        map(([draft, published]) => ({
          draft,
          published,
        })),
      )
  }
}

type ClientListenerEvent = WelcomeEvent | MutationEvent | ReconnectEvent

function _createRelayPairListener(
  client: SanityClient,
  idPair: IdPair,
  options: PairListenerOptions = {},
): Observable<ClientListenerEvent> {
  const {publishedId, draftId} = idPair

  const currentLeg = defer(
    () =>
      client.observable.listen(
        `*[_id == $publishedId || _id == $draftId]`,
        {
          publishedId,
          draftId,
        },
        {
          includeResult: false,
          events: ['welcome', 'mutation', 'reconnect'],
          effectFormat: 'mendoza',
          tag: options.tag || 'document.pair-listener',
        },
      ) as Observable<ClientListenerEvent>,
  )

  // This represents the next leg, and will be started after a certain delay
  const nextLeg = timer(getExhangeWait()).pipe(
    mergeMap(() => _createRelayPairListener(client, idPair, options)),
    share(),
  )

  // Merge current leg with next leg
  return merge(
    // take from currentLeg until we get 'welcome' from next leg, plus a little overlap in time
    currentLeg.pipe(
      takeUntil(
        nextLeg.pipe(
          filter((e) => e.type === 'welcome'),
          take(1),
          delay(EXCHANGE_OVERLAP_TIME),
        ),
      ),
    ),
    nextLeg.pipe(skip(1)),
  ).pipe(distinctByTransactionId())
}

/**
 * Operator function that operates on an observable of listener events that may include events with the duplicate transaction IDs
 * and returns a new stream filtering out duplicates
 */
function distinctByTransactionId() {
  return (input$: Observable<ClientListenerEvent>) =>
    input$.pipe(
      scan(
        (
          [seen]: [LRU<string, boolean>, ClientListenerEvent | null],
          event,
        ): [LRU<string, boolean>, ClientListenerEvent | null] => {
          if (event.type !== 'mutation') {
            return [seen, event]
          }
          if (seen.has(event.transactionId)) {
            return [seen, null]
          }
          seen.set(event.transactionId, true)
          return [seen, event]
        },
        [new LRU<string, boolean>({maxSize: 1000}), null],
      ),
      map(([_, event]) => event),
      filter((event): event is ClientListenerEvent => event !== null),
    )
}

function createSnapshotEvent(
  documentId: string,
  document: null | SanityDocument,
): InitialSnapshotEvent {
  return {
    type: 'snapshot',
    documentId,
    document,
  }
}
