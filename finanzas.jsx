import { useState, useEffect, useCallback } from "react";

const CATS_DIARIAS = [
  { id: "super_comida", label: "Super comida", icon: "ti-shopping-cart" },
  { id: "super_misc", label: "Super misc", icon: "ti-package" },
  { id: "carne", label: "Carne", icon: "ti-meat" },
  { id: "pollo", label: "Pollo", icon: "ti-feather" },
  { id: "fiambre", label: "Fiambre", icon: "ti-tools-kitchen-2" },
  { id: "delivery", label: "Delivery", icon: "ti-motorbike" },
  { id: "chatarra", label: "Chatarra", icon: "ti-cookie" },
  { id: "salidas", label: "Salidas", icon: "ti-glass-full" },
  { id: "transporte", label: "Transporte", icon: "ti-bus" },
  { id: "casa", label: "Casa", icon: "ti-home" },
  { id: "ropa", label: "Ropa", icon: "ti-hanger" },
  { id: "perfumeria", label: "Perfumería", icon: "ti-droplet" },
  { id: "regalo", label: "Regalo", icon: "ti-gift" },
  { id: "michi", label: "Michi", icon: "ti-paw" },
  { id: "anticipo_tarjeta", label: "Anticipo tarjeta", icon: "ti-credit-card" },
  { id: "anticipo_ahorro", label: "Anticipo ahorro", icon: "ti-piggy-bank" },
  { id: "otros", label: "Otros", icon: "ti-dots" },
];

const CATS_FIJAS = [
  { id: "alquiler", label: "Alquiler" },
  { id: "servicios", label: "Servicios" },
  { id: "ahorro", label: "Ahorro" },
  { id: "extension_pareja", label: "Extensión pareja" },
  { id: "visa", label: "VISA" },
  { id: "amex", label: "AMEX" },
  { id: "tarjeta_mp", label: "Tarjeta MP" },
  { id: "regalos_fijos", label: "Regalos fijos" },
  { id: "anticipos_fijos", label: "Anticipos fijos" },
];

const fmt = (n) =>
  "$" +
  Math.round(n).toLocaleString("es-AR", { minimumFractionDigits: 0 });

const STORAGE_KEY = "finanzas_app_v2";

