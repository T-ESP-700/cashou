import { randomUUID } from 'crypto';

/**
 * Tickets éphémères pour l'ouverture des WebSockets.
 *
 * Pourquoi : le token de session (durée de vie 7 jours) ne doit pas transiter
 * dans l'URL du WebSocket (`?token=`), car les URLs sont journalisées par les
 * proxies/Traefik. À la place, le client échange son token (en header Authorization
 * via POST /api/ws-ticket) contre un ticket à usage unique et courte durée, qui
 * n'a de valeur que quelques secondes et seulement pour ouvrir la connexion.
 *
 * Stockage en mémoire : cohérent car le backend tourne en mono-instance
 * (cf. spec §8.B2). À externaliser (Redis) le jour où l'on passe multi-instance.
 */

interface TicketEntry {
  userId: string;
  expiresAt: number;
}

const TICKET_TTL_MS = 30_000; // 30 s
const tickets = new Map<string, TicketEntry>();

/** Émet un ticket à usage unique pour l'utilisateur donné. */
export function issueWsTicket(userId: string): string {
  const ticket = randomUUID();
  tickets.set(ticket, { userId, expiresAt: Date.now() + TICKET_TTL_MS });
  return ticket;
}

/**
 * Consomme un ticket : le supprime (usage unique) et renvoie le userId associé
 * si le ticket existe et n'est pas expiré, sinon null.
 */
export function consumeWsTicket(ticket: string): string | null {
  const entry = tickets.get(ticket);
  if (!entry) return null;
  tickets.delete(ticket); // usage unique, même si expiré
  if (entry.expiresAt <= Date.now()) return null;
  return entry.userId;
}

// Balayage périodique des tickets jamais consommés (évite une fuite mémoire).
let sweeper: ReturnType<typeof setInterval> | null = null;

export function startWsTicketSweeper(): void {
  if (sweeper) return;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [ticket, entry] of tickets) {
      if (entry.expiresAt <= now) tickets.delete(ticket);
    }
  }, 60_000);
  // Ne pas maintenir le process en vie uniquement pour ce timer.
  (sweeper as unknown as { unref?: () => void }).unref?.();
}

export function stopWsTicketSweeper(): void {
  if (sweeper) {
    clearInterval(sweeper);
    sweeper = null;
  }
}

/** Réinitialise l'état (tests). */
export function clearWsTicketsForTests(): void {
  stopWsTicketSweeper();
  tickets.clear();
}
