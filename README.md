# Lecteur de notes R&T

Page web qui lit le relevé provisoire de notes (PDF exporté depuis le tableur
Excel du département R&T) et l'affiche lisiblement : moyennes par UE, détail des
ressources et SAÉ, comparaison avec la promo, classement estimé, évolution
d'un relevé à l'autre et objectifs personnels.

Ouvrir `index.html` dans un navigateur (ou la page GitHub Pages du dépôt), puis
cliquer sur « Ouvrir ». Les PDF sont lus localement avec
[pdf.js](https://mozilla.github.io/pdf.js/) : rien n'est envoyé.

## Ce que montre la page

- Menu ☰ : Moyenne, Points forts, Évolution, Unités d'enseignement, Matières
  et Paramètres (nombre d'élèves dans la promo et dans ton parcours).
- Moyennes d'UE en blanc à partir de 10, en orange entre 8 et 10, en rouge sous 8.
- Règles 0–20 : ta note en bleu, la moyenne de la promo en orange, la meilleure
  note en vert, la plus basse en rouge.
- Graphique en araignée : une branche par matière, ta toile et celle de la
  promo, avec tes 3 points forts et tes 3 points faibles.
- Objectifs sur la moyenne générale, chaque UE, chaque matière et le classement.

## Garder ses relevés

- Les relevés et objectifs restent dans le navigateur de chacun (`localStorage`) :
  ils sont toujours là après avoir fermé la page ou éteint l'ordinateur, mais
  pas sur un autre appareil ni après avoir vidé les données du navigateur.
- « Sauvegarder » télécharge un seul fichier, `mes-releves.json`, avec tous les
  relevés et objectifs. Pour tout retrouver, l'ouvrir avec « Ouvrir ».
- « Ouvrir » accepte aussi plusieurs PDF d'un coup ou un `.zip` de PDF.

## Comment le PDF est lu (`parser.js`)

Le relevé est un grand tableau découpé sur plusieurs pages qui se suivent de
gauche à droite. Rien n'est codé en dur (ni les codes R501/R301, ni le nombre de
colonnes ou de pages) :

1. Les lignes sont repérées par leurs libellés : le nom de l'étudiant, `Min`,
   `Max`, `Moy`, et la ligne d'en-tête qui contient le plus de « Moy ».
2. Les cases sont délimitées par le bord droit des nombres (Excel les aligne à
   droite), ce qui gère aussi les colonnes sans titre.
3. Un bloc (ressource, SAÉ ou UE) est une suite de colonnes qui se termine par
   « Moy » ou « Moy. UE » ; son code (R5xx, SAExxx, UExx) et son intitulé sont
   les textes situés au-dessus.
4. Le parcours (Cyber, IOM…) est déduit des codes (`UE54CYB`, `R3Cyber16`…).

Testé sur les relevés S3 et S5.

## Évolution

- Les flèches ▲ ▼ comparent chaque moyenne au relevé précédent du même semestre.
- La courbe suit la moyenne générale (et celle de la promo) sur tous les relevés.
- Le tableau « par compétence » relie les UE d'un semestre à l'autre par leur
  numéro de compétence (UE31 → UE51, UE34CYB → UE54CYB).

## Classement estimé

Le relevé ne donne que la moyenne, la meilleure et la plus basse note de la
promo. Le rang est estimé en supposant une répartition en cloche, avec un
écart-type déduit de (max − moyenne) pour un groupe de la taille indiquée (promo
et parcours réglables dans la page). C'est un ordre de grandeur, pas un
classement officiel.
