import {
  BoundaryElementProvider,
  Flex,
  PortalProvider,
  usePortal,
  useElementRect,
  Box,
} from '@sanity/ui'
import React, {createElement, useEffect, useMemo, useRef, useState} from 'react'
import styled, {css} from 'styled-components'
import {PaneContent, usePane, usePaneLayout} from '../../../components'
import {useDocumentPane} from '../useDocumentPane'
import {useDeskTool} from '../../../useDeskTool'
import {DocumentInspectorPanel} from '../documentInspector'
import {InspectDialog} from '../inspectDialog'
import {DeletedDocumentBanner} from './DeletedDocumentBanner'
import {ReferenceChangedBanner} from './ReferenceChangedBanner'
import {PermissionCheckBanner} from './PermissionCheckBanner'
import {FormView} from './documentViews'
import {DocumentPanelHeader} from './header'
import {useFormState, useTimelineSelector} from 'sanity/document'
import {ScrollContainer, VirtualizerScrollInstanceProvider} from 'sanity'

interface DocumentPanelProps {
  footerHeight: number | null
  rootElement: HTMLDivElement | null
  isInspectOpen: boolean
  setDocumentPanelPortalElement: (el: HTMLElement | null) => void
}

const DocumentBox = styled(Box)({
  position: 'relative',
})

const Scroller = styled(ScrollContainer)<{$disabled: boolean}>(({$disabled}) => {
  if ($disabled) {
    return {height: '100%'}
  }

  return css`
    height: 100%;
    overflow: auto;
    position: relative;
    scroll-behavior: smooth;
    outline: none;
  `
})

export const DocumentPanel = function DocumentPanel(props: DocumentPanelProps) {
  const {footerHeight, isInspectOpen, rootElement, setDocumentPanelPortalElement} = props
  const {activeViewId, inspector, views} = useDocumentPane()
  const {
    documentId,
    value,
    ready,
    schemaType,
    permissions,
    isPermissionsLoading,
    editState,
    isDeleting,
    isDeleted,
  } = useFormState()
  const {collapsed: layoutCollapsed} = usePaneLayout()
  const {collapsed} = usePane()
  const parentPortal = usePortal()
  const {features} = useDeskTool()
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null)
  const headerRect = useElementRect(headerElement)
  const portalRef = useRef<HTMLDivElement | null>(null)
  const [documentScrollElement, setDocumentScrollElement] = useState<HTMLDivElement | null>(null)
  const formContainerElement = useRef<HTMLDivElement | null>(null)

  const requiredPermission = value._createdAt ? 'update' : 'create'

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) || views[0] || {type: 'form'},
    [activeViewId, views],
  )

  // Use a local portal container when split panes is supported
  const portalElement: HTMLElement | null = features.splitPanes
    ? portalRef.current || parentPortal.element
    : parentPortal.element

  // Calculate the height of the header
  const margins: [number, number, number, number] = useMemo(() => {
    if (layoutCollapsed) {
      return [headerRect?.height || 0, 0, footerHeight ? footerHeight + 2 : 2, 0]
    }

    return [0, 0, 2, 0]
  }, [layoutCollapsed, footerHeight, headerRect])

  const formViewHidden = activeView.type !== 'form'

  const activeViewNode = useMemo(
    () =>
      activeView.type === 'component' &&
      activeView.component &&
      createElement(activeView.component, {
        document: {
          draft: editState?.draft || null,
          displayed: value,
          historical: value,
          published: editState?.published || null,
        },
        documentId,
        options: activeView.options,
        schemaType,
      }),
    [activeView, documentId, editState?.draft, editState?.published, schemaType, value],
  )

  const lastNonDeletedRevId = useTimelineSelector((state) => state.lastNonDeletedRevId)

  // Scroll to top as `documentId` changes
  useEffect(() => {
    if (!documentScrollElement?.scrollTo) return
    documentScrollElement.scrollTo(0, 0)
  }, [documentId, documentScrollElement])

  // Pass portal element to `DocumentPane`
  useEffect(() => {
    if (portalElement) {
      setDocumentPanelPortalElement(portalElement)
    }
  }, [portalElement, setDocumentPanelPortalElement])

  const showInspector = Boolean(!collapsed && inspector)

  return (
    <>
      <DocumentPanelHeader ref={setHeaderElement} />

      <PaneContent>
        <Flex height="fill">
          {(features.resizablePanes || !showInspector) && (
            <DocumentBox flex={2} overflow="hidden">
              <PortalProvider
                element={portalElement}
                __unstable_elements={{documentScrollElement: documentScrollElement}}
              >
                <BoundaryElementProvider element={documentScrollElement}>
                  <VirtualizerScrollInstanceProvider
                    scrollElement={documentScrollElement}
                    containerElement={formContainerElement}
                  >
                    {activeView.type === 'form' && !isPermissionsLoading && ready && (
                      <>
                        <PermissionCheckBanner
                          granted={Boolean(permissions?.granted)}
                          requiredPermission={requiredPermission}
                        />
                        {!isDeleting && isDeleted && (
                          <DeletedDocumentBanner revisionId={lastNonDeletedRevId} />
                        )}
                        <ReferenceChangedBanner />
                      </>
                    )}

                    <Scroller
                      $disabled={layoutCollapsed || false}
                      data-testid="document-panel-scroller"
                      ref={setDocumentScrollElement}
                    >
                      <FormView
                        hidden={formViewHidden}
                        key={documentId + (ready ? '_ready' : '_pending')}
                        margins={margins}
                        ref={formContainerElement}
                      />
                      {activeViewNode}
                    </Scroller>

                    {isInspectOpen ? <InspectDialog value={value} /> : null}

                    <div data-testid="document-panel-portal" ref={portalRef} />
                  </VirtualizerScrollInstanceProvider>
                </BoundaryElementProvider>
              </PortalProvider>
            </DocumentBox>
          )}

          {showInspector && (
            <BoundaryElementProvider element={rootElement}>
              <DocumentInspectorPanel
                documentId={documentId}
                documentType={schemaType.name}
                flex={1}
              />
            </BoundaryElementProvider>
          )}
        </Flex>
      </PaneContent>
    </>
  )
}
