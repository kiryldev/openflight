import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Shot } from '../../types/shot';
import { LivePanel } from './LivePanel';

/** React SSR splits interpolated text with comment markers; drop them. */
function text(html: string): string {
  return html.replace(/<!-- -->/g, '');
}

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    ball_speed_mph: 92,
    club_speed_mph: 68,
    smash_factor: 1.35,
    estimated_carry_yards: 210,
    carry_range: [205, 215],
    club: 'driver',
    timestamp: '2026-08-19T10:00:00Z',
    peak_magnitude: 100,
    launch_angle_vertical: 13.4,
    launch_angle_horizontal: -1.2,
    launch_angle_confidence: 0.8,
    angle_source: 'radar',
    club_angle_deg: 2.1,
    club_path_deg: -0.6,
    spin_axis_deg: 3.4,
    spin_rpm: 2650,
    spin_confidence: 0.9,
    spin_quality: 'high',
    spin_source: 'measured',
    spin_method: null,
    carry_spin_adjusted: 214,
    profile_id: 'james',
    profile_name: 'James',
    ...overrides,
  };
}

function render(
  shot: Shot | null,
  shots: Shot[] = shot ? [shot] : [],
  selectedMetricId: string | null = null,
  isNewShot = false,
  fullScreen = true,
  clubView = false
) {
  return text(
    renderToString(
      <LivePanel
        shot={shot}
        shots={shots}
        profileId="james"
        profileName="James"
        clubLabel="DR"
        selectedMetricId={selectedMetricId}
        onSelectMetric={() => {}}
        fullScreen={fullScreen}
        clubView={clubView}
        onSetClubView={() => {}}
        recentRowMetricIds={['spin', 'club_path', 'carry', 'ball_speed', 'club_speed']}
        isNewShot={isNewShot}
      />
    )
  );
}

