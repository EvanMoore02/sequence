import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./engine/dailyGenerator', () => ({
  dailyIds: () => null,
  dailyPuzzles: () => null,
  isCurrentDailyIds: () => false,
}));

import App from './App';
import DailyPreview from './DailyPreview';

describe('Daily Challenge unavailable state', () => {
  it('renders a safe message in the main app when no lineup can be generated', () => {
    const markup = renderToStaticMarkup(<App />);
    expect(markup).toContain('Daily Challenge unavailable');
    expect(markup).toContain('Please check back later.');
  });

  it('renders a safe message in Daily Preview when dates have no lineups', () => {
    const markup = renderToStaticMarkup(<DailyPreview onBack={() => undefined} />);
    expect(markup).toContain('Daily Challenge unavailable');
  });
});
