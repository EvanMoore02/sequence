import type { ReactNode } from 'react';
import { ArrowLeft, Check, Contrast, Monitor, Moon, Sun, Type } from 'lucide-react';
import { DEFAULT_SETTINGS, type AppSettings, type ContrastPreference, type MotionPreference, type TextSize, type Theme } from './engine/settings';

function Choice<T extends string>({ label, value, selected, onSelect, icon }: { label: string; value: T; selected: T; onSelect: (value: T) => void; icon?: ReactNode }) {
  return <button type="button" className={'setting-choice ' + (selected === value ? 'selected' : '')} aria-pressed={selected === value} onClick={() => onSelect(value)}>{icon}<span>{label}</span>{selected === value && <Check size={15} />}</button>;
}

export default function SettingsPage({ settings, onChange, onBack }: { settings: AppSettings; onChange: (settings: AppSettings) => void; onBack: () => void }) {
  function update<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) { onChange({ ...settings, [key]: value }); }
  function setTheme(theme: Theme) { update('theme', theme); }
  function setMotion(motion: MotionPreference) { update('motion', motion); }
  function setTextSize(textSize: TextSize) { update('textSize', textSize); }
  function setContrast(contrast: ContrastPreference) { update('contrast', contrast); }
  return <section className="settings-page fade">
    <button className="back" onClick={onBack}><ArrowLeft size={16} /> Home</button>
    <div className="settings-hero"><span className="eyebrow">MAKE IT YOURS</span><h1>Settings</h1><p>Your preferences are saved on this device.</p></div>
    <article className="settings-card">
      <div className="setting-row"><div><h2>Theme</h2><p>Choose how SEQUENCE looks.</p></div><div className="setting-options" role="group" aria-label="Theme"><Choice label="Light" value="light" selected={settings.theme} onSelect={setTheme} icon={<Sun size={15} />} /><Choice label="Dark" value="dark" selected={settings.theme} onSelect={setTheme} icon={<Moon size={15} />} /></div></div>
      <div className="setting-row"><div><h2>Text size</h2><p>Make labels and puzzle text easier to read.</p></div><div className="setting-options" role="group" aria-label="Text size"><Choice label="Standard" value="standard" selected={settings.textSize} onSelect={setTextSize} icon={<Type size={15} />} /><Choice label="Large" value="large" selected={settings.textSize} onSelect={setTextSize} /></div></div>
      <div className="setting-row"><div><h2>Contrast</h2><p>Strengthen text, borders, and focus outlines.</p></div><div className="setting-options" role="group" aria-label="Contrast"><Choice label="Standard" value="standard" selected={settings.contrast} onSelect={setContrast} /><Choice label="High" value="high" selected={settings.contrast} onSelect={setContrast} icon={<Contrast size={15} />} /></div></div>
      <div className="setting-row"><div><h2>Motion</h2><p>System follows your device's accessibility setting.</p></div><div className="motion-options" role="group" aria-label="Motion preference"><Choice label="System" value="system" selected={settings.motion} onSelect={setMotion} icon={<Monitor size={15} />} /><Choice label="Reduce" value="reduce" selected={settings.motion} onSelect={setMotion} /><Choice label="Standard" value="full" selected={settings.motion} onSelect={setMotion} /></div></div>
      <button className="reset-settings" onClick={() => onChange(DEFAULT_SETTINGS)}>Reset to defaults</button>
    </article>
    <p className="settings-note">Progress and settings are stored only in this browser on this device. Clearing browser data may erase them; they do not sync across devices.</p>
  </section>;
}
