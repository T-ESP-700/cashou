import React, { useState } from "react";
import { View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Button, Input } from "@/components/ui";
import { tokenStorage } from "@/lib/token-storage";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { useAlert } from "@/hooks/use-alert";
import { AUTH_URL } from "@/lib/api-config";

// ─── Types ────────────────────────────────────────────────────────
interface SignupFormProps {
    onSuccess?: () => void;
}

interface FormErrors {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

// ─── Validation ───────────────────────────────────────────────────
function validate(data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}): FormErrors {
    const errors: FormErrors = {};

    const trimmedUsername = data.username.trim();
    const trimmedEmail = data.email.trim();

    // Username
    if (!trimmedUsername) {
        errors.username = "Le nom d'utilisateur est requis";
    } else if (trimmedUsername.length < 3) {
        errors.username =
            "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        errors.username = "Uniquement des lettres minuscules, chiffres et _";
    }

    // Email
    if (!trimmedEmail) {
        errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        errors.email = "L'email n'est pas valide";
    }

    // Mot de passe
    if (!data.password) {
        errors.password = "Le mot de passe est requis";
    } else if (data.password.length < 8) {
        errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    } else if (!/[A-Z]/.test(data.password)) {
        errors.password =
            "Le mot de passe doit contenir au moins une majuscule";
    } else if (!/[0-9]/.test(data.password)) {
        errors.password = "Le mot de passe doit contenir au moins un chiffre";
    }

    // Confirmation
    if (!data.confirmPassword) {
        errors.confirmPassword = "Veuillez confirmer le mot de passe";
    } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    return errors;
}

// ─── Composant ────────────────────────────────────────────────────
export function SignupForm({ onSuccess }: SignupFormProps) {
    const [username, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const { colors, spacing } = useCashouTheme();
    const { showAlert } = useAlert();

    function handleUsernameChange(text: string) {
        const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setUserName(cleaned);
        clearFieldError("username");
    }

    // ─── Helpers ──────────────────────────────────────────────────
    function clearFieldError(field: keyof FormErrors) {
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    }

    // ─── Submit ───────────────────────────────────────────────────
    async function handleSignup() {
        const validationErrors = validate({
            username,
            email,
            password,
            confirmPassword,
        });

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors({});
        setIsLoading(true);

        try {
            const response = await fetch(`${AUTH_URL}/sign-up/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "omit",
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    name: username.trim(),
                    username: username.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                // 429 rate-limit / 403 / 5xx portent leur message au premier niveau.
                showAlert(
                    "Inscription échouée",
                    data.error?.message ||
                        data.message ||
                        "Impossible de créer le compte",
                );
            } else {
                await tokenStorage.setToken(data.token);
                setUserName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setErrors({});
                await onSuccess?.();
            }
        } catch (error) {
            console.error("Signup error:", error);
            if (
                error instanceof TypeError &&
                error.message === "Network request failed"
            ) {
                showAlert(
                    "Erreur de connexion",
                    "Impossible de joindre le serveur. Vérifiez :\n\n" +
                        "• Le backend est démarré\n" +
                        "• L'appareil est sur le même réseau\n" +
                        "• L'URL API est correcte dans .env",
                );
            } else {
                showAlert(
                    "Erreur",
                    "Une erreur est survenue lors de l'inscription",
                );
            }
        } finally {
            setIsLoading(false);
        }
    }

    // ─── Render ───────────────────────────────────────────────────
    return (
        <View
            style={{
                padding: spacing.lg,
                backgroundColor: colors.background,
                gap: spacing.md,
            }}
        >
            <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
                Créer un nouveau compte
            </ThemedText>

            <Input
                placeholder="Nom d'utilisateur"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                error={errors.username}
                helperText="Lettres minuscules, chiffres et _ uniquement"
            />

            <Input
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                    setEmail(text);
                    clearFieldError("email");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
                error={errors.email}
            />

            <Input
                placeholder="Mot de passe (min. 8 caractères)"
                value={password}
                onChangeText={(text) => {
                    setPassword(text);
                    clearFieldError("password");
                }}
                isPassword
                editable={!isLoading}
                error={errors.password}
                helperText="1 majuscule et 1 chiffre minimum"
            />

            <Input
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearFieldError("confirmPassword");
                }}
                isPassword
                editable={!isLoading}
                error={errors.confirmPassword}
            />

            <Button
                title="S'inscrire"
                variant="primary"
                onPress={handleSignup}
                isLoading={isLoading}
                fullWidth
                style={{ marginTop: 8 }}
            />
        </View>
    );
}
