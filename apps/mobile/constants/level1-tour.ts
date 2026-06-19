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
  PostEventOpenAssets: 'PostEventOpenAssets',
  SelectLivretAForWithdraw: 'SelectLivretAForWithdraw',
  WithdrawAndMoveToOtherLivret: 'WithdrawAndMoveToOtherLivret',
  PostEventResume: 'PostEventResume',
  AwaitEndGameChoice: 'AwaitEndGameChoice',
  SummaryQuizPrompt: 'SummaryQuizPrompt',
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

/** Texte court pour la bulle "spotlight" pointant la carte mise en avant (drawer d'assets). */
export function tourSpotlightText(step: Level1TourStep | null): string {
  switch (step) {
    case Level1TourStep.DepositOnLivretA:
      return 'Ici, découvre les informations sur un asset puis clique sur « Déposer » pour aller plus loin';
    case Level1TourStep.SelectLivretAInSheet:
      return 'Commencez par placer votre épargne dans le Livret A';
    case Level1TourStep.SelectLivretAForWithdraw:
      return 'Ouvrez le Livret A pour retirer votre argent';
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return 'Déplacez votre argent vers le Livret DDS';
    default:
      return '';
  }
}

export function tourBubbleForStep(step: Level1TourStep | null, eventPhase: number): string {
  switch (step) {
    case Level1TourStep.OpenInvestSheet:
      return "Avant de lancer la partie, ouvres les assets : appuie sur « Investir » pour voir les actifs disponibles.";
    case Level1TourStep.SelectLivretAInSheet:
      return "Seul le Livret A est disponible pour l'instant :appuie dessus pour ouvrir sa fiche, puis sur « Déposer » pour placer de l'argent.";
    case Level1TourStep.DepositOnLivretA:
      return "Sur la fiche, touchez « Déposer », choisissez un montant (un montant vous est proposé), puis confirmez. Vous devez avoir au moins un versement avant de lancer la partie.";
    case Level1TourStep.CloseSheetAndPressStart:
      return "Appues sur « Commencer » pour démarrer la partie.";
    case Level1TourStep.WaitFirstEvent:
      return "Jouez jusqu'à l'événement du niveau. Quand il arrive, ouvrez les actifs pour déplacer votre argent.";
    case Level1TourStep.FirstEventResume:
      return "Quand vous êtes prêt, touchez « Reprendre » pour continuer la partie.";
    case Level1TourStep.PostEventOpenAssets:
      return "L'événement a changé la situation du Livret A : touchez « Investir » pour ouvrir les actifs et déplacer votre argent.";
    case Level1TourStep.SelectLivretAForWithdraw:
      return "Seul le Livret A est disponible pour l'instant : ouvrez-le, touchez « Retirer », puis validez pour libérer du cash.";
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return "Seuls le livret DDS est maintenant disponible : choisissez-en un et déposez l'argent retiré du Livret A.";
    case Level1TourStep.PostEventResume:
      return "Appuies sur « Reprendre » pour que la partie continue!";
    case Level1TourStep.SummaryQuizPrompt:
      return 'Fais le quiz pour gagner la troisième étoile.';
    case Level1TourStep.AwaitEndGameChoice:
    case Level1TourStep.Done:
      return '';
    default:
      return '';
  }
}
