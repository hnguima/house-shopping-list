import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, TextField, Box, useTheme } from "@mui/material";
import { styled } from "@mui/system";
import AddIcon from "@mui/icons-material/Add";

const StyledGhostCard = styled(Card)(({ theme }: any) => ({
  marginBottom: theme.spacing(2),
  transition: "all 0.2s ease",
  border: "2px dashed",
  borderColor: theme.palette.divider,
  "&:hover": {
    borderColor: theme.palette.primary.main,
    boxShadow: theme.shadows?.[2] || "0 2px 4px rgba(0,0,0,0.08)",
  },
}));

interface GhostShoppingListCardProps {
  onCreate: (name: string) => Promise<void>;
}

const GhostShoppingListCard: React.FC<GhostShoppingListCardProps> = ({
  onCreate,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateList = async () => {
    if (!newListName.trim() || isCreating) return;

    try {
      setIsCreating(true);
      await onCreate(newListName.trim());
      setNewListName("");
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateList();
    } else if (e.key === "Escape") {
      setNewListName("");
      inputRef.current?.blur();
    }
  };

  return (
    <StyledGhostCard
      sx={{
        backgroundColor: "transparent",
        opacity: newListName ? 1 : 0.7,
      }}
    >
      <CardContent
        sx={{
          padding: 2,
          "&:last-child": {
            paddingBottom: 2,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <AddIcon
            sx={{
              color: theme.palette.text.secondary,
              fontSize: "1.5rem",
            }}
          />
          <TextField
            inputRef={inputRef}
            placeholder={t("createNewList") || "Create new list..."}
            variant="standard"
            fullWidth
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreateList}
            disabled={isCreating}
            sx={{
              "& .MuiInput-underline:before": {
                borderBottom: "1px solid transparent",
              },
              "& .MuiInput-underline:hover:before": {
                borderBottom: `1px solid ${theme.palette.text.secondary}`,
              },
              "& .MuiInput-underline:after": {
                borderBottomColor: theme.palette.primary.main,
              },
              "& .MuiInputBase-input": {
                fontSize: "1.1rem",
                fontWeight: 500,
              },
            }}
          />
        </Box>
      </CardContent>
    </StyledGhostCard>
  );
};

export default GhostShoppingListCard;
