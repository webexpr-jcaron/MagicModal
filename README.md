# MagicModal
MagicModal est un plugin jQuery qui transforme une modal HTML statique en modal dynamique, connectée au back-end.

## Sommaire
0. Général
1. MagicModal d'ajout
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back
    - Cascade de causalités
2. MagicModal d'édition
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back
    - Cascade de causalités
3. MagicModal de suppression
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back
    - Cascade de causalités

## 0. General

Grâce à une modal statique possédant des attributs data-magic-* avec des informations clés, il devient possible de la rendre totalement fonctionnelle et connectée au back end à partir de la méthode .magicModal(). En effectuant un appel à cette modale sur une magic modal (= modal avec les attributs data-magic-* placés et complétés correctement), alors:

- Les input type file, qui sont toujours cachés et trigger par un bouton, voient le texte de leur bouton devenir le nom du fichier uploadé au change
- Les input type text, lorsqu'on tape Entrée avec le focus dessus, trigger le click du bouton de submit
- Le bouton de submit devient clickable et engendre au clic
    - un message temporaire «Aucun fichier reçu» sur les input type file non remplis
    - une border red sur les select2 non remplis
    - une class input-error sur les input type text non remplis
    - si les champs obligatoires sont tous remplis, les calls à l'API, à la suite desquels il est possible d'exécuter du code custom
        - les calls à l'API incluent plusieurs fonctionnalités intéressantes: retrait des caractères interdits dans les noms de fichiers, renommage en cas de fichier avec le même nom, ajout/édition/suppression de fichiers secondaires reliés par clé primaire au fichier principal
    - la fermeture de la modal et le vidage des champs

Un grand atout de MagicModal est qu'il permet l'**édition de fichier**, qui n'est pas permise par Sharepoint. En réalité, une édition de fichier peut soit être une édition simple (on ne modifie que les colonnes de sa row), soit une édition complexe (on modifie le fichier). L'édition complexe consiste en une suppression et un ajout par recopie des caractéristiques non modifiées. Cela engendre la création d'un nouvel ID, et donc toutes les liaisons par clés primaires deviennent obsolètes. Il faut garder ça en tête si on veut lier des listes custom aux items de la magic modal. Mais en cas d'utilisation de fichiers secondaires, MagicModal est prévu pour s'occuper automatiquent de la mise à jour de leur colonne possédant l'ID du fichier principal.

## 1. MagicModal d'ajout 

### Dans le fichier HTML
- chaque élément possédant un attribut data-magic-* doit également posséder un attribut id unique.
- la modal doit avoir **data-magic-type** à add.
- la modal doit avoir **data-magic-recipient** doit être égale à Library::NomDeLaLibrairieSharepoint::PositionDansLaLibrairie::ValeurDeLaColonneDocumentType. La Librairie doit posséder les colonnes **AccessibleName** (short string) et **DocumentType** (short string).
    - Exemples:
    - 'Library::BNPPDocuments::Process::Procédure' => l'ajout se fera dans la librairie appelée "BNPPDocuments", dans son sous-dossier direct appelé "Process", et aura "Procédure" comme valeur dans la colonne DocumentType.
    - 'Library::BNPPDocuments::None::Procédure' => l'ajout se fera à la racine de la librairie "BNPPDocuments" (pas de sous-dossier).
    - 'Library::BNPPDocuments::/SousDossier1/SousDossier2/SousDossier3::Procédure': => l'ajout peut également se faire au degré de profondeur souhaité.
- le fichier principal à ajouter doit avoir l'attribut vide **data-magic-main-file** et l'attribut **data-magic-btn** égal à #idDuBoutonAssocié.
- les selects/input type text dont les valeurs doivent être enregistrées dans le back doivent posséder l'attribut **data-magic-col**, correspondant au nom de la colonne du recipient.
- le bouton de submit du formulaire doit avoir l'attribut vide **data-magic-submit**.

```html
<!-- @@ Modal simplifiée par souci de lisibilité -->
<div id="modal-add-procedure"
     data-magic-type="add"
     data-magic-recipient="Library::BNPPDocuments::Process::Procédure"
>
            
    <!-- @@ Le main file à upload -->
    <div>
        <input type="file" id="procedureParentItemFile"
            data-magic-main-file 
            data-magic-btn="#btn-targetting-procedure-file">
        <button type="button" id="btn-targetting-procedure-file">
            Cliquez ici pour ajouter un fichier
        </button>
    </div>

    <!-- @@ Les informations à mettre dans les colonnes -->
    <div>
        <select class="is-select2" data-magic-col="ParentId" id="parent-cat-id"></select>

        <input id="procedureParentItemName" data-magic-col="Title" type="text" placeholder="Nom du fichier">

        <input id="procedureParentItemReference" data-magic-col="Reference" type="text" class="form-control" placeholder="Référence (ex: RH-NP-3361)">

        <textarea id="procedureParentItemDescription" data-magic-col="Description" class="form-control" rows="5" placeholder="Description"></textarea>

        <input id="procedureParentItemLinkUrl" data-magic-col="Link" type="text" class="form-control is-link-field" placeholder="https://...">
    </div>

    <!-- @@ Le bouton "Ajouter" -->
    <div>
        <button id="procedureParentItemSubmit" type="button" class="btn btn-primary" data-magic-submit>Ajouter</button>
    </div>
</div>
```

### Dans le fichier JS

```js
    $('#modal-add-procedure').magicModal({
        onAddDone: function( addData ) 
        {
            // On peut manipuler des données une fois l'ajout complètement terminé
            console.log( addData );
            
            // Ou alors on peut ne pas se faire chier et simplement reload
            location.reload()
        }
    })
```

### Côté back 

![backend](https://zupimages.net/up/20/38/ia4o.png)


### Cascades de causalités
