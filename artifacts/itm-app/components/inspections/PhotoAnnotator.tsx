import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";

type Props = {
  photoUrls: string[];
  onAddPhoto: (uri: string) => void;
  onRemovePhoto?: (uri: string) => void;
  disabled?: boolean;
};

export function PhotoAnnotator({ photoUrls, onAddPhoto, onRemovePhoto, disabled }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    if (disabled) return;
    setLoading(true);
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera permission is required to take photos.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          allowsEditing: false,
          allowsMultipleSelection: false,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        onAddPhoto(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to capture image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable
          onPress={() => pickImage(true)}
          disabled={disabled || loading}
          style={[
            styles.captureBtn,
            { backgroundColor: colors.muted, borderColor: colors.border },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Feather name="camera" size={16} color={colors.foreground} />
          <Text style={[styles.captureBtnText, { color: colors.foreground }]}>Camera</Text>
        </Pressable>
        <Pressable
          onPress={() => pickImage(false)}
          disabled={disabled || loading}
          style={[
            styles.captureBtn,
            { backgroundColor: colors.muted, borderColor: colors.border },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Feather name="image" size={16} color={colors.foreground} />
          <Text style={[styles.captureBtnText, { color: colors.foreground }]}>Library</Text>
        </Pressable>
        {loading && <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading…</Text>}
      </View>

      {photoUrls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photoUrls.map((uri, idx) => (
            <View key={`${uri}-${idx}`} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
              {onRemovePhoto && !disabled && (
                <Pressable
                  onPress={() => onRemovePhoto(uri)}
                  style={[styles.removeBtn, { backgroundColor: colors.destructive }]}
                >
                  <Feather name="x" size={10} color="#fff" />
                </Pressable>
              )}
              <View style={[styles.photoBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.photoBadgeText, { color: colors.mutedForeground }]}>
                  {idx + 1}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {photoUrls.length === 0 && (
        <View style={[styles.emptyPhotos, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="camera" size={20} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No photos added</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  captureBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loadingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  photoRow: { gap: 8, paddingBottom: 4 },
  photoWrapper: { position: "relative" },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  photoBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  emptyPhotos: {
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
