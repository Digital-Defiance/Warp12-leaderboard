import type { FC } from 'react';

export interface Warp12LogoTournamentProps {
  width?: number;
  className?: string;
  warpColor?: string;
  numberColor?: string;
  taglineColor?: string;
  marginLeft?: string;
  tagline?: string;
}

export const Warp12LogoTournament: FC<Warp12LogoTournamentProps> = ({
  width,
  className,
  marginLeft = '-12px',
  warpColor = '#38bdf8',
  numberColor = '#ffffff',
  taglineColor = '#e2e8f0',
}) => {
  return (
    <svg
      style={{ marginLeft }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 531.41 111.65"
      width={width}
      className={className}
      aria-label="Warp 12"
    >
      <defs>
        <style>{`
          .w12t-number {
            font-family: Federation, Federation;
            fill: ${numberColor};
            font-size: 72px;
          }

          .w12t-warp {
            fill: ${warpColor};
            font-family: FederationWide, FederationWide;
            font-size: 72px;
          }

          .w12t-tagline {
            font-family: NovaLightUltraSSiThinUltraCondensed, 'Nova Light Ultra SSi';
            font-size: 42px;
            fill: ${taglineColor};
          }

          .w12t-tracking {
            letter-spacing: -0.02em;
          }
        `}</style>
      </defs>
      <text className="w12t-warp" transform="translate(17.16 60.98)">
        <tspan x="0" y="0">
          Warp
        </tspan>
      </text>
      <text className="w12t-number" transform="translate(383.22 60.98)">
        <tspan x="0" y="0">
          12
        </tspan>
      </text>
      <text className="w12t-tagline" transform="translate(373.32 97.29)">
        <tspan className="w12t-tracking" x="0" y="0">
          Tournament Reporting
        </tspan>
      </text>
    </svg>
  );
};
