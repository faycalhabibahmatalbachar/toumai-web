import Link from "next/link";
import { EditorialShell, ProductProof } from "./Editorial";
import s from "./editorial.module.css";

/** Public editorial content only; never wraps an authenticated dashboard. */
export function EditorialDocument({title,intro,children}:{title:string;intro:string;children:React.ReactNode}) {
 const path = title === "Les modèles Toumaï AI" ? "/models/" : title === "À propos de Toumaï AI" ? "/a-propos/" : "/assistant-ia/";
 const schema = {"@context":"https://schema.org","@graph":[{"@type":"WebPage",url:"https://toumaiai.com"+path,name:title,description:intro,inLanguage:"fr",about:{"@id":"https://toumaiai.com/#organisation"}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Accueil",item:"https://toumaiai.com/"},{"@type":"ListItem",position:2,name:title,item:"https://toumaiai.com"+path}]}]};
 return <EditorialShell><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/><nav aria-label="Fil d’Ariane" className={s.breadcrumb}><Link href="/">Accueil</Link> / {title}</nav><section className={s.hero}><div><p className={s.eyebrow}>TOUMAÏ AI · LE PRODUIT, CONCRÈTEMENT</p><h1>{title}</h1><p className={s.lead}>{intro}</p><div className={s.actions}><Link className={s.primary} href="/chat/">Ouvrir Toumaï ↗</Link><a href="#decouvrir">Découvrir ↓</a></div></div><ProductProof/></section><div id="decouvrir" className={s.document}>{children}</div><section className={s.final}><h2>Une question à explorer ?</h2><Link className={s.primary} href="/chat/">Essayer dans Toumaï ↗</Link><p><Link href="/contact/">Parler de votre besoin à notre équipe</Link></p></section></EditorialShell>;
}
