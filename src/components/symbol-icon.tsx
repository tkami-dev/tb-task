import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SymbolIconProps = {
  name: ComponentProps<typeof SymbolView>['name'];
  color?: string;
  size?: number;
};

export function SymbolIcon({ name, color, size = 20 }: SymbolIconProps) {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <SymbolView name={name} tintColor={color ?? theme.text} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
