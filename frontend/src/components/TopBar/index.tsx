"use client";

import * as React from "react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import HomeIcon from "@mui/icons-material/Home";
import MenuIcon from "@mui/icons-material/Menu";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

interface TopBarProps {
  title?: string;
}

const NAV_ITEMS = [
  { label: "声音工坊", href: "/voices", icon: <RecordVoiceOverIcon /> },
  { label: "我的播客", href: "/podcasts", icon: <PodcastsIcon /> },
];

export default function TopBar({ title = "PodCraft" }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleMobile = () => setMobileOpen((prev) => !prev);

  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={1} sx={{ zIndex: 1200 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Left: Logo + Desktop Nav */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <IconButton
              edge="start"
              color="primary"
              aria-label="home"
              component={Link}
              href="/"
              sx={{ mr: 1 }}
            >
              <HomeIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              href="/"
              sx={{
                textDecoration: "none",
                color: "primary.main",
                fontWeight: 700,
                display: { xs: "none", sm: "block" },
              }}
            >
              {title}
            </Typography>

            {/* Desktop nav links */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.href}
                  color="inherit"
                  component={Link}
                  href={item.href}
                  startIcon={item.icon}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Right: Credits + Login */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label="500 积分"
              color="success"
              size="small"
              variant="outlined"
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            />
            <Button
              size="small"
              variant="text"
              component={Link}
              href="/login"
              startIcon={<AccountCircleIcon />}
            >
              登录
            </Button>

            {/* Mobile menu toggle */}
            <IconButton
              color="inherit"
              aria-label="open menu"
              edge="end"
              onClick={toggleMobile}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={toggleMobile}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleMobile}>
          <List>
            <ListItem>
              <Typography variant="h6" color="primary" fontWeight={700}>
                {title}
              </Typography>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/">
                <ListItemText primary="首页" />
              </ListItemButton>
            </ListItem>
            {NAV_ITEMS.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton component={Link} href={item.href}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider />
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/login">
                <ListItemText primary="登录" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/register">
                <ListItemText primary="注册" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
