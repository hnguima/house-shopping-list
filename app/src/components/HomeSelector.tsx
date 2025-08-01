import React, { useState } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Popover,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Home as HomeIcon,
  PersonalVideo as PersonalIcon,
  Apps as AllIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useHomes } from "../hooks/useHomes";

interface HomeSelectorProps {
  value?: string[]; // Array of selected home IDs, special values: 'all', 'personal'
  onChange?: (selectedHomes: string[]) => void;
  variant?: "compact" | "full";
}

const HomeSelector: React.FC<HomeSelectorProps> = ({
  value = ["all"],
  onChange,
  variant = "full",
}) => {
  const { homes, loading } = useHomes();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Debug logging
  console.log("[HomeSelector] Debug info:", {
    homesCount: homes.length,
    homes: homes,
    loading,
    value,
    variant,
    hasHomesData: homes && homes.length > 0,
    firstHome: homes[0],
  });

  // Additional debug for useHomes hook
  React.useEffect(() => {
    console.log("[HomeSelector] useHomes result changed:", {
      loading,
      homesCount: homes.length,
      homeIds: homes.map((h) => h._id),
      homeNames: homes.map((h) => h.name),
    });
  }, [homes, loading]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const selectedValues = event.target.value as string[];

    // Handle "all" selection logic
    if (selectedValues.includes("all")) {
      // If "all" is selected, only keep "all"
      onChange?.(["all"]);
    } else if (selectedValues.length === 0) {
      // If nothing is selected, default to "all"
      onChange?.(["all"]);
    } else {
      onChange?.(selectedValues);
    }
  };

  const handleCompactClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCompactClose = () => {
    setAnchorEl(null);
  };

  const renderMenuItems = () => [
    <MenuItem key="all" value="all">
      <Checkbox checked={value.includes("all")} />
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <AllIcon sx={{ mr: 1, fontSize: 18 }} />
            All Lists
          </Box>
        }
      />
    </MenuItem>,
    <MenuItem key="personal" value="personal">
      <Checkbox checked={value.includes("personal")} />
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <PersonalIcon sx={{ mr: 1, fontSize: 18 }} />
            My Lists
          </Box>
        }
      />
    </MenuItem>,
    ...homes.map((home) => (
      <MenuItem key={home._id} value={home._id}>
        <Checkbox checked={value.includes(home._id)} />
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <HomeIcon sx={{ mr: 1, fontSize: 18 }} />
              {home.name}
            </Box>
          }
        />
      </MenuItem>
    )),
  ];

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: variant === "compact" ? 120 : 200,
        }}
      >
        <CircularProgress size={16} sx={{ mr: 1 }} />
        <Typography variant="body2">Loading...</Typography>
      </Box>
    );
  }

  if (variant === "compact") {
    // Compact chip display for header with popover
    return (
      <>
        <IconButton
          onClick={handleCompactClick}
          sx={{
            color: "inherit",
          }}
        >
          <FilterIcon />
        </IconButton>

        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleCompactClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                minWidth: 200,
                maxHeight: 400,
                overflow: "visible",
              },
            },
          }}
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, px: 1 }}>
              Filter Lists
            </Typography>

            {/* All Lists Option */}
            <Box
              onClick={() => onChange?.(["all"])}
              sx={{
                display: "flex",
                alignItems: "center",
                padding: 1,
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Checkbox checked={value.includes("all")} />
              <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                <AllIcon sx={{ mr: 1, fontSize: 18 }} />
                All Lists
              </Box>
            </Box>

            {/* Personal Lists Option */}
            <Box
              onClick={() => {
                const currentSelection = [...value];
                if (currentSelection.includes("personal")) {
                  const newSelection = currentSelection.filter(
                    (v) => v !== "personal"
                  );
                  onChange?.(newSelection.length > 0 ? newSelection : ["all"]);
                } else {
                  const filteredSelection = currentSelection.filter(
                    (v) => v !== "all"
                  );
                  onChange?.([...filteredSelection, "personal"]);
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                padding: 1,
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              <Checkbox checked={value.includes("personal")} />
              <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                <PersonalIcon sx={{ mr: 1, fontSize: 18 }} />
                My Lists
              </Box>
            </Box>

            {/* Home Options */}
            {homes.map((home) => (
              <Box
                key={home._id}
                onClick={() => {
                  const currentSelection = [...value];
                  if (currentSelection.includes(home._id)) {
                    const newSelection = currentSelection.filter(
                      (v) => v !== home._id
                    );
                    onChange?.(
                      newSelection.length > 0 ? newSelection : ["all"]
                    );
                  } else {
                    const filteredSelection = currentSelection.filter(
                      (v) => v !== "all"
                    );
                    onChange?.([...filteredSelection, home._id]);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  padding: 1,
                  cursor: "pointer",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Checkbox checked={value.includes(home._id)} />
                <Box sx={{ display: "flex", alignItems: "center", ml: 1 }}>
                  <HomeIcon sx={{ mr: 1, fontSize: 18 }} />
                  {home.name}
                </Box>
              </Box>
            ))}
          </Box>
        </Popover>
      </>
    );
  }

  // Full display for mobile screens
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <Select
        multiple
        value={value}
        onChange={handleChange}
        displayEmpty
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((selectedValue) => {
              if (selectedValue === "all") {
                return (
                  <Chip
                    key="all"
                    icon={<AllIcon sx={{ fontSize: 14 }} />}
                    label="All Lists"
                    size="small"
                  />
                );
              }
              if (selectedValue === "personal") {
                return (
                  <Chip
                    key="personal"
                    icon={<PersonalIcon sx={{ fontSize: 14 }} />}
                    label="My Lists"
                    size="small"
                  />
                );
              }
              const home = homes.find((h) => h._id === selectedValue);
              return (
                <Chip
                  key={selectedValue}
                  icon={<HomeIcon sx={{ fontSize: 14 }} />}
                  label={home?.name || "Unknown"}
                  size="small"
                />
              );
            })}
          </Box>
        )}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 400,
            },
          },
        }}
      >
        {renderMenuItems()}
      </Select>
    </FormControl>
  );
};

export default HomeSelector;
