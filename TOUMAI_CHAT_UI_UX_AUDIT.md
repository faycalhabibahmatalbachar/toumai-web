# Audit UI/UX — Toumaï AI Chat (phase 0)

Date : 27 septembre 2026  
URL : https://toumaiai.com/chat/  
Périmètre : interface visible uniquement. Aucun composant ni réglage de production modifié.

## 1. Executive summary

Le chat a une base visuelle crédible : colonne de lecture maîtrisée, composer identifiable, identité Toumaï présente, états de génération compréhensibles et adaptation mobile sans débordement horizontal aux cinq tailles examinées. La perception « premium international » est surtout limitée par l'accessibilité du sélecteur de modèle, les textes secondaires trop peu contrastés en thème clair, et quelques états incohérents ou incomplets (menu ouvert pendant la navigation, recherche sans résultat, titre de conversation en anglais). Les recommandations ci-dessous distinguent défauts observés, risques et occasions de conception.

## 2. Tested environments

| Environnement | Taille CSS vérifiée | Thème | Notes |
|---|---:|---|---|
| Edge connecté, Windows | 1440 × 900 | sombre, clair | conversation, menus, sidebar, composer |
| Edge connecté, Windows | 1280 × 800 | clair | conversation, sidebar |
| Edge connecté, Windows | 768 × 1024 | clair | conversation, composer, navigation repliée |
| Edge connecté, Windows | 390 × 844 | sombre | accueil, composer, menu modèle, tiroir, génération |
| Edge connecté, Windows | 360 × 800 | clair | conversation, composer |
| Playwright isolé, Windows | fenêtre initiale | sombre | accès non connecté : accueil fugitif puis page de connexion |

Le navigateur Edge du compte utilisateur avait un zoom de 80 %. L'override a été ajusté jusqu'à mesurer les tailles CSS indiquées par `innerWidth`/`innerHeight`; la taille initiale a été rétablie. Les captures ont été inspectées pendant la session. Le navigateur isolé a conservé une capture de la page de connexion dans `C:/Users/hp/Desktop/Projects/.playwright-cli/page-2026-09-27T16-12-21-036Z.png`; les captures de la session connectée ne sont pas enregistrées comme fichiers du dépôt.

## 3. Screens audited

Accueil sans message; conversation courte créée pour l'audit; conversation existante avec recherche Web et sources; réponse avec titre, liste et code; sidebar étendue et réduite; tiroir mobile; menus Outils et Modèle; état de saisie, brouillon long, génération en cours et réponse terminée; thème sombre et thème clair; recherche d'historique vide.

Non vérifiés de manière concluante : clavier virtuel mobile réel, lecteur d'écran, arabe/RTL et anglais, upload de fichiers, erreur réseau, conversation très longue, résultat image, flux WhatsApp/automatisations, `prefers-reduced-motion`, contraste mesuré du thème sombre. La réponse de mise en forme a affiché une syntaxe de tableau en texte continu; la cause n'est pas attribuable avec certitude au rendu front-end, car le contenu généré peut être mal formé. Le code comporte `remark-gfm`, mais un test avec contenu Markdown canonique reste nécessaire.

## 4. UX scorecard

| Dimension | /10 | Justification courte |
|---|---:|---|
| Visual quality | 7 | Palette chaude et surfaces sobres; détails de lisibilité à corriger. |
| Visual hierarchy | 7 | Composer et réponse dominent; sidebar expose beaucoup d'entrées au même niveau. |
| Conversation readability | 7 | Colonne d'environ 46 rem; citations répétées et source dense. |
| Composer UX | 7 | Saisie, focus et hauteur longue convaincants; commandes et petits boutons perfectibles. |
| Navigation | 6 | Repérable, mais recherche vide muette et forte densité d'options. |
| Discoverability | 7 | Suggestions et menu Outils visibles; plus et raccourcis peu explicites au premier regard. |
| Consistency | 7 | Composants globalement apparentés; états de menus et langue du titre rompent la cohérence. |
| Mobile UX | 6 | Pas de débordement; menu modèle et tiroir peuvent coexister de façon gênante. |
| Responsive behavior | 8 | Les cinq largeurs restent utilisables sans scroll horizontal global. |
| Accessibility | 5 | Labels présents, mais listbox au clavier défaillante et contraste secondaire insuffisant. |
| Feedback/states | 7 | « Réfléchit » et arrêt visibles; résultat de recherche vide sans message. |
| Perceived performance | 7 | Retour rapide à l'envoi, indicateur de génération; latence complète non mesurée. |
| Trust | 6 | Présentation soignée, affaiblie par un titre hors langue et des sources chargées. |
| Brand identity | 8 | Marque Toumaï, palette et ton visuel reconnaissables. |
| Overall polish | 7 | Base solide, finitions d'accessibilité et d'états à terminer. |

