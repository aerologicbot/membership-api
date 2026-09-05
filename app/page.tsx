const flows = [
  ["01", "Daftarkan", "Tambahkan nomor member dan waktu expired di Supabase."],
  ["02", "Verifikasi", "User menjalankan /start dan membagikan kontak miliknya."],
  ["03", "Undang", "Bot membuat link personal, satu kali pakai, selama 15 menit."],
  ["04", "Tertibkan", "Cron menandai expired lalu mengeluarkan user dari grup."],
];

export default function Home() {
  return <main>
    <nav><span className="mark">A</span><strong>AEROLOGIC ACCESS</strong><span className="badge">DEMO CONTROL</span></nav>
    <section className="hero">
      <div className="eyebrow">TELEGRAM MEMBERSHIP / PROOF OF CONCEPT</div>
      <h1>Akses premium,<br/><em>tanpa celah.</em></h1>
      <p>Supabase menyimpan kebenaran. Telegram mengantar akses. Scheduler memastikan setiap membership berhenti tepat waktu.</p>
      <div className="actions"><a href="/api/health">Periksa sistem <span>↗</span></a><code>GET /api/health</code></div>
    </section>
    <section className="status-strip"><div><i></i>BACKEND READY</div><div>01 GROUP</div><div>01 HOUR DEMO</div><div>15 MIN INVITE</div></section>
    <section className="flow">
      <header><span>CARA KERJA</span><h2>Satu lifecycle.<br/>Empat tahap.</h2></header>
      <div className="grid">{flows.map(([no,title,text]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
    <footer><span>PRIVATE BY DEFAULT</span><span>NEXT.JS × SUPABASE × TELEGRAM</span></footer>
  </main>;
}
