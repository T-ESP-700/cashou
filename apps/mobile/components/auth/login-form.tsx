import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, useColorScheme as useRNColorScheme } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { tokenStorage } from '@/lib/token-storage';
import { CashouTheme } from '@/constants/cashou-theme';
import { AUTH_URL } from '@/lib/api-config';

const AUTH_BASE_URL = AUTH_URL;

interface LoginFormProps {
  onSuccess?: () => void;
}

const isDev = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState(isDev ? 'test@gmail.com' : '');
  const [password, setPassword] = useState(isDev ? 'azerty123456' : '');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? CashouTheme.colors.dark : CashouTheme.colors.light;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        Alert.alert('Login Failed', data.error?.message || 'Invalid credentials');
      } else {
        console.log('[LoginForm] Login successful, storing token...');
        // Store the token
        await tokenStorage.setToken(data.token);
        console.log('[LoginForm] Token stored');
        // Clear form
        setEmail('');
        setPassword('');
        // Call onSuccess callback to refresh user data (this will update the UI automatically)
        if (onSuccess) {
          console.log('[LoginForm] Calling onSuccess callback...');
          await onSuccess();
          console.log('[LoginForm] onSuccess completed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message === 'Network request failed') {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check:\n\n' +
          '• Backend is running\n' +
          '• Device is on the same network\n' +
          '• API URL is correct in .env'
        );
      } else {
        Alert.alert('Error', 'An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Login to your account
      </ThemedText>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          }
        ]}
        placeholder="Email"
        placeholderTextColor={theme.text + '80'}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          }
        ]}
        placeholder="Password"
        placeholderTextColor={theme.text + '80'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Login</ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
