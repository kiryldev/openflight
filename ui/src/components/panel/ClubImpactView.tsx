import type { Shot } from '../../types/shot';
import { useI18n } from '../../i18n/useI18n';
import driverHeadTopView from '../../assets/driver-head-top-view.svg';
import driverHeadSideView from '../../assets/driver-head-side-view.svg';
import { NO_VALUE, resolveClubDelivery } from './liveMetrics';
import { pointAtAngle, visualAngle } from './clubImpactGeometry';
import './ClubImpactView.css';

function angleText(value: number | null): string {
  if (value === null) return NO_VALUE;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}°`;
}

function spinText(value: number | null): string {
  return value === null ? NO_VALUE : `${Math.round(value).toLocaleString()} rpm`;
}

function angleSignClass(value: number | null): string {
  return value === null || value === 0 ? '' : value > 0 ? ' club-impact__positive' : ' club-impact__negative';
}

interface ClubImpactViewProps {
  shot: Shot;
}

export function ClubImpactView({ shot }: ClubImpactViewProps) {
  const { t } = useI18n();
  const { attackAngle, clubPath, attackIsExperimental, clubPathIsExperimental } = resolveClubDelivery(shot);
  const attackVisual = visualAngle(attackAngle);
  const launchVisual = visualAngle(shot.launch_angle_vertical);
  const pathVisual = visualAngle(clubPath);
  const directionVisual = visualAngle(shot.launch_angle_horizontal);
  const axisVisual = visualAngle(shot.spin_axis_deg);
  const sideImpact = { x: 145, y: 72 };
  const topImpact = { x: 145, y: 174 };
  const clubFace = { x: topImpact.x - 10, y: topImpact.y };
  const pathDisplay = pathVisual ?? 0;
  const sideClubFace = { x: sideImpact.x - 10, y: sideImpact.y };
  const attackDisplay = attackVisual ?? 0;
  const attackStart = pointAtAngle(sideClubFace.x, sideClubFace.y, -96, attackDisplay);
  const launchEnd =
    launchVisual === null ? null : pointAtAngle(sideImpact.x, sideImpact.y, 100, launchVisual);
  const pathStart = pointAtAngle(clubFace.x, clubFace.y, -96, pathDisplay, false);
  const directionEnd =
    directionVisual === null ? null : pointAtAngle(topImpact.x, topImpact.y, 100, directionVisual, false);
  const pathCaption =
    clubPath === null ? NO_VALUE : clubPath > 0 ? t('impact.inToOut') : clubPath < 0 ? t('impact.outToIn') : t('shape.straight');

  return (
    <figure className="club-impact" aria-label={t('impact.title')}>
      <svg viewBox="0 0 620 130" role="img">
        <defs>
          <marker id="impact-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <g className="club-impact__view" aria-label={t('impact.topView')} transform="translate(0 -102)">
          {clubPath !== null && clubPath !== 0 ? (
            <polygon
              className={`club-impact__angle-area${angleSignClass(clubPath)}`}
              points={`${pathStart.x},${topImpact.y} ${pathStart.x},${pathStart.y} ${clubFace.x},${clubFace.y}`}
            />
          ) : null}
          {directionEnd && shot.launch_angle_horizontal !== 0 ? (
            <polygon
              className={`club-impact__angle-area${angleSignClass(shot.launch_angle_horizontal)}`}
              points={`${topImpact.x},${topImpact.y} ${directionEnd.x},${directionEnd.y} ${directionEnd.x},${topImpact.y}`}
            />
          ) : null}
          <line
            className={`club-impact__path-trail${angleSignClass(clubPath)}${clubPathIsExperimental ? ' club-impact__line--experimental' : ''}${clubPath === null ? ' club-impact__missing' : ''}`}
            data-angle={pathDisplay}
            x1={pathStart.x}
            y1={pathStart.y}
            x2={clubFace.x}
            y2={clubFace.y}
          />
          <image
            className={`club-impact__club-head${clubPath === null ? ' club-impact__missing' : ''}`}
            data-handedness="left"
            data-angle={pathDisplay}
            href={driverHeadTopView}
            x={clubFace.x - 44}
            y={clubFace.y - 22}
            width="44"
            height="58"
            preserveAspectRatio="xMidYMid meet"
            transform={`rotate(${pathDisplay} ${clubFace.x - 22} ${clubFace.y})`}
          />
          <line className="club-impact__guide" x1="10" y1={topImpact.y} x2="286" y2={topImpact.y} />
          {directionEnd ? (
            <line
              className={`club-impact__ball-line${angleSignClass(shot.launch_angle_horizontal)}`}
              data-angle={directionVisual}
              x1={topImpact.x}
              y1={topImpact.y}
              x2={directionEnd.x}
              y2={directionEnd.y}
              markerEnd="url(#impact-arrow)"
            />
          ) : null}
          <circle className="club-impact__ball" cx={topImpact.x} cy={topImpact.y} r="9" />
          {axisVisual !== null ? (
            <line
              className="club-impact__axis"
              data-angle={axisVisual}
              x1={topImpact.x}
              y1={topImpact.y - 7}
              x2={topImpact.x}
              y2={topImpact.y + 7}
              transform={`rotate(${axisVisual} ${topImpact.x} ${topImpact.y})`}
            />
          ) : null}
          <text className={clubPath === null ? 'club-impact__missing' : ''} x="12" y="205">
            {t('metric.clubPath')} {angleText(clubPath)}{clubPathIsExperimental ? ' *' : ''}
          </text>
          <text className={clubPath === null ? 'club-impact__missing club-impact__direction' : 'club-impact__direction'} x="12" y="221">
            {pathCaption}
          </text>
          <text className={shot.launch_angle_horizontal === null ? 'club-impact__missing' : ''} x="164" y="145">
            {t('metric.hLaunch')} {angleText(shot.launch_angle_horizontal)}
          </text>
          <text className={shot.spin_axis_deg === null ? 'club-impact__missing' : ''} x="164" y="210">
            {t('metric.spinAxis')} {angleText(shot.spin_axis_deg)}
          </text>
        </g>

        <g className="club-impact__view" aria-label={t('impact.sideView')} transform="translate(320 0)">
          {attackAngle !== null && attackAngle !== 0 ? (
            <polygon
              className={`club-impact__angle-area${angleSignClass(attackAngle)}`}
              points={`${attackStart.x},${sideImpact.y} ${attackStart.x},${attackStart.y} ${sideClubFace.x},${sideClubFace.y}`}
            />
          ) : null}
          {launchEnd && shot.launch_angle_vertical !== 0 ? (
            <polygon
              className={`club-impact__angle-area${angleSignClass(shot.launch_angle_vertical)}`}
              points={`${sideImpact.x},${sideImpact.y} ${launchEnd.x},${launchEnd.y} ${launchEnd.x},${sideImpact.y}`}
            />
          ) : null}
          <line
            className={`club-impact__path-trail${angleSignClass(attackAngle)}${attackIsExperimental ? ' club-impact__line--experimental' : ''}${attackAngle === null ? ' club-impact__missing' : ''}`}
            data-angle={attackDisplay}
            x1={attackStart.x}
            y1={attackStart.y}
            x2={sideClubFace.x}
            y2={sideClubFace.y}
          />
          <image
            className={`club-impact__club-head club-impact__club-head--side${attackAngle === null ? ' club-impact__missing' : ''}`}
            data-angle={attackDisplay}
            href={driverHeadSideView}
            x={sideClubFace.x - 44}
            y={sideClubFace.y - 35}
            width="44"
            height="47"
            preserveAspectRatio="xMaxYMax meet"
            transform={`rotate(${-attackDisplay} ${sideClubFace.x - 22} ${sideClubFace.y})`}
          />
          <line className="club-impact__guide" x1="10" y1={sideImpact.y} x2="286" y2={sideImpact.y} />
          {launchEnd ? (
            <line
              className={`club-impact__ball-line${angleSignClass(shot.launch_angle_vertical)}`}
              data-angle={launchVisual}
              x1={sideImpact.x}
              y1={sideImpact.y}
              x2={launchEnd.x}
              y2={launchEnd.y}
              markerEnd="url(#impact-arrow)"
            />
          ) : null}
          <circle className="club-impact__ball" cx={sideImpact.x} cy={sideImpact.y} r="9" />
          <text className={attackAngle === null ? 'club-impact__missing' : ''} x="12" y="103">
            {t('metric.clubAoa')} {angleText(attackAngle)}{attackIsExperimental ? ' *' : ''}
          </text>
          <text className={shot.launch_angle_vertical === null ? 'club-impact__missing' : ''} x="164" y="103">
            {t('metric.vLaunch')} {angleText(shot.launch_angle_vertical)}
          </text>
          <text className={shot.spin_rpm === null ? 'club-impact__missing' : ''} x="12" y="23">
            {t('metric.spin')} {spinText(shot.spin_rpm)}
          </text>
        </g>
      </svg>
      {(attackIsExperimental || clubPathIsExperimental) && (
        <figcaption className="club-impact__caption">* {t('impact.experimental')}</figcaption>
      )}
    </figure>
  );
}
