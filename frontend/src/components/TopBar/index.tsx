"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { label: "声音工坊", href: "/voices", icon: <RecordVoiceOverIcon fontSize="small" /> },
  { label: "我的播客", href: "/podcasts", icon: <PodcastsIcon fontSize="small" /> },
];

export default function TopBar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user, credits, logout } = useAuth();
  const router = useRouter();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    router.push("/");
  };

  const displayName = user?.nickname || user?.email || "用户";

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
          bgcolor: "rgba(255,255,255,0.9)",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Badge + Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            component={Link}
            href="/"
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              bgcolor: "var(--brand)",
              display: "inline-grid",
              placeItems: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18l6-12 6 12M8.5 13h7" />
            </svg>
          </Box>
          <Typography
            variant="subtitle1"
            component={Link}
            href="/"
            sx={{ fontWeight: 700, fontSize: "18px", color: "var(--text)", textDecoration: "none", letterSpacing: "-0.02em" }}
          >
            PodCraft
          </Typography>
        </Box>

        {/* Center: Nav Items (desktop) */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              component={Link}
              href={item.href}
              startIcon={item.icon}
              sx={{
                color: "var(--text-muted)",
                fontSize: "14px",
                fontWeight: 500,
                textTransform: "none",
                borderRadius: "8px",
                px: 2,
                py: 1,
                minHeight: "44px", // 最小触摸目标
                border: "1px solid transparent",
                "&:hover": { bgcolor: "#f5f5f5", color: "var(--brand)", borderColor: "#d1d5db" },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Right: Credits + Login/User */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {user ? (
            <>
              <Chip
                label={credits ? `${credits.available} 积分` : "加载中..."}
                size="small"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  bgcolor: "var(--success-light)",
                  color: "var(--success)",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "var(--success-light)", opacity: 0.8 },
                }}
                onClick={() => router.push("/credits")}
              />
              <Button
                onClick={handleMenuOpen}
                sx={{
                  textTransform: "none",
                  color: "var(--text)",
                  fontWeight: 500,
                  borderRadius: "8px",
                  gap: 1,
                  minHeight: "44px", // 最小触摸目标
                  px: 1,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: "var(--brand)" }}>
                  {displayName[0]?.toUpperCase()}
                </Avatar>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  {displayName}
                </Box>
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  退出登录
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                component={Link}
                href="/login"
                sx={{
                  color: "var(--text-muted)",
                  fontSize: "14px",
                  fontWeight: 500,
                  textTransform: "none",
                  minHeight: "44px", // 最小触摸目标
                  "&:hover": { color: "var(--brand)" },
                }}
              >
                登录
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="success"
                size="small"
                sx={{ 
                  borderRadius: "8px", 
                  textTransform: "none",
                  minHeight: "44px", // 最小触摸目标
                }}
              >
                注册
              </Button>
            </>
          )}
          <IconButton
            sx={{ 
              display: { md: "none" }, 
              color: "var(--text)",
              width: 44,
              height: 44, // 最小触摸目标
            }}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 250 }} role="presentation" onClick={() => setMobileOpen(false)}>
          <List>
            <ListItem>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--brand)" }}>PodCraft</Typography>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/"><ListItemText primary="首页" /></ListItemButton>
            </ListItem>
            {NAV_ITEMS.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton component={Link} href={item.href}><ListItemText primary={item.label} /></ListItemButton>
              </ListItem>
            ))}
            <Divider />
            {user ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={handleLogout}><ListItemText primary="退出登录" /></ListItemButton>
                </ListItem>
              </>
            ) : (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/login"><ListItemText primary="登录" /></ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component={Link} href="/register"><ListItemText primary="注册" /></ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
