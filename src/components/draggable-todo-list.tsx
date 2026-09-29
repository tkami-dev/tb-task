import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Platform,
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    type SharedValue,
} from "react-native-reanimated";

import { TodoRow } from "@/components/todo-row";
import { Spacing } from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { TodoItem } from "@/lib/todo-types";

const GAP = Spacing.two;
const FALLBACK_ITEM_HEIGHT = 68;
const DRAG_THRESHOLD = 4;
const LIFT_SCALE = 0.0;

const LAYOUT_SPRING = { duration: 150, dampingRatio: 0.9 };
const LIFT_SPRING = { duration: 100, dampingRatio: 1 };

type DraggableTodoListProps = {
  todos: TodoItem[];
  onToggle(id: string): Promise<void>;
  onDelete(id: string): Promise<void>;
  onReorder(orderedIds: string[]): Promise<void>;
};

type ItemProps = {
  todo: TodoItem;
  index: number;
  targetY: number;
  bounds: SharedValue<number[]>;
  reduceMotion: boolean;
  onMeasure(id: string, height: number): void;
  onToggle(id: string): Promise<void>;
  onDelete(id: string): Promise<void>;
  onMove(id: string, toIndex: number): void;
  onDragEnd(): void;
};

type Override = { base: string; order: string[] };

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function DraggableTodoItem({
  todo,
  index,
  targetY,
  bounds,
  reduceMotion,
  onMeasure,
  onToggle,
  onDelete,
  onMove,
  onDragEnd,
}: ItemProps) {
  const y = useSharedValue(targetY);
  const target = useSharedValue(targetY);
  const startY = useSharedValue(0);
  const curIndex = useSharedValue(index);
  const height = useSharedValue(FALLBACK_ITEM_HEIGHT);
  const active = useSharedValue(false);
  const lift = useSharedValue(0);
  const [isDragging, setDragging] = useState(false);

  useEffect(() => {
    target.set(targetY);
    if (active.get()) return;
    curIndex.set(index);
    y.set(reduceMotion ? targetY : withSpring(targetY, LAYOUT_SPRING));
  }, [targetY, index, reduceMotion, target, active, curIndex, y]);

  const pan = Gesture.Pan()
    .activeOffsetY([-DRAG_THRESHOLD, DRAG_THRESHOLD])
    .failOffsetX([-24, 24])
    .onStart(() => {
      active.set(true);
      startY.set(y.get());
      lift.set(reduceMotion ? 0 : withSpring(1, LIFT_SPRING));
      runOnJS(setDragging)(true);
    })
    .onUpdate((e) => {
      y.set(startY.get() + e.translationY);

      const b = bounds.get();
      if (b.length < 2) return;
      const center = y.get() + height.get() / 2;
      let next = b.length - 2;
      for (let i = 0; i < b.length - 1; i += 1) {
        if (center < b[i + 1]) {
          next = i;
          break;
        }
      }

      if (next !== curIndex.get()) {
        curIndex.set(next);
        runOnJS(onMove)(todo.id, next);
      }
    })
    .onFinalize(() => {
      if (!active.get()) return;
      active.set(false);
      lift.set(reduceMotion ? 0 : withSpring(0, LIFT_SPRING));
      runOnJS(onDragEnd)();
      y.set(
        withSpring(target.get(), LAYOUT_SPRING, () => {
          runOnJS(setDragging)(false);
        }),
      );
    });

  // No opacity animation: it forces an offscreen layer on Android -> jagged rounded corners.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.get() },
      { scale: 1 + lift.get() * LIFT_SCALE },
    ],
  }));

  const grabCursor =
    Platform.OS === "web"
      ? ({ cursor: isDragging ? "grabbing" : "grab" } as unknown as ViewStyle)
      : null;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(event: LayoutChangeEvent) => {
          const h = event.nativeEvent.layout.height;
          height.set(h);
          onMeasure(todo.id, h);
        }}
        style={[
          styles.item,
          isDragging && styles.dragging,
          grabCursor,
          animatedStyle,
        ]}
      >
        <TodoRow
          isDragging={isDragging}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function DraggableTodoList({
  todos,
  onToggle,
  onDelete,
  onReorder,
}: DraggableTodoListProps) {
  const reduceMotion = useReducedMotion();
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [override, setOverride] = useState<Override | null>(null);

  const todoIds = useMemo(() => todos.map((t) => t.id), [todos]);
  const baseKey = useMemo(() => todoIds.join("|"), [todoIds]);
  const byId = useMemo(() => new Map(todos.map((t) => [t.id, t])), [todos]);

  const order = useMemo(() => {
    if (
      override &&
      override.base === baseKey &&
      override.order.length === todoIds.length &&
      override.order.every((id) => byId.has(id))
    ) {
      return override.order;
    }
    return todoIds;
  }, [override, baseKey, todoIds, byId]);

  const orderRef = useRef(order);
  const baseKeyRef = useRef(baseKey);
  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    orderRef.current = order;
    baseKeyRef.current = baseKey;
    onReorderRef.current = onReorder;
  });

  const { tops, boundsArr, total } = useMemo(() => {
    const tops: Record<string, number> = {};
    const boundsArr = [0];
    let acc = 0;
    order.forEach((id) => {
      tops[id] = acc;
      acc += (heights[id] ?? FALLBACK_ITEM_HEIGHT) + GAP;
      boundsArr.push(acc);
    });
    return { tops, boundsArr, total: Math.max(0, acc - GAP) };
  }, [order, heights]);

  const bounds = useSharedValue<number[]>([0]);
  useEffect(() => {
    bounds.set(boundsArr);
  }, [bounds, boundsArr]);

  const handleMeasure = useCallback((id: string, h: number) => {
    setHeights((prev) =>
      Math.abs((prev[id] ?? 0) - h) < 0.5 ? prev : { ...prev, [id]: h },
    );
  }, []);

  const handleMove = useCallback((id: string, toIndex: number) => {
    const cur = orderRef.current;
    const from = cur.indexOf(id);
    if (from < 0 || from === toIndex) return;
    const next = moveItem(cur, from, toIndex);
    orderRef.current = next;
    setOverride({ base: baseKeyRef.current, order: next });
  }, []);

  const handleDragEnd = useCallback(() => {
    const next = orderRef.current;
    if (next.join("|") === baseKeyRef.current) return;
    onReorderRef.current(next).catch(() => setOverride(null));
  }, []);

  return (
    <View style={[styles.list, { height: total }]}>
      {order.map((id, index) => {
        const todo = byId.get(id);
        if (!todo) return null;
        return (
          <DraggableTodoItem
            key={id}
            todo={todo}
            index={index}
            targetY={tops[id]}
            bounds={bounds}
            reduceMotion={reduceMotion}
            onMeasure={handleMeasure}
            onToggle={onToggle}
            onDelete={onDelete}
            onMove={handleMove}
            onDragEnd={handleDragEnd}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    position: "relative",
    marginBottom: Spacing.four,
  },
  item: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  dragging: {
    zIndex: 10,
  },
});
