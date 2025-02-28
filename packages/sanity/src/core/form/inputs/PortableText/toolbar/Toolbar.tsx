import {CollapseIcon, ExpandIcon} from '@sanity/icons'
import {
  type HotkeyOptions,
  PortableTextEditor,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@sanity/portable-text-editor'
import {type ObjectSchemaType, type Path, type SchemaType} from '@sanity/types'
import {Box, Flex, useElementRect, useToast} from '@sanity/ui'
import {memo, type MouseEvent, useCallback, useMemo, useState} from 'react'
import {css, styled} from 'styled-components'

import {Button} from '../../../../../ui-components'
import {useRovingFocus} from '../../../../components'
import {useTranslation} from '../../../../i18n'
import {useResolveInitialValueForType} from '../../../../store'
import {ActionMenu} from './ActionMenu'
import {BlockStyleSelect} from './BlockStyleSelect'
import {getBlockStyles, getInsertMenuItems} from './helpers'
import {useActionGroups} from './hooks'
import {InsertMenu} from './InsertMenu'
import {type BlockItem, type BlockStyleItem, type PTEToolbarActionGroup} from './types'

interface ToolbarProps {
  /** Whether annotation and block menu buttons should fully collapse at smaller element widths */
  collapsible?: boolean
  hotkeys: HotkeyOptions
  isFullscreen: boolean
  onMemberOpen: (relativePath: Path) => void
  onToggleFullscreen: () => void
  readOnly?: boolean
}

const RootFlex = styled(Flex)`
  width: 100%;
`

const StyleSelectBox = styled(Box)`
  width: 8em;
`

const StyleSelectFlex = styled(Flex)`
  border-right: 1px solid var(--card-border-color);
`

const ActionMenuBox = styled(Box)<{$withInsertMenu: boolean}>`
  ${({$withInsertMenu}) =>
    $withInsertMenu &&
    css`
      max-width: max-content;
      border-right: 1px solid var(--card-border-color);
    `}
`

const FullscreenButtonBox = styled(Box)`
  border-left: 1px solid var(--card-border-color);
`

const SLOW_INITIAL_VALUE_LIMIT = 300

const IS_MAC =
  typeof window != 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

const InnerToolbar = memo(function InnerToolbar({
  actionGroups,
  blockStyles,
  collapsible,
  disabled,
  insertMenuItems,
  isFullscreen,
  onToggleFullscreen,
}: {
  actionGroups: PTEToolbarActionGroup[]
  blockStyles: BlockStyleItem[]
  collapsible?: boolean
  disabled: boolean
  insertMenuItems: BlockItem[]
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const {t} = useTranslation()
  const actionsLen = actionGroups.reduce((acc, x) => acc + x.actions.length, 0)
  const showActionMenu = actionsLen > 0
  const showInsertMenu = insertMenuItems.length > 0
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null)
  const rootElementRect = useElementRect(rootElement)

  const collapsed = collapsible && rootElementRect ? rootElementRect?.width < 400 : false
  const showBlockStyleSelect = blockStyles.length > 1

  useRovingFocus({
    rootElement: rootElement,
  })

  const preventEditorBlurOnToolbarMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
  }, [])

  return (
    <RootFlex align="center" ref={setRootElement} onMouseDown={preventEditorBlurOnToolbarMouseDown}>
      {showBlockStyleSelect && (
        <StyleSelectFlex flex={collapsed ? 1 : undefined}>
          <StyleSelectBox padding={isFullscreen ? 2 : 1}>
            <BlockStyleSelect disabled={disabled} items={blockStyles} />
          </StyleSelectBox>
        </StyleSelectFlex>
      )}

      <Flex flex={1}>
        {showActionMenu && (
          <ActionMenuBox
            flex={collapsed ? undefined : 1}
            padding={isFullscreen ? 2 : 1}
            $withInsertMenu={showInsertMenu}
          >
            <ActionMenu
              disabled={disabled}
              collapsed={collapsed}
              groups={actionGroups}
              isFullscreen={isFullscreen}
            />
          </ActionMenuBox>
        )}

        {showInsertMenu && (
          <Box flex={collapsed ? undefined : 1} padding={isFullscreen ? 2 : 1}>
            <InsertMenu
              disabled={disabled}
              collapsed={collapsed}
              items={insertMenuItems}
              isFullscreen={isFullscreen}
            />
          </Box>
        )}
      </Flex>
      <FullscreenButtonBox padding={isFullscreen ? 2 : 1}>
        <Button
          aria-label={t('inputs.portable-text.action.expand-editor')}
          icon={isFullscreen ? CollapseIcon : ExpandIcon}
          mode="bleed"
          onClick={onToggleFullscreen}
          tooltipProps={{
            content: t(
              isFullscreen
                ? 'inputs.portable-text.action.collapse-editor'
                : 'inputs.portable-text.action.expand-editor',
            ),
            hotkeys: [`${IS_MAC ? 'Cmd' : 'Ctrl'}`, 'Enter'],
            placement: isFullscreen ? 'bottom' : 'top',
            portal: 'default',
          }}
        />
      </FullscreenButtonBox>
    </RootFlex>
  )
})

