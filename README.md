# Lecteur de notes R&T

Page web qui lit le relevé provisoire de notes du BUT R&T (le PDF exporté depuis
le tableur Excel du département) et l'affiche de façon lisible : moyennes par UE
et par matière, position par rapport à la promo, classement estimé, évolution
d'un relevé à l'autre et objectifs personnels.

**Site :** https://esteban-crln.github.io/Galaxy-analyser/

## Utilisation

1. Ouvrir le site, puis cliquer sur **Ouvrir**.
2. Choisir un ou plusieurs relevés PDF. On peut aussi ouvrir un `.zip` de PDF ou
   une sauvegarde `mes-releves.json`.
3. Tout est lu dans le navigateur avec [pdf.js](https://mozilla.github.io/pdf.js/) :
   aucun fichier n'est envoyé nulle part.

Tant qu'aucun relevé n'est ouvert, la page affiche un exemple avec des notes
fictives.

## Ce que montre la page

L'interface montre l'essentiel d'abord ; un clic ouvre le détail.

- **Synthèse** : moyenne générale avec celle de la promo, classement estimé avec
  sa fourchette.
- **Points forts et faibles** (replié) : graphique en araignée avec une branche
  par matière, ta toile et celle de la promo, et tes 3 points forts et faibles.
- **Évolution** (replié, à partir de 2 relevés) : courbe de la moyenne générale
  et tableau par compétence d'un semestre à l'autre (UE31 → UE51…).
- **Unités d'enseignement** et **Matières** : une ligne chacune avec le nom, la
  note et une règle 0–20. Un clic ouvre la plus basse note, la moyenne promo, la
  meilleure note, le rang estimé, l'objectif et le détail (matières d'une UE,
  évaluations d'une matière avec leurs coefficients).
- **Menu ☰** : accès direct à chaque partie, et paramètres (nombre d'élèves dans
  la promo et dans le parcours, utilisés pour estimer le rang).

### Couleurs

- Règles 0–20 : ta note en bleu (trait lumineux), moyenne promo en orange,
  meilleure note en vert, plus basse en rouge, objectif en triangle.
- Moyennes d'UE et moyenne générale : blanc à partir de 10, orange entre 8 et 10,
  rouge sous 8.
- Objectifs : rose quand il est atteint, blanc tant qu'il ne l'est pas.
- Les flèches ▲ ▼ comparent au relevé précédent du même semestre.

### Objectifs

On peut fixer un objectif sur la moyenne générale, sur chaque UE, sur chaque
matière et sur le classement. La page indique l'écart restant et la moyenne à
obtenir sur les évaluations encore vides. Pour le classement, elle donne la
moyenne générale à viser.

## Garder ses relevés

- Les relevés et objectifs restent dans le navigateur (`localStorage`) : ils
  sont toujours là après avoir fermé la page ou éteint l'ordinateur, mais pas sur
  un autre appareil ni après avoir vidé les données du navigateur.
- **Sauvegarder** télécharge un seul fichier, `mes-releves.json`, avec tous les
  relevés et objectifs. Pour tout retrouver, l'ouvrir avec **Ouvrir**.
- Chaque personne qui utilise le site ne voit que ses propres relevés.

## Comment le PDF est lu

Le relevé est un grand tableau découpé sur plusieurs pages qui se suivent de
gauche à droite. `parser.js` ne code rien en dur (ni les codes R501/R301, ni le
nombre de colonnes ou de pages) :

1. Les lignes sont repérées par leurs libellés : le nom de l'étudiant, `Min`,
   `Max`, `Moy`, et la ligne d'en-tête qui contient le plus de « Moy ».
2. Les cases sont délimitées par le bord droit des nombres (Excel les aligne à
   droite), ce qui gère aussi les colonnes sans titre.
3. Un bloc (ressource, SAÉ ou UE) est une suite de colonnes qui se termine par
   « Moy » ou « Moy. UE » ; son code et son intitulé sont les textes situés
   au-dessus.
4. Le parcours (Cyber, IOM…) est déduit des codes (`UE54CYB`, `R3Cyber16`…).

Testé sur des relevés de S3 et de S5.

## Classement estimé

Le relevé ne donne que la moyenne, la meilleure et la plus basse note de la
promo, pas les notes des autres. Le rang est estimé en supposant une répartition
en cloche, avec un écart-type déduit de l'écart entre la meilleure note et la
moyenne pour un groupe de la taille indiquée dans les paramètres. C'est un ordre
de grandeur, pas un classement officiel.

## Fichiers

- `index.html` : la page (interface, calculs, graphiques).
- `parser.js` : la lecture du PDF.
