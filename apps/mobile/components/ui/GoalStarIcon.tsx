import React from 'react';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

interface GoalStarIconProps {
  filled: boolean;
  size?: number;
  idSuffix?: string;
}

const STAR_PATH =
  'M13.9551 5.27522C13.8506 4.96431 13.5815 4.73763 13.2575 4.68807L9.48637 4.11182L7.79249 0.503365C7.64803 0.19579 7.33934 0 7.00021 0C6.66086 0 6.35239 0.19579 6.20794 0.503365L4.51383 4.11204L0.742705 4.6883C0.418685 4.73786 0.149557 4.96431 0.0453279 5.27545C-0.0589009 5.58658 0.0197708 5.92926 0.248896 6.16439L3.00285 8.98835L2.35058 12.9835C2.2968 13.3142 2.43703 13.6466 2.71061 13.84C2.98396 14.0333 3.34487 14.0529 3.63889 13.8907L7.00043 12.0317L10.362 13.8907C10.4947 13.964 10.6407 14 10.786 14C10.9629 14 11.1398 13.9462 11.2903 13.84C11.5638 13.6469 11.7038 13.3144 11.6501 12.9835L10.9978 8.98835L13.752 6.16439C13.9807 5.92926 14.0593 5.58658 13.9551 5.27522Z';

export function GoalStarIcon({ filled, size = 14, idSuffix = 'default' }: GoalStarIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <Path d={STAR_PATH} fill="#FFFFFF" />
      </Svg>
    );
  }

  const insetShadeId = `goal-star-inset-shade-${idSuffix}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Defs>
        {/* Radial gradient: dark at edges (inner shadow), lighter toward center for engraved depth */}
        <RadialGradient
          id={insetShadeId}
          cx="50%"
          cy="50%"
          r="50%"
          fx="45%"
          fy="40%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor="#000000" stopOpacity="0.02" />
          <Stop offset="80%" stopColor="#000000" stopOpacity="0.10" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
        </RadialGradient>
      </Defs>

      {/* Same color as the pill background */}
      <Path d={STAR_PATH} fill="#F7B167" />
      {/* Inset print effect (engraved star with darker inner shadow) */}
      <Path d={STAR_PATH} transform="translate(0.42 0.42) scale(0.94)" fill={`url(#${insetShadeId})`} />
      <Path
        d={STAR_PATH}
        transform="translate(0.42 0.42) scale(0.94)"
        fill="none"
        stroke="#5C4A3A"
        strokeOpacity="0.25"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
