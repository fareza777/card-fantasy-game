import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { VaultButton } from './VaultButton';
import { Icon } from './Icon';

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
          <View style={styles.iconWrap}>
            <Icon name="warning" size={22} color={palette.gold} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>{this.state.error.message}</Text>
          <VaultButton
            label="Try again"
            icon="refresh"
            onPress={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    justifyContent: 'center',
    padding: 24,
    gap: 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.35)',
    backgroundColor: 'rgba(212,168,75,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    color: palette.goldBright,
    fontSize: 20,
    fontFamily: fonts.display,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  msg: { ...type.caption, fontSize: 13, marginBottom: 20 },
});
