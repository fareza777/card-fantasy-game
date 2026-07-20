import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette } from '../theme/colors';

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

/** Prevents a single screen crash from taking down the whole app. */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('ScreenErrorBoundary', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          <Pressable
            style={styles.btn}
            onPress={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: palette.bg, justifyContent: 'center', padding: 24 },
  title: { color: palette.goldBright, fontSize: 20, fontWeight: '900', marginBottom: 8 },
  msg: { color: palette.textMuted, fontSize: 13, marginBottom: 20 },
  btn: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#1A1200', fontWeight: '900', fontSize: 15 },
});
