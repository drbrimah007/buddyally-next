import Link from "next/link";
import { AuthRedirect } from "@/components/AuthRedirect";

export default function Home() {
  return (
    <>
      <AuthRedirect />
      <style dangerouslySetInnerHTML={{ __html: `
        :root{--yellow:#ffcf00;--yellow-deep:#ffb800;--pink:#ff0a8a;--blue:#2f8cff;--black:#111111;--white:#ffffff;--tag:#2f8cff}
        .screen{position:fixed;inset:0;overflow:hidden;color:var(--black);background:radial-gradient(circle at center,rgba(255,255,255,0.78) 0%,rgba(255,233,84,0.92) 16%,rgba(255,207,0,1) 46%,rgba(255,184,0,1) 100%)}
        .rays,.rays-2{position:absolute;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none}
        .rays{width:150vmax;height:150vmax;opacity:0.42;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,0.5) 0deg 3deg,rgba(255,207,0,0) 3deg 12deg);animation:spin 40s linear infinite}
        .rays-2{width:118vmax;height:118vmax;opacity:0.18;background:repeating-conic-gradient(from 0deg,rgba(255,102,0,0.55) 0deg 2deg,rgba(255,207,0,0) 2deg 15deg);animation:spinReverse 56s linear infinite}
        .sun-core{position:absolute;left:50%;top:44%;width:min(28vw,240px);height:min(28vw,240px);min-width:160px;min-height:160px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,0.78);filter:blur(30px);animation:pulse 4.5s ease-in-out infinite}
        .splash-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:max(5.2rem,env(safe-area-inset-top)) 1.25rem max(2rem,env(safe-area-inset-bottom))}
        .logo{display:flex;align-items:center;justify-content:center;gap:0.65rem;margin-bottom:1.35rem;animation:dropIn 0.55s cubic-bezier(.22,1,.36,1) both}
        .logo-icon{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#2f8cff,#1f6fe0);display:grid;place-items:center;color:white;font-weight:900;font-size:2.4rem;line-height:1;box-shadow:0 10px 28px rgba(0,0,0,0.18)}
        .logo-word{font-size:clamp(2.1rem,4vw,3.4rem);font-weight:900;letter-spacing:-0.05em}
        .logo-word .buddy{color:#111}
        .logo-word .ally{color:var(--blue)}
        .hero{position:relative;width:100%;max-width:980px}
        .we-on{position:absolute;left:50%;top:0.25rem;transform:translateX(-172%) rotate(-16deg);background:#2f8cff;color:#ffffff;padding:0.18rem 0.38rem;font-family:Inter,Arial,Helvetica,sans-serif;font-size:clamp(1.9rem,3.8vw,2.6rem);font-weight:900;letter-spacing:-0.03em;text-transform:uppercase;border-radius:4px;box-shadow:0 6px 14px rgba(47,140,255,0.22);z-index:6;animation:stickerImpact 0.62s 0.18s cubic-bezier(.175,.885,.32,1.25) both,stickerShake 2.8s 1s ease-in-out infinite}
        .word{font-family:Impact,Haettenschweiler,"Arial Black",sans-serif;font-size:clamp(4.9rem,20vw,11.8rem);line-height:0.88;letter-spacing:-0.09em;text-transform:uppercase;text-shadow:0 12px 24px rgba(0,0,0,0.16);opacity:0}
        .buddy-word{color:var(--pink);animation:slamIn 0.72s 0.28s cubic-bezier(.175,.885,.32,1.2) forwards}
        .ally-word{color:var(--black);animation:slamIn 0.72s 0.42s cubic-bezier(.175,.885,.32,1.2) forwards}
        .summer{margin-top:0.75rem;display:inline-block;background:#000;color:#ffe34d;padding:0.9rem 1.25rem;border-radius:1.1rem;font-size:clamp(1.25rem,4vw,2.6rem);font-weight:900;text-transform:uppercase;letter-spacing:-0.04em;box-shadow:0 18px 45px rgba(0,0,0,0.22);animation:riseIn 0.5s 0.58s cubic-bezier(.22,1,.36,1) both}
        .sub{margin-top:1.2rem;max-width:720px;color:rgba(0,0,0,0.68);font-size:clamp(1rem,2.2vw,1.8rem);font-weight:900;line-height:1.2;animation:fadeIn 0.5s 0.78s both}
        .cta{margin-top:2.8rem;display:inline-flex;align-items:center;justify-content:center;gap:0.8rem;width:min(100%,430px);background:var(--pink);color:white;text-decoration:none;padding:1.2rem 1.4rem;border-radius:1.6rem;font-size:clamp(1.2rem,4vw,2rem);font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;box-shadow:0 22px 60px rgba(255,10,138,0.38);animation:riseIn 0.56s 0.96s cubic-bezier(.22,1,.36,1) both}
        .arrow{display:inline-block;animation:nudge 1.1s ease-in-out infinite}
        .pills{margin-top:1rem;width:min(100%,760px);display:flex;justify-content:center;gap:0.6rem;flex-wrap:wrap;animation:fadeIn 0.5s 1.08s both}
        .pill{background:rgba(255,255,255,0.38);border:1px solid rgba(0,0,0,0.08);border-radius:999px;padding:0.45rem 0.9rem;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:rgba(0,0,0,0.72);backdrop-filter:blur(8px)}
        .footer-glow{position:absolute;inset-inline:0;bottom:0;height:180px;background:linear-gradient(to top,rgba(255,166,0,0.42),transparent);z-index:1}
        @keyframes spin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes spinReverse{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(-360deg)}}
        @keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.72}50%{transform:translate(-50%,-50%) scale(1.08);opacity:1}}
        @keyframes dropIn{from{opacity:0;transform:translateY(-18px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes stickerImpact{0%{opacity:0;transform:translateX(-120%) translateY(-22px) rotate(-24deg) scale(0.72)}65%{opacity:1;transform:translateX(-110%) translateY(3px) rotate(-13deg) scale(1.1)}100%{opacity:1;transform:translateX(-172%) translateY(0) rotate(-16deg) scale(1)}}
        @keyframes stickerShake{0%,86%,100%{transform:translateX(-172%) rotate(-16deg)}89%{transform:translateX(-172%) rotate(-13deg)}92%{transform:translateX(-172%) rotate(-19deg)}95%{transform:translateX(-172%) rotate(-15deg)}}
        @keyframes slamIn{from{opacity:0;transform:translateY(58px) scale(0.8)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes riseIn{from{opacity:0;transform:translateY(18px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
        @media(max-width:700px){.splash-content{justify-content:center;padding-top:max(4.6rem,env(safe-area-inset-top))}.logo{margin-bottom:1rem}.logo-icon{width:48px;height:48px;border-radius:15px;font-size:2.1rem}.word{font-size:clamp(4.8rem,23vw,8rem)}.we-on{top:0.15rem;transform:translateX(-160%) rotate(-16deg);animation:mobileStickerImpact 0.62s 0.18s cubic-bezier(.175,.885,.32,1.25) both,mobileStickerShake 2.8s 1s ease-in-out infinite}}
        @keyframes mobileStickerImpact{0%{opacity:0;transform:translateX(-110%) translateY(-20px) rotate(-24deg) scale(0.72)}65%{opacity:1;transform:translateX(-100%) translateY(2px) rotate(-13deg) scale(1.08)}100%{opacity:1;transform:translateX(-160%) translateY(0) rotate(-16deg) scale(1)}}
        @keyframes mobileStickerShake{0%,86%,100%{transform:translateX(-160%) rotate(-16deg)}89%{transform:translateX(-160%) rotate(-13deg)}92%{transform:translateX(-160%) rotate(-19deg)}95%{transform:translateX(-160%) rotate(-15deg)}}
      `}} />
      <main className="screen">
        <div className="rays"></div>
        <div className="rays-2"></div>
        <div className="sun-core"></div>
        <div className="footer-glow"></div>

        <section className="splash-content">
          <div className="logo">
            <img src="/buddyally-logo-full.png" alt="BuddyAlly" style={{height:'48px',width:'auto'}} />
          </div>

          <div className="hero">
            <div className="we-on"><b>WE ON</b></div>
            <div className="word buddy-word">BUDDY</div>
            <div className="word ally-word">ALLY</div>
          </div>

          <div className="summer">This Summer</div>
          <div className="sub">Real people. Real help. Real motion.</div>

          <Link className="cta" href="/dashboard">
            LINK UP. DO MORE
            <span className="arrow">&rarr;</span>
          </Link>

          <div className="pills">
            <div className="pill">CONNECT</div>
            <div className="pill">COLLAB</div>
            <div className="pill">COME UP</div>
          </div>
          <div className="pills" style={{gridTemplateColumns:'1fr',maxWidth:'260px'}}>
            <div className="pill">MOVE TOGETHER</div>
          </div>

          <Link href="/home" style={{marginTop:'1.2rem',color:'rgba(0,0,0,0.5)',fontSize:'0.85rem',fontWeight:700,textDecoration:'none',animation:'fadeIn 0.5s 1.2s both'}}>
            Skip intro &rarr;
          </Link>
        </section>
      </main>
    </>
  );
}
