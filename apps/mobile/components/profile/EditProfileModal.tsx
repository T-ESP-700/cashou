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
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useCashouTheme } from "@/hooks/use-cashou-theme";
import { useAuth } from "@/hooks/use-auth";
import { trpcClient } from "@/lib/trpc";
import { Input } from "@/components/ui";
import { ChangePasswordSection } from "./ChangePasswordSection";

// ─── Avatars prédéfinis ───────────────────────────────────────────
const PRESET_AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/png?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Mia",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Leo",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Emma",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Noah",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Luna",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Alex",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Sam",
    "https://api.dicebear.com/7.x/avataaars/png?seed=Jordan",
];

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

// ─── Composant AvatarCard ─────────────────────────────────────────
interface AvatarCardProps {
    avatarUri: string | null;
    isLoadingImage: boolean;
    isSubmitting: boolean;
    onOpenCamera: () => void;
    onOpenGallery: () => void;
    onRemove: () => void;
    onSelectPreset: (uri: string) => void;
    colors: any;
    fonts: any;
    spacing: any;
}

function AvatarCard({
    avatarUri,
    isLoadingImage,
    isSubmitting,
    onOpenCamera,
    onOpenGallery,
    onRemove,
    onSelectPreset,
    colors,
    fonts,
    spacing,
}: AvatarCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    function toggle() {
        const toValue = isOpen ? 0 : 1;
        setIsOpen(!isOpen);
        Animated.spring(rotateAnim, {
            toValue,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
        }).start();
    }

    const chevronRotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    return (
        <View
            style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
                marginBottom: spacing.lg,
            }}
        >
            {/* ─── Header cliquable ─────────────────────────── */}
            <TouchableOpacity
                onPress={toggle}
                disabled={isLoadingImage || isSubmitting}
                activeOpacity={0.7}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: spacing.md,
                    gap: spacing.md,
                }}
            >
                {/* Avatar miniature */}
                <View style={{ position: "relative" }}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: colors.background,
                            }}
                        />
                    ) : (
                        <View
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: colors.background,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 2,
                                borderColor: colors.border,
                                borderStyle: "dashed",
                            }}
                        >
                            <Ionicons
                                name="person-outline"
                                size={24}
                                color={colors.icon}
                            />
                        </View>
                    )}
                    {isLoadingImage && (
                        <View
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                borderRadius: 28,
                                backgroundColor: "rgba(0,0,0,0.45)",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ActivityIndicator color="#fff" size="small" />
                        </View>
                    )}
                </View>

                {/* Texte */}
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontFamily: fonts.heading,
                            fontSize: 15,
                            color: colors.text,
                            marginBottom: 2,
                        }}
                    >
                        Photo de profil
                    </Text>
                    <Text
                        style={{
                            fontFamily: fonts.body,
                            fontSize: 13,
                            color: colors.icon,
                        }}
                    >
                        {isOpen ? "Fermer" : "Modifier l'avatar"}
                    </Text>
                </View>

                {/* Chevron animé */}
                <Animated.View
                    style={{ transform: [{ rotate: chevronRotate }] }}
                >
                    <Ionicons
                        name="chevron-down"
                        size={20}
                        color={colors.icon}
                    />
                </Animated.View>
            </TouchableOpacity>

            {/* ─── Contenu déplié ───────────────────────────── */}
            {isOpen && (
                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                    }}
                >
                    {/* Boutons actions */}
                    <View
                        style={{
                            flexDirection: "row",
                            gap: spacing.sm,
                            padding: spacing.md,
                        }}
                    >
                        <TouchableOpacity
                            onPress={onRemove}
                            disabled={!avatarUri}
                            activeOpacity={avatarUri ? 0.7 : 1}
                            style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: spacing.sm,
                                paddingVertical: spacing.md,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: avatarUri
                                    ? colors.background
                                    : colors.card,
                                opacity: avatarUri ? 1 : 0.5,
                            }}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={18}
                                color={avatarUri ? "#ef4444" : colors.icon}
                            />
                            <Text
                                style={{
                                    fontFamily: fonts.body,
                                    fontSize: 14,
                                    color: avatarUri ? "#ef4444" : colors.icon,
                                }}
                            >
                                Supprimer l'avatar
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Séparateur */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: spacing.md,
                            marginBottom: spacing.md,
                            gap: spacing.sm,
                        }}
                    >
                        <View
                            style={{
                                flex: 1,
                                height: 1,
                                backgroundColor: colors.border,
                            }}
                        />
                        <Text
                            style={{
                                fontFamily: fonts.body,
                                fontSize: 12,
                                color: colors.icon,
                            }}
                        >
                            ou choisir un avatar
                        </Text>
                        <View
                            style={{
                                flex: 1,
                                height: 1,
                                backgroundColor: colors.border,
                            }}
                        />
                    </View>

                    {/* Grille avatars prédéfinis */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: spacing.sm,
                            paddingHorizontal: spacing.md,
                            paddingBottom: spacing.md,
                            justifyContent: "center",
                        }}
                    >
                        {PRESET_AVATARS.map((uri) => {
                            const isSelected = avatarUri === uri;
                            return (
                                <TouchableOpacity
                                    key={uri}
                                    onPress={() => onSelectPreset(uri)}
                                    activeOpacity={0.7}
                                    style={{
                                        borderRadius: 36,
                                        borderWidth: 3,
                                        borderColor: isSelected
                                            ? colors.accent
                                            : "transparent",
                                        padding: 2,
                                    }}
                                >
                                    <Image
                                        source={{ uri }}
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 30,
                                            backgroundColor: colors.background,
                                        }}
                                    />
                                    {isSelected && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                bottom: 2,
                                                right: 2,
                                                backgroundColor: colors.accent,
                                                borderRadius: 10,
                                                width: 20,
                                                height: 20,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Ionicons
                                                name="checkmark"
                                                size={12}
                                                color="#fff"
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

// ─── Composant principal ──────────────────────────────────────────
export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
    const { colors, fonts, spacing } = useCashouTheme();
    const { user, refreshUser } = useAuth();

    const [form, setForm] = useState<FormData>({ username: "" });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);

    const passwordSubmitRef = useRef<(() => Promise<void>) | null>(null);

    const hasChanges =
        form.username !== (user?.username ?? "") || avatarChanged;

    // ─── Reset à l'ouverture ──────────────────────────────────────
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

    function handleSelectPreset(uri: string) {
        setAvatarUri(uri);
        setAvatarChanged(true);
    }

    function handleRemoveAvatar() {
        setAvatarUri(null);
        setAvatarChanged(true);
    }

    // ─── Submit ───────────────────────────────────────────────────
    async function handleSubmit() {
        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

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

    // ─── Render ───────────────────────────────────────────────────
    return (
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
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text
                            style={{
                                fontFamily: fonts.body,
                                fontSize: 16,
                                color: colors.icon,
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
                    {/* ✅ Carte avatar pliable */}
                    <AvatarCard
                        avatarUri={avatarUri}
                        isLoadingImage={isLoadingImage}
                        isSubmitting={isSubmitting}
                        onOpenCamera={handleOpenCamera}
                        onOpenGallery={handleOpenGallery}
                        onRemove={handleRemoveAvatar}
                        onSelectPreset={handleSelectPreset}
                        colors={colors}
                        fonts={fonts}
                        spacing={spacing}
                    />

                    {/* Username */}
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

                    {/* Email (readonly) */}
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

                    <View style={{ height: spacing.lg }} />

                    {/* Mot de passe */}
                    <ChangePasswordSection
                        onSubmitRef={(fn) => (passwordSubmitRef.current = fn)}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
