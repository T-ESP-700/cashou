import React from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, View, Alert } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function UserProfile() {
  const { user, isLoading, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.welcomeText}>
          Welcome back!
        </ThemedText>
      </ThemedView>

      <ThemedView
        style={[
          styles.card,
          {
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            borderColor: colors.tint,
          }
        ]}
      >
        <View style={styles.infoRow}>
          <ThemedText type="subtitle" style={styles.label}>
            Name
          </ThemedText>
          <ThemedText style={styles.value}>
            {user.name || 'Not set'}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText type="subtitle" style={styles.label}>
            Email
          </ThemedText>
          <ThemedText style={styles.value}>
            {user.email}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <ThemedText type="subtitle" style={styles.label}>
            Points
          </ThemedText>
          <ThemedText style={[styles.value, { color: colors.tint, fontWeight: '700' }]}>
            {user.points}
          </ThemedText>
        </View>

        {user.levelId && (
          <View style={styles.infoRow}>
            <ThemedText type="subtitle" style={styles.label}>
              Level
            </ThemedText>
            <ThemedText style={styles.value}>
              {user.levelId}
            </ThemedText>
          </View>
        )}
      </ThemedView>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: '#ff4444' }]}
        onPress={handleLogout}
      >
        <ThemedText style={styles.logoutButtonText}>
          Logout
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    gap: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
  },
  logoutButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
