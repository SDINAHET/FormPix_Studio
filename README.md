# FormPix Studio

<p align="center">
  <img src="chrome/logo-master.png" width="150" alt="FormPix Studio logo">
</p>

<p align="center"><strong>Préparer, convertir, recadrer et optimiser des images localement dans Chrome et Firefox.</strong></p>

FormPix Studio est une extension de traitement d’images conçue par **Stéphane Dinahet**. Elle prépare une image pour un formulaire en ligne, un réseau social ou un site web sans l’envoyer vers un serveur externe.

Les images restent dans le navigateur. Aucun compte, publicité, outil d’analyse d’audience ou code distant n’est utilisé.

## Fonctionnalités

- Import par sélecteur de fichiers, glisser-déposer, presse-papiers ou clic droit sur une image web.
- Ouverture automatique dans la barre latérale du navigateur.
- Remplacement immédiat de l’image non enregistrée lorsqu’une nouvelle image est sélectionnée.
- Conversion JPG, PNG, WebP et AVIF avec détection du support réel du navigateur.
- Conservation de la transparence PNG/WebP et choix d’un fond blanc ou personnalisé.
- Suppression déterministe d’un fond blanc uni avec tolérance réglable.
- Recadrage visuel par glisser-déposer.
- Redimensionnement exact, verrouillage du ratio, modes ajuster, remplir et étirer.
- Comparaison rapide entre l’original et le résultat.
- Objectif automatique de poids : 100 Ko, 500 Ko, 1 Mo ou limite personnalisée.
- Réduction facultative des dimensions lorsque la limite ne peut pas être atteinte autrement.
- Préréglages pour formulaires, Instagram, LinkedIn, YouTube, Open Graph, Full HD et bannières web.
- Suppression des métadonnées EXIF lors du réencodage.
- Conversion de plusieurs images avec une file d’attente locale.
- Historique local facultatif sans conservation des pixels de l’image.
- Ouverture d’un téléchargement récent dans la visionneuse d’images de Windows ou Linux.
- Paramètres exportables et importables.
- Horodatage des fichiers activé par défaut.
- Autorisation facultative globale demandée une fois, ou autorisation mémorisée site par site.
- Interface disponible dans 20 langues avec langue du navigateur par défaut.

## Navigateurs

| Version | Dossier | Interface latérale | Manifeste |
|---|---|---|---|
| Chrome / Chromium | [`chrome/`](chrome/) | `sidePanel` | Manifest V3 |
| Firefox | [`firefox/`](firefox/) | `sidebar_action` | Manifest V3 |

Les deux variantes partagent le même éditeur et les mêmes fonctions. Le manifeste Firefox contient l’identifiant Gecko `formpix-studio@sdinahet.github.io` et utilise l’API de barre latérale propre à Firefox.

## Installation locale — Chrome

1. Télécharger ou cloner ce dépôt.
2. Ouvrir `chrome://extensions`.
3. Activer **Mode développeur**.
4. Cliquer sur **Charger l’extension non empaquetée**.
5. Sélectionner le dossier `chrome`.
6. Cliquer sur l’icône FormPix Studio ou faire un clic droit sur une image.

Après une modification du code, utiliser le bouton **Actualiser** de `chrome://extensions`.

## Installation locale — Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`.
2. Cliquer sur **Charger un module complémentaire temporaire**.
3. Sélectionner `firefox/manifest.json`.
4. Ouvrir FormPix Studio depuis son icône ou la barre latérale.

Une extension temporaire disparaît au redémarrage de Firefox. Pour une installation permanente, le paquet doit être signé par Mozilla Add-ons.

## Utilisation

### Depuis une page web

1. Faire un clic droit sur une image.
2. Choisir **Ouvrir dans FormPix Studio** ou un format dans **Préparer l’image en…**.
3. La barre latérale s’ouvre et l’image est importée automatiquement.
4. Régler le format, les dimensions, le recadrage, la transparence, la qualité ou le poids maximal.
5. Télécharger l’image optimisée.

Une nouvelle sélection remplace l’aperçu courant sans obliger à enregistrer l’image précédente. Un identifiant interne empêche une ancienne requête lente de remplacer la dernière image choisie.

### Autorisations de sites

Deux modes sont disponibles dans les paramètres :

