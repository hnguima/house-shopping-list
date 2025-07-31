import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Box,
  Typography,
  TextField,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  styled,
} from "@mui/material";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import ProfilePhoto from "../components/ProfilePhoto";
import type { User } from "../types/user";

interface UserProfileScreenProps {
  themeMode: "light" | "dark";
  setThemeMode: (mode: "light" | "dark") => void;
  language: string;
  setLanguage: (lang: string) => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

const Pane = styled(Paper)(({ theme }: any) => ({
  padding: theme.spacing(3),
  margin: theme.spacing(2, 0),
  borderRadius: theme.shape.borderRadius,
}));

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  themeMode,
  setThemeMode,
  language,
  setLanguage,
  user,
  onUserUpdate,
}) => {
  const { t } = useTranslation();

  // Local UI state
  const [editName, setEditName] = useState(user.name || "");
  const [photoLoading, setPhotoLoading] = useState(false);

  // No longer need subscription-based updates with the new simple cache system
  // The new system is more direct and doesn't require complex event handling

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Photo = await base64Promise;

      // Update user photo with new system
      const updatedUser = {
        ...user,
        photo: base64Photo,
        preferences: {
          ...user.preferences,
          theme: themeMode,
          language: language,
        },
      };
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      setPhotoLoading(true);
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        const updatedUser = {
          ...user,
          photo: image.dataUrl,
          preferences: {
            ...user.preferences,
            theme: themeMode, // Use current theme from props
            language: language, // Use current language from props
          },
        };
        onUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleGallerySelect = async () => {
    try {
      setPhotoLoading(true);
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        const updatedUser = {
          ...user,
          photo: image.dataUrl,
          preferences: {
            ...user.preferences,
            theme: themeMode, // Use current theme from props
            language: language, // Use current language from props
          },
        };
        onUserUpdate(updatedUser);
      }
    } catch (error) {
      console.error("Error selecting photo:", error);
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleNameSave = async () => {
    if (editName.trim() === user.name) return; // No change

    console.log("[UserProfile] Saving name change:", {
      old: user.name,
      new: editName,
    });

    try {
      // Update user data with new cache system
      const updatedUser = {
        ...user,
        name: editName.trim(),
        preferences: {
          ...user.preferences,
          theme: themeMode,
          language: language,
        },
      };

      onUserUpdate(updatedUser);

    } catch (error) {
      console.error("Error updating name:", error);
    }
  };

  return (
    <Box sx={{ py: 0, px: 2 }}>
      {/* Profile Photo Section */}
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("personalInfo")}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <ProfilePhoto
            user={user}
            size={100}
            showEditButton={true}
            isLoading={photoLoading}
            onPhotoCapture={handleCameraCapture}
            onPhotoSelect={
              Capacitor.isNativePlatform() ? handleGallerySelect : undefined
            }
          />

          {!Capacitor.isNativePlatform() && (
            <Box sx={{ ml: 3 }}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="photo-upload"
                type="file"
                onChange={handlePhotoUpload}
              />
              <label htmlFor="photo-upload">
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ cursor: "pointer", textDecoration: "underline" }}
                >
                  {t("chooseFromGallery")}
                </Typography>
              </label>
            </Box>
          )}
        </Box>

        <TextField
          fullWidth
          label={t("name")}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameSave}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label={t("email")}
          value={user.email || ""}
          disabled
          sx={{ mb: 2 }}
        />
      </Pane>

      {/* App Settings */}
      <Pane>
        <Typography variant="h6" gutterBottom>
          {t("config")}
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t("language")}</InputLabel>
          <Select
            value={language}
            label={t("language")}
            onChange={(e) => {
              const newLanguage = e.target.value;
              // Update with new system
              setLanguage(newLanguage);

              const updatedUser = {
                ...user,
                preferences: {
                  ...user.preferences,
                  language: newLanguage,
                },
              };
              onUserUpdate(updatedUser);
            }}
          >
            <MenuItem value="en">{t("en")}</MenuItem>
            <MenuItem value="fr">{t("fr")}</MenuItem>
            <MenuItem value="pt">{t("pt")}</MenuItem>
            <MenuItem value="es">{t("es")}</MenuItem>
            <MenuItem value="de">{t("de")}</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={themeMode === "dark"}
              onChange={(e) => {
                const newTheme = e.target.checked
                  ? ("dark" as const)
                  : ("light" as const);
                // Update with new system
                setThemeMode(newTheme);

                const updatedUser = {
                  ...user,
                  preferences: {
                    ...user.preferences,
                    theme: newTheme,
                  },
                };
                onUserUpdate(updatedUser);
              }}
            />
          }
          label={`${t("theme")}: ${t(themeMode)}`}
        />
      </Pane>
    </Box>
  );
};

export default UserProfileScreen;