const DEFAULT_STATE = {
  setup: null,
  gastosFijos: {},
  gastosDiarios: [],
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [form, setForm] = useState({ monto: "", cat: "super_comida", desc: "", fecha: new Date().toISOString().slice(0, 10) });
  const [setupForm, setSetupForm] = useState({ ingreso: "", fechaInicio: "", fechaSueldo: "" });
  const [fixedForm, setFixedForm] = useState({});
  const [editSetup, setEditSetup] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          const parsed = JSON.parse(r.value);
          setData(parsed);
          if (parsed.gastosFijos) setFixedForm(parsed.gastosFijos);
        } else {
          setData(DEFAULT_STATE);
        }
      } catch {
        setData(DEFAULT_STATE);
      }
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback(async (newData) => {
    setData(newData);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSetup = async () => {
    if (!setupForm.ingreso || !setupForm.fechaInicio || !setupForm.fechaSueldo) return;
    const next = {
      ...data,
      setup: {
        ingreso: parseFloat(setupForm.ingreso),
        fechaInicio: setupForm.fechaInicio,
        fechaSueldo: setupForm.fechaSueldo,
      },
      gastosFijos: fixedForm,
    };
    await save(next);
    setEditSetup(false);
    setTab("home");
    showToast("Configuración guardada");
  };

  const handleGuardarFijos = async () => {
    const next = { ...data, gastosFijos: fixedForm };
    await save(next);
    showToast("Gastos fijos actualizados");
    setTab("home");
  };

  const handleAgregarGasto = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return;
    const gasto = {
      id: Date.now(),
      monto: parseFloat(form.monto),
      cat: form.cat,
      desc: form.desc,
      fecha: form.fecha,
    };
    const next = { ...data, gastosDiarios: [gasto, ...(data.gastosDiarios || [])] };
    await save(next);
    setForm({ ...form, monto: "", desc: "" });
    showToast("Gasto registrado");
  };

  const handleEliminar = async (id) => {
    const next = { ...data, gastosDiarios: data.gastosDiarios.filter((g) => g.id !== id) };
    await save(next);
    showToast("Gasto eliminado", "warn");
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--color-text-secondary)", fontSize: 14 }}>
      Cargando...
    </div>
  );

  const needsSetup = !data?.setup;

  // COMPUTED
  const setup = data?.setup || {};
  const gastosFijos = data?.gastosFijos || {};
  const gastosDiarios = data?.gastosDiarios || [];

  const totalFijos = CATS_FIJAS.reduce((a, c) => a + (parseFloat(gastosFijos[c.id]) || 0), 0);
  const presupuestoLibre = (setup.ingreso || 0) - totalFijos;

  const today = new Date().toISOString().slice(0, 10);
  const fechaInicio = setup.fechaInicio || today;
  const fechaSueldo = setup.fechaSueldo || today;
  const msDay = 86400000;
  const diaInicio = new Date(fechaInicio);
  const diaSueldo = new Date(fechaSueldo);
  const diasTotales = Math.max(1, Math.round((diaSueldo - diaInicio) / msDay));
  const diasPasados = Math.max(0, Math.min(diasTotales, Math.round((new Date(today) - diaInicio) / msDay)));
  const diasRestantes = Math.max(1, diasTotales - diasPasados);

  const totalGastado = gastosDiarios.reduce((a, g) => a + g.monto, 0);
  const restante = presupuestoLibre - totalGastado;
  const diarioDisponible = restante / diasRestantes;
  const pct = presupuestoLibre > 0 ? Math.min(100, (totalGastado / presupuestoLibre) * 100) : 0;

  const porCategoria = {};
  CATS_DIARIAS.forEach((c) => { porCategoria[c.id] = 0; });
  gastosDiarios.forEach((g) => { if (porCategoria[g.cat] !== undefined) porCategoria[g.cat] += g.monto; });

  const topCats = CATS_DIARIAS.filter((c) => porCategoria[c.id] > 0).sort((a, b) => porCategoria[b.id] - porCategoria[a.id]);

  const barColor = pct > 80 ? "var(--color-text-danger)" : pct > 60 ? "var(--color-text-warning)" : "var(--color-text-success)";

  // ---- SETUP SCREEN ----
  if (needsSetup || editSetup) {
    return (
      <div style={{ padding: "1.5rem 0 3rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>Configurar período</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>Ingresá tu ingreso y las fechas del período</p>

        <div style={styles.card}>
          <label style={styles.label}>Ingreso del mes ($)</label>
          <input style={styles.input} type="number" placeholder="ej: 1950000" value={setupForm.ingreso}
            onChange={(e) => setSetupForm({ ...setupForm, ingreso: e.target.value })} />

          <label style={{ ...styles.label, marginTop: 14 }}>Fecha de cobro (inicio)</label>
          <input style={styles.input} type="date" value={setupForm.fechaInicio}
            onChange={(e) => setSetupForm({ ...setupForm, fechaInicio: e.target.value })} />

          <label style={{ ...styles.label, marginTop: 14 }}>Fecha del próximo sueldo</label>
          <input style={styles.input} type="date" value={setupForm.fechaSueldo}
            onChange={(e) => setSetupForm({ ...setupForm, fechaSueldo: e.target.value })} />
        </div>

        <div style={styles.card}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "var(--color-text-primary)" }}>Gastos fijos del período</p>
          {CATS_FIJAS.map((c) => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <label style={styles.label}>{c.label}</label>
              <input style={styles.input} type="number" placeholder="0"
                value={fixedForm[c.id] || ""}
                onChange={(e) => setFixedForm({ ...fixedForm, [c.id]: e.target.value })} />
            </div>
          ))}
        </div>

        <button style={styles.btnPrimary} onClick={handleSetup}>Guardar y continuar</button>
        {editSetup && (
          <button style={{ ...styles.btn, marginTop: 10 }} onClick={() => setEditSetup(false)}>Cancelar</button>
        )}
      </div>
    );
  }

  // ---- GASTOS FIJOS EDIT ----
  if (tab === "fijos") {
    return (
      <div style={{ padding: "1.5rem 0 3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button style={styles.btnBack} onClick={() => setTab("home")}><i className="ti ti-arrow-left" /></button>
          <h2 style={{ fontSize: 16, fontWeight: 500 }}>Gastos fijos</h2>
        </div>
        <div style={styles.card}>
          {CATS_FIJAS.map((c) => (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <label style={styles.label}>{c.label}</label>
              <input style={styles.input} type="number" placeholder="0"
                value={fixedForm[c.id] || ""}
                onChange={(e) => setFixedForm({ ...fixedForm, [c.id]: e.target.value })} />
            </div>
          ))}
        </div>
        <button style={styles.btnPrimary} onClick={handleGuardarFijos}>Guardar cambios</button>
      </div>
    );
  }

  // ---- HISTORIAL ----
  if (tab === "historial") {
    const grouped = {};
    gastosDiarios.forEach((g) => {
      if (!grouped[g.fecha]) grouped[g.fecha] = [];
      grouped[g.fecha].push(g);
    });
    const fechas = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
      <div style={{ padding: "1.5rem 0 3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button style={styles.btnBack} onClick={() => setTab("home")}><i className="ti ti-arrow-left" /></button>
          <h2 style={{ fontSize: 16, fontWeight: 500 }}>Historial de gastos</h2>
        </div>
        {fechas.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", paddingTop: 40 }}>Sin gastos registrados</p>
        )}
        {fechas.map((f) => {
          const [y, m, d] = f.split("-");
          const label = `${d}/${m}/${y}`;
          const total = grouped[f].reduce((a, g) => a + g.monto, 0);
          return (
            <div key={f} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{fmt(total)}</span>
              </div>
              {grouped[f].map((g) => {
                const catInfo = CATS_DIARIAS.find((c) => c.id === g.cat);
                return (
                  <div key={g.id} style={styles.histItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={styles.iconCircle}><i className={`ti ${catInfo?.icon || "ti-dots"}`} style={{ fontSize: 14 }} /></div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{g.desc || catInfo?.label}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{catInfo?.label}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-danger)" }}>−{fmt(g.monto)}</span>
                      <button style={styles.delBtn} onClick={() => handleEliminar(g.id)}><i className="ti ti-x" style={{ fontSize: 13 }} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ---- CATEGORÍAS ----
  if (tab === "cats") {
    return (
      <div style={{ padding: "1.5rem 0 3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button style={styles.btnBack} onClick={() => setTab("home")}><i className="ti ti-arrow-left" /></button>
          <h2 style={{ fontSize: 16, fontWeight: 500 }}>Por categoría</h2>
        </div>
        {CATS_DIARIAS.filter((c) => porCategoria[c.id] > 0).length === 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", paddingTop: 40 }}>Sin gastos aún</p>
        )}
        {CATS_DIARIAS.filter((c) => porCategoria[c.id] > 0).sort((a, b) => porCategoria[b.id] - porCategoria[a.id]).map((c) => {
          const monto = porCategoria[c.id];
          const pctCat = totalGastado > 0 ? (monto / totalGastado) * 100 : 0;
          return (
            <div key={c.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 15, color: "var(--color-text-secondary)" }} />
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{c.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{pctCat.toFixed(1)}%</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-danger)" }}>{fmt(monto)}</span>
                </div>
              </div>
              <div style={styles.barBg}>
                <div style={{ ...styles.barFill, width: pctCat + "%", background: "var(--color-text-info)" }} />
              </div>
            </div>
          );
        })}
        {totalGastado > 0 && (
          <div style={{ ...styles.card, marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Total gastado</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{fmt(totalGastado)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- HOME ----
  return (
    <div style={{ padding: "1rem 0 3rem", position: "relative" }}>
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "warn" ? "var(--color-background-warning)" : "var(--color-background-success)",
          color: toast.type === "warn" ? "var(--color-text-warning)" : "var(--color-text-success)",
          padding: "8px 18px", borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500,
          border: "0.5px solid", zIndex: 999, pointerEvents: "none",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>
            {fechaInicio} → {fechaSueldo}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 500 }}>Mis finanzas</h2>
        </div>
        <button style={styles.btnBack} onClick={() => setEditSetup(true)} title="Editar configuración">
          <i className="ti ti-settings" />
        </button>
      </div>

      {/* Hero cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Restante libre</div>
          <div style={{ ...styles.metricVal, color: restante < 0 ? "var(--color-text-danger)" : restante < presupuestoLibre * 0.2 ? "var(--color-text-warning)" : "var(--color-text-success)" }}>
            {fmt(restante)}
          </div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Diario disponible</div>
          <div style={{ ...styles.metricVal, color: diarioDisponible < 10000 ? "var(--color-text-danger)" : "var(--color-text-primary)" }}>
            {fmt(diarioDisponible)}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Ingreso</div>
          <div style={{ ...styles.metricVal, fontSize: 15 }}>{fmt(setup.ingreso || 0)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Fijos</div>
          <div style={{ ...styles.metricVal, fontSize: 15, color: "var(--color-text-warning)" }}>{fmt(totalFijos)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Días rest.</div>
          <div style={{ ...styles.metricVal, fontSize: 15 }}>{diasRestantes}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>
          <span>Gastado: {fmt(totalGastado)}</span>
          <span>{pct.toFixed(1)}% del presupuesto libre</span>
        </div>
        <div style={styles.barBg}>
          <div style={{ ...styles.barFill, width: pct + "%", background: barColor }} />
        </div>
      </div>

      {/* Registro de gasto */}
      <div style={styles.card}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "var(--color-text-primary)" }}>Registrar gasto</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={styles.label}>Monto ($)</label>
            <input style={styles.input} type="number" placeholder="ej: 8500" value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAgregarGasto()} />
          </div>
          <div>
            <label style={styles.label}>Fecha</label>
            <input style={styles.input} type="date" value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={styles.label}>Categoría</label>
          <select style={styles.input} value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
            {CATS_DIARIAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>Descripción (opcional)</label>
          <input style={styles.input} type="text" placeholder="ej: Coto, café, colectivo..." value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleAgregarGasto()} />
        </div>
        <button style={styles.btnPrimary} onClick={handleAgregarGasto}>
          <i className="ti ti-plus" style={{ marginRight: 6 }} />Registrar gasto
        </button>
      </div>

      {/* Top categorías */}
      {topCats.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={styles.sectionLabel}>Top categorías</span>
            <button style={styles.btnLink} onClick={() => setTab("cats")}>Ver todas <i className="ti ti-arrow-right" /></button>
          </div>
          {topCats.slice(0, 5).map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 15, color: "var(--color-text-secondary)" }} />
                <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{c.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-danger)" }}>{fmt(porCategoria[c.id])}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        <button style={styles.navBtn} onClick={() => setTab("historial")}><i className="ti ti-list" /><span>Historial</span></button>
        <button style={styles.navBtn} onClick={() => setTab("cats")}><i className="ti ti-chart-bar" /><span>Categorías</span></button>
        <button style={styles.navBtn} onClick={() => setTab("fijos")}><i className="ti ti-lock" /><span>Fijos</span></button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-lg)",
    padding: "16px",
    marginBottom: 16,
  },
  metricCard: {
    background: "var(--color-background-secondary)",
    borderRadius: "var(--border-radius-md)",
    padding: "12px",
  },
  metricLabel: { fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" },
  metricVal: { fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" },
  label: { display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 },
  input: { width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, fontFamily: "inherit" },
  btnPrimary: { width: "100%", padding: "10px", borderRadius: "var(--border-radius-md)", border: "none", background: "#0F6E56", color: "#E1F5EE", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  btn: { width: "100%", padding: "10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, cursor: "pointer" },
  btnBack: { background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16 },
  btnLink: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-info)", display: "flex", alignItems: "center", gap: 4 },
  delBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: "2px 4px" },
  barBg: { background: "var(--color-background-secondary)", borderRadius: 99, height: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, transition: "width 0.4s" },
  histItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" },
  iconCircle: { width: 30, height: 30, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)", flexShrink: 0 },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" },
  bottomNav: { display: "flex", justifyContent: "space-around", marginTop: 28, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" },
  navBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 11, padding: "4px 12px" },
};
