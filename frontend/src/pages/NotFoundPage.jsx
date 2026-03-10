export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20" data-testid="not-found-page">
      <h1 className="text-6xl font-bold text-slate-900 font-[Manrope]">404</h1>
      <p className="mt-4 text-lg text-slate-500 font-[IBM_Plex_Sans]">Pagina nao encontrada</p>
      <a
        href="/"
        className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
        data-testid="back-home-link"
      >
        Voltar ao inicio
      </a>
    </div>
  );
}
