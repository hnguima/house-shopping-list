import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import {
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  RemoveCircle as RemoveIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Home, HomeMember } from "../types/home";

interface HomeMembersListProps {
  home: Home;
  members: HomeMember[];
  currentUserId?: string;
  onRemoveMember?: (memberId: string) => void;
  loading?: boolean;
}

const HomeMembersList: React.FC<HomeMembersListProps> = ({
  home,
  members,
  currentUserId,
  onRemoveMember,
  loading = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const isCreator = currentUserId === home.creator_id;
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    memberId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedMemberId(memberId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMemberId(null);
  };

  const handleRemoveMember = () => {
    if (selectedMemberId) {
      onRemoveMember?.(selectedMemberId);
    }
    handleMenuClose();
  };

  if (!members || members.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <PersonIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          No members yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{ px: 1, fontWeight: 600 }}
      >
        Members ({members.length})
      </Typography>

      <List disablePadding>
        {members.map((member) => (
          <ListItem
            key={member._id}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <ListItemAvatar>
              <Avatar
                src={member.photo || undefined}
                alt={member.name}
                sx={{ width: 40, height: 40 }}
              >
                {!member.photo && <PersonIcon />}
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body1">{member.name}</Typography>
                  {member._id === home.creator_id && (
                    <Chip
                      label="Creator"
                      size="small"
                      color="primary"
                      variant="outlined"
                      icon={<AdminIcon sx={{ fontSize: 16 }} />}
                    />
                  )}
                  {member._id === currentUserId && (
                    <Chip
                      label="You"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
              secondary={member.email}
            />

            {isCreator && member._id !== home.creator_id && (
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => handleMenuOpen(e, member._id)}
                  disabled={loading}
                >
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

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
        <MenuItem
          onClick={handleRemoveMember}
          sx={{ color: "error.main" }}
          disabled={loading}
        >
          <ListItemIcon>
            <RemoveIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          Remove Member
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HomeMembersList;
