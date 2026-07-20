import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

/**
 * Ambient audio is currently a no-op.
 * expo-av crashed on SDK 57; expo-audio still caused post-splash native crashes
 * on some devices when create/remove raced during navigation. Re-enable later
 * behind a feature flag once stable.
 */
export type AmbientTrack = 'home' | 'battle' | 'story' | 'shop' | 'none';

type Ctx = { setTrack: (t: AmbientTrack) => void };
const AmbientCtx = createContext<Ctx>({ setTrack: () => {} });

export function AmbientProvider({ children }: { children: React.ReactNode }) {
  const setTrack = useCallback((_t: AmbientTrack) => {}, []);
  const value = useMemo(() => ({ setTrack }), [setTrack]);
  return <AmbientCtx.Provider value={value}>{children}</AmbientCtx.Provider>;
}

export function useAmbient(_track: AmbientTrack) {
  const { setTrack } = useContext(AmbientCtx);
  useEffect(() => {
    setTrack(_track);
    return () => setTrack('none');
  }, [_track, setTrack]);
}
