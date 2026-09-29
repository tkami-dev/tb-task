import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { TodoProvider } from "@/hooks/use-todos";
import { GestureHandlerRootView } from "react-native-gesture-handler";

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Ubuntu: require("@/assets/fonts/Ubuntu-Regular.ttf"),
    "Ubuntu-Medium": require("@/assets/fonts/Ubuntu-Medium.ttf"),
    "Ubuntu-Bold": require("@/assets/fonts/Ubuntu-Bold.ttf"),
  });
  const colorScheme = useColorScheme();
  const appReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (appReady) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <TodoProvider>
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade_from_bottom",
              animationDuration: 220,
            }}
          />
        </TodoProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
