import { t } from "../i18n/texts";
import { courtCount } from "../model/tournament";
import type { TournamentState } from "../model/types";
import type { RuleSection, TournamentFormat } from "./types";

const list = (items: string[]) => items.join(", ").replace(/, ([^,]*)$/, " and $1");

/**
 * The Tennessee Tournament: teams of four, every duel played as four matches,
 * and a winner decided on points scored rather than duels won.
 */
export const tennessee: TournamentFormat = {
  id: "tennessee",
  name: "Tennessee Tournament",
  tagline: "Teams of four. Three duels. Every point counts.",

  rules(state: TournamentState): RuleSection[] {
    const [r1, r2, r3] = state.settings.matchMinutes;
    const teams = state.teams.length;
    const courts = courtCount(teams);
    const sameLength = r1 === r2 && r2 === r3;

    return [
      {
        id: "team",
        poster: true,
        title: "Your team",
        lead: `Four players: two women and two men. ${teams} teams play, on ${courts} courts.`,
        points: [
          "The same four players stay together all day.",
          "Someone injured? Keep playing with who you have — nothing is blocked.",
        ],
      },
      {
        id: "duel",
        poster: true,
        title: "One duel = four matches",
        lead: "Your team faces another team and plays four matches back to back on the same court:",
        points: [
          "1 · Women — the two women against the two women.",
          "2 · Men — the two men against the two men.",
          "3 · Mixed 1 — man 1 and woman 1.",
          "4 · Mixed 2 — man 2 and woman 2.",
        ],
      },
      {
        id: "points",
        poster: true,
        title: "The points — not normal padel scoring",
        lead: sameLength
          ? `Each match lasts ${r1} minutes. You score as many points as you can in that time.`
          : `Each match lasts ${r1} minutes in rounds 1 and 2, and ${r3} minutes in round 3. You score as many points as you can in that time.`,
        points: [
          "+1 when the opponents make a mistake.",
          "+2 when you win the point outright and the opponents never touch the ball.",
          "One serve per point only — there is no second serve.",
          "The serve rotates through all four players, the way it does in a tie-break.",
          "The points of all four matches add up to the team score.",
        ],
      },
      {
        id: "winning",
        poster: true,
        title: "What decides the tournament",
        lead: "The team with the most points over its three duels wins — not the team that wins the most duels.",
        points: [
          "Being behind changes nothing: every single point still counts towards your total.",
          "So play to the last ball, even in a match you cannot win.",
        ],
      },
      {
        id: "rounds",
        poster: true,
        title: "The three rounds",
        points: [
          "Rounds 1 and 2 are fixed. They are drawn so that you never face the same team twice.",
          "Round 3 is set by the table after round 2: 1st plays 2nd, 3rd plays 4th, and so on.",
          `That puts the two leaders against each other on ${t.court(state.settings.courts[0] ?? 1)}.`,
        ],
      },
      {
        id: "reporting",
        poster: true,
        title: "After each match",
        lead: 'Come by reception and tell us the result, for example "10 to 15".',
        points: ["It is on the screen within seconds.", "Got it wrong? Tell us — it can be corrected at any time."],
      },
      {
        id: "table",
        title: "Reading the table",
        lead: `The TV rotates between the live scores, the overall standings and the qualifying table. The columns are ${list(
          ["PF", "PA", "+/−", "P W D L"],
        )}.`,
        points: [
          "PF — the points you scored. This is the column that decides the tournament.",
          "PA — the points your opponents scored.",
          "+/− — the difference between the two.",
          "P W D L — duels played, won, drawn and lost. They do not decide anything.",
          "Level on points? The difference decides, then the duel between the tied teams.",
        ],
      },
    ];
  },
};
