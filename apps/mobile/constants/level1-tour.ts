/**
 * Guided tour for level 1 only (French copy, no i18n keys for now).
 */

export const LEVEL1_TOUR_STORAGE_PREFIX = 'level1TourStep:v1:';

export function level1TourStorageKey(userId: string, gameInstanceId: number): string {
  return `${LEVEL1_TOUR_STORAGE_PREFIX}${userId}:${gameInstanceId}`;
}

/** Ordered steps persisted for resume */
export const Level1TourStep = {
  OpenInvestSheet: 'OpenInvestSheet',
  SelectLivretAInSheet: 'SelectLivretAInSheet',
  DepositOnLivretA: 'DepositOnLivretA',
  CloseSheetAndPressStart: 'CloseSheetAndPressStart',
  WaitFirstEvent: 'WaitFirstEvent',
  FirstEventResume: 'FirstEventResume',
  SecondEventOpenAssets: 'SecondEventOpenAssets',
  SelectLivretAForWithdraw: 'SelectLivretAForWithdraw',
  WithdrawAndMoveToOtherLivret: 'WithdrawAndMoveToOtherLivret',
  SecondEventResume: 'SecondEventResume',
  Done: 'Done',
} as const;

export type Level1TourStep = (typeof Level1TourStep)[keyof typeof Level1TourStep];

export interface Level1TourPersisted {
  step: Level1TourStep;
  /** 0 = before the level event, 1 = after the event operations are completed */
  eventPhase: number;
}

export function isLivretAAsset(asset: {
  title?: string | null;
  symbol?: string | null;
}): boolean {
  const s = `${asset.title ?? ''} ${asset.symbol ?? ''}`.toLowerCase().replace(/\s+/g, ' ');
  return s.includes('livret a') || s.includes('livreta');
}

/** Exported for asset list filtering in the game screen */
export function isSavingsLivretOtherThanA(asset: {
  title?: string | null;
  symbol?: string | null;
  submarket?: { type?: string | null; title?: string | null } | null;
}): boolean {
  const submarketType = asset.submarket?.type?.toUpperCase();
  if (submarketType) {
    if (submarketType !== 'SAVINGS') return false;
  } else {
    const submarketTitle = `${asset.submarket?.title ?? ''}`.toLowerCase();
    const looksLikeSavings =
      submarketTitle.includes('livret') ||
      submarketTitle.includes('épargne') ||
      submarketTitle.includes('epargne');
    if (!looksLikeSavings) return false;
  }
  return !isLivretAAsset(asset);
}

/** Short title for the in-flow tutoriel card (sheet, asset detail, transaction). */
export function tourStepHeadline(step: Level1TourStep | null): string {
  switch (step) {
    case Level1TourStep.SelectLivretAInSheet:
      return 'Étape 1 — Livret A';
    case Level1TourStep.DepositOnLivretA:
      return 'Étape 2 — Versement';
    case Level1TourStep.SelectLivretAForWithdraw:
      return 'Retrait — Livret A';
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return "Autre livret d'épargne";
    default:
      return 'Tutoriel';
  }
}

export function tourBubbleForStep(step: Level1TourStep | null, eventPhase: number): string {
  switch (step) {
    case Level1TourStep.OpenInvestSheet:
      return "Avant de lancer le temps, ouvrez les placements : touchez « Investir » pour voir les actifs.";
    case Level1TourStep.SelectLivretAInSheet:
      return "Seul le Livret A est affiché : touchez la ligne pour ouvrir sa fiche, puis « Déposer » pour placer de l'argent.";
    case Level1TourStep.DepositOnLivretA:
      return "Sur la fiche, touchez « Déposer », choisissez un montant (un montant vous est proposé), puis confirmez. Vous devez avoir au moins un versement avant de lancer la partie.";
    case Level1TourStep.CloseSheetAndPressStart:
      return "Fermez la liste des actifs, puis touchez « Commencer » pour démarrer la partie.";
    case Level1TourStep.WaitFirstEvent:
      return "Jouez jusqu'à l'événement du niveau. Quand il arrive, ouvrez les actifs pour déplacer votre argent.";
    case Level1TourStep.FirstEventResume:
      return "Quand vous êtes prêt, touchez « Reprendre » pour continuer la partie.";
    case Level1TourStep.SecondEventOpenAssets:
      return "L'événement a changé la situation du Livret A : touchez « Investir » pour ouvrir les actifs et déplacer votre argent.";
    case Level1TourStep.SelectLivretAForWithdraw:
      return "Seul le Livret A est affiché : ouvrez-le, touchez « Retirer », puis validez pour libérer du cash.";
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return "Seuls les autres livrets d'épargne sont listés : choisissez-en un et déposez l'argent retiré du Livret A.";
    case Level1TourStep.SecondEventResume:
      return "Touchez « Reprendre » pour continuer après vos opérations sur les livrets.";
    case Level1TourStep.Done:
      return '';
    default:
      return '';
  }
}
