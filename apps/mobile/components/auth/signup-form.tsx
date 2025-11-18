import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { tokenStorage } from '@/lib/token-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import Constants from 'expo-constants';

const AUTH_BASE_URL = Constants.expoConfig?.extra?.authUrl ||
  process.env.EXPO_PUBLIC_AUTH_URL ||
  'http://localhost:3000/api/auth';

interface SignupFormProps {
  onSuccess?: () => void;
}

export function SignupForm({ onSuccess }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${AUTH_BASE_URL}/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        Alert.alert('Signup Failed', data.error?.message || 'Could not create account');
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
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check:\n\n' +
          '• Backend is running\n' +
          '• Device is on the same network\n' +
          '• API URL is correct in .env'
        );
      } else {
        Alert.alert('Error', 'An error occurred during signup');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Create a new account
      </ThemedText>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            color: colors.text,
            borderColor: colors.tint,
          }
        ]}
        placeholder="Full Name"
        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!isLoading}
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            color: colors.text,
            borderColor: colors.tint,
          }
        ]}
        placeholder="Email"
        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
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
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            color: colors.text,
            borderColor: colors.tint,
          }
        ]}
        placeholder="Password (min. 8 characters)"
        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
            color: colors.text,
            borderColor: colors.tint,
          }
        ]}
        placeholder="Confirm Password"
        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={handleSignup}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
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
