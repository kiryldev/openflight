import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Shot } from '../../types/shot';
import { ClubImpactView } from './ClubImpactView';
import { visualAngle } from './clubImpactGeometry';

function text(html: string): string {
  return html.replace(/<!-- -->/g, '');
}

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    ball_speed_mph: 100,
    club_speed_mph: 70,
    smash_factor: 1.4,
    estimated_carry_yards: 220,
    carry_range: [210, 230],
    club: 'driver',
    timestamp: '2026-11-06T00:00:00Z',
    peak_magnitude: 100,
    launch_angle_vertical: 12,
    launch_angle_horizontal: 2,
    launch_angle_confidence: 0.8,
    angle_source: 'radar',
    club_angle_deg: 3,
    club_path_deg: 4,
    spin_axis_deg: 2,
    spin_rpm: 2400,
    spin_confidence: 0.8,
    spin_quality: 'high',
    spin_source: 'measured',
    carry_spin_adjusted: 225,
    ...overrides,
  };
}

describe('ClubImpactView', () => {
  it('centers the reference guides on the visible club heads', () => {
    const html = text(renderToString(<ClubImpactView shot={makeShot()} />));
    const sideImage = html.match(/<image[^>]*club-impact__club-head--side[^>]*>/)?.[0];
    const topImage = html.match(/<image[^>]*data-handedness="left"[^>]*>/)?.[0];
    expect(sideImage).toBeDefined();
    expect(topImage).toBeDefined();

    const sideY = Number(sideImage?.match(/\sy="([^"]+)"/)?.[1]);
    const topY = Number(topImage?.match(/\sy="([^"]+)"/)?.[1]);
    const sideX = Number(sideImage?.match(/\sx="([^"]+)"/)?.[1]);
    const topX = Number(topImage?.match(/\sx="([^"]+)"/)?.[1]);
    const sideHeadCenterX = sideX + (98 * 44) / 196;
    const topHeadCenterX = topX + (216 * 44) / 432;
    const sideHeadCenterY = sideY + 47 - (190 * 44) / 196 + (136 * 44) / 196;
    const topHeadCenterY = topY + (58 - (565 * 44) / 432) / 2 + (216 * 44) / 432;

    expect(sideHeadCenterY).toBeCloseTo(72, 0);
    expect(topHeadCenterY).toBeCloseTo(174, 0);

    const rotatedY = (image: string | undefined, centerX: number, centerY: number) => {
      const [, angle, pivotX, pivotY] = image?.match(/transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)"/) ?? [];
      const radians = (Number(angle) * Math.PI) / 180;
      return (
        Number(pivotY) + (centerX - Number(pivotX)) * Math.sin(radians) + (centerY - Number(pivotY)) * Math.cos(radians)
      );
    };
    expect(rotatedY(sideImage, sideHeadCenterX, sideHeadCenterY)).toBeCloseTo(72, 0);
    expect(rotatedY(topImage, topHeadCenterX, topHeadCenterY)).toBeCloseTo(174, 0);

    const guidePositions = [...html.matchAll(/<line class="club-impact__guide"[^>]*>/g)].map((match) => match.index);
    expect(guidePositions).toHaveLength(2);
    expect(guidePositions[0]).toBeGreaterThan(html.indexOf(topImage!));
    expect(guidePositions[1]).toBeGreaterThan(html.indexOf(sideImage!));
  });

  it('draws the available measurements without inventing face or loft data', () => {
    const html = text(renderToString(<ClubImpactView shot={makeShot()} />));
    expect(html).toContain('Club AoA +3.0°');
    expect(html).toContain('Club path +4.0°');
    expect(html).toContain('in-to-out');
    expect(html).toContain('Spin 2,400 rpm');
    expect(html).toMatch(/<image[^>]*club-impact__club-head[^>]*data-handedness="left"/);
    expect(html.match(/href="data:image\/svg\+xml,/g)).toHaveLength(2);
    expect(html).toContain('transform="rotate(12 113 174)"');
    expect(html).not.toContain('club-impact__club-line');
    expect(html).toContain('transform="rotate(-9 113 72)"');
    expect(html).not.toMatch(/>Side view<|>Top view</);
    expect(html).not.toMatch(/Face angle|Face to path|Dynamic loft|Spin loft/);
  });

  it('maps signs to visible directions and clamps exaggerated angles', () => {
    const html = text(renderToString(
      <ClubImpactView
        shot={makeShot({ club_angle_deg: -3, club_path_deg: -4, launch_angle_horizontal: -2 })}
      />
    ));
    expect(html).toContain('data-angle="-9"');
    expect(html).toContain('data-angle="-12"');
    expect(html).toContain('transform="rotate(-12 113 174)"');
    expect(html).toContain('transform="rotate(9 113 72)"');
    expect(html).toContain('data-angle="-6"');
    expect(html).toContain('out-to-in');
    expect(visualAngle(30)).toBe(35);
    expect(visualAngle(-30)).toBe(-35);
  });

  it('colors measured angle lines and their guide areas by sign', () => {
    const html = text(renderToString(<ClubImpactView shot={makeShot({
      club_path_deg: 4,
      club_angle_deg: -3,
      launch_angle_horizontal: -2,
      launch_angle_vertical: 12,
    })} />));

    expect(html.match(/<polygon class="club-impact__angle-area club-impact__positive"/g)).toHaveLength(2);
    expect(html.match(/<polygon class="club-impact__angle-area club-impact__negative"/g)).toHaveLength(2);
    expect(html).toMatch(/<line class="club-impact__path-trail club-impact__positive"/);
    expect(html).toMatch(/<line class="club-impact__path-trail club-impact__negative"/);
    expect(html).toMatch(/<line class="club-impact__ball-line club-impact__positive"/);
    expect(html).toMatch(/<line class="club-impact__ball-line club-impact__negative"/);
  });

  it('leaves missing and zero angles neutral without a shaded area', () => {
    const html = text(renderToString(<ClubImpactView shot={makeShot({
      club_path_deg: 0,
      club_angle_deg: null,
      launch_angle_horizontal: null,
      launch_angle_vertical: 0,
    })} />));

    expect(html).not.toContain('club-impact__angle-area');
    expect(html).not.toContain('club-impact__positive');
    expect(html).not.toContain('club-impact__negative');
  });

  it('shows dimmed placeholders and experimental markers', () => {
    const html = text(renderToString(
      <ClubImpactView
        shot={makeShot({
          club_angle_deg: null,
          club_path_deg: null,
          experimental_fused_attack_angle_deg: -2,
          experimental_fused_club_path_deg: null,
          experimental_fused_status: 'candidate_available',
          launch_angle_vertical: null,
          launch_angle_horizontal: null,
          spin_axis_deg: null,
          spin_rpm: null,
        })}
      />
    ));
    expect(html).toContain('Club AoA -2.0° *');
    expect(html).toContain('club-impact__missing');
    expect(html).toContain('Experimental club delivery');
    expect(html).toContain('—');
    expect(html).toMatch(/<image[^>]*club-impact__club-head club-impact__missing/);
    expect(html).toContain('transform="rotate(0 113 174)"');
  });
});
