import { tennessee } from "./tennessee";
import type { TournamentFormat } from "./types";

/** Every tournament format the app knows. More will join the Tennessee format here. */
export const FORMATS: TournamentFormat[] = [tennessee];

/** The format this tournament is played in. One for now, picked in Setup later. */
export const currentFormat = (): TournamentFormat => FORMATS[0];

export type { RuleSection, TournamentFormat } from "./types";
