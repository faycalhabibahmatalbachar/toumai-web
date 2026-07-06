import { Panel } from "./Rows";

export function SupportTab() {
  return (
    <div>
      <Panel title="Contact">
        <div className="px-5 py-4">
          <p className="text-sm font-medium text-[var(--cx-text-primary)]">Besoin d&apos;aide ?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">
            Décrivez votre problème directement à Toumaï AI dans le chat — questions sur une
            fonctionnalité, bug rencontré, ou suggestion. Pour un contact direct avec l&apos;équipe :
          </p>
          <a
            href="mailto:contact@toumaiai.com"
            className="mt-2 inline-block text-sm font-medium text-[var(--cx-accent-text)] transition hover:text-[var(--cx-accent-hover)]"
          >
            contact@toumaiai.com
          </a>
        </div>
      </Panel>

      <Panel title="Guide rapide">
        <ul>
          {[
            {
              t: "Connecteurs",
              d: "Reliez Google Agenda, Mail ou WhatsApp depuis l'onglet Connecteurs pour que Toumaï AI puisse agir dessus.",
            },
            {
              t: "Agent Navigateur",
              d: "Confiez une tâche web (rechercher, remplir un formulaire) depuis le menu « + » du chat.",
            },
            {
              t: "Mode vocal",
              d: "L'icône à côté du micro lance une conversation orale complète.",
            },
            {
              t: "Réflexion",
              d: "Passez sur Toumaï 5 dans le sélecteur de modèle pour un raisonnement plus approfondi sur les tâches complexes.",
            },
          ].map((g) => (
            <li
              key={g.t}
              className="border-t border-[var(--cx-border-subtle)] px-5 py-3.5 first:border-t-0"
            >
              <p className="text-sm font-medium text-[var(--cx-text-primary)]">{g.t}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">
                {g.d}
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