export function Toolbar(props: ToolbarProps) {
  const {collapsible, hotkeys, isFullscreen, readOnly, onMemberOpen, onToggleFullscreen} = props
  const editor = usePortableTextEditor()
  const selection = usePortableTextEditorSelection()
  const resolveInitialValueForType = useResolveInitialValueForType()
  const disabled = readOnly || !selection

  const {push} = useToast()

  const resolveInitialValue = useCallback(
    (type: ObjectSchemaType) => {
      let isSlow = false
      const slowTimer = setTimeout(() => {
        isSlow = true
        push({
          id: 'resolving-initial-value',
          status: 'info',
          title: 'Resolving initial value…',
        })
      }, SLOW_INITIAL_VALUE_LIMIT)
      return resolveInitialValueForType(type as unknown as SchemaType, {})
        .then((value) => {
          if (isSlow) {
            // I found no way to close an existing toast, so this will replace the message in the
            // "Resolving initial value…"-toast and then make sure it gets closed.
            push({
              id: 'resolving-initial-value',
              status: 'info',
              duration: 500,
              title: 'Initial value resolved',
            })
          }
          return value
        })
        .catch((error) => {
          push({
            title: `Could not resolve initial value`,
            id: 'resolving-initial-value',
            description: `Unable to resolve initial value for type: ${type.name}: ${error.message}.`,
            status: 'error',
          })

          return undefined
        })
        .finally(() => clearTimeout(slowTimer))
    },
    [push, resolveInitialValueForType],
  )

  const handleInsertBlock = useCallback(
    async (type: ObjectSchemaType) => {
      const initialValue = await resolveInitialValue(type)
      const path = PortableTextEditor.insertBlock(editor, type, initialValue)
      if (path) {
        onMemberOpen(path)
      }
    },
    [editor, onMemberOpen, resolveInitialValue],
  )

  const handleInsertInline = useCallback(
    async (type: ObjectSchemaType) => {
      const initialValue = await resolveInitialValue(type)
      const path = PortableTextEditor.insertChild(editor, type, initialValue)
      if (path) {
        onMemberOpen(path)
      }
    },
    [editor, onMemberOpen, resolveInitialValue],
  )

  const actionGroups = useActionGroups({
    hotkeys,
    onMemberOpen,
    resolveInitialValue,
    disabled: true,
  })

  const blockStyles = useMemo(() => getBlockStyles(editor.schemaTypes), [editor])

  const insertMenuItems = useMemo(
    () => getInsertMenuItems(editor.schemaTypes, disabled, handleInsertBlock, handleInsertInline),
    [disabled, editor, handleInsertBlock, handleInsertInline],
  )

  return (
    <InnerToolbar
      actionGroups={actionGroups}
      blockStyles={blockStyles}
      collapsible={collapsible}
      disabled={disabled}
      insertMenuItems={insertMenuItems}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  )
}
