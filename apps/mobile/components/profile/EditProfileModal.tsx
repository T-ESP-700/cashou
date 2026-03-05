import React, { useState, useEffect, useRef } from "react";
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
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { useAuth } from "@/hooks/use-auth";
import { trpcClient } from "@/lib/trpc";
import { Input } from "@/components/ui";

import { AvatarPickerModal } from "./AvatarPickerModal";
import { ChangePasswordSection } from "./ChangePasswordSection";

// ─── Types ────────────────────────────────────────────────────────
interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

interface FormData {
    username: string;
}

interface FormErrors {
    username?: string;
}

// ─── Validation ───────────────────────────────────────────────────
function validate(data: FormData): FormErrors {
    const errors: FormErrors = {};
    const trimmedUsername = data.username.trim();

    if (!trimmedUsername) {
        errors.username = "Le nom d'utilisateur est requis";
    } else if (trimmedUsername.length < 3) {
        errors.username =
            "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        errors.username = "Uniquement des lettres minuscules, chiffres et _";
    }

    return errors;
}

// ─── Traitement image ─────────────────────────────────────────────
async function processImage(uri: string): Promise<string> {
    const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 300, height: 300 } }],
        {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
        },
    );

    if (!manipulated.base64) throw new Error("Conversion base64 échouée");
    return `data:image/jpeg;base64,${manipulated.base64}`;
}

// ─── Composant principal ──────────────────────────────────────────
export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
    const { colors, fonts, spacing } = useCashouTheme();
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState<FormData>({ name: "", username: "" });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);

    const hasChanges =
        form.username !== (user?.username ?? "") || avatarChanged;

    useEffect(() => {
        if (visible && user) {
            setForm({ username: user.username ?? "" });
            setAvatarUri(user.image ?? null);
            setAvatarChanged(false);
            setErrors({});
        }
    }, [visible, user]);

    // ─── Handlers form ────────────────────────────────────────────
    function handleUsernameChange(text: string) {
        const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setForm((prev) => ({ ...prev, username: cleaned }));
        if (errors.username)
            setErrors((prev) => ({ ...prev, username: undefined }));
    }

    // ─── Handlers avatar ──────────────────────────────────────────
    async function handleOpenCamera() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission refusée",
                "L'accès à la caméra est nécessaire",
            );
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) await handleImageSelected(result.assets[0].uri);
    }

    async function handleOpenGallery() {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission refusée",
                "L'accès à la galerie est nécessaire",
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) await handleImageSelected(result.assets[0].uri);
    }

    async function handleImageSelected(uri: string) {
        try {
            setIsLoadingImage(true);
            const processed = await processImage(uri);
            setAvatarUri(processed);
            setAvatarChanged(true);
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l'image");
        } finally {
            setIsLoadingImage(false);
        }
    }

    function handleSelectPreset(uri: string) {
        setAvatarUri(uri);
        setAvatarChanged(true);
    }

    function handleRemoveAvatar() {
        setAvatarUri(null);
        setAvatarChanged(true);
    }

    // ─── Submit ───────────────────────────────────────────────────
    const passwordSubmitRef = useRef<(() => Promise<void>) | null>(null);

    async function handleSubmit() {
        // Soumet le profil
        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        // Soumet le mot de passe si rempli
        await passwordSubmitRef.current?.();

        try {
            setIsSubmitting(true);
            await trpcClient.user.updateProfile.mutate({
                username: form.username.trim() || undefined,
                image: avatarUri,
            });
            await refreshUser();
            onClose();
        } catch (error: any) {
            Alert.alert("Erreur", error.message ?? "Une erreur est survenue");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, backgroundColor: colors.background }}
                >
                    {/* Handle bar */}
                    <View
                        style={{
                            alignItems: "center",
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
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: spacing.lg,
                            paddingVertical: spacing.md,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <TouchableOpacity
                            onPress={onClose}
                            disabled={isSubmitting}
                            hitSlop={{
                                top: 10,
                                bottom: 10,
                                left: 10,
                                right: 10,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: fonts.body,
                                    fontSize: 16,
                                    color: isSubmitting
                                        ? colors.icon
                                        : colors.accent,
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
                            hitSlop={{
                                top: 10,
                                bottom: 10,
                                left: 10,
                                right: 10,
                            }}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={colors.accent}
                                />
                            ) : (
                                <Text
                                    style={{
                                        fontFamily: fonts.body,
                                        fontSize: 16,
                                        color: hasChanges
                                            ? colors.accent
                                            : colors.icon,
                                        fontWeight: "600",
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
                        {/* Avatar */}
                        <View
                            style={{
                                alignItems: "center",
                                marginBottom: spacing.xl,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => setShowAvatarPicker(true)}
                                disabled={isLoadingImage || isSubmitting}
                                style={{ position: "relative" }}
                            >
                                {avatarUri ? (
                                    <Image
                                        source={{ uri: avatarUri }}
                                        style={{
                                            width: 100,
                                            height: 100,
                                            borderRadius: 50,
                                            backgroundColor: colors.card,
                                        }}
                                    />
                                ) : (
                                    <View
                                        style={{
                                            width: 100,
                                            height: 100,
                                            borderRadius: 50,
                                            backgroundColor: colors.card,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderWidth: 2,
                                            borderColor: colors.border,
                                            borderStyle: "dashed",
                                        }}
                                    >
                                        <Ionicons
                                            name="person-outline"
                                            size={40}
                                            color={colors.icon}
                                        />
                                    </View>
                                )}

                                {isLoadingImage && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            borderRadius: 50,
                                            backgroundColor: "rgba(0,0,0,0.4)",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <ActivityIndicator color="#fff" />
                                    </View>
                                )}

                                {!isLoadingImage && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            bottom: 0,
                                            right: 0,
                                            backgroundColor: colors.accent,
                                            borderRadius: 12,
                                            width: 28,
                                            height: 28,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderWidth: 2,
                                            borderColor: colors.background,
                                        }}
                                    >
                                        <Ionicons
                                            name="camera-outline"
                                            size={14}
                                            color="#fff"
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text
                                style={{
                                    marginTop: spacing.sm,
                                    fontFamily: fonts.body,
                                    fontSize: 13,
                                    color: colors.icon,
                                }}
                            >
                                Appuyer pour modifier
                            </Text>
                        </View>

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

                        <Input
                            label="Email"
                            value={user?.email ?? ""}
                            editable={false}
                            leftIcon={
                                <Ionicons
                                    name="mail-outline"
                                    size={18}
                                    color={colors.icon}
                                />
                            }
                            helperText="L'email ne peut pas être modifié"
                        />

                        <ChangePasswordSection
                            onSubmitRef={(fn) => (passwordSubmitRef.current = fn)}
                        />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Avatar Picker Drawer */}
            <AvatarPickerModal
                visible={showAvatarPicker}
                currentUri={avatarUri}
                onClose={() => setShowAvatarPicker(false)}
                onSelectPreset={handleSelectPreset}
                onOpenCamera={handleOpenCamera}
                onOpenGallery={handleOpenGallery}
                onRemove={handleRemoveAvatar}
            />
        </>
    );
}
