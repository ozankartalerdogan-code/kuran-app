import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useColors } from '../hooks/useColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: c.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonAyetCard() {
  return (
    <View style={s.card}>
      <SkeletonBox width="40%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={32} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={32} borderRadius={6} style={{ marginBottom: 12 }} />
      <SkeletonBox width="80%" height={14} />
    </View>
  );
}

export function SkeletonListItem() {
  return (
    <View style={s.listItem}>
      <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={s.card}>
      <SkeletonBox width={40} height={40} borderRadius={8} style={{ marginBottom: 12 }} />
      <SkeletonBox width="70%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonBox width="90%" height={12} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
});
