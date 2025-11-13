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

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
        // Store the token
        await tokenStorage.setToken(data.token);
        Alert.alert('Success', 'Logged in successfully!');
        // Clear form
        setEmail('');
        setPassword('');
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
        placeholder="Password"
        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
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
