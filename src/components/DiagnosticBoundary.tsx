import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { reportIssue } from "../services/diagnostics/client";
import { shareSupportReport } from "../services/diagnostics/runtime";

/** Recover a React render failure without deleting progress or creating a new account. */
export class DiagnosticBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    reportIssue("ui.render", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Let’s get you back on the road</Text>
        <Text style={styles.note}>
          Something went wrong while showing this screen. Your saved progress is
          kept.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => this.setState({ failed: false })}
        >
          <Text style={styles.label}>Try again</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => {
            shareSupportReport().catch(() =>
              Alert.alert("Support", "akssoft.feedback@gmail.com")
            );
          }}
        >
          <Text style={styles.label}>Report a problem</Text>
        </Pressable>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#073655",
    padding: 28,
    gap: 24,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  note: { color: "#D9ECFF", fontSize: 17, textAlign: "center" },
  button: {
    backgroundColor: "#FFDA00",
    padding: 18,
    borderRadius: 20,
    minHeight: 56,
  },
  label: {
    color: "#073655",
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
  },
});
