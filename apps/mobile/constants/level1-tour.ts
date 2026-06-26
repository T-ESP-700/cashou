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
      return 'Commences par placer ton épargne dans le Livret A';
    case Level1TourStep.SelectLivretAForWithdraw:
      return 'Ouvres le Livret A pour retirer ton argent';
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return 'Déplaces ton argent vers le Livret DDS';
    default:
      return '';
  }
}

export function tourBubbleForStep(step: Level1TourStep | null, eventPhase: number): string {
  switch (step) {
    case Level1TourStep.OpenInvestSheet:
      return "Avant de lancer la partie, ouvres les assets : appuie sur « Investir » pour voir les actifs disponibles.";
    case Level1TourStep.SelectLivretAInSheet:
      return "Seul le Livret A est disponible pour l'instant : appuie dessus pour ouvrir sa fiche, puis sur « Déposer » pour placer de l'argent.";
    case Level1TourStep.DepositOnLivretA:
      return "Appuies sur « Déposer », choisis un montant, puis confirmes. Tu dois avoir au moins un versement avant de lancer la partie.";
    case Level1TourStep.CloseSheetAndPressStart:
      return "Appuies sur « Commencer » pour démarrer la partie.";
    case Level1TourStep.WaitFirstEvent:
      return "Joue jusqu'à l'événement du niveau. Quand il arrive, ouvre tes actifs pour déplacer ton argent.";
    case Level1TourStep.FirstEventResume:
      return "Quand tu es prêt, appuies sur « Reprendre » pour continuer la partie.";
    case Level1TourStep.PostEventOpenAssets:
      return "L'événement a changé la situation du Livret A : appuies sur « Investir » pour ouvrir les actifs et déplacer ton argent.";
    case Level1TourStep.SelectLivretAForWithdraw:
      return "Retournes sur ton Livret, appuies sur« Retirer », puis valides pour libérer du cash.";
    case Level1TourStep.WithdrawAndMoveToOtherLivret:
      return "Le livret DDS est maintenant disponible : choisis-le et déplaces l'argent retiré du Livret A.";
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
