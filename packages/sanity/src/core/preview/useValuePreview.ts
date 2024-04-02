import {type PreviewValue, type SchemaType, type SortOrdering} from '@sanity/types'
import {useMemoObservable} from 'react-rx'
import {of} from 'rxjs'
import {catchError, map} from 'rxjs/operators'

import {useDocumentPreviewStore} from '../store/_legacy/datastores'
import {type Previewable} from './types'

export {useDocumentPreview as unstable_useValuePreview}

interface State {
  isLoading: boolean
  error?: Error
  value?: PreviewValue
}
const INITIAL_STATE: State = {
  isLoading: true,
}
const PENDING_STATE: State = {
  isLoading: false,
}
/**
 * @internal
 * @deprecated FOR INTERNAL USE.
 */
function useDocumentPreview(props: {
  enabled?: boolean
  ordering?: SortOrdering
  schemaType?: SchemaType
  value: unknown | undefined
}): State {
  const {enabled = true, ordering, schemaType, value: previewValue} = props || {}
  const {observeForPreview} = useDocumentPreviewStore()
  return useMemoObservable<State>(
    () => {
      if (!enabled || !previewValue || !schemaType) return of(PENDING_STATE)

      return observeForPreview(previewValue as Previewable, schemaType, {ordering}).pipe(
        map((event) => ({isLoading: false, value: event.snapshot || undefined})),
        catchError((error) => of({isLoading: false, error})),
      )
    },
    [enabled, observeForPreview, ordering, schemaType, previewValue],
    INITIAL_STATE,
  )
}
