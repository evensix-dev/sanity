import {useContext} from 'react'
import {useMemoObservable} from 'react-rx'
import {EMPTY} from 'rxjs'
import {UserColorManagerContext} from 'sanity/_singletons'

import {type UserColor, type UserColorManager} from './types'

/** @internal */
export function useUserColorManager(): UserColorManager {
  const userColorManager = useContext(UserColorManagerContext)

  if (!userColorManager) {
    throw new Error('UserColorManager: missing context value')
  }

  return userColorManager
}

/** @internal */
export function useUserColor(userId: string | null): UserColor {
  const manager = useUserColorManager()

  // eslint-disable-next-line react-hooks/exhaustive-deps -- no need to refactor to an inline function
  return useMemoObservable(userId ? manager.listen(userId) : EMPTY, [userId], manager.get(null))
}
