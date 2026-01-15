import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { tokenStorage } from '@/lib/token-storage';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
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
  const { colors, spacing } = useCashouTheme();

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

      let data;
      const contentType = response.headers.get('content-type');

      // Handle JSON parsing with error handling
      try {
        if (contentType && contentType.includes('application/json')) {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
        } else {
          // If response is not JSON, try to parse as text
          const text = await response.text();
          if (text) {
            try {
              data = JSON.parse(text);
            } catch {
              // If parsing fails, create error object
              data = { error: { message: text || 'Invalid response format' } };
            }
          } else {
            data = { error: { message: 'Empty response from server' } };
          }
        }
      } catch (parseError) {
        console.error('[LoginForm] JSON parsing error:', parseError);
        data = { error: { message: 'Failed to parse server response' } };
      }

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
      } else if (error instanceof SyntaxError) {
        Alert.alert('Error', 'Invalid response from server. Please try again.');
      } else {
        Alert.alert('Error', 'An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={{ padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md }}
    >
      <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
        Login to your account
      </ThemedText>

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
      />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        isPassword
        editable={!isLoading}
      />

      <Button
        title="Login"
        variant="primary"
        onPress={handleLogin}
        isLoading={isLoading}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </View>
  );
}
