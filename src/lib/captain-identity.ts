/** Federation captain avatar presentation (independent of pronouns). */
export type CaptainGender = 'other' | 'male' | 'female';

export const DEFAULT_CAPTAIN_GENDER: CaptainGender = 'other';

export const CAPTAIN_GENDER_OPTIONS: readonly CaptainGender[] = [
  'other',
  'male',
  'female',
];

const PILOT_ICON: Record<CaptainGender, string> = {
  other: '/user-pilot-duotone-solid-full.svg',
  male: '/user-pilot-tie-duotone-solid-full.svg',
  female: '/user-pilot-tie-hair-long-duotone-solid-full.svg',
};

export function isCaptainGender(value: unknown): value is CaptainGender {
  return value === 'other' || value === 'male' || value === 'female';
}

export function captainPilotIcon(gender: CaptainGender): string {
  return PILOT_ICON[gender];
}

export function captainGenderLabel(gender: CaptainGender): string {
  switch (gender) {
    case 'other':
      return 'Captain X';
    case 'female':
      return 'Female captain';
    default:
      return 'Male captain';
  }
}

/** Narration pronouns — independent of avatar gender. */
export type PronounPresetId = 'they' | 'she' | 'he' | 'custom';

export interface CaptainPronounPreference {
  readonly preset: PronounPresetId;
  /** Slash form subject/object/possessive[/independent] when preset is custom. */
  readonly custom?: string;
}

export const DEFAULT_CAPTAIN_PRONOUNS: CaptainPronounPreference = {
  preset: 'they',
};

export const CAPTAIN_PRONOUN_PRESETS: readonly {
  readonly id: PronounPresetId;
  readonly label: string;
  readonly example: string;
}[] = [
  { id: 'she', label: 'She / her', example: 'she / her / hers' },
  { id: 'he', label: 'He / him', example: 'he / him / his' },
  { id: 'they', label: 'They / them', example: 'they / them / their' },
  { id: 'custom', label: 'Custom', example: 'xe / xem / xyr' },
];

export function isPronounPresetId(value: unknown): value is PronounPresetId {
  return (
    value === 'they' || value === 'she' || value === 'he' || value === 'custom'
  );
}

export function isCaptainPronounPreference(
  value: unknown
): value is CaptainPronounPreference {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const raw = value as { preset?: unknown; custom?: unknown };
  if (!isPronounPresetId(raw.preset)) {
    return false;
  }
  if (raw.custom !== undefined && typeof raw.custom !== 'string') {
    return false;
  }
  return true;
}

export function sanitizePronounPreference(
  preference: CaptainPronounPreference
): CaptainPronounPreference {
  if (preference.preset !== 'custom') {
    return { preset: preference.preset };
  }
  return { preset: 'custom', custom: preference.custom?.trim() ?? '' };
}

export function captainPronounsLabel(
  preference: CaptainPronounPreference
): string {
  switch (preference.preset) {
    case 'she':
      return 'she / her / hers';
    case 'he':
      return 'he / him / his';
    case 'custom': {
      const custom = preference.custom?.trim();
      return custom || 'Custom (enter forms)';
    }
    default:
      return 'they / them / their';
  }
}

export function sanitizeSpeakAs(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().slice(0, 48);
  return trimmed || null;
}
