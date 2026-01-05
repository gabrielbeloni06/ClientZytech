"use client";

import { useState } from "react";

export default function Home() {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function gerarQR() {
    setLoading(true);
    setQr(null);

    const res = await fetch("/api/evolution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceName: "bo21" })
    });

    const data = await res.json();

    if (data.status === "qrcode") {
      setQr(data.qrcode);
    } else if (data.status === "connected") {
      alert("Já conectado!");
    } else {
      alert("Ainda carregando, tenta de novo");
    }

    setLoading(false);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Evolution QR Code</h1>

      <button onClick={gerarQR} disabled={loading}>
        {loading ? "Gerando..." : "Gerar QR Code"}
      </button>

      {qr && (
        <div style={{ marginTop: 20 }}>
          <p>Escaneie no WhatsApp:</p>
          <img src={qr} alt="QR Code" />
        </div>
      )}
    </main>
  );
}