Scores indicatifs fondés sur les états testés, pas sur une mesure exhaustive de tous les parcours.

## 5–8. Findings par sévérité

### P0 — aucun défaut bloquant confirmé

### P1

**ID: UX-001**  
**SEVERITY:** P1  
**CATEGORY:** ACCESSIBILITY  
**LOCATION:** Sélecteur de modèle, desktop et mobile  
**OBSERVED:** Après ouverture, `ArrowDown` laisse le focus sur le bouton « Sao 4 ». `Tab` passe directement à « Dicter », sans entrer dans les options visibles. `Escape` ferme correctement.  
**USER IMPACT:** Le choix du modèle est difficile ou impossible selon la stratégie clavier ou lecteur d'écran.  
**WHY IT MATTERS:** Le panneau se déclare comme listbox et ses choix comme options, mais ne fournit pas la navigation attendue.  
**EVIDENCE:** Test clavier sur Edge connecté, conversation, viewport 1440 × 900; arbre d'accessibilité avant/après les touches.  
**RECOMMENDATION:** Donner le focus à l'option active à l'ouverture, gérer flèches/Home/End/Enter, puis restituer le focus au déclencheur à la fermeture; vérifier Tab et lecteur d'écran.  
**EXPECTED RESULT:** Les deux modèles sont sélectionnables sans souris.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

**ID: UX-002**  
**SEVERITY:** P1  
**CATEGORY:** ACCESSIBILITY  
**LOCATION:** Texte secondaire, thème clair  
**OBSERVED:** Le texte tertiaire `#98907f` sur le fond `#faf7f2` donne un contraste calculé d'environ **2,96:1**. L'avertissement sous le composer utilise cette couleur à 11 px; plusieurs icônes et métadonnées sont également très pâles.  
**USER IMPACT:** Les informations secondaires et certains contrôles sont difficiles à lire, notamment à faible vision ou en forte luminosité.  
**WHY IT MATTERS:** L'avertissement contient une information utile et ne devrait pas dépendre d'une vision optimale.  
**EVIDENCE:** Thème clair dans Edge; couleurs calculées depuis le DOM, captures à 360, 768 et 1440 px. Le ratio concerne le fond de page; les autres surfaces doivent être mesurées séparément.  
**RECOMMENDATION:** Relever le contraste des textes tertiaires utiles et du disclaimer; vérifier les paires réelles texte/fond selon WCAG, sans accroître inutilement la saturation.  
**EXPECTED RESULT:** Métadonnées et aide lisibles dans les deux thèmes.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

### P2

**ID: UX-003**  
**SEVERITY:** P2  
**CATEGORY:** MOBILE  
**LOCATION:** Menu modèle et tiroir, 390 × 844  
**OBSERVED:** Le menu du modèle reste ouvert lorsque le tiroir des conversations s'ouvre; il apparaît au-dessus du tiroir et du fond assombri. Un clic extérieur ferme d'abord le modèle, un autre ferme le tiroir.  
**USER IMPACT:** Deux couches simultanées brouillent l'état courant et demandent deux gestes pour revenir au chat.  
**WHY IT MATTERS:** Un changement de contexte de navigation devrait fermer le menu transitoire.  
**EVIDENCE:** Séquence Sao 4 → Ouvrir les conversations, capture visuelle et états d'accessibilité sur mobile.  
**RECOMMENDATION:** Fermer les popovers de composer à l'ouverture du tiroir et à « Nouvelle conversation »; tester l'ordre des couches et le clic sur le backdrop.  
**EXPECTED RESULT:** Un seul overlay actif à la fois.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

