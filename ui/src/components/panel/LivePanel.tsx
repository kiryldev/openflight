import { useMemo, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GolfBallIcon } from '@hugeicons/core-free-icons';
import type { Shot } from '../../types/shot';
import { computeSwingSpeedStats, filterShotsByProfile } from '../../types/shot';
import { useUnitPreference } from '../../state/useUnitPreference';
import { useI18n } from '../../i18n/useI18n';
import { useSharedFitFontSize } from '../../hooks/useFitFontSize';
import { MetricCard } from '../ui/MetricCard';
import { PanelHeader } from './PanelHeader';
import { buildLiveMetrics, pinSelectedMetric, resolveSelectedMetric } from './liveMetrics';

interface LivePanelProps {
  shot: Shot | null;
  shots: Shot[];
  profileId: string;
  profileName: string;
  clubLabel: string;
  /** Undefined outside swing-speed mode. Scopes the swing stats to one implement. */
  activeTrainingImplement?: string;
  /** Metric shown in full-screen mode and marked selected in the grid. */
  selectedMetricId?: string | null;
  onSelectMetric?: (id: string) => void;
  /** When true, the selected metric is shown as a large center number. */
  fullScreen?: boolean;
  /** True for a freshly captured shot (not a restored session). */
  isNewShot?: boolean;
  /** Pinned header control, e.g. Change club. */
  headerAction?: ReactNode;
}

/**
 * Live metric table. Full-screen mode keeps canonical order and shows the
 * selected value as a large center number. Outside full screen, tapping a tile
 * pins it top-left like before.
 */
export function LivePanel({
  shot,
  shots,
  profileId,
  profileName,
  clubLabel,
  activeTrainingImplement,
  selectedMetricId = null,
  onSelectMetric,
  fullScreen = true,
  isNewShot = false,
  headerAction,
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
  const metrics = useMemo(() => {
    if (!displayedShot) {
      return [];
    }
    const built = buildLiveMetrics(displayedShot, unitSystem, swingStats);
    return fullScreen ? built : pinSelectedMetric(built, selectedMetricId);
    // locale is not read in the factory; t() is a stable import. Without it,
    // changing language would keep stale metric labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [displayedShot, unitSystem, swingStats, selectedMetricId, fullScreen, locale]);
  const selected = useMemo(() => resolveSelectedMetric(metrics, selectedMetricId), [metrics, selectedMetricId]);
  const gridRef = useSharedFitFontSize(
    metrics.length > 0,
    metrics.map((metric) => `${metric.value}:${metric.unit ?? ''}`).join('|')
  );
  const header = <PanelHeader title={t('nav.live')} subtitle={profileName} club={clubLabel} actions={headerAction} />;

  if (!selected) {
    return (
      <div className="panel">
        {header}
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
    fullScreen ? 'live-panel__body--hero-expanded' : 'live-panel__body--hero-collapsed',
  ].join(' ');

  return (
    <div className="panel">
      {header}
      <div className="live-panel__context">
        <strong>{t('live.latestShot', { number: displayedShot?.shot_number ?? 0 })}</strong>
      </div>
      <div className={bodyClass}>
        {isProfileNewShot ? <div className="shot-flash" /> : null}
        {fullScreen ? (
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
        ) : null}
        <div ref={gridRef} className={`live-panel__grid live-panel__grid--of-${metrics.length}`}>
          {metrics.map((metric) => (
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
