export type Theme = 'light' | 'dark';
export type MotionPreference = 'system' | 'reduce' | 'full';
export type TextSize = 'standard' | 'large';
export type ContrastPreference = 'standard' | 'high';
export type AppSettings = { theme: Theme; motion: MotionPreference; textSize: TextSize; contrast: ContrastPreference };
export const SETTINGS_KEY = 'sequence.settings.v1';
export const DEFAULT_SETTINGS: AppSettings = { theme: 'light', motion: 'system', textSize: 'standard', contrast: 'standard' };

export function readSettings(): AppSettings {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') as Partial<AppSettings> | null;
    return {
      theme: value?.theme === 'dark' ? 'dark' : 'light',
      motion: value?.motion === 'reduce' || value?.motion === 'full' ? value.motion : 'system',
      textSize: value?.textSize === 'large' ? 'large' : 'standard',
      contrast: value?.contrast === 'high' ? 'high' : 'standard',
    };
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Storage may be unavailable. */ }
}

export function applySettings(settings: AppSettings) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.motion = settings.motion;
  document.documentElement.dataset.textSize = settings.textSize;
  document.documentElement.dataset.contrast = settings.contrast;
}
