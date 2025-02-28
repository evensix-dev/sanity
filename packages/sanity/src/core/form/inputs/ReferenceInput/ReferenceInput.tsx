import {Stack, Text, useToast} from '@sanity/ui'
import {uuid} from '@sanity/uuid'
import {
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import {useObservableCallback} from 'react-rx'
import {concat, type Observable, of} from 'rxjs'
import {catchError, filter, map, scan, switchMap, tap} from 'rxjs/operators'
import {styled} from 'styled-components'

import {Button} from '../../../../ui-components'
import {PreviewCard} from '../../../components'
import {Translate, useTranslation} from '../../../i18n'
import {getPublishedId, isNonNullable} from '../../../util'
import {Alert} from '../../components/Alert'
import {useDidUpdate} from '../../hooks/useDidUpdate'
import {useOnClickOutside} from '../../hooks/useOnClickOutside'
import {set, setIfMissing, unset} from '../../patch'
import {AutocompleteContainer} from './AutocompleteContainer'
import {CreateButton} from './CreateButton'
import {OptionPreview} from './OptionPreview'
import {ReferenceAutocomplete} from './ReferenceAutocomplete'
import {
  type CreateReferenceOption,
  type ReferenceInputProps,
  type ReferenceSearchHit,
  type ReferenceSearchState,
} from './types'
import {useReferenceInfo} from './useReferenceInfo'
import {useReferenceInput} from './useReferenceInput'
import {useReferenceItemRef} from './useReferenceItemRef'

// This is a workaround for a circular import issue.
// Calling `styled(PreviewCard)` at program load time triggered a build error with the commonjs bundle because it tried
// to access the PreviewCard variable/symbol before it was initialized.
// The workaround is to defer creating StyledPreviewCard until react render time
let StyledPreviewCardImpl: undefined | typeof PreviewCard
const StyledPreviewCard: typeof PreviewCard = forwardRef(function StyledPreviewCard(props, ref) {
  if (!StyledPreviewCardImpl) {
    StyledPreviewCardImpl = styled(PreviewCard)`
      /* this is a hack to avoid layout jumps while previews are loading
      there's probably better ways of solving this */
      min-height: 36px;
    `
  }
  return <StyledPreviewCardImpl ref={ref} {...props} />
})

const INITIAL_SEARCH_STATE: ReferenceSearchState = {
  hits: [],
  isLoading: false,
}

const NO_FILTER = () => true

function nonNullable<T>(v: T): v is NonNullable<T> {
  return v !== null
}

interface AutocompleteOption {
  hit: ReferenceSearchHit
  value: string
}
export function ReferenceInput(props: ReferenceInputProps) {
  const {
    createOptions,
    onChange,
    onEditReference,
    onSearch,
    schemaType,
    readOnly,
    id,
    onPathFocus,
    value,
    renderPreview,
    path,
    elementProps,
    focusPath,
  } = props

  const {getReferenceInfo} = useReferenceInput({
    path,
    schemaType,
    value,
  })

  const [searchState, setSearchState] = useState<ReferenceSearchState>(INITIAL_SEARCH_STATE)

  const handleCreateNew = useCallback(
    (option: CreateReferenceOption) => {
      const newDocumentId = uuid()

      const patches = [
        setIfMissing({}),
        set(schemaType.name, ['_type']),
        set(newDocumentId, ['_ref']),
        set(true, ['_weak']),
        set({type: option.type, weak: schemaType.weak, template: option.template}, [
          '_strengthenOnPublish',
        ]),
      ].filter(isNonNullable)

      onChange(patches)

      onEditReference({id: newDocumentId, type: option.type, template: option.template})
      onPathFocus([])
    },
    [onChange, onEditReference, onPathFocus, schemaType],
  )

  const handleChange = useCallback(
    (nextId: string) => {
      if (!nextId) {
        onChange(unset())
        onPathFocus([])
        return
      }

      const hit = searchState.hits.find((h) => h.id === nextId)

      if (!hit) {
        throw new Error('Selected an item that wasnt part of the result set')
      }
      // if there's no published version of this document, set the reference to weak

      const patches = [
        setIfMissing({}),
        set(schemaType.name, ['_type']),
        set(getPublishedId(nextId), ['_ref']),
        hit.published && !schemaType.weak ? unset(['_weak']) : set(true, ['_weak']),
        hit.published
          ? unset(['_strengthenOnPublish'])
          : set({type: hit?.type, weak: schemaType.weak}, ['_strengthenOnPublish']),
      ].filter(isNonNullable)

      onChange(patches)
      // Move focus away from _ref and one level up
      onPathFocus([])
    },
    [onChange, onPathFocus, schemaType.name, schemaType.weak, searchState.hits],
  )

  const handleClear = useCallback(() => {
    onChange(unset())
  }, [onChange])

  const handleCancelEdit = useCallback(() => {
    if (!value?._ref) {
      handleClear()
    }
  }, [handleClear, value?._ref])

  const handleAutocompleteKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onPathFocus([])
      }
    },
    [onPathFocus],
  )

  const loadableReferenceInfo = useReferenceInfo(value?._ref, getReferenceInfo)

  const autocompletePopoverReferenceElementRef = useRef<HTMLDivElement | null>(null)

  const {push} = useToast()
  const {t} = useTranslation()

  const handleQueryChange = useObservableCallback(
    (inputValue$: Observable<string | null>) => {
      return inputValue$.pipe(
        filter(nonNullable),
        switchMap((searchString) =>
          concat(
            of({isLoading: true}),
            onSearch(searchString).pipe(
              map((hits) => ({hits, searchString, isLoading: false})),
              catchError((error) => {
                push({
                  title: t('inputs.reference.error.search-failed-title'),
                  description: error.message,
                  status: 'error',
                  id: `reference-search-fail-${id}`,
                })

                console.error(error)
                return of({hits: []})
              }),
            ),
          ),
        ),

        scan(
          (prevState, nextState): ReferenceSearchState => ({...prevState, ...nextState}),
          INITIAL_SEARCH_STATE,
        ),

        tap(setSearchState),
      )
    },
    [id, onSearch, push, t],
  )

  const handleAutocompleteOpenButtonClick = useCallback(() => {
    handleQueryChange('')
  }, [handleQueryChange])

  const handleCreateButtonKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onPathFocus([])
      }
    },
    [onPathFocus],
  )

  const renderOption = useCallback(
    (option: AutocompleteOption) => {
      const documentId = option.hit.draft?._id || option.hit.published?._id || option.value

      return (
        <StyledPreviewCard forwardedAs="button" type="button" radius={2} tone="inherit">
          <OptionPreview
            getReferenceInfo={getReferenceInfo}
            id={documentId}
            renderPreview={renderPreview}
            type={schemaType}
          />
        </StyledPreviewCard>
      )
    },
    [schemaType, getReferenceInfo, renderPreview],
  )

  const renderValue = useCallback(() => {
    return (
      loadableReferenceInfo.result?.preview.draft?.title ||
      loadableReferenceInfo.result?.preview.published?.title ||
      ''
    )
  }, [
    loadableReferenceInfo.result?.preview.draft?.title,
    loadableReferenceInfo.result?.preview.published?.title,
  ])

  const handleFocus = useCallback(() => onPathFocus(['_ref']), [onPathFocus])
  const handleBlur = useCallback(
    (event: FocusEvent) => {
      if (!autocompletePopoverReferenceElementRef.current?.contains(event.relatedTarget)) {
        props.elementProps.onBlur(event)
      }
    },
    [props.elementProps],
  )

  const isWeakRefToNonexistent =
    loadableReferenceInfo?.result?.availability?.reason === 'NOT_FOUND' &&
    !value?._strengthenOnPublish &&
    value?._weak

  useDidUpdate(focusPath?.[0] === '_ref', (hadFocusAtRef, hasFocusAtRef) => {
    if (!hadFocusAtRef && hasFocusAtRef) {
      elementProps.ref.current?.focus()
    }
  })
  const hits: AutocompleteOption[] = useMemo(
    () =>
      searchState.hits.map((hit) => ({
        value: hit.id,
        hit: hit,
      })),
    [searchState.hits],
  )

  const isEditing = focusPath.length === 1 && focusPath[0] === '_ref'

  // --- click outside handling
  const {menuRef, containerRef} = useReferenceItemRef()
  const clickOutsideBoundaryRef = useRef<HTMLDivElement>(null)
  const autoCompletePortalRef = useRef<HTMLDivElement>(null)
  const createButtonMenuPortalRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(
    [
      containerRef,
      clickOutsideBoundaryRef,
      autoCompletePortalRef,
      createButtonMenuPortalRef,
      menuRef,
    ],
    () => {
      if (isEditing) {
        handleCancelEdit()
      }
    },
  )

  return (
    <Stack space={1} data-testid="reference-input" ref={clickOutsideBoundaryRef}>
      <Stack space={2}>
        {isWeakRefToNonexistent ? (
          <Alert
            data-testid="alert-nonexistent-document"
            title={t('inputs.reference.error.nonexistent-document-title')}
            suffix={
              <Stack padding={2}>
                <Button
                  text={t('inputs.reference.error.nonexistent-document.clear-button-label')}
                  onClick={handleClear}
                />
              </Stack>
            }
          >
            <Text size={1}>
              <Translate
                i18nKey="inputs.reference.error.nonexistent-document-description"
                t={t}
                values={{documentId: value._ref}}
              />
            </Text>
          </Alert>
        ) : null}
        <AutocompleteContainer ref={autocompletePopoverReferenceElementRef}>
          <ReferenceAutocomplete
            {...elementProps}
            onFocus={handleFocus}
            onBlur={handleBlur}
            data-testid="autocomplete"
            loading={searchState.isLoading}
            referenceElement={autocompletePopoverReferenceElementRef.current}
            options={hits}
            radius={2}
            placeholder={t('inputs.reference.search-placeholder')}
            onKeyDown={handleAutocompleteKeyDown}
            readOnly={loadableReferenceInfo.isLoading || readOnly}
            onQueryChange={handleQueryChange}
            searchString={searchState.searchString}
            onChange={handleChange}
            filterOption={NO_FILTER}
            renderOption={renderOption as any}
            renderValue={renderValue}
            openButton={{onClick: handleAutocompleteOpenButtonClick}}
            portalRef={autoCompletePortalRef}
            value={value?._ref}
          />

          {createOptions.length > 0 && (
            <CreateButton
              id={`${id}-selectTypeMenuButton`}
              readOnly={readOnly}
              createOptions={createOptions}
              onCreate={handleCreateNew}
              onKeyDown={handleCreateButtonKeyDown}
              menuRef={createButtonMenuPortalRef}
            />
          )}
        </AutocompleteContainer>
      </Stack>
    </Stack>
  )
}
