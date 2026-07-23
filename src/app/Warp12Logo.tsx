import type { FC } from 'react';

export interface Warp12LogoProps {
  width?: number;
  className?: string;
  warpColor?: string;
  numberColor?: string;
  taglineColor?: string;
  marginLeft?: string;
  tagline?: string;
}

export const Warp12Logo: FC<Warp12LogoProps> = ({
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
          .w12-number {
            font-family: Federation, Federation;
            fill: ${numberColor};
            font-size: 72px;
          }

          .w12-warp {
            fill: ${warpColor};
            font-family: FederationWide, FederationWide;
            font-size: 72px;
          }

          .w12-tagline {
            font-family: NovaLightUltraSSiThinUltraCondensed, 'Nova Light Ultra SSi';
            font-size: 42px;
            fill: ${taglineColor};
          }
        `}</style>
      </defs>
      <text className="w12-warp" transform="translate(17.16 60.98)">
        <tspan x="0" y="0">
          Warp
        </tspan>
      </text>
      <text className="w12-number" transform="translate(383.22 60.98)">
        <tspan x="0" y="0">
          12
        </tspan>
      </text>
      <text className="w12-tagline" transform="translate(353.14 97.29)">
        <tspan x="0" y="0">
          Leaderboards and Logs
        </tspan>
      </text>
    </svg>
  );
};
