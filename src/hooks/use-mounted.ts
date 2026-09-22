import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * True once hydrated on the client, false during server rendering and the
 * first client render. Needed anywhere reading next-themes' resolvedTheme,
 * which is unknown until mounted - guessing would risk a flash of the wrong
 * icon.
 *
 * useSyncExternalStore rather than useState+useEffect: the latter calls
 * setState from inside an effect purely to force a second render, which is
 * exactly what react-hooks/set-state-in-effect exists to catch. This hook
 * IS an external store in the sense the API means - "has the client taken
 * over yet" - so it reads as the value, not a synchronized side effect.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
