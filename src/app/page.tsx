export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">PromptGen Next.js</h1>
        <p className="text-xl text-muted-foreground">
          Modern AI Image Generation System
        </p>
        <div className="flex gap-4">
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Phase 0</h2>
            <p className="text-sm text-muted-foreground">Project Setup ✅</p>
          </div>
          <div className="rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Phase 1</h2>
            <p className="text-sm text-muted-foreground">Data Layer (In Progress)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
