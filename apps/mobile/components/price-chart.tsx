import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { CashouTheme } from '@/constants/cashou-theme';

interface PricePoint {
  timestamp: string | Date;
  value: number | string; // Decimal from Prisma comes as string
}

interface PriceChartProps {
  data: PricePoint[];
  isDark: boolean;
  theme: any;
}

const CHART_HEIGHT = 180;
const CHART_PADDING_TOP = 10;
const CHART_PADDING_BOTTOM = 20;

export function PriceChart({ data, isDark, theme }: PriceChartProps) {
  const chartWidth = Dimensions.get('window').width - 64; // 16px padding on each side + 16px section padding

  const { path, areaPath, minVal, maxVal, firstVal, lastVal, change, changePercent } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: '', areaPath: '', minVal: 0, maxVal: 0, firstVal: 0, lastVal: 0, change: 0, changePercent: 0 };
    }

    // Sort by timestamp ascending (oldest first)
    const sorted = [...data].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const values = sorted.map(d => Number(d.value) / 100); // cents to EUR
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const first = values[0];
    const last = values[values.length - 1];

    const drawHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * chartWidth;
      const y = CHART_PADDING_TOP + drawHeight - ((v - min) / range) * drawHeight;
      return { x, y };
    });

    // Line path
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    // Area path (line + close to bottom)
    const area = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${CHART_HEIGHT} L ${points[0].x.toFixed(1)} ${CHART_HEIGHT} Z`;

    return {
      path: linePath,
      areaPath: area,
      minVal: min,
      maxVal: max,
      firstVal: first,
      lastVal: last,
      change: last - first,
      changePercent: ((last - first) / first) * 100,
    };
  }, [data, chartWidth]);

  if (!data || data.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.text, fontFamily: CashouTheme.fonts.body }]}>
          Pas encore de donnees
        </Text>
      </View>
    );
  }

  const isPositive = change >= 0;
  const lineColor = isPositive ? '#4CAF50' : '#F44336';
  const gradientOpacity = isPositive ? '0.15' : '0.10';

  return (
    <View>
      {/* Variation display */}
      <View style={styles.variationRow}>
        <Text style={[styles.currentPrice, { color: theme.text, fontFamily: CashouTheme.fonts.heading }]}>
          {lastVal.toFixed(2)} EUR
        </Text>
        <Text style={[styles.variationText, { color: lineColor, fontFamily: CashouTheme.fonts.body }]}>
          {isPositive ? '+' : ''}{change.toFixed(2)} EUR ({isPositive ? '+' : ''}{changePercent.toFixed(1)}%)
        </Text>
      </View>

      {/* Chart */}
      <Svg width={chartWidth} height={CHART_HEIGHT} style={styles.chart}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={gradientOpacity} />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <Path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Min/Max labels */}
      <View style={styles.rangeRow}>
        <Text style={[styles.rangeText, { color: theme.text, opacity: 0.5, fontFamily: CashouTheme.fonts.body }]}>
          Min: {minVal.toFixed(2)} EUR
        </Text>
        <Text style={[styles.rangeText, { color: theme.text, opacity: 0.5, fontFamily: CashouTheme.fonts.body }]}>
          Max: {maxVal.toFixed(2)} EUR
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  variationRow: {
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 24,
    marginBottom: 2,
  },
  variationText: {
    fontSize: 14,
  },
  chart: {
    alignSelf: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeText: {
    fontSize: 11,
  },
  emptyContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
