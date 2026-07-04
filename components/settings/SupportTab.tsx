export function SupportTab() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="mb-1 text-sm font-medium">Besoin d'aide ?</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Décrivez votre problème directement à Toumaï AI dans le chat — questions
          sur une fonctionnalité, bug rencontré, ou suggestion. Pour un contact
          direct avec l'équipe :
        </p>
        <a
          href="mailto:contact@toumaiai.com"
          className="mt-2 inline-block text-sm font-medium"
          style={{ color: "var(--primary-light)" }}
        >
          contact@toumaiai.com
        </a>
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-sm font-medium">Guide rapide</p>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>
            <span className="font-medium text-[var(--text-primary)]">Connecteurs</span> — reliez
            Google Agenda, Mail ou WhatsApp depuis l'onglet Connecteurs pour que
            Toumaï AI puisse agir dessus.
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">Agent Navigateur</span> —
            confiez une tâche web (rechercher, remplir un formulaire) depuis le
            menu « + » du chat.
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">Mode vocal</span> — l'icône à
            côté du micro lance une conversation orale complète.
          </li>
          <li>
            <span className="font-medium text-[var(--text-primary)]">Réflexion</span> — passez sur
            Toumaï 5 dans le sélecteur de modèle pour un raisonnement plus
            approfondi sur les tâches complexes.
          </li>
        </ul>
      </div>
    </div>
  );
}
