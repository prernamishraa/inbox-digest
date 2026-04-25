import { Suspense } from "react";
import { DigestContent } from "./DigestContent";

export default async function DigestPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense fallback={<DigestShell />}>
      <DigestContent username={username} />
    </Suspense>
  );
}

function DigestShell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F0E8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid rgba(45,80,22,0.12)",
          borderTopColor: "rgba(45,80,22,0.60)",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
