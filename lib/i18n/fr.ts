/**
 * DICTIONNAIRE DE RÉFÉRENCE — français.
 *
 * Ce fichier définit AUSSI la forme (`Dict`) que les trois autres langues
 * doivent respecter. TypeScript refuse une traduction incomplète : ajouter une
 * phrase ici casse la compilation tant que l'arabe, l'arabe tchadien et
 * l'anglais ne l'ont pas reçue. C'est voulu — une page à moitié traduite est
 * pire qu'une page qui ne l'est pas.
 *
 * POURQUOI QUATRE LANGUES, ET PAS TROIS
 * --------------------------------------
 * L'arabe littéraire et l'arabe tchadien sont deux langues d'interface
 * distinctes, pas deux variantes de style. Un locuteur de N'Djaména lit
 * l'arabe littéraire mais ne le parle pas ; lui servir « كيف حالك » quand il
 * dit « إنت كيف » revient à lui parler la langue de l'école. Toute la promesse
 * du produit tient dans cette différence : elle doit s'entendre dans
 * l'interface elle-même, pas seulement dans les réponses du modèle.
 */

export const LANGS = ["fr", "ar-td", "ar", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_META: Record<Lang, { label: string; native: string; dir: "ltr" | "rtl"; htmlLang: string }> = {
  fr: { label: "Français", native: "Français", dir: "ltr", htmlLang: "fr" },
  // BCP 47 : `shu` est le code ISO 639-3 de l'arabe tchadien (shuwa). `ar-TD`
  // le rattache au Tchad — c'est la forme qu'un navigateur sait interpréter.
  "ar-td": { label: "Arabe tchadien", native: "عربي تشادي", dir: "rtl", htmlLang: "ar-TD" },
  ar: { label: "Arabe", native: "العربية", dir: "rtl", htmlLang: "ar" },
  en: { label: "English", native: "English", dir: "ltr", htmlLang: "en" },
};

export const fr = {
  nav: {
    capacites: "Capacités",
    pourquoi: "Pourquoi Toumaï",
    modeles: "Modèles",
    connecteurs: "Connecteurs",
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    tryFree: "Essayer gratuitement",
    tryShort: "Essayer",
    openApp: "Ouvrir Toumaï AI",
    openShort: "Ouvrir",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
    menu: "Menu",
    skip: "Aller au contenu",
    appearance: "Apparence",
    language: "Langue",
    ariaMain: "Navigation principale",
  },

  hero: {
    badge: "Conçu à N'Djaména, pour le monde",
    titleA: "Parlez comme",
    titleEm: "chez vous.",
    leadA: "Toumaï AI comprend le français, l'anglais et l'arabe — y compris",
    leadStrong: "l'arabe tchadien",
    leadB: ", celui qu'on parle au marché, pas celui des manuels.",
    ctaPrimary: "Commencer gratuitement",
    ctaSecondary: "Voir Toumaï AI à l'œuvre",
    countRegistered: "inscrits",
    countConversations: "conversations",
    trust: ["Gratuit, sans carte bancaire", "Web et WhatsApp, sans installation", "Aucune revente de données"],
    heroImgAlt: "",
  },

  console: {
    aria:
      "Démonstration de Toumaï AI : conversation, arabe tchadien, génération d'image, mode vocal et Agent Navigateur",
    live: "En direct",
    paused: "En pause",
    pause: "Mettre la démonstration en pause",
    resume: "Reprendre la démonstration",
    scenesAria: "Scènes de la démonstration",
    sceneAria: (n: number, total: number, name: string) => `Scène ${n} sur ${total} : ${name}`,
    tabs: {
      fr: "Conversation",
      shu: "Arabe tchadien",
      image: "Image",
      voice: "Voix",
      agent: "Agent Navigateur",
    },
    fr: {
      shotAlt:
        "Toumaï AI sur téléphone : « Rédige un message pour annoncer l'ouverture de ma boutique samedi à N'Djaména. » La réponse propose une annonce complète — Grande ouverture samedi, marché de Dembé dès 8 h, vêtements, accessoires et tissus, prix de lancement toute la journée.",
      ask: "Rédige un message pour annoncer l'ouverture de ma boutique samedi à N'Djaména.",
      thinking: "Sao 4 rédige…",
      answer:
        "Grande ouverture samedi ! Venez découvrir notre boutique au marché de Dembé dès 9 h — offres de lancement toute la journée.",
      chips: ["Plus court", "En arabe", "Version WhatsApp"],
    },
    shu: {
      ask: "Comment on dit « Comment vas-tu aujourd'hui ? » en arabe tchadien ?",
      thinking: "Recherche dans le parler tchadien…",
      answer:
        "C'est la formulation du quotidien. L'arabe littéraire dirait « كيف حالك اليوم؟ » — correct, mais personne ne parle comme ça au marché de N'Djaména.",
      chips: ["Arabe tchadien", "Arabe littéraire", "Français"],
    },
    image: {
      ask: "Génère une image d'un entrepreneur africain moderne dans un bureau élégant.",
      thinking: "Ennedi compose l'image…",
      caption: "Image générée par Toumaï AI",
      chip: "Signature intégrée",
      alt: "Toumaï AI sur téléphone : la demande d'une image d'entrepreneur africain, et l'image rendue juste en dessous, signée Toumaï AI",
    },
    voice: {
      ask: "Rappelle-moi ce qu'on a décidé hier pour la livraison.",
      engine: "KANEM FLASH · RÉPOND À VOIX HAUTE",
      answer: "Livraison le vendredi matin, paiement à la remise. Je vous le remets par écrit ?",
      chips: ["Coupez-la quand vous voulez", "Mains libres"],
    },
    agent: {
      ask: "Trouve les horaires du vol N'Djaména → Abéché de vendredi.",
      searching: "recherche en cours…",
      steps: [
        { label: "Ouvre le moteur de recherche", meta: "recherche" },
        { label: "Compare trois pages de résultats", meta: "lecture" },
        { label: "Extrait les horaires et l'adresse", meta: "extraction" },
        { label: "Rend compte — sans rien valider seul", meta: "rapport" },
      ],
      note: "Toute action qui engage quelque chose vous est soumise avant d'être faite.",
    },
  },

  showcase: {
    eyebrow: "Toumaï AI à l'œuvre",
    titleA: "Huit façons de",
    titleEm: "s'en servir",
    titleB: ", une seule conversation.",
    lead: "Pas de menus à apprendre. Vous écrivez, vous parlez, vous déposez un fichier — Toumaï AI fait le reste.",
    listAria: "Capacités de Toumaï AI",
    pause: "Arrêter le défilement des capacités",
    resume: "Reprendre le défilement des capacités",
    pauseLabel: "Pause",
    resumeLabel: "Reprendre",
    caps: {
      multilingue: { label: "Conversation multilingue", short: "Multilingue", line: "Français, anglais, arabe — dans la même conversation." },
      tchadien: { label: "Arabe tchadien", short: "Arabe tchadien", line: "Le parler du quotidien, pas celui des manuels." },
      image: { label: "Génération d'images", short: "Images", line: "Décrivez la scène, Toumaï AI la compose." },
      document: { label: "Analyse de documents", short: "Documents", line: "Un PDF entre, l'essentiel en sort." },
      code: { label: "Programmation", short: "Code", line: "Écrire, expliquer, corriger, exécuter." },
      web: { label: "Agent Navigateur", short: "Agent", line: "Une tâche confiée, menée étape par étape." },
      voix: { label: "Mode vocal", short: "Voix", line: "Parlez, il répond à voix haute." },
      connecteurs: { label: "Connecteurs", short: "Connecteurs", line: "WhatsApp, e-mail, agenda — sous votre contrôle." },
    },
    langues: {
      title: "Une conversation, plusieurs langues",
      note: "fr · ar · en",
      rows: [
        { hello: "Bonjour", lang: "Français", reply: "Comment puis-je vous aider aujourd'hui ?" },
        { hello: "مرحبا", lang: "العربية", reply: "كيف يمكنني مساعدتك اليوم؟" },
        { hello: "Hello", lang: "English", reply: "How can I help you today?" },
      ],
      foot: "Changez de langue en cours de route : le fil ne se coupe pas.",
    },
    tchadien: {
      title: "L'arabe tel qu'on le parle ici",
      note: "tchadien · shuwa",
      msaLabel: "littéraire",
      rows: [
        { fr: "Comment vas-tu ?", shu: "إنت كيف؟", tr: "inta kēf ?", msa: "كيف حالك؟" },
        { fr: "Je viens du marché", shu: "أنا جاي من السوق", tr: "ana jāy min as-sūg", msa: "أنا قادم من السوق" },
        { fr: "Il n'y a pas de problème", shu: "ما في مشكلة", tr: "mā fī mushkila", msa: "لا توجد مشكلة" },
      ],
      note2:
        "Toumaï AI est développé à partir d'un corpus d'arabe tchadien collecté sur le terrain — pas d'une simple traduction depuis l'arabe littéraire.",
    },
    image: {
      prompt: "« Génère une image d'un entrepreneur africain moderne dans un bureau élégant. »",
      promptLabel: "Votre demande",
      alt: "Toumaï AI sur téléphone : la demande d'une image d'entrepreneur africain, et l'image rendue juste en dessous",
      chips: ["Signature Toumaï AI intégrée", "Modèle Ennedi", "Téléchargeable"],
    },
    document: {
      title: "Un document entre, l'essentiel en sort",
      note: "pdf · docx · image",
      file: "contrat.pdf",
      points: [
        "Durée : 12 mois, reconduction tacite",
        "Préavis de résiliation : 60 jours",
        "Pénalité de retard : 3 % par mois",
        "Point de vigilance : clause 7.2, exclusivité",
      ],
      foot: "Posez ensuite vos questions sur le document : les réponses restent rattachées à son contenu.",
    },
    code: {
      file: "moyenne.py",
      lang: "Python",
      aria: "Fonction Python qui calcule la moyenne d'une liste de notes, puis son résultat d'exécution",
      outputLabel: "Exécuté dans le navigateur",
    },
    web: {
      title: "Une tâche confiée au Web",
      note: "agent navigateur",
      searching: "recherche en cours",
      steps: [
        { label: "Formule la recherche", detail: "vol N'Djaména → Abéché vendredi" },
        { label: "Ouvre les résultats", detail: "3 sources comparées" },
        { label: "Extrait l'information", detail: "horaires, escales, tarif affiché" },
        { label: "Rend compte", detail: "avec les liens d'origine" },
      ],
      foot: "L'agent vous demande confirmation avant toute action qui engage quelque chose.",
    },
    voix: {
      ask: "« Résume-moi la réunion d'hier. »",
      note: "Détection de fin de phrase · réponse à voix haute",
      answer: "Trois décisions : livraison le vendredi, paiement à la remise, et un point d'étape lundi prochain.",
      chips: ["Dictée", "Lecture à voix haute", "Interruption à tout moment"],
    },
    connecteurs: {
      shotAlt:
        "Toumaï AI sur téléphone : « Résume-moi le message vocal d'Ahmat. » La réponse — il confirme la livraison de vendredi et demande une facture au nom de la coopérative. Puis « Réponds-lui d'accord », et Toumaï AI demande confirmation avant d'envoyer, avec deux boutons : Envoyer et Modifier.",
      title: "Vos outils, dans la conversation",
      note: "révocable",
      available: "Disponible",
      items: [
        { name: "WhatsApp", detail: "Lire, résumer, répondre — contact par contact." },
        { name: "E-mail", detail: "Trier, rédiger, retrouver un fil." },
        { name: "Google Agenda", detail: "Consulter, créer, déplacer un rendez-vous." },
      ],
      permsLabel: "Permissions — chacune se coupe séparément",
      perms: ["Lire les messages", "Envoyer un message", "Résumer une conversation", "Publier un statut"],
      foot: "Une action sensible demande toujours votre confirmation.",
      manage: "Gérer les connecteurs",
    },
  },

  marquee: [
    { t: "Bonjour", s: "français" },
    { t: "مرحبا", s: "arabe", rtl: true },
    { t: "Hello", s: "english" },
    { t: "إنت كيف؟", s: "arabe tchadien", rtl: true, hot: true },
    { t: "Comment ça va ?", s: "français" },
    { t: "ما في مشكلة", s: "arabe tchadien", rtl: true, hot: true },
    { t: "How can I help?", s: "english" },
    { t: "كيف حالك؟", s: "arabe littéraire", rtl: true },
  ],

  why: {
    shotAlt:
      "Toumaï AI sur téléphone : « J'ai 150 000 F CFA pour lancer un petit business à N'Djamena. Que me conseilles-tu ? » — la réponse détaille trois étapes, du choix du service à la répartition du budget.",
    eyebrow: "Pourquoi Toumaï AI",
    titleA: "Un assistant n'est utile que s'il vous",
    titleEm: "comprend vraiment.",
    lead:
      "Les grands modèles parlent le monde entier. Peu d'entre eux savent ce qu'on dit à Dembé un samedi matin, ni ce que veut dire « il n'y a pas de problème » quand ce n'est pas vrai.",
    r1: {
      title: "Il connaît le contexte d'ici",
      body: "Les villes, les marchés, les administrations, les manières de dire. Une réponse juste ailleurs peut être inutile à N'Djaména — Toumaï AI est conçu à partir de ce contexte, pas malgré lui.",
    },
    r2: {
      title: "Trois langues, dont la vôtre",
      body: "Français, anglais, arabe — et l'arabe tchadien, développé à partir d'un corpus collecté sur le terrain.",
      rows: [
        { w: "Bonjour", l: "Français" },
        { w: "مرحبا", l: "العربية", rtl: true },
        { w: "إنت كيف؟", l: "Arabe tchadien", rtl: true, hot: true },
        { w: "Hello", l: "English" },
      ],
    },
    r3: {
      title: "Il voit, il lit, il écoute, il parle",
      body: "Une photo, un PDF, une note vocale, une question tapée à la volée : tout entre dans la même conversation.",
      modes: ["Voir", "Lire", "Écouter", "Parler"],
    },
    r4: {
      title: "Il travaille là où vous travaillez déjà",
      body: "Sur le Web, dans WhatsApp, et bientôt sur Android. Et il se branche à votre messagerie et à votre agenda — capacité par capacité, révocable à tout moment.",
      chips: ["Web", "WhatsApp", "E-mail", "Google Agenda", "Agent Navigateur", "Android — bientôt"],
    },
    freeA: "Gratuit.",
    freeEm: "Sans carte bancaire.",
    freeBody: "Le chat, les images, la voix, les agents et les connecteurs : tout est ouvert, sans abonnement ni période d'essai.",
    privacyA: "Vos conversations",
    privacyEm: "ne sont pas à vendre.",
    privacyBody:
      "Aucune revente de données, aucune publicité ciblée à partir de ce que vous écrivez. Vous supprimez vos conversations quand vous voulez.",
    privacyLink: "Politique de confidentialité",
    ctaLabel: "Essayer maintenant",
    ctaNote: "Aucun compte requis pour commencer.",
  },

  everywhere: {
    eyebrow: "Partout où vous êtes",
    titleA: "Il vient à vous.",
    titleEm: "Pas l'inverse.",
    web: {
      kicker: "Sur le Web",
      title: "Ouvrez, écrivez. C'est tout.",
      body: "Rien à installer, rien à configurer. Vous pouvez essayer avant même de créer un compte.",
      points: ["Aucune installation", "Essai sans compte", "Historique synchronisé une fois connecté"],
      cta: "Ouvrir Toumaï AI",
    },
    whatsapp: {
      kicker: "Dans WhatsApp",
      title: "Un contact de plus, rien d'autre à apprendre.",
      body: "Vous lui écrivez comme à n'importe qui — questions, notes vocales, photos. Il répond dans le fil.",
      points: ["Aucune application supplémentaire", "Notes vocales comprises", "Chaque capacité se coupe séparément"],
      cta: "Voir les connecteurs",
    },
    mobile: {
      kicker: "Sur Android",
      title: "Bientôt dans votre poche.",
      body: "L'application Android est en préparation : elle reprendra votre historique et permettra de relire vos échanges sans réseau. Elle n'est pas encore publiée.",
      points: ["En développement", "Historique repris", "Mode vocal mains libres"],
      cta: "Utiliser le Web en attendant",
      badge: "En préparation",
    },
    devices: {
      web: "Toumaï AI ouvert dans un navigateur : une question en français, une réponse qui commence en arabe tchadien",
      whatsapp: "Un échange avec Toumaï AI dans une conversation WhatsApp, sur téléphone",
      mobile: "L'application Toumaï AI sur Android : accueil, suggestions et mode vocal",
      newChat: "+ Nouvelle",
      composer: "Écrivez à Toumaï AI…",
      message: "Message",
      online: "en ligne",
      translate: "Traduis ça en arabe tchadien.",
      waAsk: "Résume-moi le message vocal d'Ahmat.",
      waAnswer: "Il confirme la livraison de vendredi et demande une facture au nom de la coopérative.",
      waAsk2: "Réponds-lui d'accord.",
      waAnswer2: "Message prêt. Je l'envoie ?",
      greeting: "Bonsoir.",
      greetingSub: "Par quoi commence-t-on ?",
      suggestions: ["Traduire en arabe tchadien", "Résumer un document", "Générer une image"],
    },
  },

  intelligence: {
    shotAlt:
      "Le mode vocal de Toumaï AI : une sphère lumineuse qui pulse pendant l'échange, avec les commandes micro, appel et haut-parleur sous elle.",
    eyebrow: "L'intelligence derrière Toumaï",
    titleA: "Vous écrivez. Toumaï AI choisit",
    titleEm: "le bon moteur.",
    lead: "Une famille de modèles, un aiguillage automatique. Aucun réglage, aucun menu — et vous pouvez toujours reprendre la main dans le sélecteur.",
    defaultBadge: "Par défaut",
    sao: {
      tag: "Le modèle du quotidien",
      desc: "Conversation, rédaction, traduction, code, résumés. Rapide, et par défaut.",
      points: ["Réponses en flux continu", "À l'aise en français et en arabe", "Comprend le parler tchadien"],
    },
    toumai: {
      tag: "Réflexion — raisonnement profond",
      desc: "Pour ce qui demande de la rigueur : mathématiques, planification, analyse, décisions.",
      points: ["Raisonnement étape par étape", "Pensé pour les tâches complexes", "Sélectionnable dans le chat"],
    },
    routerTitle: "L'aiguillage, en direct",
    routerFlow: "demande → compréhension → moteur → résultat",
    yourRequest: "Votre demande",
    engines: {
      sao: "Code & aide quotidienne",
      toumai: "Raisonnement profond",
      ennedi: "Génération d'images",
      ouaddai: "Analyse & données",
      tibesti: "Développement",
      kanem: "Conversations vocales",
      chari: "Lettres & rapports",
    },
    requests: [
      { text: "Traduis ça en arabe tchadien.", out: "Réponse dans le parler d'ici" },
      { text: "Dessine les dunes au crépuscule.", out: "Image générée, signée" },
      { text: "Résume ce contrat de 40 pages.", out: "Points clés extraits" },
      { text: "Écris une fonction qui trie une liste.", out: "Code écrit puis exécuté" },
      { text: "Combien de temps pour rembourser à 3 % ?", out: "Raisonnement étape par étape" },
      { text: "Lis-moi la réponse à voix haute.", out: "Réponse parlée" },
      { text: "Prépare-moi une lettre de motivation.", out: "Document mis en page" },
    ],
    foot: "Sao 4 et Toumaï 5 se choisissent à la main dans le sélecteur de modèle. Les moteurs dédiés sont appelés automatiquement selon la demande.",
    footLink: "Tout savoir sur les modèles",
    hubLabel: "Toumaï",
    hubSub: "ROUTEUR",
  },

  connectors: {
    eyebrow: "Connecteurs",
    titleA: "Il ne se contente pas de répondre.",
    titleEm: "Il agit.",
    lead: "Branchez vos outils et demandez en une phrase ce qui vous prenait cinq applications. Chaque capacité s'active — et se coupe — séparément.",
    available: "Disponible",
    serviceOf: (owner: string) => `Service de ${owner}`,
    items: [
      { name: "WhatsApp", does: ["Lire et résumer un fil", "Rédiger et envoyer un message", "Retrouver une information"] },
      { name: "E-mail", does: ["Trier la boîte de réception", "Rédiger une réponse", "Retrouver une pièce jointe"] },
      { name: "Google Agenda", does: ["Consulter la journée", "Créer un rendez-vous", "Déplacer un créneau"] },
    ],
    safety:
      "Une action qui envoie, publie ou modifie quelque chose vous est toujours soumise avant d'être faite. Vous pouvez restreindre l'accès à des contacts précis, et retirer une autorisation à tout moment.",
    manage: "Gérer mes connecteurs",
    trademark:
      "WhatsApp est une marque de Meta ; Gmail et Google Agenda, de Google. Toumaï AI s'y connecte avec votre autorisation, sans aucun lien de partenariat avec ces entreprises.",
  },

  faq: {
    eyebrow: "Questions fréquentes",
    titleA: "Ce qu'on nous demande",
    titleEm: "le plus souvent.",
    contactA: "Une autre question ?",
    contactLink: "Écrivez-nous",
    items: [
      {
        q: "Est-ce vraiment gratuit ?",
        a: "Oui, entièrement. Discuter, générer des images, utiliser le mode vocal, les agents et les connecteurs — tout est gratuit, sans abonnement ni carte bancaire.",
      },
      {
        q: "Comprend-il l'arabe tchadien, ou seulement l'arabe standard ?",
        a: "Les deux. L'arabe tchadien est l'un des objectifs premiers du projet : Toumaï AI est développé à partir d'un corpus collecté sur le terrain, pour comprendre et répondre dans le parler du quotidien, en plus du français et de l'anglais.",
      },
      {
        q: "Mes données sont-elles vendues ou utilisées pour de la publicité ?",
        a: "Non. Toumaï AI ne vend aucune donnée et ne fait pas de publicité ciblée à partir de vos conversations. Le détail figure dans la politique de confidentialité.",
      },
      {
        q: "Le connecteur WhatsApp lit-il tous mes messages en permanence ?",
        a: "Non. Chaque capacité (lecture, envoi, résumé…) se désactive séparément, une action sensible demande toujours votre confirmation, et vous pouvez restreindre l'accès à des contacts ou groupes précis.",
      },
      {
        q: "Faut-il créer un compte pour essayer ?",
        a: "Non. Vous pouvez ouvrir Toumaï AI et discuter tout de suite. Le compte sert à retrouver votre historique sur vos autres appareils et à brancher les connecteurs.",
      },
      {
        q: "L'application Android est-elle disponible ?",
        a: "Pas encore. Elle est en préparation et n'est pas publiée sur le Play Store. En attendant, la version Web fonctionne sur téléphone sans rien installer.",
      },
      {
        q: "Puis-je supprimer mes conversations ?",
        a: "À tout moment, directement depuis l'interface — suppression immédiate, sans passer par le support.",
      },
    ],
  },

  partners: {
    eyebrow: "Partenaires & sponsors",
    titleA: "Construisons cette IA",
    titleEm: "avec vous.",
    lead:
      "Toumaï AI est bâtie à N'Djamena, pour des usages d'ici. Entreprises, institutions, écoles, médias : écrivez-nous pour un partenariat, un sponsoring ou une intégration.",
    kinds: ["Partenariat", "Sponsoring", "Intégration technique", "Recherche & données"],
    cta: "Nous écrire",
  },
  cta: {
    eyebrow: "Prêt en une phrase",
    titleA: "Dites-lui bonjour.",
    titleEm: "Dans votre langue.",
    lead: "Gratuit, sans carte bancaire, sans installation. Ouvrez et posez votre première question.",
    primary: "Commencer gratuitement",
    secondary: "Créer un compte",
    notes: ["Français · العربية · English", "Web et WhatsApp, sans installation", "Conversations supprimables"],
  },

  footer: {
    blurb: "Nommé d'après le plus ancien hominidé connu, découvert au Tchad. L'intelligence, depuis toujours.",
    nav: "Pied de page",
    cols: {
      product: "Produit",
      models: "Modèles",
      connectors: "Connecteurs",
      legal: "Compte & légal",
    },
    links: {
      chat: "Chat",
      capabilities: "Capacités",
      library: "Bibliothèque",
      agent: "Agent Navigateur",
      whatsapp: "Tableau de bord WhatsApp",
      modelsPage: "Sao 4 & Toumaï 5",
      routing: "L'aiguillage",
      aiChad: "L'IA au Tchad",
      arabic: "النسخة العربية",
      overview: "Vue d'ensemble",
      manage: "Gérer mes connecteurs",
      settings: "Paramètres",
      register: "Créer un compte",
      login: "Se connecter",
      terms: "Conditions & politiques",
      privacy: "Politique de confidentialité",
      choices: "Choix de confidentialité",
      deleteAccount: "Supprimer mon compte",
    },
    rights: (year: number) => `© ${year} Toumaï AI. Conçu et développé à N'Djaména, Tchad.`,
  },
};

export type Dict = typeof fr;