**ID: UX-004**  
**SEVERITY:** P2  
**CATEGORY:** COPY  
**LOCATION:** Historique, titre automatique du fil de test  
**OBSERVED:** Après un message français (« Pour cet audit visuel... »), le fil a reçu le titre anglais et inachevé « They want the assistant to ».  
**USER IMPACT:** Retrouver la conversation devient difficile; le titre réduit la confiance dans la finition du produit.  
**WHY IT MATTERS:** L'historique est une fonction de repérage et la langue du titre doit rester cohérente avec celle de la conversation.  
**EVIDENCE:** Fil créé le 27 septembre 2026, visible en sidebar à 1280 et 1440 px. La cause de génération du titre n'a pas été étudiée; seul son effet visible entre dans cet audit.  
**RECOMMENDATION:** Prévoir côté interface un titre de repli dérivé du début du message si le titre reçu est manifestement générique ou incomplet; vérifier le libellé avant affichage.  
**EXPECTED RESULT:** Historique compréhensible en français même si le titre automatique échoue.  
**CONFIDENCE:** HIGH pour l'observation, MEDIUM pour la solution  
**TYPE:** OBSERVED ISSUE

**ID: UX-005**  
**SEVERITY:** P2  
**CATEGORY:** EMPTY_STATE  
**LOCATION:** Recherche dans l'historique, sidebar étendue  
**OBSERVED:** La requête `zzzz-audit-sans-resultat` masque tous les fils et laisse une zone entièrement vide, sans « Aucun résultat » ni action de retour.  
**USER IMPACT:** On peut croire que l'historique n'est pas chargé ou a disparu.  
**WHY IT MATTERS:** Une recherche négative doit confirmer qu'elle a abouti.  
**EVIDENCE:** Test dans Edge connecté à 1440 × 900; capture et arbre d'accessibilité sans message de résultat.  
**RECOMMENDATION:** Ajouter un état « Aucune conversation trouvée » lorsque la requête est non vide et la liste filtrée vide, avec effacement accessible.  
**EXPECTED RESULT:** L'utilisateur comprend le résultat et sait revenir à ses fils.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

**ID: UX-006**  
**SEVERITY:** P2  
**CATEGORY:** ACCESSIBILITY  
**LOCATION:** Boutons d'icône du composer et de l'en-tête  
**OBSERVED:** Plusieurs cibles « Outils », « Dicter », « Parler » et « Discussion éphémère » mesurent environ 36 × 36 px; le thème mesure 40 × 40 px.  
**USER IMPACT:** La manipulation au doigt peut être moins fiable, surtout près des bords ou avec des limitations motrices.  
**WHY IT MATTERS:** Les commandes importantes et voisines gagnent à offrir une cible plus généreuse.  
**EVIDENCE:** Rectangles DOM calculés en thème clair; capture mobile 360 × 800. Cela ne prouve pas à lui seul une violation WCAG, les espacements voisins n'ayant pas tous été mesurés.  
**RECOMMENDATION:** Viser une zone tactile effective d'environ 44 px pour les actions fréquentes, en conservant l'icône visuelle actuelle si nécessaire.  
**EXPECTED RESULT:** Moins d'erreurs de toucher sans densifier le composer.  
**CONFIDENCE:** HIGH pour les dimensions, MEDIUM pour l'impact  
**TYPE:** UX RISK

**ID: UX-007**  
**SEVERITY:** P2  
**CATEGORY:** CONVERSATION  
**LOCATION:** Carte de source Web dépliée  
**OBSERVED:** Une source montre titre, domaine, date/heure, statut et un extrait contenant des mentions de partage (« Facebook X Pinterest LinkedIn »). Le tout est très petit et dense dans la carte.  
**USER IMPACT:** La provenance reste accessible, mais sa lecture rapide et sa crédibilité visuelle diminuent.  
**WHY IT MATTERS:** La carte doit aider à juger une source, pas exposer du bruit éditorial aspiré.  
**EVIDENCE:** Conversation « Recherche sur le web : FGI tchad », source ATPE dépliée à 1440 × 900.  
**RECOMMENDATION:** Prioriser titre, domaine et date; nettoyer ou réduire l'extrait affiché et garder le statut discret.  
**EXPECTED RESULT:** Source plus facile à reconnaître et à ouvrir.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

### P3 / P4

