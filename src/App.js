import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const motivosRetificacao = [
  "Análise preliminar",
  "Despacho decisório",
  "Preventiva",
  "Proposta específica",
  "Exigência do cliente",
  "Abertura de créditos",
  "Pedido de restituição",
];

const empresaInicial = {
  razao_social: "",
  cnpj: "",
  motivo: "",
  status: "Triagem",
  data_inicio: "",
  data_conclusao: "",
  observacao: "",
  observacao2: "",
};

const empresaTimeInicial = {
  retificador_id: "",
  razao_social: "",
  erro: "",
  nivel: "Resolvo",
  verificacao: "Aguardando",
  status: "Estou resolvendo",
  data_devolucao: "",
};

const baseInicial = {
  titulo: "",
  descricao: "",
  solucao: "",
  file: null,
};

export default function App() {
  const [aba, setAba] = useState("dashboard");
  const [carregando, setCarregando] = useState(true);

  const [retificadores, setRetificadores] = useState([]);
  const [minhasEmpresas, setMinhasEmpresas] = useState([]);
  const [empresasTime, setEmpresasTime] = useState([]);
  const [base, setBase] = useState([]);

  const [nomeRetificador, setNomeRetificador] = useState("");
  const [editandoRetificadorId, setEditandoRetificadorId] = useState(null);
  const [retificadorEdicao, setRetificadorEdicao] = useState({
    nome: "",
    status: "Ativo",
  });

  const [novaEmpresa, setNovaEmpresa] = useState(empresaInicial);
  const [editandoEmpresaId, setEditandoEmpresaId] = useState(null);
  const [empresaEdicao, setEmpresaEdicao] = useState(empresaInicial);

  const [novaEmpresaTime, setNovaEmpresaTime] = useState(empresaTimeInicial);
  const [editandoEmpresaTimeId, setEditandoEmpresaTimeId] = useState(null);
  const [empresaTimeEdicao, setEmpresaTimeEdicao] =
    useState(empresaTimeInicial);

  const [novoBase, setNovoBase] = useState(baseInicial);

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    setCarregando(true);

    const [r, e, t, b] = await Promise.all([
      supabase
        .from("retificadores")
        .select("*")
        .order("id", { ascending: true }),
      supabase
        .from("minhas_empresas")
        .select("*")
        .order("id", { ascending: false }),
      supabase
        .from("empresas_time")
        .select("*")
        .order("id", { ascending: false }),
      supabase
        .from("base_conhecimento")
        .select("*")
        .order("id", { ascending: false }),
    ]);

    setRetificadores(r.data || []);
    setMinhasEmpresas(e.data || []);
    setEmpresasTime(t.data || []);
    setBase(b.data || []);
    setCarregando(false);
  }

  const retificadoresAtivos = useMemo(
    () => retificadores.filter((r) => (r.status || "Ativo") === "Ativo"),
    [retificadores]
  );

  const dashboard = useMemo(() => {
    const emTriagem = minhasEmpresas.filter(
      (e) => (e.status || "") === "Triagem"
    ).length;
    const paraRetificar = minhasEmpresas.filter(
      (e) => (e.status || "") === "Retificar"
    ).length;
    const emAndamento = minhasEmpresas.filter(
      (e) =>
        !!e.data_inicio &&
        !e.data_conclusao &&
        ((e.status || "") === "Retificar" ||
          (e.status || "") === "Retificação em andamento")
    ).length;
    const concluidas = minhasEmpresas.filter((e) => !!e.data_conclusao).length;

    return {
      empresas: minhasEmpresas.length,
      erros: empresasTime.length,
      retificadores: retificadores.length,
      ativos: retificadoresAtivos.length,
      emTriagem,
      paraRetificar,
      emAndamento,
      concluidas,
      resolvidos: empresasTime.filter((e) => e.status === "Devolvido corrigido")
        .length,
    };
  }, [minhasEmpresas, empresasTime, retificadores, retificadoresAtivos]);

  function nomeDoRetificador(id) {
    return retificadores.find((r) => String(r.id) === String(id))?.nome || "-";
  }

  async function addRetificador() {
    setMensagem("");
    if (!nomeRetificador.trim()) return;

    const { error } = await supabase
      .from("retificadores")
      .insert([{ nome: nomeRetificador.trim(), status: "Ativo" }]);

    if (error) {
      setMensagem("Erro ao cadastrar retificador.");
      return;
    }

    setNomeRetificador("");
    setMensagem("Retificador cadastrado com sucesso.");
    carregarTudo();
  }

  function iniciarEdicaoRetificador(r) {
    setEditandoRetificadorId(r.id);
    setRetificadorEdicao({
      nome: r.nome || "",
      status: r.status || "Ativo",
    });
  }

  async function salvarRetificador() {
    const { error } = await supabase
      .from("retificadores")
      .update({
        nome: retificadorEdicao.nome,
        status: retificadorEdicao.status,
      })
      .eq("id", editandoRetificadorId);

    if (error) {
      setMensagem("Erro ao salvar retificador.");
      return;
    }

    setEditandoRetificadorId(null);
    setMensagem("Retificador atualizado com sucesso.");
    carregarTudo();
  }

  async function toggleRetificador(r) {
    const novo = (r.status || "Ativo") === "Ativo" ? "Inativo" : "Ativo";

    const { error } = await supabase
      .from("retificadores")
      .update({ status: novo })
      .eq("id", r.id);

    if (error) {
      setMensagem("Erro ao alterar status.");
      return;
    }

    setMensagem(
      `Retificador ${novo === "Ativo" ? "ativado" : "inativado"} com sucesso.`
    );
    carregarTudo();
  }

  async function addEmpresa() {
    setMensagem("");
    if (!novaEmpresa.razao_social.trim()) return;

    const payload = {
      ...novaEmpresa,
      status: novaEmpresa.data_conclusao
        ? "Retificação concluída"
        : novaEmpresa.data_inicio && novaEmpresa.status === "Retificar"
        ? "Retificação em andamento"
        : novaEmpresa.status,
    };

    const { error } = await supabase.from("minhas_empresas").insert([payload]);

    if (error) {
      setMensagem("Erro ao salvar empresa.");
      return;
    }

    setNovaEmpresa(empresaInicial);
    setMensagem("Empresa cadastrada com sucesso.");
    carregarTudo();
  }

  function iniciarEdicaoEmpresa(e) {
    setEditandoEmpresaId(e.id);
    setEmpresaEdicao({
      razao_social: e.razao_social || "",
      cnpj: e.cnpj || "",
      motivo: e.motivo || "",
      status: e.status || "Triagem",
      data_inicio: e.data_inicio || "",
      data_conclusao: e.data_conclusao || "",
      observacao: e.observacao || "",
      observacao2: e.observacao2 || "",
    });
  }

  async function salvarEmpresa() {
    const payload = {
      ...empresaEdicao,
      status: empresaEdicao.data_conclusao
        ? "Retificação concluída"
        : empresaEdicao.data_inicio && empresaEdicao.status === "Retificar"
        ? "Retificação em andamento"
        : empresaEdicao.status,
    };

    const { error } = await supabase
      .from("minhas_empresas")
      .update(payload)
      .eq("id", editandoEmpresaId);

    if (error) {
      setMensagem("Erro ao atualizar empresa.");
      return;
    }

    setEditandoEmpresaId(null);
    setMensagem("Empresa atualizada com sucesso.");
    carregarTudo();
  }

  async function addEmpresaTime() {
    setMensagem("");
    if (!novaEmpresaTime.razao_social.trim() || !novaEmpresaTime.erro.trim())
      return;

    const { error } = await supabase
      .from("empresas_time")
      .insert([novaEmpresaTime]);

    if (error) {
      setMensagem("Erro ao salvar empresa do time.");
      return;
    }

    setNovaEmpresaTime(empresaTimeInicial);
    setMensagem("Empresa do time cadastrada com sucesso.");
    carregarTudo();
  }

  function iniciarEdicaoEmpresaTime(e) {
    setEditandoEmpresaTimeId(e.id);
    setEmpresaTimeEdicao({
      retificador_id: e.retificador_id || "",
      razao_social: e.razao_social || "",
      erro: e.erro || "",
      nivel: e.nivel || "Resolvo",
      verificacao: e.verificacao || "Aguardando",
      status: e.status || "Estou resolvendo",
      data_devolucao: e.data_devolucao || "",
    });
  }

  async function salvarEmpresaTime() {
    const { error } = await supabase
      .from("empresas_time")
      .update(empresaTimeEdicao)
      .eq("id", editandoEmpresaTimeId);

    if (error) {
      setMensagem("Erro ao atualizar empresa do time.");
      return;
    }

    setEditandoEmpresaTimeId(null);
    setMensagem("Empresa do time atualizada com sucesso.");
    carregarTudo();
  }

  async function addBase() {
    setMensagem("");
    if (!novoBase.titulo.trim()) return;

    let url = "";

    if (novoBase.file) {
      const fileName = `${Date.now()}_${novoBase.file.name}`;

      const upload = await supabase.storage
        .from("base-conhecimento-retificacoes")
        .upload(fileName, novoBase.file, { upsert: true });

      if (upload.error) {
        setMensagem("Erro ao enviar imagem.");
        return;
      }

      const { data } = supabase.storage
        .from("base-conhecimento-retificacoes")
        .getPublicUrl(fileName);

      url = data.publicUrl;
    }

    const { error } = await supabase.from("base_conhecimento").insert([
      {
        titulo: novoBase.titulo,
        descricao: novoBase.descricao,
        solucao: novoBase.solucao,
        imagem_url: url,
      },
    ]);

    if (error) {
      setMensagem("Erro ao salvar base de conhecimento.");
      return;
    }

    setNovoBase(baseInicial);
    setMensagem("Base de conhecimento cadastrada com sucesso.");
    carregarTudo();
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #eef3f9 0%, #f8fbff 100%)",
      fontFamily: "Inter, Arial, sans-serif",
      padding: 28,
      color: "#0f172a",
    },
    container: {
      maxWidth: 1320,
      margin: "0 auto",
    },
    hero: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      borderRadius: 28,
      padding: 28,
      color: "#fff",
      boxShadow: "0 18px 48px rgba(15,23,42,0.18)",
      marginBottom: 22,
    },
    heroTitle: {
      fontSize: 38,
      fontWeight: 800,
      margin: 0,
      letterSpacing: "-0.03em",
    },
    heroText: {
      marginTop: 10,
      color: "#d7e4f5",
      maxWidth: 780,
      lineHeight: 1.5,
    },
    tabs: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 20,
    },
    tab: (active) => ({
      border: "none",
      borderRadius: 999,
      padding: "12px 16px",
      fontWeight: 700,
      cursor: "pointer",
      background: active ? "#fff" : "rgba(255,255,255,0.12)",
      color: active ? "#0f172a" : "#fff",
    }),
    section: {
      background: "#fff",
      borderRadius: 24,
      padding: 22,
      boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
      marginBottom: 20,
    },
    sectionTitle: {
      margin: 0,
      fontSize: 24,
      fontWeight: 800,
    },
    subtitle: {
      marginTop: 6,
      color: "#64748b",
      marginBottom: 16,
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      gap: 18,
    },
    grid3: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
    },
    grid4: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 14,
    },
    inputGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
      marginBottom: 16,
    },
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 6,
      color: "#334155",
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid #d7e0ea",
      borderRadius: 14,
      padding: "12px 14px",
      fontSize: 14,
      background: "#fff",
    },
    textarea: {
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid #d7e0ea",
      borderRadius: 14,
      padding: "12px 14px",
      fontSize: 14,
      minHeight: 110,
      resize: "vertical",
      background: "#fff",
    },
    btnPrimary: {
      border: "none",
      borderRadius: 14,
      padding: "12px 18px",
      fontWeight: 800,
      background: "#0f172a",
      color: "#fff",
      cursor: "pointer",
    },
    btnSecondary: {
      border: "1px solid #cbd5e1",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 700,
      background: "#fff",
      color: "#334155",
      cursor: "pointer",
    },
    btnDanger: {
      border: "1px solid #fecdd3",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 700,
      background: "#fff1f2",
      color: "#be123c",
      cursor: "pointer",
    },
    btnSuccess: {
      border: "1px solid #a7f3d0",
      borderRadius: 12,
      padding: "10px 14px",
      fontWeight: 700,
      background: "#ecfdf5",
      color: "#166534",
      cursor: "pointer",
    },
    actions: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    },
    cardMetric: (bg, border, color) => ({
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 20,
      padding: 16,
      color,
    }),
    metricLabel: {
      fontSize: 13,
      opacity: 0.9,
    },
    metricValue: {
      marginTop: 8,
      fontSize: 32,
      fontWeight: 800,
      lineHeight: 1,
    },
    badge: (status) => ({
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      fontWeight: 800,
      fontSize: 12,
      background: status === "Ativo" ? "#ecfdf5" : "#fff1f2",
      color: status === "Ativo" ? "#166534" : "#be123c",
      border: `1px solid ${status === "Ativo" ? "#a7f3d0" : "#fecdd3"}`,
    }),
    rowCard: {
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      alignItems: "center",
      background: "#f8fafc",
      borderRadius: 18,
      padding: "14px 16px",
      marginBottom: 10,
    },
    message: {
      marginBottom: 16,
      padding: "12px 14px",
      borderRadius: 14,
      background: "#eff6ff",
      color: "#1d4ed8",
      fontWeight: 700,
    },
    tableWrap: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 980,
    },
    th: {
      textAlign: "left",
      fontSize: 13,
      color: "#64748b",
      fontWeight: 800,
      padding: "12px 10px",
      borderBottom: "1px solid #e2e8f0",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px 10px",
      borderBottom: "1px solid #f1f5f9",
      verticalAlign: "top",
      fontSize: 14,
    },
    editBox: {
      marginTop: 16,
      marginBottom: 18,
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 18,
      padding: 18,
    },
    empty: {
      padding: 26,
      borderRadius: 18,
      textAlign: "center",
      color: "#64748b",
      background: "#f8fafc",
      border: "1px dashed #cbd5e1",
    },
    image: {
      marginTop: 12,
      maxWidth: 220,
      borderRadius: 14,
      border: "1px solid #e2e8f0",
    },
  };

  const MetricCard = ({ label, value, bg, border, color }) => (
    <div style={styles.cardMetric(bg, border, color)}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );

  if (carregando) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.section}>Carregando sistema...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Dashboard de Retificações</h1>
          <div style={styles.heroText}>
            Controle centralizado das suas empresas, demandas do time, base de
            conhecimento e acompanhamento operacional.
          </div>

          <div style={styles.tabs}>
            <button
              style={styles.tab(aba === "dashboard")}
              onClick={() => setAba("dashboard")}
            >
              Dashboard
            </button>
            <button
              style={styles.tab(aba === "retificadores")}
              onClick={() => setAba("retificadores")}
            >
              Retificadores
            </button>
            <button
              style={styles.tab(aba === "empresas")}
              onClick={() => setAba("empresas")}
            >
              Minhas Empresas
            </button>
            <button
              style={styles.tab(aba === "time")}
              onClick={() => setAba("time")}
            >
              Empresas do Time
            </button>
            <button
              style={styles.tab(aba === "base")}
              onClick={() => setAba("base")}
            >
              Base
            </button>
          </div>
        </div>

        {mensagem ? <div style={styles.message}>{mensagem}</div> : null}

        {aba === "dashboard" && (
          <>
            <div style={styles.grid2}>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Resumo geral</h2>
                <div style={styles.subtitle}>Visão rápida do sistema</div>
                <div style={styles.grid4}>
                  <MetricCard
                    label="Empresas"
                    value={dashboard.empresas}
                    bg="#eff6ff"
                    border="#bfdbfe"
                    color="#1d4ed8"
                  />
                  <MetricCard
                    label="Erros"
                    value={dashboard.erros}
                    bg="#fff1f2"
                    border="#fecdd3"
                    color="#be123c"
                  />
                  <MetricCard
                    label="Retificadores"
                    value={dashboard.retificadores}
                    bg="#f8fafc"
                    border="#cbd5e1"
                    color="#0f172a"
                  />
                  <MetricCard
                    label="Ativos"
                    value={dashboard.ativos}
                    bg="#ecfdf5"
                    border="#a7f3d0"
                    color="#166534"
                  />
                </div>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Status das empresas</h2>
                <div style={styles.subtitle}>Etapas da sua carteira</div>
                <div style={styles.grid4}>
                  <MetricCard
                    label="Triagem"
                    value={dashboard.emTriagem}
                    bg="#fffbeb"
                    border="#fde68a"
                    color="#92400e"
                  />
                  <MetricCard
                    label="Retificar"
                    value={dashboard.paraRetificar}
                    bg="#eff6ff"
                    border="#bfdbfe"
                    color="#1d4ed8"
                  />
                  <MetricCard
                    label="Em andamento"
                    value={dashboard.emAndamento}
                    bg="#f8fafc"
                    border="#cbd5e1"
                    color="#0f172a"
                  />
                  <MetricCard
                    label="Concluídas"
                    value={dashboard.concluidas}
                    bg="#ecfdf5"
                    border="#a7f3d0"
                    color="#166534"
                  />
                </div>
              </div>
            </div>

            <div style={styles.grid2}>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Time</h2>
                <div style={styles.subtitle}>Status dos casos recebidos</div>
                <div style={styles.grid3}>
                  <MetricCard
                    label="Recebidos"
                    value={dashboard.erros}
                    bg="#eff6ff"
                    border="#bfdbfe"
                    color="#1d4ed8"
                  />
                  <MetricCard
                    label="Resolvidos"
                    value={dashboard.resolvidos}
                    bg="#ecfdf5"
                    border="#a7f3d0"
                    color="#166534"
                  />
                  <MetricCard
                    label="Pendentes"
                    value={dashboard.erros - dashboard.resolvidos}
                    bg="#fff1f2"
                    border="#fecdd3"
                    color="#be123c"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {aba === "retificadores" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Retificadores</h2>
            <div style={styles.subtitle}>
              Cadastro, edição e controle de status
            </div>

            <div
              style={{
                ...styles.inputGrid,
                gridTemplateColumns: "minmax(260px, 400px)",
              }}
            >
              <div>
                <label style={styles.label}>Nome do retificador</label>
                <input
                  style={styles.input}
                  value={nomeRetificador}
                  onChange={(e) => setNomeRetificador(e.target.value)}
                  placeholder="Ex.: Retificadora 5"
                />
              </div>
            </div>

            <button style={styles.btnPrimary} onClick={addRetificador}>
              Adicionar
            </button>

            {editandoRetificadorId && (
              <div style={styles.editBox}>
                <h3 style={{ marginTop: 0 }}>Editar retificador</h3>
                <div style={styles.inputGrid}>
                  <div>
                    <label style={styles.label}>Nome</label>
                    <input
                      style={styles.input}
                      value={retificadorEdicao.nome}
                      onChange={(e) =>
                        setRetificadorEdicao({
                          ...retificadorEdicao,
                          nome: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Status</label>
                    <select
                      style={styles.input}
                      value={retificadorEdicao.status}
                      onChange={(e) =>
                        setRetificadorEdicao({
                          ...retificadorEdicao,
                          status: e.target.value,
                        })
                      }
                    >
                      <option>Ativo</option>
                      <option>Inativo</option>
                    </select>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button style={styles.btnPrimary} onClick={salvarRetificador}>
                    Salvar edição
                  </button>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => setEditandoRetificadorId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              {retificadores.length === 0 ? (
                <div style={styles.empty}>Nenhum retificador cadastrado.</div>
              ) : (
                retificadores.map((r) => (
                  <div key={r.id} style={styles.rowCard}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{r.nome}</div>
                      <div style={{ marginTop: 6 }}>
                        <span style={styles.badge(r.status || "Ativo")}>
                          {r.status || "Ativo"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.actions}>
                      <button
                        style={styles.btnSecondary}
                        onClick={() => iniciarEdicaoRetificador(r)}
                      >
                        Editar
                      </button>
                      {(r.status || "Ativo") === "Ativo" ? (
                        <button
                          style={styles.btnDanger}
                          onClick={() => toggleRetificador(r)}
                        >
                          Inativar
                        </button>
                      ) : (
                        <button
                          style={styles.btnSuccess}
                          onClick={() => toggleRetificador(r)}
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {aba === "empresas" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Minhas Empresas</h2>
            <div style={styles.subtitle}>
              Cadastro e acompanhamento da sua carteira
            </div>

            <div style={styles.inputGrid}>
              <div>
                <label style={styles.label}>Razão social</label>
                <input
                  style={styles.input}
                  value={novaEmpresa.razao_social}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      razao_social: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>CNPJ</label>
                <input
                  style={styles.input}
                  value={novaEmpresa.cnpj}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Motivo</label>
                <select
                  style={styles.input}
                  value={novaEmpresa.motivo}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, motivo: e.target.value })
                  }
                >
                  <option value="">Selecionar</option>
                  {motivosRetificacao.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={novaEmpresa.status}
                  onChange={(e) =>
                    setNovaEmpresa({ ...novaEmpresa, status: e.target.value })
                  }
                >
                  <option>Triagem</option>
                  <option>Retificar</option>
                  <option>Não retificar</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Data início</label>
                <input
                  type="date"
                  style={styles.input}
                  value={novaEmpresa.data_inicio}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      data_inicio: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Data conclusão</label>
                <input
                  type="date"
                  style={styles.input}
                  value={novaEmpresa.data_conclusao}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      data_conclusao: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Observação</label>
                <textarea
                  style={styles.textarea}
                  value={novaEmpresa.observacao}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      observacao: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Observação 2</label>
                <textarea
                  style={styles.textarea}
                  value={novaEmpresa.observacao2}
                  onChange={(e) =>
                    setNovaEmpresa({
                      ...novaEmpresa,
                      observacao2: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <button style={styles.btnPrimary} onClick={addEmpresa}>
              Salvar empresa
            </button>

            {editandoEmpresaId && (
              <div style={styles.editBox}>
                <h3 style={{ marginTop: 0 }}>Editar empresa</h3>
                <div style={styles.inputGrid}>
                  <div>
                    <label style={styles.label}>Razão social</label>
                    <input
                      style={styles.input}
                      value={empresaEdicao.razao_social}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          razao_social: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>CNPJ</label>
                    <input
                      style={styles.input}
                      value={empresaEdicao.cnpj}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          cnpj: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Motivo</label>
                    <select
                      style={styles.input}
                      value={empresaEdicao.motivo}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          motivo: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecionar</option>
                      {motivosRetificacao.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Status</label>
                    <select
                      style={styles.input}
                      value={empresaEdicao.status}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          status: e.target.value,
                        })
                      }
                    >
                      <option>Triagem</option>
                      <option>Retificar</option>
                      <option>Não retificar</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Data início</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={empresaEdicao.data_inicio}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          data_inicio: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Data conclusão</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={empresaEdicao.data_conclusao}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          data_conclusao: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div style={styles.grid2}>
                  <div>
                    <label style={styles.label}>Observação</label>
                    <textarea
                      style={styles.textarea}
                      value={empresaEdicao.observacao}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          observacao: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Observação 2</label>
                    <textarea
                      style={styles.textarea}
                      value={empresaEdicao.observacao2}
                      onChange={(e) =>
                        setEmpresaEdicao({
                          ...empresaEdicao,
                          observacao2: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div style={styles.actions}>
                  <button style={styles.btnPrimary} onClick={salvarEmpresa}>
                    Salvar edição
                  </button>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => setEditandoEmpresaId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Razão social</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Motivo</th>
                    <th style={styles.th}>Data início</th>
                    <th style={styles.th}>Data conclusão</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {minhasEmpresas.length === 0 ? (
                    <tr>
                      <td style={styles.td} colSpan={6}>
                        <div style={styles.empty}>
                          Nenhuma empresa cadastrada.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    minhasEmpresas.map((e) => (
                      <tr key={e.id}>
                        <td style={styles.td}>{e.razao_social}</td>
                        <td style={styles.td}>{e.status}</td>
                        <td style={styles.td}>{e.motivo || "-"}</td>
                        <td style={styles.td}>{e.data_inicio || "-"}</td>
                        <td style={styles.td}>{e.data_conclusao || "-"}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.btnSecondary}
                            onClick={() => iniciarEdicaoEmpresa(e)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {aba === "time" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Empresas do Time</h2>
            <div style={styles.subtitle}>
              Controle dos erros recebidos do time
            </div>

            <div style={styles.inputGrid}>
              <div>
                <label style={styles.label}>Retificador</label>
                <select
                  style={styles.input}
                  value={novaEmpresaTime.retificador_id}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      retificador_id: e.target.value,
                    })
                  }
                >
                  <option value="">Selecionar</option>
                  {retificadoresAtivos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.label}>Empresa</label>
                <input
                  style={styles.input}
                  value={novaEmpresaTime.razao_social}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      razao_social: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Erro</label>
                <input
                  style={styles.input}
                  value={novaEmpresaTime.erro}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      erro: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Nível</label>
                <select
                  style={styles.input}
                  value={novaEmpresaTime.nivel}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      nivel: e.target.value,
                    })
                  }
                >
                  <option>Resolvo</option>
                  <option>Luiz</option>
                  <option>Falta XML</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Verificação</label>
                <select
                  style={styles.input}
                  value={novaEmpresaTime.verificacao}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      verificacao: e.target.value,
                    })
                  }
                >
                  <option>Aguardando</option>
                  <option>Eu estou vendo</option>
                  <option>Luiz está vendo</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={novaEmpresaTime.status}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Estou resolvendo</option>
                  <option>Com o Luiz</option>
                  <option>Devolvido corrigido</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Data devolução</label>
                <input
                  type="date"
                  style={styles.input}
                  value={novaEmpresaTime.data_devolucao}
                  onChange={(e) =>
                    setNovaEmpresaTime({
                      ...novaEmpresaTime,
                      data_devolucao: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <button style={styles.btnPrimary} onClick={addEmpresaTime}>
              Salvar empresa do time
            </button>

            {editandoEmpresaTimeId && (
              <div style={styles.editBox}>
                <h3 style={{ marginTop: 0 }}>Editar empresa do time</h3>
                <div style={styles.inputGrid}>
                  <div>
                    <label style={styles.label}>Retificador</label>
                    <select
                      style={styles.input}
                      value={empresaTimeEdicao.retificador_id}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          retificador_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecionar</option>
                      {retificadoresAtivos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Empresa</label>
                    <input
                      style={styles.input}
                      value={empresaTimeEdicao.razao_social}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          razao_social: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Erro</label>
                    <input
                      style={styles.input}
                      value={empresaTimeEdicao.erro}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          erro: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Nível</label>
                    <select
                      style={styles.input}
                      value={empresaTimeEdicao.nivel}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          nivel: e.target.value,
                        })
                      }
                    >
                      <option>Resolvo</option>
                      <option>Luiz</option>
                      <option>Falta XML</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Verificação</label>
                    <select
                      style={styles.input}
                      value={empresaTimeEdicao.verificacao}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          verificacao: e.target.value,
                        })
                      }
                    >
                      <option>Aguardando</option>
                      <option>Eu estou vendo</option>
                      <option>Luiz está vendo</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Status</label>
                    <select
                      style={styles.input}
                      value={empresaTimeEdicao.status}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          status: e.target.value,
                        })
                      }
                    >
                      <option>Estou resolvendo</option>
                      <option>Com o Luiz</option>
                      <option>Devolvido corrigido</option>
                    </select>
                  </div>
                  <div>
                    <label style={styles.label}>Data devolução</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={empresaTimeEdicao.data_devolucao}
                      onChange={(e) =>
                        setEmpresaTimeEdicao({
                          ...empresaTimeEdicao,
                          data_devolucao: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div style={styles.actions}>
                  <button style={styles.btnPrimary} onClick={salvarEmpresaTime}>
                    Salvar edição
                  </button>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => setEditandoEmpresaTimeId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Retificador</th>
                    <th style={styles.th}>Empresa</th>
                    <th style={styles.th}>Erro</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Data devolução</th>
                    <th style={styles.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasTime.length === 0 ? (
                    <tr>
                      <td style={styles.td} colSpan={6}>
                        <div style={styles.empty}>
                          Nenhuma empresa do time cadastrada.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    empresasTime.map((e) => (
                      <tr key={e.id}>
                        <td style={styles.td}>
                          {nomeDoRetificador(e.retificador_id)}
                        </td>
                        <td style={styles.td}>{e.razao_social}</td>
                        <td style={styles.td}>{e.erro}</td>
                        <td style={styles.td}>{e.status}</td>
                        <td style={styles.td}>{e.data_devolucao || "-"}</td>
                        <td style={styles.td}>
                          <button
                            style={styles.btnSecondary}
                            onClick={() => iniciarEdicaoEmpresaTime(e)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {aba === "base" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Base de Conhecimento</h2>
            <div style={styles.subtitle}>Registre soluções e anexe imagem</div>

            <div style={styles.inputGrid}>
              <div>
                <label style={styles.label}>Título</label>
                <input
                  style={styles.input}
                  value={novoBase.titulo}
                  onChange={(e) =>
                    setNovoBase({ ...novoBase, titulo: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Descrição</label>
                <textarea
                  style={styles.textarea}
                  value={novoBase.descricao}
                  onChange={(e) =>
                    setNovoBase({ ...novoBase, descricao: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={styles.label}>Solução</label>
                <textarea
                  style={styles.textarea}
                  value={novoBase.solucao}
                  onChange={(e) =>
                    setNovoBase({ ...novoBase, solucao: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Imagem</label>
              <input
                type="file"
                style={styles.input}
                onChange={(e) =>
                  setNovoBase({
                    ...novoBase,
                    file: e.target.files?.[0] || null,
                  })
                }
              />
            </div>

            <button style={styles.btnPrimary} onClick={addBase}>
              Salvar
            </button>

            <div style={{ marginTop: 20 }}>
              {base.length === 0 ? (
                <div style={styles.empty}>
                  Nenhum item na base de conhecimento.
                </div>
              ) : (
                base.map((b) => (
                  <div key={b.id} style={styles.section}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {b.titulo}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong>Descrição:</strong> {b.descricao || "-"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong>Solução:</strong> {b.solucao || "-"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong>Imagem:</strong>{" "}
                      {b.imagem_url ? (
                        <a href={b.imagem_url} target="_blank" rel="noreferrer">
                          Abrir imagem
                        </a>
                      ) : (
                        "Nenhuma"
                      )}
                    </div>
                    {b.imagem_url ? (
                      <img
                        src={b.imagem_url}
                        alt={b.titulo}
                        style={styles.image}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
