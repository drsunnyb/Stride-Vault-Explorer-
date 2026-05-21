import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { track } from "@/lib/analytics";
import { createLogger } from "@/lib/logger";

const log = createLogger("ErrorBoundary");

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary. Catches render-phase exceptions in the tree
 * below, logs them with the centralised logger, fires an `error` analytics
 * event, and shows a friendly recovery UI instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    log.error("uncaught render error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? "",
    });
    track("error", {
      message: error.message,
      // Cap stack length so a runaway trace can't blow up the events table.
      stack: (error.stack ?? "").slice(0, 1000),
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.root} testID="error-boundary">
          <Text style={styles.emoji}>🧯</Text>
          <Text style={styles.title}>Something went sideways.</Text>
          <Text style={styles.subtitle}>
            We logged it. Tap to keep walking.
          </Text>
          <Text numberOfLines={3} style={styles.detail}>
            {this.state.error.message}
          </Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.bg,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 15,
    marginBottom: 18,
    textAlign: "center",
  },
  detail: {
    color: theme.textMuted,
    fontSize: 12,
    fontFamily: "Menlo",
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    backgroundColor: theme.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: { color: theme.bg, fontWeight: "800", fontSize: 15 },
});