**ID: UX-008**  
**SEVERITY:** P3  
**CATEGORY:** COPY  
**LOCATION:** Sélecteur de modèle, 390 px et desktop  
**OBSERVED:** La description « Raisonnement avancé · Tâches complexes » est tronquée dans le menu à « ... Tâches compl... ».  
**USER IMPACT:** La différence entre modèles perd une partie de son sens.  
**WHY IT MATTERS:** Le sous-titre est l'aide à la décision principale du menu.  
**EVIDENCE:** Menu Sao 4 ouvert à 390 px et sur desktop.  
**RECOMMENDATION:** Autoriser deux lignes courtes ou reformuler la description pour la largeur réelle.  
**EXPECTED RESULT:** Comparaison complète des modèles.  
**CONFIDENCE:** HIGH  
**TYPE:** OBSERVED ISSUE

**ID: UX-009**  
**SEVERITY:** P3  
**CATEGORY:** CONVERSATION  
**LOCATION:** Réponse avec une source  
**OBSERVED:** Le même renvoi `[1]` apparaît cinq fois dans un paragraphe relativement court; la ponctuation orangée devient un motif visuel dominant.  
**USER IMPACT:** La lecture continue demande plus d'effort.  
**WHY IT MATTERS:** Une citation doit soutenir le texte sans le fragmenter inutilement.  
**EVIDENCE:** Conversation FGI Tchad à 1440 px, thème sombre et clair. Le placement provient peut-être du contenu généré; l'interface peut néanmoins limiter la répétition visuelle.  
**RECOMMENDATION:** Tester une présentation par paragraphe ou un traitement typographique plus discret, sans perdre le lien entre assertion et source.  
**EXPECTED RESULT:** Lecture plus fluide avec provenance conservée.  
**CONFIDENCE:** MEDIUM  
**TYPE:** DESIGN OPPORTUNITY

**ID: UX-010**  
**SEVERITY:** P3  
**CATEGORY:** DISCOVERABILITY  
**LOCATION:** Placeholder du composer, desktop  
**OBSERVED:** Le placeholder associe « Écrivez à Toumaï AI... » et les indices « / commandes, @ modèle ». L'aide est compacte, mais les symboles restent opaques au premier usage; sur mobile elle disparaît.  
**USER IMPACT:** Le premier geste est clair, les raccourcis le sont moins.  
**WHY IT MATTERS:** Un indice de découverte doit être immédiatement décodable.  
**EVIDENCE:** Accueil et conversation à 1440 px; placeholder mobile à 390 px.  
**RECOMMENDATION:** Conserver l'appel à écrire et déplacer l'explication des raccourcis dans une aide contextuelle ou une palette ouverte au premier usage.  
**EXPECTED RESULT:** Composer plus simple au premier regard et raccourcis toujours trouvables.  
**CONFIDENCE:** MEDIUM  
**TYPE:** DESIGN OPPORTUNITY

**P4:** aucun finding confirmé.  
**Comptage:** P0 0 · P1 2 · P2 5 · P3 3 · P4 0.

## 9. Desktop findings

La sidebar de 288 px et la colonne de lecture centrée donnent une structure stable. Une réponse courte laisse beaucoup d'espace vide, ce qui reste acceptable pour un chat. Le composer s'aligne sur la colonne de réponse. La barre latérale montre dès l'entrée Aujourd'hui, Bibliothèque, Automatisations, WhatsApp, Notifications et Connecteurs, puis l'historique. Cette densité est une **occasion de simplification**, à valider par données d'usage, pas une suppression à décider dans la phase 0. Hiérarchie actuelle : **PRIMARY** conversation et composer; **SECONDARY** nouvelle conversation et modèle; **TERTIARY** thème, discussion éphémère, outils avancés; **NOISE potentiel** entrées rarement utilisées toujours visibles et répétition des citations.

## 10. Mobile findings

L'accueil à 390 px présente la marque, le nom de l'utilisateur, une question simple, quatre suggestions et le composer sans débordement horizontal. À 360 px, le composer et les messages restent dans le viewport. Le tiroir occupe environ 288 px sur 390 px et son backdrop se ferme au toucher. La coexistence tiroir/menu modèle (UX-003) et la taille des cibles (UX-006) sont les priorités mobiles observées. Le clavier virtuel d'un vrai téléphone et les safe areas n'ont pas été testés.

## 11. Composer audit

