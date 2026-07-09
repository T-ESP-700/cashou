import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Level1TourStep,
  level1TourStorageKey,
  type Level1TourPersisted,
  isLivretAAsset,
  isSavingsLivretOtherThanA,
} from '@/constants/level1-tour';
import { trpcClient } from '@/lib/trpc';
import {
  registerLevel1TourLogoutClear,
  unregisterLevel1TourLogoutClear,
} from '@/lib/level1-tour-logout-bridge';

export interface HoldingLike {
  quantity: string | number | null;
  asset: { id: number; title?: string | null; symbol?: string | null; submarket?: { type?: string | null } | null } | null;
}

interface Level1TourContextValue {
  sessionActive: boolean;
  step: Level1TourStep;
  eventPhase: number;
  /**
   * True when the level offers at least one savings livret other than Livret A.
   * Drives the post-event branching (multi-livret rebalance vs. simple acknowledge).
   */
  hasOtherSavings: boolean;
  restrictEventModalToAssetsOnly: boolean;

  initFromGameScreen: (args: {
    userId: string;
    gameInstanceId: number;
    levelNumber: number | null | undefined;
    hasLevel1CompletionRecord: boolean;
  }) => Promise<void>;

  goToStep: (s: Level1TourStep) => Promise<void>;

  syncHoldings: (holdings: HoldingLike[]) => Promise<void>;

  /** Sync flag from current.tsx once available assets are fetched. */
  setHasOtherSavings: (value: boolean) => void;

  notifyEventResumeCompleted: () => Promise<void>;

  /** After gameInstance.start() succeeds — time runs, wait for first event */
  notifyGameClockStarted: () => Promise<void>;

  abortTour: () => Promise<void>;
  clearSession: () => void;

  resetTourDev: () => Promise<void>;
}

const Level1TourContext = createContext<Level1TourContextValue | null>(null);

function holdingsHasLivretA(holdings: HoldingLike[]): boolean {
  return holdings.some(
    (h) => h.asset && isLivretAAsset(h.asset) && Number(h.quantity ?? 0) > 0
  );
}

function holdingsHasOtherSavings(holdings: HoldingLike[]): boolean {
  return holdings.some(
    (h) =>
      h.asset &&
      isSavingsLivretOtherThanA(h.asset) &&
      Number(h.quantity ?? 0) > 0
  );
}

function livretAQuantity(holdings: HoldingLike[]): number {
  const h = holdings.find((x) => x.asset && isLivretAAsset(x.asset));
  return h ? Number(h.quantity ?? 0) : 0;
}

function parsePersisted(json: string | null): Level1TourPersisted | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Level1TourPersisted;
    if (!o || typeof o.step !== 'string') return null;
    if (!Object.values(Level1TourStep).includes(o.step as Level1TourStep)) return null;
    const phase = typeof o.eventPhase === 'number' ? o.eventPhase : 0;
    return { step: o.step as Level1TourStep, eventPhase: phase };
  } catch {
    return null;
  }
}

