import {type PortableTextTextBlock} from '@sanity/types'
import {type ObjectDiff} from 'sanity/_singleton'

export type PortableTextDiff = ObjectDiff & {
  displayValue: PortableTextTextBlock
  origin: ObjectDiff
}

export type MarkSymbolMap = Record<string, string[]>

export type InlineSymbolMap = Record<string, string>
