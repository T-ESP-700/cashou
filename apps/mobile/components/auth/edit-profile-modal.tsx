import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCashouTheme } from '@/hooks/use-cashou-theme';
import { useAuth } from '@/hooks/use-auth';
import { trpcClient } from '@/lib/trpc';
import { Input } from '@/components/ui';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

interface FormData {
    name: string;
    username: string;
}

interface FormErrors {
    name?: string;
    username?: string;
}

function validate(data: FormData): FormErrors {
    const errors: FormErrors = {};

    const trimmedName = data.name.trim();
    const trimmedUsername = data.username.trim();

    if (!trimmedName) {
        errors.name = "Le nom est requis";
    } else if (trimmedName.length < 3) {
        errors.name = "Le nom doit contenir au moins 3 caractères";
    }

    if (!trimmedUsername) {
        errors.username = "Le nom d'utilisateur est requis";
    } else if (trimmedUsername.length < 3) {
        errors.username = "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        errors.username = 'Uniquement des lettres minuscules, chiffres et _';
    }

    return errors;
}

export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
    const { colors, fonts, spacing } = useCashouTheme();
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState<FormData>({ name: '', username: '' });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasChanges = form.name !== (user?.name ?? '') || form.username !== (user?.username ?? '');

    // Sync form with current user data when modal opens
    useEffect(() => {
        if (visible && user) {
            setForm({ name: user.name ?? '', username: user.username ?? '' });
            setErrors({});
        }
    }, [visible, user]);

    function handleNameChange(text: string) {
        const cleaned = text.trim();
        setForm(prev => ({ ...prev, name: cleaned }));
        if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
    }

    function handleUsernameChange(text: string) {
        const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setForm(prev => ({ ...prev, username: cleaned }));
        if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));
    }

    async function handleSubmit() {
        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        if (!hasChanges) {
            onClose();
            return;
        }

        try {
            setIsSubmitting(true);

            // updateProfile prend l'ID depuis ctx.session côté serveur
            await trpcClient.user.updateProfile.mutate({
                name: form.name,
                username: form.username.trim(),
            });

            console.log('Profile updated successfully', await refreshUser());

            await refreshUser();

            Alert.alert('Succès ✓', 'Votre profil a été mis à jour', [
                { text: 'OK', onPress: onClose },
            ]);
        } catch (error: any) {
            const code = error?.data?.code ?? error?.shape?.data?.code;
            const message =
                code === 'CONFLICT'
                    ? "Ce nom d'utilisateur est déjà pris"
                    : code === 'UNAUTHORIZED'
                        ? 'Session expirée, veuillez vous reconnecter'
                        : error?.message ?? 'Une erreur est survenue';

            Alert.alert('Erreur', message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: colors.background }}
            >
                {/* Drag indicator */}
                <View
                    style={{
                        alignItems: 'center',
                        paddingTop: spacing.sm,
                        paddingBottom: spacing.xs,
                    }}
                >
                    <View
                        style={{
                            width: 40,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: colors.border,
                            opacity: 0.6,
                        }}
                    />
                </View>
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={isSubmitting}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text
                            style={{
                                fontFamily: fonts.body,
                                fontSize: 16,
                                color: isSubmitting ? colors.icon : colors.accent,
                            }}
                        >
                            Annuler
                        </Text>
                    </TouchableOpacity>

                    <Text
                        style={{
                            fontFamily: fonts.heading,
                            fontSize: 17,
                            color: colors.text,
                        }}
                    >
                        Modifier le profil
                    </Text>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isSubmitting || !hasChanges}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                            <Text
                                style={{
                                    fontFamily: fonts.body,
                                    fontSize: 16,
                                    color: hasChanges ? colors.accent : colors.icon,
                                    fontWeight: '600',
                                }}
                            >
                                Enregistrer
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <ScrollView
                    contentContainerStyle={{ padding: spacing.lg }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Input
                        label="Nom"
                        value={form.name}
                        onChangeText={handleNameChange}
                        error={errors.name}
                        placeholder="Votre nom"
                        autoCapitalize="words"
                        returnKeyType="next"
                        onSubmitEditing={handleSubmit}
                    />

                    <View style={{ height: spacing.lg }} />

                    <Input
                        label="Nom d'utilisateur"
                        value={form.username}
                        onChangeText={handleUsernameChange}
                        error={errors.username}
                        helperText="Lettres minuscules, chiffres et _ uniquement"
                        placeholder="votre_pseudo"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                        editable={!isSubmitting}
                    />

                    <View style={{ height: spacing.lg }} />

                    {/* Email (read-only) */}
                    <Input
                        label="Email"
                        value={user?.email ?? ''}
                        editable={false}
                        leftIcon={
                            <Ionicons name="mail-outline" size={18} color={colors.icon} />
                        }
                        helperText="L'email ne peut pas être modifié"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