export function Level1TourProvider({ children }: { children: React.ReactNode }) {
  const [sessionActive, setSessionActive] = useState(false);
  const [step, setStepState] = useState<Level1TourStep>(Level1TourStep.Done);
  const [eventPhase, setEventPhase] = useState(0);
  const [hasOtherSavings, setHasOtherSavingsState] = useState(false);
  const storageContextRef = useRef<{ userId: string; gameInstanceId: number } | null>(null);
  const stepRef = useRef(step);
  const eventPhaseRef = useRef(0);
  const hasOtherSavingsRef = useRef(false);
  stepRef.current = step;
  eventPhaseRef.current = eventPhase;
  hasOtherSavingsRef.current = hasOtherSavings;

  const setHasOtherSavings = useCallback((value: boolean) => {
    if (hasOtherSavingsRef.current === value) return;
    hasOtherSavingsRef.current = value;
    setHasOtherSavingsState(value);
  }, []);

  const persist = useCallback(async (s: Level1TourStep, phase: number) => {
    const ctx = storageContextRef.current;
    if (!ctx) return;
    if (s === Level1TourStep.Done) {
      await AsyncStorage.removeItem(level1TourStorageKey(ctx.userId, ctx.gameInstanceId));
      return;
    }
    const body: Level1TourPersisted = { step: s, eventPhase: phase };
    await AsyncStorage.setItem(level1TourStorageKey(ctx.userId, ctx.gameInstanceId), JSON.stringify(body));
  }, []);

  const applyState = useCallback(async (s: Level1TourStep, phase: number) => {
    setStepState(s);
    setEventPhase(phase);
    stepRef.current = s;
    eventPhaseRef.current = phase;
    await persist(s, phase);
  }, [persist]);

  const clearSession = useCallback(() => {
    setSessionActive(false);
    setStepState(Level1TourStep.Done);
    setEventPhase(0);
    setHasOtherSavingsState(false);
    stepRef.current = Level1TourStep.Done;
    eventPhaseRef.current = 0;
    hasOtherSavingsRef.current = false;
    storageContextRef.current = null;
  }, []);

  useEffect(() => {
    registerLevel1TourLogoutClear(clearSession);
    return () => unregisterLevel1TourLogoutClear();
  }, [clearSession]);

  const abortTour = useCallback(async () => {
    const ctx = storageContextRef.current;
    if (ctx) {
      await AsyncStorage.removeItem(level1TourStorageKey(ctx.userId, ctx.gameInstanceId));
    }
    clearSession();
  }, [clearSession]);

  const goToStep = useCallback(
    async (s: Level1TourStep) => {
      if (s === Level1TourStep.Done) {
        await applyState(Level1TourStep.Done, 0);
        clearSession();
        return;
      }
      await applyState(s, eventPhaseRef.current);
    },
    [applyState, clearSession]
  );

  const initFromGameScreen = useCallback(
    async (args: {
      userId: string;
      gameInstanceId: number;
      levelNumber: number | null | undefined;
      hasLevel1CompletionRecord: boolean;
    }) => {
      const { userId, gameInstanceId, levelNumber, hasLevel1CompletionRecord } = args;

      const levelNum = levelNumber == null ? NaN : Number(levelNumber);
      const blockedByCompletion = hasLevel1CompletionRecord && !__DEV__;
      if (!Number.isFinite(levelNum) || levelNum !== 1 || blockedByCompletion) {
        await AsyncStorage.removeItem(level1TourStorageKey(userId, gameInstanceId));
        clearSession();
        return;
      }

      storageContextRef.current = { userId, gameInstanceId };
      setSessionActive(true);

      const raw = await AsyncStorage.getItem(level1TourStorageKey(userId, gameInstanceId));
      const parsed = parsePersisted(raw);
      if (parsed && parsed.step !== Level1TourStep.Done) {
        await applyState(parsed.step, parsed.eventPhase);
        return;
      }

      await applyState(Level1TourStep.OpenInvestSheet, 0);
    },
    [applyState, clearSession]
  );

  const syncHoldings = useCallback(
    async (holdings: HoldingLike[]) => {
      // Use refs only: sessionActive in deps caused a stale closure right after init, so holdings
      // updates never advanced the step (e.g. after Livret A deposit).
      if (!storageContextRef.current) return;
      if (stepRef.current === Level1TourStep.Done) return;
      const s = stepRef.current;
      if (s === Level1TourStep.DepositOnLivretA && holdingsHasLivretA(holdings)) {
        await applyState(Level1TourStep.CloseSheetAndPressStart, eventPhaseRef.current);
      }
      if (s === Level1TourStep.SelectLivretAForWithdraw && livretAQuantity(holdings) <= 0) {
        await applyState(Level1TourStep.WithdrawAndMoveToOtherLivret, eventPhaseRef.current);
      }
      if (
        s === Level1TourStep.WithdrawAndMoveToOtherLivret &&
        holdingsHasOtherSavings(holdings) &&
        livretAQuantity(holdings) <= 0
      ) {
        await applyState(Level1TourStep.PostEventResume, eventPhaseRef.current);
      }
    },
    [applyState]
  );

  const notifyEventResumeCompleted = useCallback(async () => {
    if (!storageContextRef.current) return;
    const s = stepRef.current;
    if (s === Level1TourStep.FirstEventResume) {
      // Single-livret flow (e.g. new level 1 with only Livret A): event is purely
      // narrative, so resuming after it leads directly to the end-game choice.
      await applyState(Level1TourStep.AwaitEndGameChoice, 1);
      return;
    }
    if (s === Level1TourStep.PostEventResume) {
      await applyState(Level1TourStep.AwaitEndGameChoice, 1);
    }
  }, [applyState]);

  const notifyGameClockStarted = useCallback(async () => {
    if (!storageContextRef.current) return;
    await applyState(Level1TourStep.WaitFirstEvent, 0);
  }, [applyState]);

  const restrictEventModalToAssetsOnly =
    sessionActive &&
    hasOtherSavings &&
    eventPhase === 0 &&
    (step === Level1TourStep.WaitFirstEvent ||
      step === Level1TourStep.PostEventOpenAssets);

  const resetTourDev = useCallback(async () => {
    try {
      await trpcClient.levelCompletion.resetLevel1TourDev.mutate();
    } catch (e) {
      console.warn('[Level1Tour] resetLevel1TourDev failed', e);
    }
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith('level1TourStep:'));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      sessionActive,
      step,
      eventPhase,
      hasOtherSavings,
      restrictEventModalToAssetsOnly,
      initFromGameScreen,
      goToStep,
      syncHoldings,
      setHasOtherSavings,
      notifyEventResumeCompleted,
      notifyGameClockStarted,
      abortTour,
      clearSession,
      resetTourDev,
    }),
    [
      sessionActive,
      step,
      eventPhase,
      hasOtherSavings,
      restrictEventModalToAssetsOnly,
      initFromGameScreen,
      goToStep,
      syncHoldings,
      setHasOtherSavings,
      notifyEventResumeCompleted,
      notifyGameClockStarted,
      abortTour,
      clearSession,
      resetTourDev,
    ]
  );

  return <Level1TourContext.Provider value={value}>{children}</Level1TourContext.Provider>;
}

export function useLevel1Tour(): Level1TourContextValue {
  const ctx = useContext(Level1TourContext);
  if (!ctx) {
    throw new Error('useLevel1Tour must be used within Level1TourProvider');
  }
  return ctx;
}

export function useOptionalLevel1Tour(): Level1TourContextValue | null {
  return useContext(Level1TourContext);
}
