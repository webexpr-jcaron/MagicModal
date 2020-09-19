# MagicModal
MagicModal est un plugin jQuery qui transforme une modal HTML statique en modal dynamique, connectée au back-end.

## Sommaire
0. Présentation
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

## 0. Présentation

À partir d'une modal HTML statique possédant des attributs data-magic-* sur certains éléments clés, il devient possible de la rendre totalement fonctionnelle et connectée au back end à partir de la méthode .magicModal(). En effectuant un appel à cette méthode sur une modal selectionnée avec jQuery, voici ce qui se produit:

- Les input type file, qui sont toujours cachés et trigger par un bouton, voient le texte de leur bouton devenir le nom du fichier uploadé au change
- Les input type text, lorsqu'on tape Entrée avec le focus dessus, trigger le click du bouton de submit
- Le bouton de submit devient clickable et engendre au clic
    - un message temporaire «Aucun fichier reçu» sur les input type file non remplis
    - une border red sur les select2 non remplis
    - une class input-error sur les input type text non remplis
    - si les champs obligatoires sont tous remplis, les calls d'ajout/édition/suppression à l'API, à la suite desquels il est possible d'exécuter du code custom
        - les calls à l'API incluent plusieurs fonctionnalités intéressantes: retrait des caractères interdits dans les noms de fichiers, renommage en cas de fichier avec le même nom, ajout/édition/suppression de fichiers secondaires reliés par clé primaire au fichier principal
    - la fermeture de la modal et le vidage des champs

Chaque librairie qui est utilisée avec MagicModal doit avoir les colonnes **DocumentType** (short string) et **AccessibleName**, elles sont indispensables au fonctionnement du module. Pour choisir la librairie Sharepoint avec laquelle intéragir, la modal doit posséder un attribut data-magic-recipient égal à une formule structurée en 4 arguments: Library::NomDeLaLibrairie::Position::DocumentType. Le premier argument est statique, c'est toujours Library. Le second est le nom de la librairie dans le back du site Sharepoint. Le troisième est le degré de position (à la racine = "None"/dans un sous-dossier = "NomDuSousDossier"/à partir d'un chemin = /SousDossier1/SousDossier2). Le dernier est la valeur qui sera injectée dans la colonne "DocumentType" de la librairie.
 - Exemples:
    - 'Library::BNPPDocuments::Process::Procédure' => l'ajout se fera dans la librairie appelée "BNPPDocuments", dans son sous-dossier direct appelé "Process", et aura "Procédure" comme valeur dans la colonne DocumentType.
    - 'Library::BNPPDocuments::None::Procédure' => l'ajout se fera à la racine de la librairie "BNPPDocuments" (pas de sous-dossier).
    - 'Library::BNPPDocuments::/SousDossier1/SousDossier2/SousDossier3::Procédure': => l'ajout peut également se faire au degré de profondeur souhaité.

Un grand atout de MagicModal est qu'il permet l'**édition de fichier**, qui n'est pas permise par Sharepoint. En réalité, une édition de fichier peut soit être une édition simple (on ne modifie que les colonnes de sa row), soit une édition complexe (on modifie le fichier). L'édition complexe consiste en une suppression et un ajout par recopie des caractéristiques non modifiées. Cela engendre la création d'un nouvel ID, et donc toutes les liaisons par clés primaires deviennent obsolètes. Il faut garder ça en tête si on veut lier des listes custom aux items de la magic modal. Mais en cas d'utilisation de fichiers secondaires, MagicModal est prévu pour s'occuper automatiquent de la mise à jour de leur colonne possédant l'ID du fichier principal.

## 1. MagicModal d'ajout 

### Dans le fichier HTML
- chaque élément possédant un attribut data-magic-* doit également posséder un attribut id unique.
- la modal doit avoir **data-magic-type** à add.
- la modal doit avoir **data-magic-recipient** doit être égale à Library::NomDeLaLibrairieSharepoint::PositionDansLaLibrairie::ValeurDeLaColonneDocumentType.
- le fichier principal à ajouter doit avoir l'attribut vide **data-magic-main-file** et l'attribut **data-magic-btn** égal à #idDuBoutonAssocié.
- les selects/input type text dont les valeurs doivent être enregistrées dans le back doivent posséder l'attribut **data-magic-col**, correspondant au nom de la colonne du recipient.
- le bouton de submit du formulaire doit avoir l'attribut vide **data-magic-submit**.

