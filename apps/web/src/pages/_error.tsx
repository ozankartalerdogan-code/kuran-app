// pages/_error.tsx — styled-jsx kullanmayan minimal hata sayfası.
// Next.js'in /_error statik sayfa üretiminde styled-jsx çift-React
// instance hatasını bypass etmek için gereklidir.
function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 48, color: "#ccc" }}>{statusCode ?? "Hata"}</h1>
      <p style={{ color: "#666" }}>
        {statusCode === 404
          ? "Sayfa bulunamadı"
          : "Beklenmeyen bir hata oluştu"}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode?: number }; err?: { statusCode?: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default Error;
