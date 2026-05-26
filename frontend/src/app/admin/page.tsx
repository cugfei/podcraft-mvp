"use client";

import * as React from "react";
import {
  Container, Typography, Box, Grid, Card, CardContent,
  TextField, Button, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Stack, Tooltip, Paper, InputAdornment,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TaskIcon from "@mui/icons-material/Task";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SettingsVoiceIcon from "@mui/icons-material/SettingsVoice";
import RouterIcon from "@mui/icons-material/Router";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

import {
  listAdminUsers, disableUser, enableUser, adjustCredit,
  getCreditLedger,
  listAdminPodcasts, deletePodcastAdmin,
  listSynthesisTasksAdmin,
  listAllVoices, createVoice, updateVoice, deleteVoice,
  getProviderConfig, updateProviderConfig,
  listPlans, createPlan, updatePlan, deletePlan,
  AdminUser, CreditTx, AdminPodcast, AdminTask, AdminVoice, ProviderConfig, Plan,
} from "@/lib/api";

type ModuleKey =
  | "users" | "credits" | "podcasts" | "tasks"
  | "errors" | "voices" | "providers" | "plans";

const MODULES: { key: ModuleKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "users", label: "用户管理", desc: "查看用户列表、积分调整、状态管理", icon: <PeopleIcon fontSize="large" /> },
  { key: "credits", label: "积分流水", desc: "查看所有积分变动记录", icon: <AccountBalanceWalletIcon fontSize="large" /> },
  { key: "podcasts", label: "播客项目", desc: "查看所有播客项目及状态", icon: <PodcastsIcon fontSize="large" /> },
  { key: "tasks", label: "合成任务", desc: "查看任务队列、成功率、耗时", icon: <TaskIcon fontSize="large" /> },
  { key: "errors", label: "错误日志", desc: "查看 Provider 错误、系统异常", icon: <ErrorOutlineIcon fontSize="large" /> },
  { key: "voices", label: "音色配置", desc: "管理预设音色、克隆音色", icon: <SettingsVoiceIcon fontSize="large" /> },
  { key: "providers", label: "Provider 配置", desc: "配置 TTS Provider、降级策略", icon: <RouterIcon fontSize="large" /> },
  { key: "plans", label: "套餐配置", desc: "管理定价套餐、积分额度", icon: <LocalOfferIcon fontSize="large" /> },
];

