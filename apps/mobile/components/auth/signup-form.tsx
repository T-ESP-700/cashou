import React, { useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Button, Input } from '@/components/ui';
import { tokenStorage } from '@/lib/token-storage';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAlert } from '@/hooks/use-alert';
import { AUTH_URL } from '@/lib/api-config';

interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors, spacing } = useCashouTheme();
  const { showAlert } = useAlert();

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showAlert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        showAlert('Signup Failed', data.error?.message || 'Could not create account');
      } else {
        // Store the token
        await tokenStorage.setToken(data.token);
        // Clear form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        // Call onSuccess callback to refresh user data (this will update the UI automatically)
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (error) {
      console.error('Signup error:', error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message === 'Network request failed') {
        showAlert(
          'Connection Error',
          'Cannot connect to the server. Please check:\n\n' +
          '• Backend is running\n' +
          '• Device is on the same network\n' +
          '• API URL is correct in .env'
        );
      } else {
        showAlert('Error', 'An error occurred during signup');
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
        Create a new account
      </ThemedText>

      <Input
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!isLoading}
      />

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
      />

      <Input
        placeholder="Password (min. 8 characters)"
        value={password}
        onChangeText={setPassword}
        isPassword
        editable={!isLoading}
      />

      <Input
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword
        editable={!isLoading}
      />

      <Button
        title="Sign Up"
        variant="primary"
        onPress={handleSignup}
        isLoading={isLoading}
        fullWidth
        style={{ marginTop: 8 }}
      />
    </View>
  );
}
