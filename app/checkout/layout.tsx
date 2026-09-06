import type { Metadata } from "next";
export const metadata: Metadata = { title: "Votre abonnement", robots: {index:false, follow:false}, alternates: {canonical:"https://toumaiai.com/checkout/",languages:{}} };
export default function Layout({children}:{children:React.ReactNode}){return children;}
