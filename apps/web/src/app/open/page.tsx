"use client";
// Deep link test sayfası — kuranyolu:// scheme
export default function OpenPage() {
  const links = [
    { label: "Ana Sayfa",        url: "kuranyolu://"                     },
    { label: "Bakara 255 (Ayetel Kürsi)", url: "kuranyolu://ayah/2/255"  },
    { label: "Fatiha Suresi",    url: "kuranyolu://surah/1"              },
    { label: "Namaz Ayetleri",   url: "kuranyolu://search?tag=namaz-genel" },
    { label: "Keşfet",           url: "kuranyolu://kesfet"               },
  ];

  return (
    <main style={{ fontFamily: "sans-serif", padding: 32, maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Kuran Yolu — Deep Link Test</h1>
      <p style={{ color: "#666", marginBottom: 24, fontSize: 14 }}>
        Telefonunuzda Kuran Yolu kuruluysa aşağıdaki linkler uygulamayı açar.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {links.map(l => (
          <a
            key={l.url}
            href={l.url}
            style={{
              display: "block",
              backgroundColor: "#059669",
              color: "#fff",
              padding: "14px 20px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {l.label}
            <span style={{ display: "block", fontSize: 11, opacity: 0.75, marginTop: 2 }}>
              {l.url}
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
