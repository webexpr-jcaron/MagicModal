# MagicModal
MagicModal est un plugin jQuery qui transforme une modal HTML statique en modal dynamique, connectée au back-end.

## Sommaire
1. MagicModal d'ajout
2. MagicModal d'édition
3. MagicModal de suppression

## 1. MagicModal d'ajout 

### Dans le fichier HTML
- la modal doit avoir **data-magic-type** à add.
- la modal doit avoir **data-magic-recipient** égal à:
    - 'Library::BNPPDocuments::Process::Procédure' => l'ajout se fera dans la librairie appelée "BNPPDocuments", dans son sous-dossier direct appelé "Process", et aura "Procédure" comme valeur dans la colonne DocumentType.
    - 'Library::BNPPDocuments::None::Procédure' => l'ajout se fera à la racine de la librairie "BNPPDocuments" (pas de sous-dossier).
    - 'Library::BNPPDocuments::/SousDossier1/SousDossier2/SousDossier3::Procédure': => l'ajout peut également se faire au degré de profondeur souhaité.
- le fichier principal à ajouter doit avoir l'attribut vide **data-magic-main-file** et l'attribut **data-magic-btn** égal à #idDuBoutonAssocié.
- les selects/input type text dont les valeurs doivent être enregistrées dans le back doivent posséder l'attribut **data-magic-col**, correspondant au nom de la colonne du recipient
- le bouton de submit du formulaire doit avoir l'attribut vide **data-magic-submit**

```html
<!-- @@ Modal simplifiée par souci de lisibilité -->
<div id="modal-add-procedure"
     data-magic-type="add"
     data-magic-recipient="Library::BNPPDocuments::Process::Procédure"
>
            
    <!-- @@ Le main file à upload -->
    <div>
        <input type="file" id="procedure-parent-item-file"
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
        onAddDone: function() { location.reload() }
    })
```
