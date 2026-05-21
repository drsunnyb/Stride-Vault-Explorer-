import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { theme } from "@/constants/theme";
import { track } from "@/lib/analytics";
import { AuthProvider, useAuth } from "@/lib/auth";
import { GameProvider, useGame } from "@/providers/GameProvider";

SplashScreen.preventAutoHideAsync();

// Silence a noisy dev-only warning from react-native-screens forwarding
// `collapsable` through react-native-web to the DOM. Not a real bug.
if (Platform.OS === "web" && typeof console !== "undefined") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("non-boolean attribute") && args.some((a) => a === "collapsable")) {
      return;
    }
    origError(...(args as []));
  };
}

const queryClient = new QueryClient();

function OnboardingGate() {
  const { isAuthed, isLoading: authLoading } = useAuth();
  const { hasOnboarded, isLoading: gameLoading } = useGame();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || gameLoading) return;
    const onOnboarding = segments[0] === "onboarding";
    const needsOnboarding = !isAuthed || !hasOnboarded;
    if (needsOnboarding && !onOnboarding) {
      router.replace("/onboarding");
    } else if (!needsOnboarding && onOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isAuthed, hasOnboarded, authLoading, gameLoading, segments, router]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "800" as const },
        contentStyle: { backgroundColor: theme.bg },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="vault/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="reward/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="raffle/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="plus"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="challenge/new"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="challenge/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="predict"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="tribes"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    track("app_open", { platform: Platform.OS });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
          <AuthProvider>
            <GameProvider>
              <StatusBar style="light" />
              <OnboardingGate />
              <RootLayoutNav />
            </GameProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
