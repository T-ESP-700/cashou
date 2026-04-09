import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { trpcClient } from "@/lib/trpc";
import { Input } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────
interface PasswordForm {
    current: string;
    next: string;
    confirm: string;
}

interface PasswordErrors {
    current?: string;
    next?: string;
    confirm?: string;
}

// ─── Validation ───────────────────────────────────────────────────
function validatePassword(form: PasswordForm): PasswordErrors {
    const errors: PasswordErrors = {};

    if (!form.current) {
        errors.current = "L'ancien mot de passe est requis";
    }

    if (!form.next) {
        errors.next = "Le nouveau mot de passe est requis";
    } else if (form.next.length < 8) {
        errors.next = "Le mot de passe doit contenir au moins 8 caractères";
    } else if (!/[A-Z]/.test(form.next)) {
        errors.next = "Le mot de passe doit contenir au moins une majuscule";
    } else if (!/[0-9]/.test(form.next)) {
        errors.next = "Le mot de passe doit contenir au moins un chiffre";
    } else if (form.next === form.current) {
        errors.next = "Le nouveau mot de passe doit être différent de l'ancien";
    }

    if (!form.confirm) {
        errors.confirm = "La confirmation est requise";
    } else if (form.confirm !== form.next) {
        errors.confirm = "Les mots de passe ne correspondent pas";
    }

    return errors;
}

const EMPTY_FORM: PasswordForm = { current: "", next: "", confirm: "" };

interface ChangePasswordSectionProps {
    onSubmitRef?: (fn: () => Promise<void>) => void;
}

// ─── Composant ────────────────────────────────────────────────────
export function ChangePasswordSection({
    onSubmitRef,
}: ChangePasswordSectionProps) {
    const { colors, fonts, spacing } = useCashouTheme();

    const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<PasswordErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Visibilité des mots de passe
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const hasChanges =
        form.current !== "" || form.next !== "" || form.confirm !== "";

    // ─── Helpers ──────────────────────────────────────────────────
    function handleChange(field: keyof PasswordForm, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field])
            setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function handleCancel() {
        setForm(EMPTY_FORM);
        setErrors({});
    }

    async function handleSubmit() {
        const validationErrors = validatePassword(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            setIsSubmitting(true);
            await trpcClient.user.changePassword.mutate({
                currentPassword: form.current,
                newPassword: form.next,
            });
            Alert.alert("Succès", "Votre mot de passe a été modifié");
            handleCancel();
        } catch (error: any) {
            Alert.alert("Erreur", error.message ?? "Une erreur est survenue");
        } finally {
            setIsSubmitting(false);
        }
    }

    // ─── Render ───────────────────────────────────────────────────
    return (
        <View>
            {/* ─── Titre section ───────────────────────────────── */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    marginBottom: spacing.lg,
                }}
            >
                <View
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: `${colors.accent}15`,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={colors.accent}
                    />
                </View>
                <Text
                    style={{
                        fontFamily: fonts.heading,
                        fontSize: 16,
                        color: colors.text,
                    }}
                >
                    Modifier le mot de passe
                </Text>
            </View>

            {/* ─── Champs ───────────────────────────────────────── */}
            <Input
                label="Ancien mot de passe"
                value={form.current}
                onChangeText={(v) => handleChange("current", v)}
                error={errors.current}
                placeholder="••••••••"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
                rightIcon={
                    <TouchableOpacity onPress={() => setShowCurrent((v) => !v)}>
                        <Ionicons
                            name={
                                showCurrent ? "eye-off-outline" : "eye-outline"
                            }
                            size={18}
                            color={colors.icon}
                        />
                    </TouchableOpacity>
                }
            />

            <View style={{ height: spacing.md }} />

            <Input
                label="Nouveau mot de passe"
                value={form.next}
                onChangeText={(v) => handleChange("next", v)}
                error={errors.next}
                helperText="8 caractères minimum, 1 majuscule, 1 chiffre"
                placeholder="••••••••"
                secureTextEntry={!showNext}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="next"
                rightIcon={
                    <TouchableOpacity onPress={() => setShowNext((v) => !v)}>
                        <Ionicons
                            name={showNext ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color={colors.icon}
                        />
                    </TouchableOpacity>
                }
            />

            <View style={{ height: spacing.md }} />

            <Input
                label="Confirmation du mot de passe"
                value={form.confirm}
                onChangeText={(v) => handleChange("confirm", v)}
                error={errors.confirm}
                placeholder="••••••••"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                        <Ionicons
                            name={
                                showConfirm ? "eye-off-outline" : "eye-outline"
                            }
                            size={18}
                            color={colors.icon}
                        />
                    </TouchableOpacity>
                }
            />
        </View>
    );
}