function tileLabels(html: string): string[] {
  const grid = html.match(/<div class="live-panel__grid[\s\S]*$/)?.[0] ?? html;
  return [...grid.matchAll(/metric-card__label[^>]*>([^<]+)/g)].map((match) => match[1]);
}

describe('LivePanel', () => {
  it('sizes live metric numbers in rem that follow the screen', () => {
    const css = readFileSync(fileURLToPath(new URL('./panel.css', import.meta.url)), 'utf8');
    const rootCss = readFileSync(fileURLToPath(new URL('../../index.css', import.meta.url)), 'utf8');

    expect(rootCss).toMatch(/html \{[^}]*font-size: clamp\([^)]*vw[^)]*150%/);
    expect(css).toMatch(
      /\.live-panel__grid \.metric-card__value-row \{[^}]*font-size: clamp\([\d.]+rem, min\([^)]*vw[^)]*vh[^)]*cqi[^)]*cqb\), [\d.]+rem\)/
    );
    expect(css).toMatch(/\.live-panel__grid \.metric-card__value \{[^}]*font-size: 1em/);
    expect(css).toMatch(/\.live-panel__grid \.metric-card__value \{[^}]*flex-shrink: 0/);
    expect(css).toMatch(/\.live-panel__grid \.metric-card__unit \{[^}]*font-size: 0\.42em/);
    expect(css).toMatch(/\.live-panel__grid \.metric-card__value \{[^}]*letter-spacing: 0/);
    expect(css).toMatch(/\.live-panel__grid \.metric-card__value-row \{[^}]*gap: 0\.12em/);
    expect(css).toMatch(/\.live-panel__grid \.metric-card__value-row \{[^}]*overflow: hidden/);
    expect(css).not.toMatch(/\.live-panel__grid \.metric-card__value \{[^}]*font-size: clamp\(\d+px/);
  });

  it('shares one live number size across tiles instead of shrinking per card', () => {
    const liveSrc = readFileSync(fileURLToPath(new URL('./LivePanel.tsx', import.meta.url)), 'utf8');
    const cardSrc = readFileSync(fileURLToPath(new URL('../ui/MetricCard.tsx', import.meta.url)), 'utf8');

    expect(liveSrc).toContain('useSharedFitFontSize');
    expect(cardSrc).not.toContain('useFitFontSize');
    expect(cardSrc).not.toContain('useSharedFitFontSize');
  });

  it('shows the ready state before the first shot', () => {
    const html = render(null);

    expect(html).toContain('Ready');
    expect(html).toContain('live-panel__empty-title');
    expect(html).not.toContain('live-panel__spotlight');
    expect(html).not.toContain('metric-card--interactive');
  });

  it('renders all ten metrics plus a center hero for the selected metric', () => {
    const html = render(makeShot());

    expect(html).toContain('live-panel__hero');
    expect(html).toContain('metric-card--hero');
    expect(html).toContain('live-panel__grid--of-10');
    expect(html.match(/metric-card--interactive/g)).toHaveLength(10);
    expect(html).toContain('>Club AoA<');
    expect(tileLabels(html)[0]).toBe('Ball speed');
    expect(html).toMatch(/live-panel__hero[\s\S]*?>Ball speed</);
  });

  it('keeps grid order fixed and marks the selected metric in the hero and grid', () => {
    const html = render(makeShot(), undefined, 'spin');

    expect(tileLabels(html)[0]).toBe('Ball speed');
    expect(html).toMatch(/live-panel__hero[\s\S]*?>Spin</);
    expect(html).toContain('metric-card--selected');
    expect(html).toMatch(/live-panel__grid[\s\S]*metric-card--selected[\s\S]*?>Spin</);
    expect(html).toContain('>Ball speed<');
    expect(html.match(/metric-card--interactive/g)).toHaveLength(10);
  });

  it('shows the selected metric detail under the full-screen value', () => {
    const spin = render(makeShot(), undefined, 'spin');
    const carry = render(makeShot(), undefined, 'carry');

    expect(spin).toMatch(/live-panel__hero[\s\S]*metric-card__confidence--high[\s\S]*metric-card__confidence-dots/);
    expect(spin).toMatch(/live-panel__hero[\s\S]*>high</);
    expect(carry).toMatch(/live-panel__hero[\s\S]*>Spin-adjusted</);
  });

  it('falls back to ball speed when the selected metric is not in this set', () => {
    const html = render(makeShot(), undefined, 'swing_best');

    expect(tileLabels(html)[0]).toBe('Ball speed');
    expect(html).toMatch(/live-panel__hero[\s\S]*?>Ball speed</);
    expect(html).toMatch(/live-panel__grid[\s\S]*metric-card--selected[\s\S]*?>Ball speed</);
  });

  it('hides the center hero when full screen is off and pins the selected metric top-left', () => {
    const html = render(makeShot(), undefined, 'spin', true, false);

    expect(html).not.toContain('live-panel__hero"');
    expect(html).not.toContain('metric-card--hero');
    expect(html).toContain('live-panel__body--hero-collapsed');
    expect(html).toContain('live-panel__grid--of-10');
    expect(html.match(/metric-card--interactive/g)).toHaveLength(10);
    expect(html).toContain('shot-flash');
    expect(tileLabels(html)[0]).toBe('Spin');
    expect(html).toMatch(/metric-card--selected[\s\S]*?>Spin</);
  });

  it('shows the selected metric above the impact graphic and omits it from the recent single row', () => {
    const html = render(makeShot(), undefined, 'spin', false, true, true);

    expect(html).toContain('live-panel__body--club-view');
    expect(html).toContain('live-panel__impact-layout');
    expect(html).toContain('club-impact');
    expect(html.indexOf('live-panel__hero')).toBeLessThan(html.indexOf('club-impact'));
    expect(html).toContain('live-panel__grid--single-row');
    expect(tileLabels(html).slice(0, 5)).toEqual(['Club path', 'Carry', 'Ball speed', 'Club speed', 'Smash']);
    expect(html).toContain('live-panel__grid--of-9');
    expect(html.match(/live-panel__grid[\s\S]*?>Spin</g)).toBeNull();
    expect(html.match(/metric-card--interactive/g)).toHaveLength(9);
    expect(html).toContain('aria-label="Hide club impact"');
  });

  it('hides the club impact toggle outside full screen and in swing-speed mode', () => {
    expect(render(makeShot(), undefined, null, false, false)).not.toContain('live-panel__club-toggle');
    const swing = makeShot({ mode: 'swing-speed' });
    expect(render(swing, [swing])).not.toContain('live-panel__club-toggle');
  });

  it('uses the side-view club silhouette as the impact toggle icon', () => {
    const html = render(makeShot());
    const sideView = readFileSync(fileURLToPath(new URL('../../assets/driver-head-side-view.svg', import.meta.url)), 'utf8');
    const bodyPath = sideView.match(/<path d="(M29 150[^"]+)"/)?.[1];
    const toggle = html.match(/<button[^>]*live-panel__club-toggle[\s\S]*?<\/button>/)?.[0];

    expect(bodyPath).toBeDefined();
    expect(toggle).toContain(bodyPath);
    expect(toggle).not.toContain('M5 4v11');
    expect(toggle).not.toContain('<image');
  });

  it('does not show the spotlight for a restored session shot', () => {
    const html = render(makeShot(), undefined, null, false);

    expect(html).not.toContain('live-panel__spotlight');
    expect(html).not.toContain('shot-flash');
  });

  it('marks estimated tiles with an icon instead of provenance copy', () => {
    const html = render(makeShot({ angle_source: 'estimated', spin_source: 'calculated' }));

    expect(html).toContain('metric-card__estimated');
    expect(html).not.toContain('>estimated<');
    expect(html).not.toContain('>radar<');
  });

  it('makes every tile a pressable button so it can be selected', () => {
    const html = render(makeShot());

    expect(html.match(/<button[^>]*metric-card--interactive/g)).toHaveLength(10);
    expect(html).toContain('aria-pressed="true"');
  });

  it('shows the profile and club in the header', () => {
    const html = render(makeShot(), [makeShot(), makeShot(), makeShot()]);

    expect(html).toContain('panel-header__subtitle">James<');
    expect(html).toContain('panel-header__club">DR<');
    expect(html).not.toContain('mph / yds');
    expect(html).not.toContain('Shot 03');
  });

  it('places Change club in the header actions', () => {
    const html = text(
      renderToString(
        <LivePanel
          shot={null}
          shots={[]}
          profileId="james"
          profileName="James"
          clubLabel="DR"
          headerAction={
            <button type="button" className="panel-action">
              Change club
            </button>
          }
        />
      )
    );
    const header = html.match(/<header class="panel-header">[\s\S]*?<\/header>/)?.[0] ?? '';

    expect(header).toContain('Change club');
    expect(header).toContain('panel-action');
  });

  it("shows the current profile's last shot, not the previous profile's", () => {
    const james = makeShot({ ball_speed_mph: 90, timestamp: 'a' });
    const alex = makeShot({ profile_id: 'alex', profile_name: 'Alex', ball_speed_mph: 150, timestamp: 'b' });
    const html = render(alex, [james, alex]);

    expect(html).toContain('>90.0<');
    expect(html).not.toContain('>150.0<');
    expect(html).not.toContain('Ready');
  });

  it('returns to ready when the current profile has no shots', () => {
    const alex = makeShot({ profile_id: 'alex', profile_name: 'Alex', ball_speed_mph: 150, timestamp: 'b' });
    const html = render(alex, [alex]);

    expect(html).toContain('Ready');
    expect(html).not.toContain('metric-card--interactive');
  });

  it('renders the five-tile grid for a swing-speed shot', () => {
    const swing = makeShot({
      mode: 'swing-speed',
      training_implement: 'stack-100g',
      training_implement_label: 'Stack 100g',
      profile_id: 'james',
      profile_name: 'James',
    });
    const html = text(
      renderToString(
        <LivePanel
          shot={swing}
          shots={[swing]}
          profileId="james"
          profileName="James"
          clubLabel="Stack 100g"
          activeTrainingImplement="stack-100g"
          onSelectMetric={() => {}}
        />
      )
    );

    expect(html).toContain('live-panel__hero');
    expect(html).toContain('live-panel__grid--of-5');
    expect(html.match(/metric-card--interactive/g)).toHaveLength(5);
    expect(tileLabels(html)[0]).toBe('Last swing');
  });
});
