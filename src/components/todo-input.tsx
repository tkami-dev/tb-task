import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Fonts, Spacing } from "@/constants/theme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TodoInput({
  onAdd,
  disabled,
}: {
  onAdd(title: string): Promise<void>;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [isSaving, setSaving] = useState(false);
  const pressed = useSharedValue(0);
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const canAdd = title.trim().length > 0 && !disabled && !isSaving;
  const inputStyle = useMemo(
    () => [styles.input, { color: theme.text }],
    [theme.text],
  );
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.03 }],
  }));

  async function submit() {
    const cleanTitle = title.trim();

    if (!cleanTitle || !canAdd) {
      return;
    }

    setSaving(true);
    try {
      await onAdd(cleanTitle);
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        editable={!disabled && !isSaving}
        placeholder="Add a task"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        style={inputStyle}
      />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Add task"
        disabled={!canAdd}
        onPress={submit}
        style={buttonStyle}
      >
        <View style={[styles.button, { opacity: canAdd ? 1 : 0.4 }]}>
          <ThemedText
            type="smallBold"
            style={{ color: canAdd ? theme.accent : theme.textSecondary }}
          >
            Add
          </ThemedText>
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 52,
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    paddingLeft: Spacing.three,
  },
});