export default function AdminPage() {
  const [activeModule, setActiveModule] = React.useState<ModuleKey | null>(null);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const showMsg = (msg: string, sev: "success" | "error" = "success") =>
    setSnackbar({ open: true, message: msg, severity: sev });

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        管理后台
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        PodCraft 运营数据概览与管理入口
      </Typography>

      {!activeModule && (
        <>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            管理模块
          </Typography>
          <Grid container spacing={2}>
            {MODULES.map((m) => (
              <Grid item xs={12} sm={6} md={3} key={m.key}>
                <Card
                  variant="outlined"
                  sx={{ height: "100%", cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
                  onClick={() => setActiveModule(m.key)}
                >
                  <CardContent sx={{ textAlign: "center" }}>
                    <Box sx={{ color: "primary.main", mb: 1 }}>{m.icon}</Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>{m.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {activeModule && (
        <Box>
          <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
            <IconButton onClick={() => setActiveModule(null)} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              {MODULES.find((m) => m.key === activeModule)?.label}
            </Typography>
          </Stack>

          {activeModule === "users" && (
            <UserManagementModule showMsg={showMsg} />
          )}
          {activeModule === "credits" && (
            <CreditLedgerModule showMsg={showMsg} />
          )}
          {activeModule === "podcasts" && (
            <PodcastManagementModule showMsg={showMsg} />
          )}
          {activeModule === "tasks" && (
            <SynthesisTasksModule showMsg={showMsg} />
          )}
          {activeModule === "errors" && (
            <ErrorLogsModule />
          )}
          {activeModule === "voices" && (
            <VoiceConfigModule showMsg={showMsg} />
          )}
          {activeModule === "providers" && (
            <ProviderConfigModule showMsg={showMsg} />
          )}
          {activeModule === "plans" && (
            <PlanConfigModule showMsg={showMsg} />
          )}
        </Box>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

// ---------------------------------------------------------------------------
// 1. 用户管理
// ---------------------------------------------------------------------------
function UserManagementModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [adjustDialog, setAdjustDialog] = React.useState<{ open: boolean; user: AdminUser | null }>({ open: false, user: null });
  const [adjustAmount, setAdjustAmount] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("admin_adjust");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers(q, "", page * rowsPerPage, rowsPerPage);
      setUsers(res.items);
    } catch {
      showMsg("加载用户列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [page, rowsPerPage]);

  const handleSearch = () => { setPage(0); load(); };

  const handleDisable = async (u: AdminUser) => {
    try {
      await disableUser(u.id);
      showMsg(`已禁用用户 ${u.email || u.nickname}`);
      load();
    } catch {
      showMsg("操作失败", "error");
    }
  };

  const handleEnable = async (u: AdminUser) => {
    try {
      await enableUser(u.id);
      showMsg(`已启用用户 ${u.email || u.nickname}`);
      load();
    } catch {
      showMsg("操作失败", "error");
    }
  };

  const handleAdjust = async () => {
    if (!adjustDialog.user || !adjustAmount) return;
    try {
      await adjustCredit(adjustDialog.user.id, Number(adjustAmount), adjustReason);
      showMsg(`已调整积分 ${adjustAmount}`);
      setAdjustDialog({ open: false, user: null });
      setAdjustAmount("");
      load();
    } catch {
      showMsg("积分调整失败", "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="搜索邮箱/昵称"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" /> }}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" onClick={handleSearch}>搜索</Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>邮箱</TableCell>
              <TableCell>昵称</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>积分</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.nickname}</TableCell>
                <TableCell><Chip label={u.role} size="small" color={u.role === "admin" ? "error" : "default"} /></TableCell>
                <TableCell><Chip label={u.status} size="small" color={u.status === "active" ? "success" : "warning"} /></TableCell>
                <TableCell>{u.credit_balance}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {u.status === "active" ? (
                      <Button size="small" color="warning" onClick={() => handleDisable(u)}>禁用</Button>
                    ) : (
                      <Button size="small" color="success" onClick={() => handleEnable(u)}>启用</Button>
                    )}
                    <Button size="small" onClick={() => setAdjustDialog({ open: true, user: u })}>调积分</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={-1}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
      />

      {/* 积分调整弹窗 */}
      <Dialog open={adjustDialog.open} onClose={() => setAdjustDialog({ open: false, user: null })}>
        <DialogTitle>调整积分 — {adjustDialog.user?.email}</DialogTitle>
        <DialogContent>
          <TextField
            label="调整数量（正=赠送，负=扣除）"
            type="number"
            fullWidth
            sx={{ mt: 2 }}
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
          <TextField
            label="原因"
            fullWidth
            sx={{ mt: 2 }}
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog({ open: false, user: null })}>取消</Button>
          <Button variant="contained" onClick={handleAdjust}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 2. 积分流水
// ---------------------------------------------------------------------------
function CreditLedgerModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [txs, setTxs] = React.useState<CreditTx[]>([]);
  const [userId, setUserId] = React.useState("");
  const [txType, setTxType] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCreditLedger(userId, txType, page * rowsPerPage, rowsPerPage);
      setTxs(res.items);
    } catch {
      showMsg("加载积分流水失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [page, rowsPerPage]);

  const handleFilter = () => { setPage(0); load(); };

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField size="small" label="用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} sx={{ width: 200 }} />
        <FormControl size="small" sx={{ width: 150 }}>
          <InputLabel>类型</InputLabel>
          <Select value={txType} label="类型" onChange={(e) => setTxType(e.target.value)}>
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="grant">赠送</MenuItem>
            <MenuItem value="deduct">扣除</MenuItem>
            <MenuItem value="freeze">冻结</MenuItem>
            <MenuItem value="refund">退回</MenuItem>
            <MenuItem value="admin_adjust">管理员调整</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleFilter}>筛选</Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>用户 ID</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>数量</TableCell>
              <TableCell>余额</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txs.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell sx={{ fontSize: "0.75rem" }}>{tx.id.slice(0, 8)}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{tx.user_id.slice(0, 8)}</TableCell>
                <TableCell><Chip label={tx.type} size="small" /></TableCell>
                <TableCell color={tx.amount > 0 ? "success.main" : "error.main"}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </TableCell>
                <TableCell>{tx.balance_after}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{tx.created_at ? new Date(tx.created_at).toLocaleString() : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div" count={-1} page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 3. 播客项目管理
// ---------------------------------------------------------------------------
function PodcastManagementModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [podcasts, setPodcasts] = React.useState<AdminPodcast[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [deleteDialog, setDeleteDialog] = React.useState<{ open: boolean; pod: AdminPodcast | null }>({ open: false, pod: null });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAdminPodcasts("", page * rowsPerPage, rowsPerPage);
      setPodcasts(res.items);
    } catch {
      showMsg("加载播客列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [page, rowsPerPage]);

  const handleDelete = async () => {
    if (!deleteDialog.pod) return;
    try {
      await deletePodcastAdmin(deleteDialog.pod.id);
      showMsg(`已删除播客 ${deleteDialog.pod.title}`);
      setDeleteDialog({ open: false, pod: null });
      load();
    } catch {
      showMsg("删除失败", "error");
    }
  };

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>标题</TableCell>
              <TableCell>模式</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>时长(秒)</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {podcasts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.title || "(无标题)"}</TableCell>
                <TableCell><Chip label={p.mode} size="small" /></TableCell>
                <TableCell><Chip label={p.status} size="small" color={p.status === "completed" ? "success" : "default"} /></TableCell>
                <TableCell>{p.target_duration}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{p.created_at ? new Date(p.created_at).toLocaleString() : ""}</TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, pod: p })}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div" count={-1} page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
      />

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, pod: null })}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除播客「{deleteDialog.pod?.title}」吗？此操作不可恢复。
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, pod: null })}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 4. 合成任务管理
// ---------------------------------------------------------------------------
function SynthesisTasksModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [tasks, setTasks] = React.useState<AdminTask[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listSynthesisTasksAdmin("", "", page * rowsPerPage, rowsPerPage);
      setTasks(res.items);
    } catch {
      showMsg("加载任务列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, [page, rowsPerPage]);

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>项目 ID</TableCell>
              <TableCell>用户 ID</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>进度</TableCell>
              <TableCell>错误</TableCell>
              <TableCell>创建时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ fontSize: "0.75rem" }}>{t.id.slice(0, 8)}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{t.project_id.slice(0, 8)}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{t.user_id.slice(0, 8)}</TableCell>
                <TableCell><Chip label={t.type} size="small" /></TableCell>
                <TableCell><Chip label={t.status} size="small" color={t.status === "completed" ? "success" : t.status === "failed" ? "error" : "warning"} /></TableCell>
                <TableCell>{t.completed_segments}/{t.total_segments}</TableCell>
                <TableCell sx={{ fontSize: "0.7rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{t.error_message || "-"}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{t.created_at ? new Date(t.created_at).toLocaleString() : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div" count={-1} page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
      />
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 5. 错误日志
// ---------------------------------------------------------------------------
function ErrorLogsModule() {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        MVP 阶段：错误日志功能待完善，请查看服务端日志文件。
      </Alert>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          服务端日志路径：<code>backend/logs/app.log</code>
        </Typography>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 6. 音色配置
// ---------------------------------------------------------------------------
function VoiceConfigModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [voices, setVoices] = React.useState<AdminVoice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ open: boolean; voice?: AdminVoice }>({ open: false });
  const [form, setForm] = React.useState({ provider: "minimax", provider_voice_id: "", name: "", language: "zh", is_cloned: false });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAllVoices();
      setVoices(res.items);
    } catch {
      showMsg("加载音色列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ provider: "minimax", provider_voice_id: "", name: "", language: "zh", is_cloned: false });
    setDialog({ open: true });
  };

  const openEdit = (v: AdminVoice) => {
    setForm({
      provider: v.provider,
      provider_voice_id: v.provider_voice_id,
      name: v.name,
      language: v.language,
      is_cloned: v.is_cloned,
    });
    setDialog({ open: true, voice: v });
  };

  const handleSave = async () => {
    try {
      if (dialog.voice) {
        await updateVoice(dialog.voice.id, form);
        showMsg("音色已更新");
      } else {
        await createVoice(form);
        showMsg("音色已创建");
      }
      setDialog({ open: false });
      load();
    } catch {
      showMsg("保存失败", "error");
    }
  };

  const handleDelete = async (v: AdminVoice) => {
    if (!confirm(`确定删除音色 ${v.name}？`)) return;
    try {
      await deleteVoice(v.id);
      showMsg("音色已删除");
      load();
    } catch {
      showMsg("删除失败", "error");
    }
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }} onClick={openCreate}>
        新增音色
      </Button>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Provider Voice ID</TableCell>
              <TableCell>语言</TableCell>
              <TableCell>克隆</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {voices.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.name}</TableCell>
                <TableCell><Chip label={v.provider} size="small" /></TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{v.provider_voice_id}</TableCell>
                <TableCell>{v.language}</TableCell>
                <TableCell>{v.is_cloned ? "是" : "否"}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(v)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(v)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })}>
        <DialogTitle>{dialog.voice ? "编辑音色" : "新增音色"}</DialogTitle>
        <DialogContent>
          <TextField label="名称" fullWidth sx={{ mt: 2 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Provider" fullWidth sx={{ mt: 2 }} value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          <TextField label="Provider Voice ID" fullWidth sx={{ mt: 2 }} value={form.provider_voice_id} onChange={(e) => setForm({ ...form, provider_voice_id: e.target.value })} />
          <TextField label="语言" fullWidth sx={{ mt: 2 }} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>是否克隆</InputLabel>
            <Select value={form.is_cloned ? "true" : "false"} label="是否克隆" onChange={(e) => setForm({ ...form, is_cloned: e.target.value === "true" })}>
              <MenuItem value="false">否</MenuItem>
              <MenuItem value="true">是</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 7. Provider 配置
// ---------------------------------------------------------------------------
function ProviderConfigModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [config, setConfig] = React.useState<ProviderConfig | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProviderConfig();
      setConfig(res);
    } catch {
      showMsg("加载配置失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateProviderConfig(config);
      showMsg("Provider 配置已更新");
    } catch {
      showMsg("保存失败", "error");
    }
  };

  if (!config) return <Typography>加载中...</Typography>;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>首选 Provider</InputLabel>
            <Select value={config.primary} label="首选 Provider" onChange={(e) => setConfig({ ...config, primary: e.target.value })}>
              <MenuItem value="minimax">MiniMax</MenuItem>
              <MenuItem value="edge-tts">Edge-TTS</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>降级 Provider</InputLabel>
            <Select value={config.fallback} label="降级 Provider" onChange={(e) => setConfig({ ...config, fallback: e.target.value })}>
              <MenuItem value="edge-tts">Edge-TTS</MenuItem>
              <MenuItem value="minimax">MiniMax</MenuItem>
            </Select>
          </FormControl>
          <TextField label="MiniMax API Key" fullWidth type="password" value={config.minimax_api_key} onChange={(e) => setConfig({ ...config, minimax_api_key: e.target.value })} />
          <FormControl fullWidth>
            <InputLabel>Edge-TTS 启用</InputLabel>
            <Select value={config.edge_tts_enabled ? "true" : "false"} label="Edge-TTS 启用" onChange={(e) => setConfig({ ...config, edge_tts_enabled: e.target.value === "true" })}>
              <MenuItem value="true">是</MenuItem>
              <MenuItem value="false">否</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleSave} sx={{ mt: 2 }}>保存配置</Button>
        </Stack>
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// 8. 套餐配置
// ---------------------------------------------------------------------------
function PlanConfigModule({ showMsg }: { showMsg: (m: string, s?: "success" | "error") => void }) {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ open: boolean; plan?: Plan }>({ open: false });
  const [form, setForm] = React.useState({ id: "", name: "", price: 0, credits: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPlans();
      setPlans(res.items);
    } catch {
      showMsg("加载套餐列表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ id: "", name: "", price: 0, credits: 0 });
    setDialog({ open: true });
  };

  const openEdit = (p: Plan) => {
    setForm({ id: p.id, name: p.name, price: p.price, credits: p.credits });
    setDialog({ open: true, plan: p });
  };

  const handleSave = async () => {
    try {
      if (dialog.plan) {
        await updatePlan(dialog.plan.id, form);
        showMsg("套餐已更新");
      } else {
        await createPlan(form);
        showMsg("套餐已创建");
      }
      setDialog({ open: false });
      load();
    } catch {
      showMsg("保存失败", "error");
    }
  };

  const handleDelete = async (p: Plan) => {
    if (!confirm(`确定删除套餐 ${p.name}？`)) return;
    try {
      await deletePlan(p.id);
      showMsg("套餐已删除");
      load();
    } catch {
      showMsg("删除失败", "error");
    }
  };

  return (
    <Box>
      <Button variant="contained" startIcon={<AddIcon />} sx={{ mb: 2 }} onClick={openCreate}>
        新增套餐
      </Button>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>价格 (元)</TableCell>
              <TableCell>积分</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.id}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>¥{p.price}</TableCell>
                <TableCell>{p.credits}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(p)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })}>
        <DialogTitle>{dialog.plan ? "编辑套餐" : "新增套餐"}</DialogTitle>
        <DialogContent>
          <TextField label="ID" fullWidth sx={{ mt: 2 }} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!dialog.plan} />
          <TextField label="名称" fullWidth sx={{ mt: 2 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="价格 (元)" type="number" fullWidth sx={{ mt: 2 }} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <TextField label="积分" type="number" fullWidth sx={{ mt: 2 }} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
