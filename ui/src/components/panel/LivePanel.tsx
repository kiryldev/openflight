import { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GolfBallIcon } from '@hugeicons/core-free-icons';
import type { Shot } from '../../types/shot';
import { computeSwingSpeedStats, filterShotsByProfile } from '../../types/shot';
import { useUnitPreference } from '../../state/useUnitPreference';
import { useI18n } from '../../i18n/useI18n';
import { useSharedFitFontSize } from '../../hooks/useFitFontSize';
import { MetricCard } from '../ui/MetricCard';
import { ClubImpactView } from './ClubImpactView';
import { buildLiveMetrics, orderRowMetrics, pinSelectedMetric, resolveSelectedMetric } from './liveMetrics';

interface LivePanelProps {
  shot: Shot | null;
  shots: Shot[];
  profileId: string;
  /** Undefined outside swing-speed mode. Scopes the swing stats to one implement. */
  activeTrainingImplement?: string;
  /** Metric shown as the hero in club-impact view and pinned first otherwise. */
  selectedMetricId?: string | null;
  onSelectMetric?: (id: string) => void;
  /**
   * Expanded mode: selected metric as a large hero above the club impact
   * visual. Ignored for swing-speed shots. Toggled from the Live header.
   */
  clubView?: boolean;
  recentRowMetricIds?: string[];
  /** True for a freshly captured shot (not a restored session). */
  isNewShot?: boolean;
}

/**
 * Live metric table. In club-impact view the selected value is a large hero
 * above the impact visual and the grid follows recent-selection order.
 * Otherwise only the grid shows, and tapping a tile moves it top-left.
 */
export function LivePanel({
  shot,
  shots,
  profileId,
  activeTrainingImplement,
  selectedMetricId = null,
  onSelectMetric,
  clubView = false,
  recentRowMetricIds = [],
  isNewShot = false,
}: LivePanelProps) {
  const { locale, t } = useI18n();
  const { unitSystem } = useUnitPreference();
  const profileShots = useMemo(() => filterShotsByProfile(shots, profileId), [shots, profileId]);
  const displayedShot = profileShots[profileShots.length - 1] ?? null;
  const isProfileNewShot = Boolean(isNewShot && shot && displayedShot && shot.timestamp === displayedShot.timestamp);

  const swingStats = useMemo(
    () => computeSwingSpeedStats(profileShots, { profileId, trainingImplement: activeTrainingImplement }),
    [profileShots, profileId, activeTrainingImplement]
  );
  const showImpact = Boolean(clubView && displayedShot && displayedShot.mode !== 'swing-speed');
  const metrics = useMemo(() => {
    if (!displayedShot) {
      return [];
    }
    const built = buildLiveMetrics(displayedShot, unitSystem, swingStats);
    return showImpact ? orderRowMetrics(built, recentRowMetricIds) : pinSelectedMetric(built, selectedMetricId);
    // locale is not read in the factory; t() is a stable import. Without it,
    // changing language would keep stale metric labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [displayedShot, unitSystem, swingStats, selectedMetricId, showImpact, recentRowMetricIds, locale]);
  const selected = useMemo(() => resolveSelectedMetric(metrics, selectedMetricId), [metrics, selectedMetricId]);
  const rowMetrics = metrics;
  const gridRef = useSharedFitFontSize(
    rowMetrics.length > 0,
    rowMetrics.map((metric) => `${metric.value}:${metric.unit ?? ''}`).join('|')
  );

  if (!selected) {
    return (
      <div className="panel">
        <div className="panel__body panel__body--empty live-panel__empty">
          <span className="live-panel__empty-icon" aria-hidden="true">
            <HugeiconsIcon icon={GolfBallIcon} strokeWidth={1.5} />
          </span>
          <span className="panel__empty-title live-panel__empty-title">{t('live.ready')}</span>
          <span className="panel__empty-detail live-panel__empty-detail">{t('live.readyDetail')}</span>
        </div>
      </div>
    );
  }

  const bodyClass = [
    'panel__body',
    'live-panel__body',
    showImpact ? 'live-panel__body--hero-expanded live-panel__body--club-view' : 'live-panel__body--hero-collapsed',
  ].join(' ');

  return (
    <div className="panel">
      <div className={bodyClass}>
        {isProfileNewShot ? <div className="shot-flash" /> : null}
        {showImpact && displayedShot ? (
          <div className="live-panel__impact-layout">
            <div className="live-panel__hero" aria-live="polite">
              <MetricCard
                label={selected.label}
                value={selected.value}
                unit={selected.unit}
                subtext={selected.subtext}
                estimated={selected.estimated}
                confidence={selected.confidence}
                confidenceLabel={selected.confidenceLabel}
                size="hero"
                labelPosition="above"
                selected
              />
            </div>
            <ClubImpactView shot={displayedShot} />
          </div>
        ) : null}
        <div
          ref={gridRef}
          className={`live-panel__grid live-panel__grid--of-${rowMetrics.length}${showImpact ? ' live-panel__grid--impact' : ''}`}
        >
          {rowMetrics.map((metric) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              subtext={metric.subtext}
              estimated={metric.estimated}
              confidence={metric.confidence}
              confidenceLabel={metric.confidenceLabel}
              labelPosition="above"
              selected={metric.id === selected.id}
              onClick={onSelectMetric ? () => onSelectMetric(metric.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
