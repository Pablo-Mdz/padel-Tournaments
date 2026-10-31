import type { ReactNode } from "react";
import type { TournamentState } from "../model/types";

/** One block of the rules page. */
export interface RuleSection {
  id: string;
  title: string;
  /** Short lead paragraph, shown above the points. */
  lead?: ReactNode;
  /** Bullet points; each one is a sentence the players can read off a wall. */
  points?: ReactNode[];
  /** Goes on the printed poster too; the rest is only on the rules page. */
  poster?: boolean;
}

/**
 * A way of running a tournament: how it is scheduled, scored and explained.
 * The app ships one for now; more are meant to sit beside it.
 */
export interface TournamentFormat {
  id: string;
  name: string;
  tagline: string;
  /** Written from the live settings, so the rules always match this tournament. */
  rules: (state: TournamentState) => RuleSection[];
}
