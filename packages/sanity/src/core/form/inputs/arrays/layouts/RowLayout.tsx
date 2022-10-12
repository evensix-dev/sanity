import {Box, Card, CardTone, Flex, Stack} from '@sanity/ui'
import React, {ReactNode, useRef} from 'react'
import {useDidUpdate} from '../../../hooks/useDidUpdate'
import {DragHandle} from '../common/DragHandle'
import {ItemCard} from './ItemCard'

interface RowLayoutProps {
  tone?: CardTone
  dragHandle?: boolean
  focused?: boolean
  presence?: ReactNode
  validation?: ReactNode
  menu?: ReactNode
  footer?: ReactNode
  selected?: boolean
  children?: ReactNode
}

export function RowLayout(props: RowLayoutProps) {
  const {validation, selected, tone, presence, focused, children, dragHandle, menu, footer} = props

  const elementRef = useRef<HTMLDivElement | null>(null)

  useDidUpdate(focused, (hadFocus, hasFocus) => {
    if (!hadFocus && hasFocus) {
      elementRef.current?.focus()
    }
  })

  return (
    <ItemCard
      ref={elementRef}
      selected={selected}
      aria-selected={selected}
      radius={2}
      padding={1}
      tone={tone}
    >
      <Stack space={1}>
        <Flex align="center">
          {dragHandle && (
            <Box marginRight={1} paddingY={1}>
              <DragHandle paddingX={1} paddingY={3} />
            </Box>
          )}

          <Box flex={1}>{children}</Box>

          <Flex align="center">
            {presence && <Box marginLeft={1}>{presence}</Box>}
            {validation && <Box marginLeft={1}>{validation}</Box>}
            {menu}
          </Flex>
        </Flex>
        {footer}
      </Stack>
    </ItemCard>
  )
}
