import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Home as HomeIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  PersonAdd as InviteIcon,
  ExitToApp as LeaveIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Home } from "../types/home";

interface HomeCardProps {
  home: Home;
  currentUserId?: string;
  onEdit?: (home: Home) => void;
  onInvite?: (home: Home) => void;
  onLeave?: (home: Home) => void;
  onDelete?: (home: Home) => void;
}

const HomeCard: React.FC<HomeCardProps> = ({
  home,
  currentUserId,
  onEdit,
  onInvite,
  onLeave,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isMenuOpen = Boolean(anchorEl);
  const isCreator = currentUserId === home.creator_id;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(home);
  };

  const handleInvite = () => {
    handleMenuClose();
    onInvite?.(home);
  };

  const handleLeave = () => {
    handleMenuClose();
    onLeave?.(home);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete?.(home);
  };

  const handleCopyId = async () => {
    handleMenuClose();
    try {
      await navigator.clipboard.writeText(home._id);
      // You could add a toast notification here if you have one
      console.log("Home ID copied to clipboard:", home._id);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = home._id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <HomeIcon
              sx={{
                mr: 2,
                fontSize: 24,
                color: "primary.main",
              }}
            />
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                {home.name}
              </Typography>
              {home.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {home.description}
                </Typography>
              )}
            </Box>
          </Box>

          <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <PeopleIcon sx={{ mr: 1, fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {home.members?.length || 0} member
              {(home.members?.length || 0) !== 1 ? "s" : ""}
            </Typography>
          </Box>

          {isCreator && (
            <Chip
              label="Creator"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
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
        {isCreator && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Home</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleInvite}>
          <ListItemIcon>
            <InviteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Invite Member</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleCopyId}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Home ID</ListItemText>
        </MenuItem>

        {!isCreator && (
          <MenuItem onClick={handleLeave} sx={{ color: "warning.main" }}>
            <ListItemIcon>
              <LeaveIcon fontSize="small" sx={{ color: "warning.main" }} />
            </ListItemIcon>
            <ListItemText>Leave Home</ListItemText>
          </MenuItem>
        )}

        {isCreator && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText>Delete Home</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default HomeCard;
