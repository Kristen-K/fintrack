import { useState, useEffect, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6"];
const ACCOUNT_TYPES = ["checking","savings","credit_card","pension","investment","business","loan"];
const CATEGORIES = {
  "Income": ["Salary","Freelance","Benefits","Investment Returns","Business Income","Other Income"],
  "Housing": ["Rent","Mortgage","Utilities","Internet","Council Tax","Insurance","Maintenance"],
  "Food": ["Groceries","Restaurants","Takeaway","Coffee","Alcohol"],
  "Transport": ["Fuel","Public Transport","Car Insurance","Parking","Uber/Taxi","Car Maintenance"],
  "Subscriptions": ["Streaming","Software","Gym","Magazines","Cloud Storage","Gaming"],
  "Health": ["GP/Doctor","Dentist","Pharmacy","Mental Health","Optician"],
  "Shopping": ["Clothing","Electronics","Home & Garden","Books","Gifts"],
  "Entertainment": ["Cinema","Events","Holidays","Hobbies","Sports"],
  "Finance": ["Savings Transfer","Investment","Pension Contribution","Loan Payment","Credit Card Payment","Interest"],
  "Business": ["Office Supplies","Travel","Software","Marketing","Professional Services","Equipment","Client Entertainment"],
  "Other": ["Cash Withdrawal","Bank Charge","Unknown"],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n, currency = "£") => `${currency}${Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtSigned = (n, currency = "£") => `${n < 0 ? "-" : "+"}${fmt(n, currency)}`;
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "fintrack_v2";
const loadState = async () => {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
};
const saveState = async (state) => {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(state)); } catch {}
};

// ─── DEFAULT STATE ────────────────────────────────────────────────────────────
const defaultState = () => ({
  users: [{ id: "u1", name: "Me", role: "owner", email: "" }],
  currentUser: "u1",
  accounts: [
    { id: "a1", name: "Barclays Current", type: "checking", balance: 3240.50, currency: "£", color: "#6366f1", isPersonal: true },
    { id: "a2", name: "Monzo Savings", type: "savings", balance: 8500.00, currency: "£", color: "#10b981", interestRate: 4.5, isPersonal: true },
    { id: "a3", name: "Visa Credit Card", type: "credit_card", balance: -1200.00, currency: "£", color: "#ef4444", interestRate: 22.9, creditLimit: 5000, isPersonal: true },
    { id: "a4", name: "Aviva Pension", type: "pension", balance: 42000.00, currency: "£", color: "#8b5cf6", interestRate: 7, isPersonal: true },
    { id: "a5", name: "Business Account", type: "business", balance: 15000.00, currency: "£", color: "#f59e0b", isPersonal: false },
  ],
  transactions: [
    { id: "t1", accountId: "a1", date: "2025-02-15", description: "Tesco Groceries", amount: -65.40, category: "Food", subCategory: "Groceries", type: "expense", isPersonal: true },
    { id: "t2", accountId: "a1", date: "2025-02-14", description: "Netflix", amount: -15.99, category: "Subscriptions", subCategory: "Streaming", type: "expense", isPersonal: true },
    { id: "t3", accountId: "a1", date: "2025-02-12", description: "Salary", amount: 3500.00, category: "Income", subCategory: "Salary", type: "income", isPersonal: true },
    { id: "t4", accountId: "a5", date: "2025-02-10", description: "Client Invoice #42", amount: 5000.00, category: "Income", subCategory: "Business Income", type: "income", isPersonal: false },
    { id: "t5", accountId: "a5", date: "2025-02-08", description: "Office Supplies", amount: -234.00, category: "Business", subCategory: "Office Supplies", type: "expense", isPersonal: false },
  ],
  pots: [
    { id: "p1", name: "Emergency Fund", target: 5000, current: 3200, color: "#10b981", accountId: "a2" },
    { id: "p2", name: "Holiday 2025", target: 3000, current: 800, color: "#06b6d4", accountId: "a2" },
  ],
  settings: { currency: "£", darkMode: true },
});

// ─── ICONS (inline SVG) ───────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const paths = {
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    accounts: "M3 3h18v18H3zM3 9h18M9 21V9",
    transactions: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    pots: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
    pension: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    projections: "M22 12h-4l-3 9L9 3l-3 9H2",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    plus: "M12 5v14M5 12h14",
    x: "M18 6L6 18M6 6l12 12",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    chart: "M18 20V10M12 20V4M6 20v-6",
    pie: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
    trend: "M23 6l-9.5 9.5-5-5L1 18",
    user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
    check: "M20 6L9 17l-5-5",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8h.01M11 12h1v4h1",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
    arrow_right: "M5 12h14M12 5l7 7-7 7",
    menu: "M3 12h18M3 6h18M3 18h18",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] && paths[name].split("M").filter(Boolean).map((d, i) => (
        <path key={i} d={"M" + d} />
      ))}
    </svg>
  );
};

// ─── MODAL ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide = false }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
    <div style={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 16, padding: 24, width: "100%", maxWidth: wide ? 700 : 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#e2e8f0" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}><Icon name="x" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
    <input style={{ width: "100%", background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" }} {...props} />
  </div>
);
const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
    <select style={{ width: "100%", background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" }} {...props}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
const Btn = ({ children, onClick, variant = "primary", style = {}, small = false }) => (
  <button onClick={onClick} style={{
    background: variant === "primary" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : variant === "danger" ? "#ef4444" : variant === "ghost" ? "transparent" : "#2d2d4e",
    border: variant === "ghost" ? "1px solid #2d2d4e" : "none",
    borderRadius: 8, padding: small ? "6px 12px" : "10px 18px",
    color: "#fff", cursor: "pointer", fontSize: small ? 12 : 14, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 6, ...style
  }}>{children}</button>
);

// ─── BADGE ────────────────────────────────────────────────────────────────────
const Badge = ({ children, color = "#6366f1" }) => (
  <span style={{ background: color + "22", color, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, border: `1px solid ${color}44` }}>{children}</span>
);

// ─── CARD ─────────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 16, padding: 20, ...style }}>{children}</div>
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = "#6366f1", icon }) => (
  <Card style={{ flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && <div style={{ background: color + "22", borderRadius: 10, padding: 8 }}><Icon name={icon} color={color} /></div>}
    </div>
  </Card>
);

// ─── ACCOUNT CARD ─────────────────────────────────────────────────────────────
const AccountCard = ({ account, onClick }) => {
  const typeLabels = { checking: "Current", savings: "Savings", credit_card: "Credit Card", pension: "Pension", investment: "Investment", business: "Business", loan: "Loan" };
  const isDebt = account.balance < 0;
  return (
    <div onClick={onClick} style={{ background: `linear-gradient(135deg, ${account.color}22, ${account.color}11)`, border: `1px solid ${account.color}44`, borderRadius: 16, padding: 20, cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${account.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <Badge color={account.color}>{typeLabels[account.type] || account.type}</Badge>
        {account.interestRate && <span style={{ fontSize: 11, color: "#94a3b8" }}>{account.interestRate}% p.a.</span>}
      </div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>{account.name}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: isDebt ? "#ef4444" : "#e2e8f0", fontFamily: "monospace" }}>
        {isDebt ? "-" : ""}{fmt(account.balance, account.currency)}
      </div>
      {account.type === "credit_card" && account.creditLimit && (
        <div style={{ marginTop: 8 }}>
          <div style={{ background: "#0f0f23", borderRadius: 4, height: 4, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (Math.abs(account.balance) / account.creditLimit) * 100)}%`, background: "#ef4444", height: "100%", borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{fmt(Math.abs(account.balance), account.currency)} / {fmt(account.creditLimit, account.currency)} used</div>
        </div>
      )}
      {account.type === "pension" && account.interestRate && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
          Growth rate: {account.interestRate}% → {fmt(account.balance * (1 + account.interestRate / 100), account.currency)} in 1yr
        </div>
      )}
    </div>
  );
};

