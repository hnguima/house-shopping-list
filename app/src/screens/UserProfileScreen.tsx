import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Box,
  Alert,
  Snackbar,
  Typography,
  TextField,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
} from "@mui/material";
import { styled } from "@mui/material";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import ProfilePhoto from "../components/ProfilePhoto";
import type { User } from "../types/user";
import { UserStorageManager } from "../utils/userStorageManager";
import { useAutoSync } from "../hooks/useAutoSync";

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

  // Enable auto-sync and local update marking
  useAutoSync("profile");

  const [editName, setEditName] = useState(user.name || "");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Photo must be smaller than 5MB",
        severity: "error",
      });
      return;
    }

    setPhotoLoading(true);
    try {
      // Use UserStorageManager to handle base64 conversion and storage
      await UserStorageManager.updateUserPhoto(file);

      // Get the updated user data
      const updatedUser = await UserStorageManager.getUser();
      if (updatedUser) {
        onUserUpdate(updatedUser);
      }

      setSnackbar({
        open: true,
        message: "Photo updated successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      setSnackbar({
        open: true,
        message: "Failed to update photo",
        severity: "error",
      });
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

        setSnackbar({
          open: true,
          message: "Photo captured successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      setSnackbar({
        open: true,
        message: "Failed to capture photo",
        severity: "error",
      });
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

        setSnackbar({
          open: true,
          message: "Photo selected successfully",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error selecting photo:", error);
      setSnackbar({
        open: true,
        message: "Failed to select photo",
        severity: "error",
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleNameSave = async () => {
    console.log("[UserProfile] Saving name change:", {
      old: user.name,
      new: editName,
    });

    // Create updated user with current name AND current preferences from props
    const updatedUser = {
      ...user,
      name: editName,
      preferences: {
        ...user.preferences,
        theme: themeMode, // Use current theme from props
        language: language, // Use current language from props
      },
    };

    // Update the UI state and save to storage (this automatically updates timestamp)
    onUserUpdate(updatedUser);

    setSnackbar({
      open: true,
      message: "Name updated successfully",
      severity: "success",
    });
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
            onChange={(e) => setLanguage(e.target.value)}
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
              onChange={(e) =>
                setThemeMode(e.target.checked ? "dark" : "light")
              }
            />
          }
          label={`${t("theme")}: ${t(themeMode)}`}
        />
      </Pane>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfileScreen;
