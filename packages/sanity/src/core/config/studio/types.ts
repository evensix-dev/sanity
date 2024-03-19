import {type ComponentType, type ReactElement} from 'react'

import {type Tool} from '../types'

// Components

/**
 * @hidden
 * @beta */
export interface LayoutProps {
  renderDefault: (props: LayoutProps) => ReactElement
}

/**
 * @hidden
 * @beta */
export interface GlobalErrorBoundaryProps {
  renderDefault: (props: GlobalErrorBoundaryProps) => ReactElement
}

/**
 * @hidden
 * @beta */
export interface LogoProps {
  title: string
  renderDefault: (props: LogoProps) => ReactElement
}

/**
 * @internal
 * @beta
 * An internal API for defining actions in the navbar.
 */
export interface NavbarAction {
  icon?: React.ComponentType
  location: 'topbar' | 'sidebar'
  name: string
  onAction: () => void
  selected: boolean
  title: string
}

/**
 * @hidden
 * @beta */
export interface NavbarProps {
  renderDefault: (props: NavbarProps) => ReactElement

  /**
   * @internal
   * @beta */
  __internal_actions?: NavbarAction[]
}

/**
 * @hidden
 * @beta */
export interface ActiveToolLayoutProps {
  renderDefault: (props: ActiveToolLayoutProps) => React.ReactElement
  activeTool: Tool
}

/**
 * @hidden
 * @beta */
export interface ToolMenuProps {
  activeToolName?: string
  closeSidebar: () => void
  context: 'sidebar' | 'topbar'
  isSidebarOpen: boolean
  tools: Tool[]
  renderDefault: (props: ToolMenuProps) => ReactElement
}

// Config

/**
 * @hidden
 * @beta */
export interface StudioComponents {
  globalErrorBoundary: ComponentType<Omit<GlobalErrorBoundaryProps, 'renderDefault'>>
  layout: ComponentType<Omit<LayoutProps, 'renderDefault'>>
  logo: ComponentType<Omit<LogoProps, 'renderDefault'>>
  navbar: ComponentType<Omit<NavbarProps, 'renderDefault'>>
  toolMenu: ComponentType<Omit<ToolMenuProps, 'renderDefault'>>
}

/**
 * @hidden
 * @beta */
export interface StudioComponentsPluginOptions {
  activeToolLayout?: ComponentType<ActiveToolLayoutProps>
  globalErrorBoundary?: ComponentType<GlobalErrorBoundaryProps>
  layout?: ComponentType<LayoutProps>
  /**
   * @deprecated Add custom icons on a per-workspace basis by customizing workspace `icon` instead.
   * @see {@link https://www.sanity.io/docs/workspaces}
   */
  logo?: ComponentType<LogoProps>
  navbar?: ComponentType<NavbarProps>
  toolMenu?: ComponentType<ToolMenuProps>
}
