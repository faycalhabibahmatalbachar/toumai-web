import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BulleUtilisateur, SignatureToumai } from "@/components/accueil/demo/primitives";
import s from "./editorial.module.css";

export function EditorialShell({children}:{children:React.ReactNode}) {
 return <div className={s.page}><a className={s.skip} href="#contenu">Aller au contenu</a><header className={s.header}><Link className={s.brand} href="/"><Logo size={30}/>Toumaï AI</Link><Link className={s.primary} href="/chat/">Ouvrir Toumaï ↗</Link></header><main id="contenu" className={s.main}>{children}</main><footer className={s.footer}><span>Toumaï AI · Conçu au Tchad.</span><nav aria-label="Pages liées">{[["/assistant-ia/","Assistant IA"],["/models/","Modèles"],["/a-propos/","À propos"],["/contact/","Contact"],["/security/","Sécurité"],["/privacy/","Confidentialité"],["/terms/","Conditions"]].map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav></footer></div>;
}
export function EditorialSection({id,label,title,children}:{id:string;label:string;title:string;children:React.ReactNode}) {
 return <section id={id} className={s.section}><p className={s.eyebrow}>{label}</p><h2>{title}</h2>{children}</section>;
}
export function EditorialFAQ({items}:{items:{q:string;r:string}[]}) {
 return <EditorialSection id="faq" label="QUESTIONS FRÉQUENTES" title="Avant de commencer."><div className={s.faq}>{items.map(({q,r})=><details key={q}><summary>{q}</summary><p>{r}</p></details>)}</div></EditorialSection>;
}
export function ProductProof() {
 return <figure className={s.proof}><div className={s.windowBar}><span aria-hidden="true">● ● ●</span><span>Toumaï AI / Rédaction</span></div><div className={s.conversation}><BulleUtilisateur>Aide-moi à proposer un rendez-vous à un client à N’Djamena.</BulleUtilisateur><div className={s.answer}><SignatureToumai/><p>Voici une base à personnaliser :</p><blockquote>Bonjour, je souhaite vous proposer un rendez-vous pour discuter de votre projet. Quel créneau vous conviendrait cette semaine ?</blockquote><p>Ajoutez le nom du destinataire et vos disponibilités avant l’envoi.</p></div><div className={s.composer}>Votre prochaine question… <span aria-hidden="true">↑</span></div></div><figcaption>Reproduction de l’interface · exemple illustratif, sans envoi réel. <Link href="/chat/">Essayer dans le chat ↗</Link></figcaption></figure>;
}