```html
<div class="modal theme-modal fade" 
    id="modal-add-document"
    data-magic-type="add"                                                                            
    data-magic-recipient="Library::BNPPDocuments::Agreements::Accord">                               <!-- @@ data-magic-type, data-magic-recipient -->
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title h4">Ajouter un accord</div>
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">
                    <i class="bac-close"></i>
                </button>
            </div>
            <div class="form-group mb-0">
                <button type="button" class="btn btn-dark btn-add-file btn-block">
                    <input class="hidden-input" type="file" 
                    id="add-agreement-file" data-magic-main-file data-magic-btn="#add-agreement-file-btn"> <!-- data-magic-main-file, data-magic-btn -->
                    <span class="file-name" id="add-agreement-file-btn">Cliquez ici pour ajouter un fichier</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <input id="addDocumentName" type="text" class="form-control" placeholder="Nom du fichier"
                    data-magic-col="Title">                                                                 <!-- data-magic-col => colonne Title -->
                </div>
                <div class="form-group">
                    <select id="addDocumentCompany" class="selectCompany form-control is-select2"
                    data-magic-col="Company">                                                               <!-- data-magic-col => colonne Company -->
                        <option class="d-none" disabled="disabled" selected >Société</option>
                    </select>
                </div>
                <div class="form-group">
                    <select id="addDocumentTopic" class="selectTopic form-control is-select2"
                    data-magic-col="Topic">                                                                 <!-- data-magic-col => colonne Topic -->
                        <option class="d-none" disabled="disabled" selected>Thématique</option>
                    </select>
                </div>
                <div  class="form-group fg-date fc-shadow">
                    <input id="addDocumentDate" type="text" class="form-control" 
                    data-magic-col="Date">                                                                  <!-- data-magic-col => colonne Date -->
                </div>
            </div>
            <div class="modal-footer">
                <button id="addAgreement" type="button" class="btn btn-primary" 
                data-magic-submit>Ajouter</button>                                                          <!-- data-magic-submit -->
            </div>
            <div class="modal-sub-footer">
                <a href="javascript:void(0);" class="btn btn-secondary btn-block position-relative">
                    <input type="file" class="hidden-input" 
                    id="quickNote" 
                    data-magic-secondary-file
                    data-magic-optional
                    data-magic-primary-key-col="ParentId"
                    data-magic-secondary-recipient="Library::BNPPDocuments::AgreementsExplicativeNotes::Note explicative"
                    data-magic-btn="#add-explicative-note-btn"                                             
                >                                                                                          <!-- data-magic-optional, data-magic-secondary-file,
                                                                                                                data-magic-primary-key-col,
                                                                                                                data-magic-secondary-recipient, data-magic-btn -->
                    <span class="fa fa-info fai-circle rounded-circle align-middle"></span>
                    <span id="add-explicative-note-btn" class="file-name align-middle ml-1">Ajouter une note explicative</span>
                </a>
            </div>
        </div>
    </div>
</div>
```

### Dans le fichier JS

Il suffit alors de sélectionner cette modal avec jQuery et lui appliquer la méthode .magicModal( paramètre ). Le paramètre est un objet, car j'avais prévu initialement de permettre plus d'options que ça, mais au final il n'y en a qu'une. C'est soit onAddDone, soit onEditDone, soit onDeleteDone à choisir de manière appropriée selon la modaL. 

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

Le paramètre de la fonction de callback d'ajout, ici appelé "addData", contiendra toujours un objet de la forme suivante:

```js
    {
        main: < données sur le fichier principal ajouté (data-magic-main-file) >,
        idDuFichierSecondaire1: < données sur le fichier secondaire 1 (data-magic-secondary-file) >,
        idDuFichierSecondaire2: < et ainsi de suite pour chaque fichier secondaire >
    }
```


### Résultat côté back 

Comme on a mis ici dans le **data-magic-recipient** la valeur Library::BNPPDocuments::Agreements::Accord, cela signifie que le call API a ajouté le fichier dans la librairie BNPPDocuments, dans le sous-dossier direct Agreements, avec le DocumentType mis à Accord.
![backend](https://zupimages.net/up/20/38/8w9i.png)

Pour le fichier secondaire, on a mis son **data-magic-secondary-recipient** à Library::BNPPDocuments::AgreementsExplicativeNotes::Note explicative. Il a donc atterri dans le sous-dossier direct AgreementsExplicativeNote. La colonne ParentId, renseignée via l'attribut data-magic-primary-key-col, a la valeur de l'ID du fichier principal.
![backend](https://zupimages.net/up/20/38/hp5n.png)


### Cascades de causalités