États observés : vide, texte saisi, focus, génération, arrêt disponible, brouillon de huit lignes avec URL longue. Le champ s'agrandit puis scrolle à l'intérieur, sans overflow horizontal global. Le bouton droit passe du mode vocal à l'envoi puis à l'arrêt; cette logique est claire après usage. Le focus du composer est visible. Non vérifiés : pièce jointe, image jointe, upload en cours/erreur, dictée réelle, clavier mobile physique, erreur d'envoi. Le modèle et les outils sont accessibles depuis la barre; leurs interactions croisées doivent être mieux fermées lors de la navigation.

## 12. Sidebar / navigation audit

La distinction navigation générale / historique est lisible via les sections. La recherche n'a pas d'état négatif (UX-005). Un titre généré inadapté dégrade le repérage (UX-004). Proposition d'architecture à **tester** : KEEP nouvelle conversation, recherche et historique; GROUP les espaces de travail secondaires; DEEMPHASIZE les entrées moins fréquentes; éviter HIDE/REMOVE sans données d'usage. Le bouton de nouvelle conversation est présent dans la sidebar et dans l'en-tête d'un fil actif, ce qui est fonctionnel mais mérite une vérification de nécessité.

## 13. Conversation rendering audit

Réponse courte et paragraphe long lisibles dans une colonne d'environ 46 rem. Messages utilisateur suffisamment distincts et alignés à droite. Les actions de copie, feedback, audio, régénération et workspace apparaissent sous la réponse; les contrôles sont nombreux mais restent discrets. La réponse test avec titre/liste/code a rendu le code dans une carte avec langue et actions. La syntaxe de tableau est apparue en texte continu dans cet échantillon; cause **non déterminée** et pas classée comme défaut front-end confirmé. Les citations et la carte de source demandent une finition (UX-007/009).

## 14. Model selector audit

Le menu s'ouvre vers le haut et reste dans le viewport aux largeurs testées. L'option active est marquée. Les descriptions sont tronquées et la navigation clavier ne respecte pas l'attente créée par `listbox`/`option` (UX-001/008). `Escape` ferme le menu; ouvrir le tiroir ne le ferme pas (UX-003).

## 15. States / feedback audit

À l'envoi, le message apparaît immédiatement, puis « Toumaï AI réfléchit » et un bouton d'arrêt sont visibles. La réponse courte est arrivée et les actions sont apparues ensuite. Aucun clic « sans réaction » n'a été observé dans ce parcours. La recherche d'historique vide ne confirme pas son résultat. La version non connectée montre brièvement le chat avec « Connexion… » puis redirige vers l'authentification; ce parcours n'a pas été suffisamment mesuré pour en déduire un défaut.

## 16. Accessibility audit

Points positifs : plusieurs boutons d'icône ont des labels accessibles; le focus du composer est visible; `Escape` ferme le menu modèle; `aria-pressed`/état sélectionné apparaissent sur les actions concernées. Points à corriger : navigation clavier du modèle (UX-001), contraste des textes secondaires clairs (UX-002), zones tactiles de 36 px (UX-006). Audit lecteur d'écran complet, zoom 200 % et réduction de mouvement restent à faire.

## 17. Responsive audit

Les largeurs CSS 360, 390, 768, 1280 et 1440 px ont été vérifiées. `scrollWidth` n'a pas dépassé `innerWidth` dans les mesures prises. À 768 px la sidebar est hors écran et le bouton d'ouverture reste accessible. Les règles de hauteur semblent préserver le composer dans le viewport testé; aucune conclusion sur le clavier virtuel n'est possible.

## 18. Visual consistency audit

