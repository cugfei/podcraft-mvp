import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "var(--panel)",
        borderTop: "1px solid var(--line)",
        py: { xs: 3, md: 5 },
        px: { xs: 2, sm: 3 },
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: { xs: "12px", sm: "14px" },
      }}
    >
      <Typography variant="body2">
        &copy; {new Date().getFullYear()} PodCraft. All rights reserved.
        {" | "}
        <Link href="#" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 500 }}>
          隐私政策
        </Link>
        {" | "}
        <Link href="#" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 500 }}>
          服务条款
        </Link>
      </Typography>
    </Box>
  );
}
