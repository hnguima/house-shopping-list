import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
} from "@mui/material";
import {
  Home as HomeIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import type { HomeInvitation } from "../types/home";

interface HomeInvitationCardProps {
  invitation: HomeInvitation;
  onAccept?: (invitation: HomeInvitation) => void;
  onReject?: (invitation: HomeInvitation) => void;
  loading?: boolean;
}

const HomeInvitationCard: React.FC<HomeInvitationCardProps> = ({
  invitation,
  onAccept,
  onReject,
  loading = false,
}) => {
  const isInvite = invitation.type === "invite";
  const isRequest = invitation.type === "request";

  const getStatusColor = () => {
    switch (invitation.status) {
      case "accepted":
        return "success";
      case "rejected":
        return "error";
      default:
        return "warning";
    }
  };

  const getStatusText = () => {
    if (invitation.status === "pending") {
      return isInvite ? "Invitation" : "Request";
    }
    return (
      invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      sx={{
        mb: 2,
        opacity: invitation.status === "pending" ? 1 : 0.7,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: invitation.status === "pending" ? 3 : 1,
          transform:
            invitation.status === "pending" ? "translateY(-1px)" : "none",
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <HomeIcon
            sx={{
              mr: 2,
              fontSize: 24,
              color: "primary.main",
            }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h6" component="h3">
                {invitation.home?.name || "Unknown Home"}
              </Typography>
              <Chip
                label={getStatusText()}
                size="small"
                color={getStatusColor()}
                variant="outlined"
              />
            </Box>

            {invitation.home?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {invitation.home.description}
              </Typography>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              {isInvite && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <PersonIcon
                    sx={{ mr: 1, fontSize: 16, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    From: {invitation.from_user?.name || "Unknown User"}
                  </Typography>
                </Box>
              )}

              {isRequest && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <EmailIcon
                    sx={{ mr: 1, fontSize: 16, color: "text.secondary" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    To: {invitation.to_user_email}
                  </Typography>
                </Box>
              )}
            </Box>

            {invitation.message && (
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  p: 1,
                  backgroundColor: "action.hover",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                "{invitation.message}"
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary">
              {formatDate(new Date(invitation.createdAt).toISOString())}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      {invitation.status === "pending" && (onAccept || onReject) && (
        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {onAccept && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => onAccept(invitation)}
                disabled={loading}
              >
                {isInvite ? "Accept" : "Approve"}
              </Button>
            )}
            {onReject && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => onReject(invitation)}
                disabled={loading}
              >
                {isInvite ? "Decline" : "Reject"}
              </Button>
            )}
          </Box>
        </CardActions>
      )}
    </Card>
  );
};

export default HomeInvitationCard;
