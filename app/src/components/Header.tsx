import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import type { User } from "../types/user";
import HomeSelector from "./HomeSelector";

interface HeaderProps {
  title?: string;
  screen: "dashboard" | "profile";
  setScreen: (screen: "dashboard" | "profile") => void;
  user?: User | null;
  selectedHomeId?: string[];
  onHomeChange?: (selectedHomes: string[]) => void;
}

const Header: React.FC<HeaderProps> = ({
  title = "Shopping List",
  screen,
  setScreen,
  user,
  selectedHomeId,
  onHomeChange,
}) => {
  // Debug logging for user photo
  console.log("[Header] User data:", {
    hasUser: !!user,
    userName: user?.name,
    hasPhoto: !!user?.photo,
    photoLength: user?.photo?.length,
    photoPreview: user?.photo?.substring(0, 50) + "...",
  });
  // Styled components
  const StyledAppBar = styled(AppBar)({
    zIndex: 1201,
  });

  const StyledToolbar = styled(Toolbar)(({ theme }: any) => ({
    minHeight: 64,
    paddingLeft: 16,
    paddingRight: 16,
    [theme.breakpoints.down("sm")]: {
      minHeight: 56,
    },
  }));

  const StyledTitle = styled(Typography)(({ theme }: any) => ({
    flexGrow: 1,
    textAlign: "left",
    fontSize: "1.5rem",
    [theme.breakpoints.down("sm")]: {
      textAlign: "center",
      fontSize: "1.25rem",
    },
  }));

  const SafeArea = styled("div")({
    height: "env(safe-area-inset-top, 0px)",
  });

  return (
    <StyledAppBar position="fixed" color="primary">
      <SafeArea />
      <StyledToolbar
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {screen === "profile" && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="back"
              sx={{ mr: 2 }}
              onClick={() => setScreen("dashboard")}
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {/* Home selector on the left side, visible on all screen sizes */}
          {screen === "dashboard" && (
            <Box sx={{ mr: 2 }}>
              <HomeSelector
                value={selectedHomeId}
                onChange={onHomeChange}
                variant="compact"
              />
            </Box>
          )}
        </Box>
        <StyledTitle variant="h5" sx={{ flexGrow: 1, textAlign: "center" }}>
          {title}
        </StyledTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {screen === "dashboard" && (
            <>
              {user && (
                <Box sx={{ ml: 2 }}>
                  <IconButton
                    onClick={() => setScreen("profile")}
                    sx={{ p: 0 }}
                  >
                    <Avatar
                      src={user.photo || undefined}
                      alt={user.name || "User"}
                      sx={{
                        width: 36,
                        height: 36,
                        border: "2px solid #fff",
                      }}
                    >
                      {!user.photo && <PersonIcon />}
                    </Avatar>
                  </IconButton>
                </Box>
              )}
            </>
          )}
        </Box>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default Header;
