import { useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GolfBallIcon } from '@hugeicons/core-free-icons';
import type { Shot } from '../../types/shot';
import { computeSwingSpeedStats, filterShotsByProfile } from '../../types/shot';
import { useUnitPreference } from '../../state/useUnitPreference';
import { useI18n } from '../../i18n/useI18n';
import { useSharedFitFontSize } from '../../hooks/useFitFontSize';
import { useDragScroll } from '../../hooks/useDragScroll';
import { MetricCard } from '../ui/MetricCard';
import { ClubImpactView } from './ClubImpactView';
import { buildLiveMetrics, orderRowMetrics, pinSelectedMetric, resolveSelectedMetric } from './liveMetrics';

interface LivePanelProps {
  shot: Shot | null;
  shots: Shot[];
  profileId: string;
  /** Undefined outside swing-speed mode. Scopes the swing stats to one implement. */
  activeTrainingImplement?: string;
  /** Metric shown in full-screen mode. */
  selectedMetricId?: string | null;
  onSelectMetric?: (id: string) => void;
  /** When true, the selected metric is shown as a large center number. */
  fullScreen?: boolean;
  clubView?: boolean;
  onSetClubView?: (visible: boolean) => void;
  recentRowMetricIds?: string[];
  /** True for a freshly captured shot (not a restored session). */
  isNewShot?: boolean;
}

/**
 * Live metric table. Full-screen mode keeps canonical order and shows the
 * selected value as a large center number. Outside full screen, tapping a tile
 * moves it top-left.
 */
export function LivePanel({
  shot,
  shots,
  profileId,
  activeTrainingImplement,
  selectedMetricId = null,
  onSelectMetric,
  fullScreen = true,
  clubView = false,
  onSetClubView,
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
  const rowRef = useRef<HTMLDivElement>(null);
  const rowScroll = useDragScroll(rowRef, 'x');
  const metrics = useMemo(() => {
    if (!displayedShot) {
      return [];
    }
    const built = buildLiveMetrics(displayedShot, unitSystem, swingStats);
    if (!fullScreen) return pinSelectedMetric(built, selectedMetricId);
    return clubView ? orderRowMetrics(built, recentRowMetricIds) : built;
    // locale is not read in the factory; t() is a stable import. Without it,
    // changing language would keep stale metric labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [displayedShot, unitSystem, swingStats, selectedMetricId, fullScreen, clubView, recentRowMetricIds, locale]);
  const selected = useMemo(() => resolveSelectedMetric(metrics, selectedMetricId), [metrics, selectedMetricId]);
  const rowMetrics = fullScreen && clubView ? metrics.filter((metric) => metric.id !== selected?.id) : metrics;
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
    fullScreen ? 'live-panel__body--hero-expanded' : 'live-panel__body--hero-collapsed',
    fullScreen && clubView ? 'live-panel__body--club-view' : '',
  ].join(' ');
  const canShowClubView = fullScreen && displayedShot && displayedShot.mode !== 'swing-speed';

  return (
    <div className="panel">
      <div className={bodyClass}>
        {isProfileNewShot ? <div className="shot-flash" /> : null}
        {canShowClubView && onSetClubView ? (
          <button
            type="button"
            className="live-panel__club-toggle"
            aria-label={clubView ? t('impact.hide') : t('impact.show')}
            aria-pressed={clubView}
            onClick={() => onSetClubView(!clubView)}
          >
            <svg viewBox="20 58 204 132" aria-hidden="true">
              <path d="M198 58v36" />
              <path d="M29 150c17-24 57-46 99-55 23-5 48-8 62-3 12 4 18 15 20 31l6 45c1 9-4 14-13 15-51 3-114-1-164-8-9-1-13-6-12-13l2-12Z" />
              <path d="M31 151c30-32 91-57 142-60 9-1 17 0 23 3" />
            </svg>
          </button>
        ) : null}
        {fullScreen && clubView && displayedShot ? (
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
        ) : fullScreen ? (
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
        <div
          ref={(node) => {
            gridRef.current = node;
            rowRef.current = node;
          }}
          className={`live-panel__grid live-panel__grid--of-${rowMetrics.length}${clubView && fullScreen ? ' live-panel__grid--single-row' : ''}`}
          onPointerDown={clubView && fullScreen ? rowScroll.onPointerDown : undefined}
          onPointerMove={clubView && fullScreen ? rowScroll.onPointerMove : undefined}
          onPointerUp={clubView && fullScreen ? rowScroll.onPointerUp : undefined}
          onPointerCancel={clubView && fullScreen ? rowScroll.onPointerCancel : undefined}
          onClickCapture={clubView && fullScreen ? rowScroll.onClickCapture : undefined}
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
              onClick={onSelectMetric ? () => {
                onSelectMetric(metric.id);
                if (clubView && fullScreen && rowRef.current) rowRef.current.scrollLeft = 0;
              } : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
