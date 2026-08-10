// bc.settings.constants.ts
//
// Shared BunnyCase settings keys. The Play All delay is configured in the
// Settings module and consumed by the Simulator (stored in localStorage so the
// preference survives reloads).

/** localStorage key for the Simulator "Play All" delay in milliseconds. */
export const BC_PLAY_DELAY_STORAGE_KEY = "bc.simulator.playDelay";

/** Default delay (ms) between turns when playing all simulator audio. */
export const BC_PLAY_DELAY_DEFAULT = 500;
