"use client";

import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";

interface TopBarProps {
  /** Optional title to display in the app bar. Defaults to "PodCraft". */
  title?: string;
}

/**
 * TopBar component renders the main navigation bar for the application.
 * It includes the app logo, title, and basic navigation buttons.
 */
export default function TopBar({ title = "PodCraft" }: TopBarProps) {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="home"
            href="/"
            sx={{ mr: 2 }}
          >
            <HomeIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Button color="inherit" href="/login">
            登录
          </Button>
          <Button color="inherit" href="/podcasts">
            我的播客
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