// ─── TRANSACTION ROW ──────────────────────────────────────────────────────────
const TxRow = ({ tx, accounts, onEdit, onDelete }) => {
  const acc = accounts.find(a => a.id === tx.accountId);
  const isIncome = tx.amount > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #1e1e3a", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: (isIncome ? "#10b981" : "#6366f1") + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="tag" color={isIncome ? "#10b981" : "#6366f1"} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
        <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8, marginTop: 2 }}>
          <span>{tx.date}</span>
          {acc && <span>• {acc.name}</span>}
          {tx.category && <span>• {tx.category}{tx.subCategory ? ` › ${tx.subCategory}` : ""}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: isIncome ? "#10b981" : "#ef4444", fontFamily: "monospace" }}>
          {isIncome ? "+" : "-"}{fmt(tx.amount, acc?.currency || "£")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => onEdit(tx)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><Icon name="edit" size={14} /></button>
        <button onClick={() => onDelete(tx.id)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}><Icon name="trash" size={14} /></button>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [activeMode, setActiveMode] = useState("personal"); // personal | business
  const [modal, setModal] = useState(null); // null | string key
  const [editItem, setEditItem] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [chartType, setChartType] = useState("bar"); // bar | pie | line

  // Load on mount
  useEffect(() => {
    loadState().then(s => {
      setState(s || defaultState());
      setLoading(false);
    });
  }, []);

  // Save on change
  useEffect(() => {
    if (state && !loading) saveState(state);
  }, [state]);

  const update = useCallback((fn) => setState(prev => {
    const next = { ...prev };
    fn(next);
    return next;
  }), []);

  const closeModal = () => { setModal(null); setEditItem(null); };

  // ── Derived ────
  const accounts = useMemo(() => state?.accounts?.filter(a => activeMode === "business" ? !a.isPersonal : a.isPersonal) || [], [state, activeMode]);
  const allAccounts = state?.accounts || [];
  const transactions = useMemo(() => {
    let txs = state?.transactions?.filter(t => activeMode === "business" ? !t.isPersonal : t.isPersonal) || [];
    if (filterAccount !== "all") txs = txs.filter(t => t.accountId === filterAccount);
    if (filterCategory !== "all") txs = txs.filter(t => t.category === filterCategory);
    if (searchTerm) txs = txs.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return txs.sort((a, b) => b.date.localeCompare(a.date));
  }, [state, activeMode, filterAccount, filterCategory, searchTerm]);

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalDebt = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalDebt;
  const monthlyIncome = transactions.filter(t => t.amount > 0 && t.date >= today().slice(0, 7)).reduce((s, t) => s + t.amount, 0);
  const monthlySpend = transactions.filter(t => t.amount < 0 && t.date >= today().slice(0, 7)).reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Category spend data ────
  const catData = useMemo(() => {
    const map = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const k = t.category || "Other";
      map[k] = (map[k] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  // ── Monthly trend ────
  const trendData = useMemo(() => {
    const months = {};
    (state?.transactions || []).filter(t => activeMode === "business" ? !t.isPersonal : t.isPersonal).forEach(t => {
      const m = t.date.slice(0, 7);
      if (!months[m]) months[m] = { month: m, income: 0, spend: 0 };
      if (t.amount > 0) months[m].income += t.amount;
      else months[m].spend += Math.abs(t.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [state, activeMode]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f23", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⬡</div>
        <div>Loading FinTrack...</div>
      </div>
    </div>
  );

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "accounts", label: "Accounts", icon: "accounts" },
    { id: "transactions", label: "Transactions", icon: "transactions" },
    { id: "analytics", label: "Analytics", icon: "chart" },
    { id: "pots", label: "Pots & Savings", icon: "pots" },
    { id: "pension", label: activeMode === "business" ? "Business Finance" : "Pensions", icon: "pension" },
    { id: "projections", label: "Projections", icon: "projections" },
    { id: "users", label: "Users", icon: "user" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  const Sidebar = () => (
    <div style={{
      width: 220, background: "#0d0d1f", borderRight: "1px solid #1e1e3a", height: "100vh",
      display: "flex", flexDirection: "column", position: "fixed", left: sidebarOpen ? 0 : -220,
      top: 0, zIndex: 100, transition: "left 0.3s ease", overflowY: "auto",
    }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>FinTrack</span>
        </div>
        {/* Mode Toggle */}
        <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 3, display: "flex", marginBottom: 20 }}>
          {["personal", "business"].map(m => (
            <button key={m} onClick={() => setActiveMode(m)} style={{
              flex: 1, padding: "6px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: activeMode === m ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: activeMode === m ? "#fff" : "#64748b", textTransform: "capitalize",
            }}>{m === "personal" ? "Personal" : "Business"}</button>
          ))}
        </div>
        <nav>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveNav(item.id); setSidebarOpen(true); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none",
              background: activeNav === item.id ? "#6366f122" : "transparent",
              color: activeNav === item.id ? "#a5b4fc" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: activeNav === item.id ? 600 : 400, marginBottom: 2,
              borderLeft: activeNav === item.id ? "2px solid #6366f1" : "2px solid transparent",
            }}>
              <Icon name={item.icon} size={16} />{item.label}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ marginTop: "auto", padding: "12px 16px", borderTop: "1px solid #1e1e3a" }}>
        <div style={{ fontSize: 11, color: "#64748b" }}>Logged in as</div>
        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{state.users.find(u => u.id === state.currentUser)?.name}</div>
      </div>
    </div>
  );

  // ── Main Content ────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeNav) {
      case "dashboard": return <Dashboard />;
      case "accounts": return <Accounts />;
      case "transactions": return <Transactions />;
      case "analytics": return <Analytics />;
      case "pots": return <Pots />;
      case "pension": return <PensionView />;
      case "projections": return <Projections />;
      case "users": return <Users />;
      case "settings": return <Settings />;
      default: return <Dashboard />;
    }
  };

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>
          {activeMode === "business" ? "Business Overview" : "Financial Overview"}
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Net Worth Banner */}
      <Card style={{ marginBottom: 20, background: "linear-gradient(135deg, #6366f122, #8b5cf622)", border: "1px solid #6366f144" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Net Worth</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: netWorth >= 0 ? "#a5b4fc" : "#f87171", fontFamily: "monospace" }}>{fmt(netWorth)}</div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Assets</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{fmt(totalAssets)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Debt</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", fontFamily: "monospace" }}>-{fmt(totalDebt)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="This Month Income" value={fmt(monthlyIncome)} color="#10b981" icon="trend" />
        <StatCard label="This Month Spend" value={fmt(monthlySpend)} color="#ef4444" icon="chart" />
        <StatCard label="Net This Month" value={fmtSigned(monthlyIncome - monthlySpend)} color={monthlyIncome > monthlySpend ? "#10b981" : "#ef4444"} icon="accounts" />
        <StatCard label="Accounts" value={accounts.length} color="#6366f1" icon="accounts" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card>
          <h3 style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Spending by Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                <Legend formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: "#64748b", textAlign: "center", padding: 40, fontSize: 13 }}>No spending data yet</div>}
        </Card>
        <Card>
          <h3 style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b98122" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="spend" stroke="#ef4444" fill="#ef444422" strokeWidth={2} name="Spend" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Accounts overview */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Accounts</h3>
          <Btn small onClick={() => setModal("addAccount")}><Icon name="plus" size={12} />Add</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {accounts.map(a => <AccountCard key={a.id} account={a} onClick={() => { setEditItem(a); setModal("editAccount"); }} />)}
        </div>
      </Card>

      {/* Recent transactions */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Transactions</h3>
          <Btn small onClick={() => setActiveNav("transactions")}>View All</Btn>
        </div>
        {transactions.slice(0, 5).map(tx => <TxRow key={tx.id} tx={tx} accounts={allAccounts} onEdit={t => { setEditItem(t); setModal("editTx"); }} onDelete={id => update(s => { s.transactions = s.transactions.filter(t => t.id !== id); })} />)}
        {transactions.length === 0 && <div style={{ color: "#64748b", textAlign: "center", padding: 32, fontSize: 13 }}>No transactions yet. Import or add one!</div>}
      </Card>
    </div>
  );

  // ── ACCOUNTS ───────────────────────────────────────────────────────────────
  const Accounts = () => {
    const personalAccounts = state.accounts.filter(a => a.isPersonal);
    const bizAccounts = state.accounts.filter(a => !a.isPersonal);
    const savings = accounts.filter(a => a.type === "savings");
    const debts = accounts.filter(a => a.type === "credit_card" || a.type === "loan" || a.balance < 0);
    const pensions = accounts.filter(a => a.type === "pension");
    const regular = accounts.filter(a => !["savings","credit_card","loan","pension"].includes(a.type));
    const Section = ({ title, items, color }) => items.length === 0 ? null : (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: "inline-block" }} />{title}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {items.map(a => <AccountCard key={a.id} account={a} onClick={() => { setEditItem(a); setModal("editAccount"); }} />)}
        </div>
      </div>
    );
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>Accounts</h1>
          <Btn onClick={() => setModal("addAccount")}><Icon name="plus" size={14} />Add Account</Btn>
        </div>
        <Section title="Current & Checking" items={regular} color="#6366f1" />
        <Section title="Savings" items={savings} color="#10b981" />
        <Section title="Debt & Credit Cards" items={debts} color="#ef4444" />
        <Section title="Pensions & Investments" items={pensions} color="#8b5cf6" />
        {/* Interest calculator */}
        <Card style={{ marginTop: 8 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Interest Calculator</h3>
          <InterestCalc accounts={accounts} />
        </Card>
      </div>
    );
  };

  // ── INTEREST CALC ──────────────────────────────────────────────────────────
  const InterestCalc = ({ accounts }) => {
    const [principal, setPrincipal] = useState(10000);
    const [rate, setRate] = useState(5);
    const [years, setYears] = useState(5);
    const [compound, setCompound] = useState("annual");
    const n = { annual: 1, monthly: 12, daily: 365 }[compound];
    const simple = principal * (1 + (rate / 100) * years);
    const comp = principal * Math.pow(1 + rate / 100 / n, n * years);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Input label="Principal (£)" type="number" value={principal} onChange={e => setPrincipal(+e.target.value)} />
          <Input label="Annual Rate (%)" type="number" value={rate} onChange={e => setRate(+e.target.value)} step="0.1" />
          <Input label="Years" type="number" value={years} onChange={e => setYears(+e.target.value)} />
          <Select label="Compound Frequency" value={compound} onChange={e => setCompound(e.target.value)} options={["annual","monthly","daily"]} />
        </div>
        <div style={{ background: "#0f0f23", borderRadius: 12, padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Simple Interest</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{fmt(simple)}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Interest: {fmt(simple - principal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Compound Interest ({compound})</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#6366f1", fontFamily: "monospace" }}>{fmt(comp)}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Interest: {fmt(comp - principal)}</div>
          </div>
        </div>
      </div>
    );
  };

  // ── TRANSACTIONS ───────────────────────────────────────────────────────────
  const Transactions = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>Transactions</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => setModal("importCSV")}><Icon name="upload" size={14} />Import CSV</Btn>
          <Btn onClick={() => setModal("addTx")}><Icon name="plus" size={14} />Add</Btn>
        </div>
      </div>
      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: 160, background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13 }} />
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13 }}>
            <option value="all">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13 }}>
            <option value="all">All Categories</option>
            {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>
      <Card>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{transactions.length} transactions</div>
        {transactions.map(tx => <TxRow key={tx.id} tx={tx} accounts={allAccounts} onEdit={t => { setEditItem(t); setModal("editTx"); }} onDelete={id => update(s => { s.transactions = s.transactions.filter(t => t.id !== id); })} />)}
        {transactions.length === 0 && <div style={{ color: "#64748b", textAlign: "center", padding: 40, fontSize: 14 }}>No transactions found</div>}
      </Card>
    </div>
  );

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  const Analytics = () => {
    const [view, setView] = useState("spending"); // spending | income | trend | accounts
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
          <div style={{ display: "flex", gap: 6 }}>
            {["spending","income","trend","accounts"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === v ? "#6366f1" : "#1a1a2e", color: view === v ? "#fff" : "#64748b", textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
        </div>
        {view === "spending" && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Spending by Category</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {["pie","bar"].map(t => <button key={t} onClick={() => setChartType(t)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, background: chartType === t ? "#6366f1" : "#2d2d4e", color: chartType === t ? "#fff" : "#64748b" }}>{t.toUpperCase()}</button>)}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                {chartType === "pie" ? (
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#2d2d4e" }}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                  </PieChart>
                ) : (
                  <BarChart data={catData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `£${v}`} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={90} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Card>
            {/* Category breakdown table */}
            <Card>
              <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Breakdown</h3>
              {catData.map((c, i) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e1e3a", gap: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], display: "inline-block", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: "#e2e8f0" }}>{c.name}</span>
                  <span style={{ fontSize: 13, color: "#ef4444", fontFamily: "monospace", fontWeight: 600 }}>{fmt(c.value)}</span>
                  <span style={{ fontSize: 11, color: "#64748b", width: 40, textAlign: "right" }}>{((c.value / catData.reduce((s, x) => s + x.value, 0)) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </Card>
          </>
        )}
        {view === "trend" && (
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Income vs Spending Trend</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b98122" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="spend" stroke="#ef4444" fill="#ef444422" strokeWidth={2} name="Spending" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
        {view === "income" && (
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Income Sources</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={(() => { const m = {}; transactions.filter(t => t.amount > 0).forEach(t => { const k = t.subCategory || t.category || "Other"; m[k] = (m[k] || 0) + t.amount; }); return Object.entries(m).map(([name, value]) => ({ name, value: +value.toFixed(2) })); })()} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name }) => name}>
                  {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
        {view === "accounts" && (
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Account Balances</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={accounts.map(a => ({ name: a.name, balance: a.balance, color: a.color }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                  {accounts.map((a, i) => <Cell key={i} fill={a.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    );
  };

  // ── POTS ──────────────────────────────────────────────────────────────────
  const Pots = () => {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: "", target: "", current: "", color: "#6366f1", accountId: accounts[0]?.id || "" });
    const pots = state.pots || [];
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, margin: 0 }}>Savings Pots</h1>
          <Btn onClick={() => setShowAdd(true)}><Icon name="plus" size={14} />New Pot</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
          {pots.map(pot => {
            const pct = Math.min(100, (pot.current / pot.target) * 100);
            const acc = allAccounts.find(a => a.id === pot.accountId);
            return (
              <Card key={pot.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 15 }}>{pot.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { const a = prompt("Add amount:", ""); if (a && !isNaN(a)) update(s => { const p = s.pots.find(p => p.id === pot.id); if (p) p.current = Math.min(p.target, p.current + +a); }); }} style={{ background: "#10b98122", border: "none", color: "#10b981", cursor: "pointer", borderRadius: 6, padding: "3px 8px", fontSize: 11 }}>Add</button>
                    <button onClick={() => update(s => { s.pots = s.pots.filter(p => p.id !== pot.id); })} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Icon name="trash" size={13} /></button>
                  </div>
                </div>
                {acc && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>From: {acc.name}</div>}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: pot.color, fontFamily: "monospace", fontWeight: 700 }}>{fmt(pot.current)}</span>
                    <span style={{ color: "#64748b", fontFamily: "monospace" }}>{fmt(pot.target)}</span>
                  </div>
                  <div style={{ background: "#0f0f23", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${pot.color}, ${pot.color}99)`, height: "100%", borderRadius: 4, transition: "width 0.5s ease" }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                  <span>{pct.toFixed(0)}% saved</span>
                  <span>{fmt(pot.target - pot.current)} to go</span>
                </div>
              </Card>
            );
          })}
        </div>
        {showAdd && (
          <Card>
            <h3 style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New Pot</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Pot Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Target Amount (£)" type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
              <Input label="Current Amount (£)" type="number" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Colour</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #2d2d4e", background: "#0f0f23", cursor: "pointer" }} />
              </div>
            </div>
            <Select label="Linked Account" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} options={accounts.map(a => ({ value: a.id, label: a.name }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn onClick={() => { if (form.name && form.target) { update(s => { s.pots = [...(s.pots || []), { id: uid(), name: form.name, target: +form.target, current: +(form.current || 0), color: form.color, accountId: form.accountId }]; }); setShowAdd(false); setForm({ name: "", target: "", current: "", color: "#6366f1", accountId: accounts[0]?.id || "" }); } }}>Create Pot</Btn>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ── PENSION VIEW ───────────────────────────────────────────────────────────
  const PensionView = () => {
    const pensions = accounts.filter(a => a.type === "pension" || a.type === "investment");
    const [projYears, setProjYears] = useState(20);
    return (
      <div>
        <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
          {activeMode === "business" ? "Business Finance & Tax" : "Pensions & Investments"}
        </h1>
        {pensions.map(p => {
          const projections = Array.from({ length: projYears + 1 }, (_, i) => ({
            year: new Date().getFullYear() + i,
            value: p.balance * Math.pow(1 + (p.interestRate || 7) / 100, i),
            conservative: p.balance * Math.pow(1 + (((p.interestRate || 7) - 2) / 100), i),
            optimistic: p.balance * Math.pow(1 + (((p.interestRate || 7) + 2) / 100), i),
          }));
          return (
            <Card key={p.id} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.type === "pension" ? "Pension" : "Investment"}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6", fontFamily: "monospace", marginTop: 4 }}>{fmt(p.balance)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Growth Rate</div>
                  <input type="number" value={p.interestRate || 7} step="0.5" min="0" max="30"
                    onChange={e => update(s => { const acc = s.accounts.find(a => a.id === p.id); if (acc) acc.interestRate = +e.target.value; })}
                    style={{ width: 80, background: "#0f0f23", border: "1px solid #2d2d4e", borderRadius: 8, padding: "6px 10px", color: "#8b5cf6", fontSize: 18, fontWeight: 700, textAlign: "right" }} />
                  <span style={{ color: "#64748b", fontSize: 12 }}> % p.a.</span>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#94a3b8" }}>Projection: {projYears} years (to {new Date().getFullYear() + projYears})</label>
                <input type="range" min={5} max={40} value={projYears} onChange={e => setProjYears(+e.target.value)} style={{ width: "100%", marginTop: 4 }} />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                  <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
                  <Area type="monotone" dataKey="optimistic" stroke="#10b98155" fill="#10b98111" strokeWidth={1} name="Optimistic" strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf622" strokeWidth={2} name="Expected" />
                  <Area type="monotone" dataKey="conservative" stroke="#ef444455" fill="#ef444411" strokeWidth={1} name="Conservative" strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                {[5, 10, 20, 30].map(y => (
                  <div key={y} style={{ textAlign: "center", background: "#0f0f23", borderRadius: 8, padding: "8px 14px" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{y}yr</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#8b5cf6", fontFamily: "monospace" }}>{fmt(p.balance * Math.pow(1 + (p.interestRate || 7) / 100, y))}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {pensions.length === 0 && (
          <Card>
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
              <div>No pension or investment accounts yet.</div>
              <Btn style={{ marginTop: 16, display: "inline-flex" }} onClick={() => setModal("addAccount")}>Add Pension Account</Btn>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ── PROJECTIONS ────────────────────────────────────────────────────────────
  const Projections = () => {
    const [months, setMonths] = useState(36);
    const [monthlyContrib, setMonthlyContrib] = useState(500);
    const [growthRate, setGrowthRate] = useState(5);
    const [scenario, setScenario] = useState("savings");
    const totalSavings = accounts.filter(a => a.type === "savings").reduce((s, a) => s + a.balance, 0);
    const starting = scenario === "savings" ? totalSavings : netWorth;
    const projData = Array.from({ length: months + 1 }, (_, i) => {
      const base = starting * Math.pow(1 + growthRate / 100 / 12, i);
      const contrib = monthlyContrib * (Math.pow(1 + growthRate / 100 / 12, i) - 1) / (growthRate / 100 / 12);
      const total = base + (growthRate > 0 ? contrib : monthlyContrib * i);
      return { month: i, value: Math.round(total), label: `Month ${i}` };
    }).filter((_, i) => i % 3 === 0);
    return (
      <div>
        <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Projections</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Settings</h3>
            <Select label="Scenario" value={scenario} onChange={e => setScenario(e.target.value)} options={[{ value: "savings", label: "Savings Growth" }, { value: "networth", label: "Net Worth" }]} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Period: {months} months ({(months / 12).toFixed(1)} years)</label>
              <input type="range" min={6} max={360} value={months} onChange={e => setMonths(+e.target.value)} style={{ width: "100%" }} />
            </div>
            <Input label="Monthly Contribution (£)" type="number" value={monthlyContrib} onChange={e => setMonthlyContrib(+e.target.value)} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Annual Growth: {growthRate}%</label>
              <input type="range" min={0} max={20} step={0.5} value={growthRate} onChange={e => setGrowthRate(+e.target.value)} style={{ width: "100%" }} />
            </div>
          </Card>
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Summary</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Starting Value</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{fmt(starting)}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Projected Value ({(months / 12).toFixed(1)}yr)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>{fmt(projData[projData.length - 1]?.value || 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Contributions</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", fontFamily: "monospace" }}>{fmt(monthlyContrib * months)}</div>
            </div>
          </Card>
        </div>
        <Card>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
              <XAxis dataKey="month" tickFormatter={v => `${(v / 12).toFixed(0)}yr`} tick={{ fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} labelFormatter={v => `Month ${v}`} contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d4e", borderRadius: 8, color: "#e2e8f0" }} />
              <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98122" strokeWidth={2} name="Projected Value" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  // ── USERS ─────────────────────────────────────────────────────────────────
  const Users = () => {
    const [form, setForm] = useState({ name: "", email: "", role: "viewer" });
    return (
      <div>
        <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Users & Access</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flexWrap: "wrap" }}>
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Current Users</h3>
            {state.users.map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #1e1e3a" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#6366f122", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="user" size={16} color="#6366f1" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{u.email || "No email"}</div>
                </div>
                <Badge color={u.role === "owner" ? "#8b5cf6" : u.role === "editor" ? "#6366f1" : "#64748b"}>{u.role}</Badge>
                {u.id !== "u1" && <button onClick={() => update(s => { s.users = s.users.filter(x => x.id !== u.id); })} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Icon name="trash" size={14} /></button>}
              </div>
            ))}
          </Card>
          <Card>
            <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Add User</h3>
            <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} options={[{ value: "viewer", label: "Viewer (read only)" }, { value: "editor", label: "Editor" }, { value: "owner", label: "Owner" }]} />
            <Btn onClick={() => { if (form.name) { update(s => { s.users = [...s.users, { id: uid(), ...form }]; }); setForm({ name: "", email: "", role: "viewer" }); } }}>
              <Icon name="plus" size={14} />Add User
            </Btn>
          </Card>
        </div>
      </div>
    );
  };

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  const Settings = () => (
    <div>
      <h1 style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Settings</h1>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Data Management</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn variant="secondary" onClick={() => { const d = JSON.stringify(state, null, 2); const b = new Blob([d], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "fintrack-backup.json"; a.click(); }}>
            <Icon name="upload" size={14} />Export Backup
          </Btn>
          <Btn variant="danger" onClick={() => { if (confirm("Reset all data? This cannot be undone.")) { setState(defaultState()); } }}>
            <Icon name="trash" size={14} />Reset All Data
          </Btn>
        </div>
      </Card>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Profile</h3>
        <Input label="Your Name" value={state.users.find(u => u.id === state.currentUser)?.name || ""} onChange={e => update(s => { const u = s.users.find(x => x.id === s.currentUser); if (u) u.name = e.target.value; })} />
      </Card>
      <Card>
        <h3 style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>About</h3>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>FinTrack — Personal & Business Finance Tracker. Data is stored securely in your browser using persistent storage. Import transactions from any bank via CSV. All calculations are done locally.</p>
      </Card>
    </div>
  );

  // ── MODALS ─────────────────────────────────────────────────────────────────
  const AccountForm = ({ initial, onSave }) => {
    const [form, setForm] = useState(initial || { name: "", type: "checking", balance: "", currency: "£", color: "#6366f1", interestRate: "", creditLimit: "", isPersonal: activeMode === "personal" });
    return (
      <div>
        <Input label="Account Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={ACCOUNT_TYPES.map(t => ({ value: t, label: t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()) }))} />
        <Input label="Current Balance (£)" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} step="0.01" />
        {["savings","credit_card","loan","pension","investment"].includes(form.type) && (
          <Input label="Interest/Growth Rate (%)" type="number" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} step="0.1" />
        )}
        {form.type === "credit_card" && (
          <Input label="Credit Limit (£)" type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} />
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Colour</label>
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: "100%", height: 40, borderRadius: 8, border: "1px solid #2d2d4e", background: "#0f0f23", cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
          <Btn onClick={() => { if (form.name) { onSave({ ...form, balance: +form.balance, interestRate: form.interestRate ? +form.interestRate : undefined, creditLimit: form.creditLimit ? +form.creditLimit : undefined }); closeModal(); } }}>Save Account</Btn>
        </div>
      </div>
    );
  };

  const TxForm = ({ initial, onSave }) => {
    const [form, setForm] = useState(initial || { description: "", amount: "", date: today(), accountId: accounts[0]?.id || "", category: "Food", subCategory: "Groceries", type: "expense", isPersonal: activeMode === "personal" });
    const subCats = CATEGORIES[form.category] || [];
    return (
      <div>
        <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Amount (£)" type="number" value={Math.abs(form.amount || 0) || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} step="0.01" />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} options={["income","expense","transfer"]} />
        <Select label="Account" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} options={allAccounts.map(a => ({ value: a.id, label: a.name }))} />
        <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, subCategory: CATEGORIES[e.target.value]?.[0] || "" }))} options={Object.keys(CATEGORIES)} />
        {subCats.length > 0 && <Select label="Sub-Category" value={form.subCategory} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} options={subCats} />}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
          <Btn onClick={() => { if (form.description && form.amount) { const amt = form.type === "expense" ? -Math.abs(+form.amount) : +form.amount; onSave({ ...form, amount: amt }); closeModal(); } }}>Save Transaction</Btn>
        </div>
      </div>
    );
  };

  const ImportCSV = () => {
    const [preview, setPreview] = useState([]);
    const [mapping, setMapping] = useState({ date: 0, description: 1, amount: 2 });
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const handleFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split("\n").filter(Boolean).slice(0, 11);
        setPreview(lines.map(l => l.split(",")));
      };
      reader.readAsText(file);
    };
    const doImport = () => {
      const newTxs = preview.slice(1).map(row => {
        const rawAmt = (row[mapping.amount] || "").replace(/[^0-9.-]/g, "");
        const amount = parseFloat(rawAmt) || 0;
        return { id: uid(), accountId, date: (row[mapping.date] || "").trim(), description: (row[mapping.description] || "").trim(), amount, category: "Other", subCategory: "Unknown", type: amount >= 0 ? "income" : "expense", isPersonal: activeMode === "personal" };
      }).filter(t => t.description && t.amount !== 0);
      update(s => { s.transactions = [...s.transactions, ...newTxs]; });
      closeModal();
    };
    return (
      <div>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>Import CSV from PayPal, banks, or any provider. Select your account, then map the columns.</p>
        <Select label="Target Account" value={accountId} onChange={e => setAccountId(e.target.value)} options={allAccounts.map(a => ({ value: a.id, label: a.name }))} />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>CSV File</label>
          <input type="file" accept=".csv" onChange={handleFile} style={{ color: "#94a3b8", fontSize: 13 }} />
        </div>
        {preview.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {["date","description","amount"].map(f => (
                <Select key={f} label={`${f} column`} value={mapping[f]} onChange={e => setMapping(m => ({ ...m, [f]: +e.target.value }))} options={preview[0].map((h, i) => ({ value: i, label: `Col ${i + 1}: ${h?.trim() || "?"}` }))} />
              ))}
            </div>
            <div style={{ background: "#0f0f23", borderRadius: 8, padding: 12, maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
              {preview.slice(0, 5).map((row, i) => (
                <div key={i} style={{ fontSize: 11, color: i === 0 ? "#6366f1" : "#94a3b8", fontFamily: "monospace", marginBottom: 4 }}>{row.join(" | ")}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
              <Btn onClick={doImport}><Icon name="upload" size={14} />Import {preview.length - 1} rows</Btn>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── LAYOUT ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#0f0f23", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* Mobile header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0d0d1f", borderBottom: "1px solid #1e1e3a", position: "sticky", top: 0, zIndex: 90 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}><Icon name="menu" /></button>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>FinTrack</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge color={activeMode === "business" ? "#f59e0b" : "#6366f1"}>{activeMode === "business" ? "Business" : "Personal"}</Badge>
          <Btn small onClick={() => setModal("addTx")}><Icon name="plus" size={12} />Add</Btn>
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 95 }} onClick={() => setSidebarOpen(false)} />}
      <Sidebar />

      {/* Bottom nav for mobile */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d0d1f", borderTop: "1px solid #1e1e3a", display: "flex", zIndex: 90, padding: "8px 0" }}>
        {[{ id: "dashboard", icon: "home", label: "Home" }, { id: "accounts", icon: "accounts", label: "Accounts" }, { id: "transactions", icon: "transactions", label: "Txns" }, { id: "analytics", icon: "chart", label: "Charts" }, { id: "projections", icon: "projections", label: "Forecast" }].map(item => (
          <button key={item.id} onClick={() => { setActiveNav(item.id); setSidebarOpen(false); }} style={{ flex: 1, background: "none", border: "none", color: activeNav === item.id ? "#a5b4fc" : "#64748b", cursor: "pointer", padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 9, fontWeight: activeNav === item.id ? 700 : 400 }}>
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 0, padding: "20px 16px", maxWidth: 960, marginInline: "auto", paddingBottom: 80 }}>
        {renderContent()}
      </div>

      {/* Modals */}
      {modal === "addAccount" && <Modal title="Add Account" onClose={closeModal}><AccountForm onSave={acc => update(s => { s.accounts = [...s.accounts, { id: uid(), ...acc }]; })} /></Modal>}
      {modal === "editAccount" && editItem && <Modal title="Edit Account" onClose={closeModal}><AccountForm initial={editItem} onSave={acc => update(s => { const i = s.accounts.findIndex(a => a.id === editItem.id); if (i >= 0) s.accounts[i] = { ...s.accounts[i], ...acc }; })} /></Modal>}
      {modal === "addTx" && <Modal title="Add Transaction" onClose={closeModal}><TxForm onSave={tx => update(s => { s.transactions = [...s.transactions, { id: uid(), ...tx }]; })} /></Modal>}
      {modal === "editTx" && editItem && <Modal title="Edit Transaction" onClose={closeModal}><TxForm initial={{ ...editItem, amount: Math.abs(editItem.amount) }} onSave={tx => update(s => { const i = s.transactions.findIndex(t => t.id === editItem.id); if (i >= 0) s.transactions[i] = { ...s.transactions[i], ...tx }; })} /></Modal>}
      {modal === "importCSV" && <Modal title="Import CSV" onClose={closeModal} wide><ImportCSV /></Modal>}
    </div>
  );
}
