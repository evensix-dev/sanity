import {type ComponentType} from 'react'

import {useMiddlewareComponents} from '../../config'
import {
  type ActiveToolLayoutProps,
  type GlobalErrorBoundaryProps,
  type LayoutProps,
  type LogoProps,
  type NavbarProps,
  type ToolMenuProps,
} from '../../config/studio'
import {StudioLogo, StudioNavbar, StudioToolMenu} from '../components'
import {StudioActiveToolLayout} from '../components/navbar/StudioActiveToolLayout'
import {StudioErrorBoundary} from '../StudioErrorBoundary'
import {StudioLayoutComponent} from '../StudioLayout'
import {
  pickActiveToolLayoutComponent,
  pickGlobalErrorBoundaryComponent,
  pickLayoutComponent,
  pickLogoComponent,
  pickNavbarComponent,
  pickToolMenuComponent,
} from './picks'

/**
 * @internal
 */
export function useToolMenuComponent(): ComponentType<Omit<ToolMenuProps, 'renderDefault'>> {
  return useMiddlewareComponents({
    defaultComponent: StudioToolMenu as ComponentType<Omit<ToolMenuProps, 'renderDefault'>>,
    pick: pickToolMenuComponent,
  })
}

/**
 * @internal
 */
export function useNavbarComponent(): ComponentType<Omit<NavbarProps, 'renderDefault'>> {
  return useMiddlewareComponents({
    defaultComponent: StudioNavbar as ComponentType<Omit<NavbarProps, 'renderDefault'>>,
    pick: pickNavbarComponent,
  })
}

/**
 * @internal
 * @deprecated Use `useLogoMarkComponent` instead.
 */
export function useLogoComponent(): ComponentType<Omit<LogoProps, 'renderDefault'>> {
  return useMiddlewareComponents({
    defaultComponent: StudioLogo as ComponentType<Omit<LogoProps, 'renderDefault'>>,
    pick: pickLogoComponent,
  })
}

/**
 * @internal
 */
export function useLayoutComponent(): ComponentType<Omit<LayoutProps, 'renderDefault'>> {
  return useMiddlewareComponents({
    defaultComponent: StudioLayoutComponent as ComponentType<Omit<LayoutProps, 'renderDefault'>>,
    pick: pickLayoutComponent,
  })
}

/**
 * @internal
 */
export function useActiveToolLayoutComponent(): ComponentType<
  Omit<ActiveToolLayoutProps, 'renderDefault'>
> {
  return useMiddlewareComponents({
    defaultComponent: StudioActiveToolLayout as ComponentType<
      Omit<ActiveToolLayoutProps, 'renderDefault'>
    >,
    pick: pickActiveToolLayoutComponent,
  })
}

/**
 * @internal
 */
export function useGlobalErrorBoundaryComponent(): ComponentType<
  Omit<GlobalErrorBoundaryProps, 'renderDefault'>
> {
  return useMiddlewareComponents({
    defaultComponent: StudioErrorBoundary as ComponentType<
      Omit<GlobalErrorBoundaryProps, 'renderDefault'>
    >,
    pick: pickGlobalErrorBoundaryComponent,
  })
}
