import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  CircularProgress,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PersonIcon from "@mui/icons-material/Person";
import { Capacitor } from "@capacitor/core";

import type { User } from "../types/user";

const PhotoContainer = styled(Box)(() => ({
  position: "relative",
  display: "inline-block",
}));

const LoadingOverlay = styled(Box)(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  zIndex: 1,
}));

const PhotoIconButton = styled(IconButton)(({ theme }: any) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  width: 32,
  height: 32,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

interface ProfilePhotoProps {
  user: User;
  size?: number;
  showEditButton?: boolean;
  isLoading?: boolean;
  onPhotoCapture?: () => void;
  onPhotoSelect?: () => void;
}

const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  user,
  size = 80,
  showEditButton = false,
  isLoading = false,
  onPhotoCapture,
  onPhotoSelect,
}) => {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handlePhotoCapture = () => {
    handleMenuClose();
    onPhotoCapture?.();
  };

  const handlePhotoSelect = () => {
    handleMenuClose();
    onPhotoSelect?.();
  };

  return (
    <PhotoContainer>
      <Avatar
        src={user.photo}
        alt={user.name || "User"}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.4,
        }}
      >
        {!user.photo && <PersonIcon sx={{ fontSize: size * 0.6 }} />}
      </Avatar>

      {isLoading && (
        <LoadingOverlay>
          <CircularProgress size={size * 0.4} color="primary" />
        </LoadingOverlay>
      )}

      {showEditButton && (
        <>
          <PhotoIconButton onClick={handleMenuClick}>
            <PhotoCameraIcon fontSize="small" />
          </PhotoIconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            {Capacitor.isNativePlatform() && (
              <MenuItem onClick={handlePhotoCapture}>
                <ListItemIcon>
                  <PhotoCameraIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("takePhoto")}</ListItemText>
              </MenuItem>
            )}
            <MenuItem onClick={handlePhotoSelect}>
              <ListItemIcon>
                <PhotoLibraryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {Capacitor.isNativePlatform()
                  ? t("selectFromPhotos")
                  : t("chooseFromGallery")}
              </ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
    </PhotoContainer>
  );
};

export default ProfilePhoto;
