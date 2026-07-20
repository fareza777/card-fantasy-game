import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { palette } from './src/theme/colors';

type EBState = { error: Error | null };

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('AppErrorBoundary', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.err}>
          <Text style={styles.errTitle}>Rune Vault failed to start</Text>
          <Text style={styles.errMsg}>{this.state.error.message}</Text>
          <Pressable style={styles.errBtn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.errBtnText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <StatusBar style="light" />
          <RootNavigator />
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  err: { flex: 1, backgroundColor: '#0B0E14', justifyContent: 'center', padding: 24 },
  errTitle: { color: palette.goldBright, fontSize: 20, fontWeight: '900', marginBottom: 10 },
  errMsg: { color: palette.textMuted, fontSize: 13, marginBottom: 20 },
  errBtn: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  errBtnText: { color: '#1A1200', fontWeight: '900', fontSize: 15 },
});
