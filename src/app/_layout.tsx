import { useFonts } from "expo-font";
import { NavigationBar } from "expo-navigation-bar";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Colors } from "@/constants/theme";
import { TodoProvider } from "@/hooks/use-todos";

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Ubuntu: require("@/assets/fonts/Ubuntu-Regular.ttf"),
    "Ubuntu-Medium": require("@/assets/fonts/Ubuntu-Medium.ttf"),
    "Ubuntu-Bold": require("@/assets/fonts/Ubuntu-Bold.ttf"),
  });
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const appReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(
      (isDark ? Colors.dark : Colors.light).background,
    ).catch(() => {});
  }, [isDark]);

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  const palette = isDark ? Colors.dark : Colors.light;
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: palette.background,
      card: palette.background,
      border: palette.border,
      text: palette.text,
    },
  };

  return (
    <SafeAreaProvider style={{ backgroundColor: palette.background }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
        <ThemeProvider value={navTheme}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <NavigationBar style={isDark ? "light" : "dark"} />
          <TodoProvider>
            <AnimatedSplashOverlay />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: palette.background },
                animation: "fade_from_bottom",
                animationDuration: 220,
              }}
            >
              <Stack.Screen
                name="settings"
                options={{
                  animation: "slide_from_right",
                  animationDuration: 320,
                  gestureEnabled: true,
                }}
              />
            </Stack>
          </TodoProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
