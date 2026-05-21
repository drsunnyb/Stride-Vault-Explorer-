import { Tabs } from "expo-router";
import { Gift, Map, Trophy, UserRound, Users } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

import { theme } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.goldBright,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: {
          backgroundColor: theme.bgElev,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.6 },
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "900" as const, letterSpacing: 1 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "MAP",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Map color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "REWARDS",
          tabBarIcon: ({ color, size }) => <Gift color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "LADDER",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "FRIENDS",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "PROFILE",
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