- **Autoriser une fois pour tous les sites** : Chrome ou Firefox affiche une demande globale une fois, puis les imports deviennent automatiques.
- **Demander pour chaque nouveau site** : l’autorisation est limitée au domaine de l’image et reste mémorisée par le navigateur.

L’accès est facultatif. Il est utilisé uniquement après une action explicite dans le menu contextuel pour récupérer l’image choisie et la traiter localement.

## Formats et transparence

- **JPG** : idéal pour les photographies, fichiers légers, aucune transparence.
- **PNG** : sans perte et adapté aux éléments transparents.
- **WebP** : format moderne pour les développeurs et le Web.
- **AVIF** : très bonne compression lorsque l’encodage est pris en charge par le navigateur.

Pour un export JPG, les pixels transparents sont composés sur le fond choisi. La fonction de suppression de fond vise les fonds blancs unis ; ce n’est pas une suppression de fond par intelligence artificielle.

## Confidentialité

- Aucun téléversement des images vers FormPix Studio.
- Aucun serveur applicatif.
- Aucun compte utilisateur.
- Aucune publicité, analyse d’audience ou vente de données.
- Aucun script distant.
- Réencodage local supprimant les métadonnées EXIF.
- Historique désactivé par défaut et effaçable à tout moment.

La politique complète se trouve dans [`chrome/PRIVACY.md`](chrome/PRIVACY.md) et [`firefox/PRIVACY.md`](firefox/PRIVACY.md).

## Internationalisation

FormPix Studio suit automatiquement la langue du navigateur ou permet un choix manuel mémorisé : anglais, français, allemand, espagnol, italien, portugais du Brésil, néerlandais, polonais, suédois, turc, indonésien, ukrainien, russe, arabe, hindi, thaï, vietnamien, japonais, coréen et chinois simplifié.

Les métadonnées de boutique utilisent les fichiers standards `_locales/<langue>/messages.json`.

## Architecture

L’extension n’utilise aucune dépendance externe ni étape de compilation.

- `editor.html`, `editor.js`, `styles.css` : éditeur et aperçu.
- `options.html`, `options.js`, `options.css` : paramètres, historique et assistance.
- `background.js` : menu contextuel, permissions facultatives et communication avec la barre latérale.
- `i18n.js` et `_locales/` : choix manuel et métadonnées localisées.
- `icons/`, `icon.svg`, `logo-master.png` : identité visuelle.
- `PRIVACY.md` : politique de confidentialité.
- `STORE_LISTING.md` : préparation de la fiche de boutique.

## Vérification avant publication

Tester au minimum :

- fichiers PNG, JPG et WebP locaux ;
- import depuis une image HTTPS ;
- refus puis acceptation d’une permission ;
- modes global et site par site ;
- transparence PNG/WebP ;
- dimensions exactes et recadrage ;
- cible de 500 Ko ;
- téléchargement multiple ;
- ouverture depuis l’historique ;
- langue automatique et choix manuel ;
- retour depuis les paramètres sans perdre l’image courante ;
- comportement AVIF ou message d’indisponibilité.

## Limites connues

- Certaines images temporaires utilisant une URL `blob:` ne peuvent pas être récupérées depuis le processus d’arrière-plan.
- Les pages internes telles que `chrome://`, `about:` et le Chrome Web Store limitent les extensions.
- Un fichier déplacé ou supprimé ne peut plus être ouvert depuis l’historique.
- La compression PNG dépend davantage des pixels et dimensions que d’un curseur de qualité.

## Développement et contribution

Les rapports de bugs et propositions sont les bienvenus dans les [issues GitHub](https://github.com/SDINAHET/FormPix_Studio/issues).

Lors d’un rapport, préciser le navigateur, sa version, le système d’exploitation, l’URL de test si elle est publique, le format de l’image et les étapes permettant de reproduire le problème. Ne jamais joindre d’image privée ou de donnée personnelle.

## Auteur

**Stéphane Dinahet** — [GitHub @SDINAHET](https://github.com/SDINAHET)

Projet : [github.com/SDINAHET/FormPix_Studio](https://github.com/SDINAHET/FormPix_Studio)

## Licence

Aucune licence open source n’est accordée pour le moment. Le code reste protégé par le droit d’auteur de Stéphane Dinahet. Ajouter un fichier `LICENSE` avant d’accepter des contributions de code si le projet doit devenir open source.