Les cartes, menus et boutons partagent une palette chaude et des formes cohérentes. La marque colorée du logo apporte un signe distinctif sans perturber le chat. Les écarts principaux sont des **états** (superposition d'overlays, titre hors langue), davantage qu'une absence globale de design system. En thème clair, les surfaces crème sont harmonieuses mais certains petits textes sont trop pâles.

## 19. Typography / spacing audit

La mesure de lecture `--chat-measure: 46rem` et le composer aligné réduisent la fatigue sur desktop. Le corps des réponses est lisible; les métadonnées de source et l'avertissement à 11–12 px le sont moins. Le code contient un rayon de composer de 26 px et des boutons d'icône de 36 px; ces valeurs semblent systématiques, mais les cibles demandent une révision mobile. Normaliser et vérifier : échelle typo des métadonnées, contraste des textes tertiaires, tailles tactiles, règles d'ouverture des popovers et breakpoints.

## 20. Brand perception audit

Sans connaître Toumaï, l'interface évoque un produit maintenu avec soin : logo propre, palette identifiable, composition aérée et états principaux présents. Le niveau « mature international » est freiné par UX-001 à UX-005, qui sont des détails visibles dans des usages ordinaires. La bonne direction est de conserver la familiarité du chat tout en fiabilisant les comportements de Toumaï, plutôt que de redessiner toute l'interface.

## 21. Quick wins

1. Ajouter « Aucune conversation trouvée » à la recherche filtrée.
2. Fermer les menus du composer à l'ouverture du tiroir et au changement de conversation.
3. Raccourcir ou laisser passer sur deux lignes les descriptions des modèles.
4. Relever le contraste du disclaimer et des textes secondaires utiles dans le thème clair.
5. Appliquer un repli UI aux titres de conversation manifestement invalides.

## 22. Structural improvements

Corriger la gestion du focus et des touches du sélecteur de modèle; définir une politique commune pour popovers, tiroirs et modales; réviser l'échelle des cibles tactiles et du texte secondaire; tester une hiérarchie de navigation selon les usages réels. Ces travaux impliquent plus qu'une correction cosmétique.

## 23. Do-not-change-yet / KEEP_AS_IS

**KEEP_AS_IS :** largeur de lecture, alignement réponse/composer, distinction visuelle des messages, bouton d'envoi qui remplace le mode vocal quand un texte est saisi, indicateur de réflexion et arrêt, menu de modèle ouvert vers le haut, identité de marque et palette générale. Leur comportement observé soutient la compréhension. Ne pas changer les flux de génération, la structure serveur, ni le rendu des tableaux avant de confirmer la forme exacte du Markdown reçu. Ne pas cacher des entrées de navigation sans étude d'usage.

## 24. Recommended roadmap / UX debt map

| Phase | Travail | Dette | Impact | Effort | Risque |
|---|---|---|---|---|---|
| UI-1 | Corriger titre de repli, recherche vide et fermeture des overlays | MUST FIX NOW | HIGH | S | LOW |
| UI-2 | Sélecteur modèle au clavier, architecture des menus; valider navigation | MUST FIX NOW | HIGH | M | MEDIUM |
| UI-3 | Nettoyer la carte source et affiner citations; vérifier tableau avec fixture canonique | SHOULD IMPROVE | MEDIUM | M | MEDIUM |
| UI-4 | Cibles tactiles, clavier virtuel et safe areas sur appareils réels | SHOULD IMPROVE | HIGH | M | MEDIUM |
| UI-5 | Contrastes, focus complet, lecteur d'écran, zoom et mouvement réduit | MUST FIX NOW | HIGH | M | LOW |
| UI-6 | Consolider tokens typo/couleurs/cibles et règles d'overlay | SHOULD IMPROVE | MEDIUM | M | MEDIUM |
| UI-7 | Microcopie des raccourcis, finesse des métadonnées et transitions | LATER / POLISH | LOW | S | LOW |

### Cartographie front-end après observation

| Élément visible | Composant | Style/token | Règle responsive probable |
|---|---|---|---|
| Accueil, en-tête, conversation, composer, outils | `app/chat/page.tsx` | `app/globals.css` : `chat-shell`, `chat-composer`, `chat-iconbtn`, `chat-input`, `--chat-measure` | classes `md`, `sm`, état `narrow`, `h-dvh` |
| Sidebar, recherche, historique, tiroir | `components/Sidebar.tsx` | couleurs globales, largeur `w-72`, `md:w-[68px]` | `fixed` mobile, `md:static` desktop |
| Menu du modèle | `components/ModelSelector.tsx` | largeur `17rem`, `bottom-full`, `right-0`, couleurs globales | largeur fixe avec texte `truncate` |
| Messages et citations | `components/ChatMessage.tsx` | `prose-toumai`, variables de texte | colonne héritée du chat |
| Carte de sources | `components/chat/widgets/kinds/ResearchWidgets.tsx` | `WidgetCard`, petits textes 11–12,5 px | carte dans la colonne de réponse |

Ce rapprochement pointe les composants probables; il n'affirme pas que la cause de chaque défaut se situe exclusivement dans ces fichiers. Aucune implémentation n'a commencé.
