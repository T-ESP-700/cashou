import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCashouTheme } from "@/hooks/use-cashou-theme";

// ─── Avatars prédéfinis ───────────────────────────────────────────
export const PRESET_AVATARS = [
    { id: "1", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Felix" },
    { id: "2", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Aneka" },
    { id: "3", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Luna" },
    { id: "4", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Max" },
    { id: "5", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Zoe" },
    { id: "6", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Sam" },
    { id: "7", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Alex" },
    { id: "8", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Jordan" },
    { id: "9", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Riley" },
    { id: "10", uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Casey" },
    {
        id: "11",
        uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Morgan",
    },
    {
        id: "12",
        uri: "https://api.dicebear.com/7.x/adventurer/png?seed=Taylor",
    },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const AVATAR_SIZE = (SCREEN_WIDTH - 48 - 32) / 4;

// ─── Types ────────────────────────────────────────────────────────
export interface AvatarPickerModalProps {
    visible: boolean;
    currentUri: string | null;
    onClose: () => void;
    onSelectPreset: (uri: string) => void;
    onOpenCamera: () => void;
    onOpenGallery: () => void;
    onRemove: () => void;
}

// ─── Composant ────────────────────────────────────────────────────
export function AvatarPickerModal({
    visible,
    currentUri,
    onClose,
    onSelectPreset,
    onOpenCamera,
    onOpenGallery,
    onRemove,
}: AvatarPickerModalProps) {
    const { colors, fonts, spacing } = useCashouTheme();

    function handleSelectPreset(uri: string) {
        onSelectPreset(uri);
        onClose();
    }

    function handleCamera() {
        onClose();
        // Petit délai pour laisser le drawer se fermer avant d'ouvrir la caméra
        setTimeout(onOpenCamera, 300);
    }

    function handleGallery() {
        onClose();
        setTimeout(onOpenGallery, 300);
    }

    function handleRemove() {
        onRemove();
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Pressable
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
                onPress={onClose}
            />

            {/* Drawer */}
            <View
                style={{
                    backgroundColor: colors.background,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    paddingBottom: 40,
                    // Positionné en bas grâce au Pressable flex:1 au-dessus
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                }}
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
                    <Text
                        style={{
                            fontFamily: fonts.heading,
                            fontSize: 17,
                            color: colors.text,
                        }}
                    >
                        Choisir un avatar
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={22} color={colors.icon} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: spacing.lg }}
                >
                    {/* ─── Actions rapides ─────────────────────────── */}
                    <View
                        style={{
                            flexDirection: "row",
                            gap: spacing.sm,
                            marginBottom: spacing.xl,
                        }}
                    >
                        {/* Caméra */}
                        <ActionCard
                            icon="camera-outline"
                            label="Caméra"
                            onPress={handleCamera}
                            colors={colors}
                            fonts={fonts}
                            spacing={spacing}
                        />

                        {/* Galerie */}
                        <ActionCard
                            icon="image-outline"
                            label="Galerie"
                            onPress={handleGallery}
                            colors={colors}
                            fonts={fonts}
                            spacing={spacing}
                        />

                        {/* Supprimer — seulement si avatar existant */}
                        {currentUri && (
                            <ActionCard
                                icon="trash-outline"
                                label="Supprimer"
                                onPress={handleRemove}
                                colors={colors}
                                fonts={fonts}
                                spacing={spacing}
                                danger
                            />
                        )}
                    </View>

                    {/* ─── Séparateur ──────────────────────────────── */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: spacing.lg,
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

                    {/* ─── Grille avatars ───────────────────────────── */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        {PRESET_AVATARS.map((avatar) => {
                            const isSelected = currentUri === avatar.uri;

                            return (
                                <TouchableOpacity
                                    key={avatar.id}
                                    onPress={() =>
                                        handleSelectPreset(avatar.uri)
                                    }
                                    style={{
                                        width: AVATAR_SIZE,
                                        height: AVATAR_SIZE,
                                        borderRadius: AVATAR_SIZE / 2,
                                        borderWidth: isSelected ? 3 : 2,
                                        borderColor: isSelected
                                            ? colors.accent
                                            : colors.border,
                                        overflow: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    <Image
                                        source={{ uri: avatar.uri }}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                        }}
                                    />

                                    {/* Badge sélectionné */}
                                    {isSelected && (
                                        <View
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundColor:
                                                    "rgba(0,0,0,0.35)",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={28}
                                                color={colors.accent}
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── ActionCard ───────────────────────────────────────────────────
interface ActionCardProps {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    onPress: () => void;
    colors: any;
    fonts: any;
    spacing: any;
    danger?: boolean;
}

function ActionCard({
    icon,
    label,
    onPress,
    colors,
    fonts,
    spacing,
    danger,
}: ActionCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flex: 1,
                backgroundColor: danger ? `${colors.error}15` : colors.card,
                borderRadius: 16,
                paddingVertical: spacing.md,
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.xs,
                borderWidth: 1,
                borderColor: danger ? `${colors.error}30` : colors.border,
            }}
        >
            <View
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: danger
                        ? `${colors.error}20`
                        : `${colors.accent}15`,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Ionicons
                    name={icon}
                    size={22}
                    color={danger ? colors.error : colors.accent}
                />
            </View>
            <Text
                style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: danger ? colors.error : colors.text,
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}
