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
  Button,
  Divider,
} from "@mui/material";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import ProfilePhoto from "../components/ProfilePhoto";
import HomeCard from "../components/HomeCard";
import HomeInvitationCard from "../components/HomeInvitationCard";
import CreateHomeDialog from "../components/dialogs/CreateHomeDialog";
import InviteUserDialog from "../components/dialogs/InviteUserDialog";
import JoinHomeDialog from "../components/dialogs/JoinHomeDialog";
import EditHomeDialog from "../components/dialogs/EditHomeDialog";
import { useHomes } from "../hooks/useHomes";
import type { User } from "../types/user";
import type { Home, HomeInvitation } from "../types/home";

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

  // Homes management state
  const {
    homes,
    invitations,
    loading: homesLoading,
    createHome,
    updateHome,
    deleteHome,
    inviteToHome,
    requestJoinHome,
    respondToInvitation,
    leaveHome,
  } = useHomes();
  const [createHomeOpen, setCreateHomeOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [joinHomeOpen, setJoinHomeOpen] = useState(false);
  const [editHomeOpen, setEditHomeOpen] = useState(false);
  const [selectedHomeForInvite, setSelectedHomeForInvite] =
    useState<Home | null>(null);
  const [selectedHomeForEdit, setSelectedHomeForEdit] = useState<Home | null>(
    null
  );

  // Handle home management actions
  const handleCreateHome = async (name: string, description?: string) => {
    return (await createHome(name, description)) !== null;
  };

  const handleInviteUser = async (email: string, message?: string) => {
    if (selectedHomeForInvite) {
      return await inviteToHome(selectedHomeForInvite._id, email, message);
    }
    return false;
  };

  const handleAcceptInvitation = (invitation: HomeInvitation) => {
    respondToInvitation(invitation._id, true);
  };

  const handleDeclineInvitation = (invitation: HomeInvitation) => {
    respondToInvitation(invitation._id, false);
  };

  const handleLeaveHome = (home: Home) => {
    leaveHome(home._id);
  };

  const handleInviteToHome = (home: Home) => {
    setSelectedHomeForInvite(home);
    setInviteUserOpen(true);
  };

  const handleJoinHome = async (homeId: string, message?: string) => {
    return await requestJoinHome(homeId, message);
  };

  const handleEditHome = (home: Home) => {
    setSelectedHomeForEdit(home);
    setEditHomeOpen(true);
  };

  const handleUpdateHome = async (name: string, description?: string) => {
    if (selectedHomeForEdit) {
      return await updateHome(selectedHomeForEdit._id, name, description);
    }
    return false;
  };

  const handleDeleteHome = async (home: Home) => {
    // Add confirmation dialog logic here if needed
    if (
      window.confirm(
        `Are you sure you want to delete "${home.name}"? This action cannot be undone.`
      )
    ) {
      await deleteHome(home._id);
    }
  };

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

      {/* Homes Management Section */}
      <Pane>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">{t("homes", "My Homes")}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setJoinHomeOpen(true)}
            >
              {t("joinHome", "Join Home")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCreateHomeOpen(true)}
            >
              {t("createHome", "Create Home")}
            </Button>
          </Box>
        </Box>

        {homesLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("loading", "Loading...")}
            </Typography>
          </Box>
        ) : (
          <>
            {/* User's Homes */}
            {homes.length > 0 ? (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {t("myHomes", "My Homes")}
                </Typography>
                {homes.map((home) => (
                  <HomeCard
                    key={home._id}
                    home={home}
                    currentUserId={user.id}
                    onEdit={() => handleEditHome(home)}
                    onInvite={() => handleInviteToHome(home)}
                    onLeave={() => handleLeaveHome(home)}
                    onDelete={() => handleDeleteHome(home)}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {t("noHomes", "You haven't joined any homes yet.")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(
                    "createOrJoinHome",
                    "Create a new home or wait for an invitation."
                  )}
                </Typography>
              </Box>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {t("pendingInvitations", "Pending Invitations")}
                </Typography>
                {invitations.map((invitation) => (
                  <HomeInvitationCard
                    key={invitation._id}
                    invitation={invitation}
                    onAccept={() => handleAcceptInvitation(invitation)}
                    onReject={() => handleDeclineInvitation(invitation)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Pane>

      {/* Dialogs */}
      <CreateHomeDialog
        open={createHomeOpen}
        onClose={() => setCreateHomeOpen(false)}
        onCreate={handleCreateHome}
      />

      <InviteUserDialog
        open={inviteUserOpen}
        onClose={() => {
          setInviteUserOpen(false);
          setSelectedHomeForInvite(null);
        }}
        onInvite={handleInviteUser}
        home={selectedHomeForInvite || undefined}
      />

      <JoinHomeDialog
        open={joinHomeOpen}
        onClose={() => setJoinHomeOpen(false)}
        onJoin={handleJoinHome}
      />

      <EditHomeDialog
        open={editHomeOpen}
        onClose={() => {
          setEditHomeOpen(false);
          setSelectedHomeForEdit(null);
        }}
        onEdit={handleUpdateHome}
        home={selectedHomeForEdit || undefined}
      />
    </Box>
  );
};

export default UserProfileScreen;
