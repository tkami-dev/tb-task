import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { TodoItem } from '@/lib/todo-types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const SCRIBBLE_PATH =
  'M 10 16.91 s 79.8 -11.36 98.1 -11.34 c 22.2 0.02 -47.82 14.25 -33.39 22.02 c 12.61 6.77 124.18 -27.98 133.31 -17.28 c 7.52 8.38 -26.8 20.02 4.61 22.05 c 24.55 1.93 113.37 -20.36 113.37 -20.36';
const SCRIBBLE_LENGTH = 360;

type TodoRowProps = {
  todo: TodoItem;
  isDragging?: boolean;
  onToggle(id: string): Promise<void>;
  onDelete(id: string): Promise<void>;
};
export function TodoRow({ todo, isDragging = false, onToggle, onDelete }: TodoRowProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const checked = useSharedValue(todo.completed ? 1 : 0);
  const pressed = useSharedValue(0);
  const [titleWidth, setTitleWidth] = useState(0);
  const grabCursor =
    Platform.OS === 'web' ? ({ cursor: isDragging ? 'grabbing' : 'grab' } as unknown as ViewStyle) : null;

  useEffect(() => {
    checked.value = reduceMotion
      ? withTiming(todo.completed ? 1 : 0, { duration: 0 })
      : withTiming(todo.completed ? 1 : 0, { duration: 260 });
  }, [checked, reduceMotion, todo.completed]);

  const rowMotionStyle = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.12,
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.006 }],
  }));
  const checkMotionStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + checked.value * 0.55,
    transform: [{ scale: reduceMotion ? 1 : 0.96 + checked.value * 0.04 }],
  }));
  const textMotionStyle = useAnimatedStyle(() => ({
    opacity: 1 - checked.value * 0.3,
  }));
  const scribbleStyle = useAnimatedStyle(() => ({
    opacity: checked.value,
  }));
  const scribbleProps = useAnimatedProps(() => ({
    strokeDashoffset: SCRIBBLE_LENGTH * (1 - checked.value),
  }));
  const scribbleWidth = Math.min(Math.max(titleWidth + 8, 40), 260);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(90)}
      exiting={reduceMotion ? undefined : FadeOut.duration(70)}>
      <Animated.View
        style={[
          styles.row,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isDragging ? theme.textSecondary : theme.border,
            shadowColor: theme.shadow,
            elevation: isDragging ? 4 : 0,
          },
          isDragging && styles.draggingRow,
          rowMotionStyle,
        ]}>
        <AnimatedPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.completed }}
          onPress={() => onToggle(todo.id)}
          onPressIn={() => {
            pressed.value = withSpring(1, { duration: reduceMotion ? 0 : 120, dampingRatio: 1 });
          }}
          onPressOut={() => {
            pressed.value = withSpring(0, { duration: reduceMotion ? 0 : 140, dampingRatio: 1 });
          }}
          style={[styles.toggleArea, grabCursor]}>
          <Animated.View
            style={[
              styles.checkbox,
              {
                borderColor: todo.completed ? theme.accent : theme.textSecondary,
                backgroundColor: todo.completed ? theme.accent : 'transparent',
              },
              checkMotionStyle,
            ]}>
            {todo.completed && <ThemedText style={[styles.checkmark, { color: theme.background }]}>✓</ThemedText>}
          </Animated.View>

          <Animated.View style={[styles.titleContainer, textMotionStyle]}>
            <ThemedText
              numberOfLines={1}
              onLayout={(event: LayoutChangeEvent) => {
                setTitleWidth(event.nativeEvent.layout.width);
              }}
              style={styles.title}
              themeColor={todo.completed ? 'textSecondary' : 'text'}>
              {todo.title}
            </ThemedText>
            {titleWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[styles.scribble, { width: scribbleWidth }, scribbleStyle]}>
                <Svg width="100%" height="24" viewBox="0 0 340 32" preserveAspectRatio="none">
                  <AnimatedPath
                    animatedProps={scribbleProps}
                    d={SCRIBBLE_PATH}
                    vectorEffect="non-scaling-stroke"
                    stroke={theme.text}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeMiterlimit={10}
                    strokeDasharray={SCRIBBLE_LENGTH}
                    transform="translate(0 7) scale(1 0.58)"
                    fill="none"
                  />
                </Svg>
              </Animated.View>
            )}
          </Animated.View>
        </AnimatedPressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${todo.title}`}
          hitSlop={12}
          onPress={() => onDelete(todo.id)}
          style={({ pressed: removePressed }) => [
            styles.removeButton,
            removePressed && styles.removePressed,
            grabCursor,
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            Delete
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  draggingRow: {
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  toggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 66,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    lineHeight: 18,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    alignSelf: 'flex-start',
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '100%',
  },
  scribble: {
    position: 'absolute',
    left: -2,
    top: 0,
    height: 24,
  },
  removeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: Spacing.two,
    paddingRight: Spacing.one,
  },
  removePressed: {
    opacity: 0.5,
  },
});
