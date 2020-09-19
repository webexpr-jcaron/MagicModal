# MagicModal
MagicModal est un plugin jQuery qui transforme une modal HTML statique en modal dynamique, connectée au back-end.

## Sommaire
0. Présentation
1. MagicModal d'ajout
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back
2. MagicModal d'édition
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back
3. MagicModal de suppression
    - Dans le fichier HTML
    - Dans le fichier JS
    - Côté back

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
- pour ajouter un fichier secondaire, il faut ajouter un input type file dans la modal avec plusieurs attributs data-magic-*:
    - **data-magic-optional**, pour le rendre "secondaire" et non bloquant pour le call API s'il n'est pas renseigné
    - **data-magic-secondary-file**, pour préciser à MagicModal que c'est un fichier secondaire,
    - **data-magic-primary-key-col**, pour indiquer le nom de la colonne dans son recipient qui prendra la valeur de l'ID du fichier principal,
    - **data-magic-secondary-recipient**, pour indiquer son recipient dans le back, en suivant le même pattern que le data-magic-recipient
    - **data-magic-btn**, pour indiquer quel élément trigger son click 


```html
<!-- @@ data-magic-type, data-magic-recipient sur la modal -->
<div class="modal theme-modal fade" 
    id="modal-add-document"
    data-magic-type="add"                                                                            
    data-magic-recipient="Library::BNPPDocuments::Agreements::Accord">                               
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
                    <!-- @@ data-magic-main-file, data-magic-btn sur l'input type file du fichier principal à envoyer -->
                    <input class="hidden-input" type="file" 
                    id="add-agreement-file" data-magic-main-file data-magic-btn="#add-agreement-file-btn"> 
                    <span class="file-name" id="add-agreement-file-btn">Cliquez ici pour ajouter un fichier</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <!-- @@ data-magic-col sur un input type text => sa valeur ira dans la colonne Title -->
                    <input id="addDocumentName" type="text" class="form-control" placeholder="Nom du fichier"
                    data-magic-col="Title">                                                                 
                </div>
                <div class="form-group">
                    <!-- @@ data-magic-col sur un select select2 => sa valeur ira dans la colonne Company -->
                    <select id="addDocumentCompany" class="selectCompany form-control is-select2"
                    data-magic-col="Company">                                                               
                        <option class="d-none" disabled="disabled" selected >Société</option>
                    </select>
                </div>
                <div class="form-group">
                    <!-- @@ data-magic-col sur un select select2 => sa valeur ira dans la colonne Topic -->
                    <select id="addDocumentTopic" class="selectTopic form-control is-select2"
                    data-magic-col="Topic">                                                                 
                        <option class="d-none" disabled="disabled" selected>Thématique</option>
                    </select>
                </div>
                <!-- @@ data-magic-col sur un input type text => sa valeur ira dans la colonne Date -->
                <div  class="form-group fg-date fc-shadow">
                    <input id="addDocumentDate" type="text" class="form-control" 
                    data-magic-col="Date">                                                                  
                </div>
            </div>
            <div class="modal-footer">
                <!-- @@ data-magic-submit sur l'élément qui déclenche le call API au click -->
                <button id="addAgreement" type="button" class="btn btn-primary" 
                data-magic-submit>Ajouter</button>                                                          
            </div>
            <div class="modal-sub-footer">
                <a href="javascript:void(0);" class="btn btn-secondary btn-block position-relative">
                    <!-- @@ pour ajouter un fichier secondaire, il lui faut pas mal d'attributs -->
                    <input type="file" class="hidden-input" 
                    id="quickNote" 
                    data-magic-secondary-file
                    data-magic-optional
                    data-magic-primary-key-col="ParentId"
                    data-magic-secondary-recipient="Library::BNPPDocuments::AgreementsExplicativeNotes::Note explicative"
                    data-magic-btn="#add-explicative-note-btn"                                             
                >                                                                                          
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
            // Ce code s'exécute une fois l'ajout complètement terminé, et on peut manipuler les données insérées via le paramètre
            // Typiquement, après un ajout, on s'attend à voir l'apparition d'un élément dans le DOM
            console.log( addData );
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
![backend](https://zupimages.net/up/20/38/dy1r.png)

Pour le fichier secondaire, on a mis son **data-magic-secondary-recipient** à Library::BNPPDocuments::AgreementsExplicativeNotes::Note explicative. Il a donc atterri dans le sous-dossier direct AgreementsExplicativeNote. La colonne ParentId, renseignée via l'attribut data-magic-primary-key-col, a la valeur de l'ID du fichier principal.
![backend](https://zupimages.net/up/20/38/bi1j.png)


## 2. MagicModal d'édition

### Dans le fichier HTML

- chaque élément possédant un attribut data-magic-* doit également posséder un attribut id unique.
- la modal doit avoir **data-magic-type** égal à edit.
- la modal doit avoir **data-magic-recipient** égal à Library::NomDeLaLibrairie::SousDossier::ValeurDeDocumentType (voir 0. Présentation).
- le fichier principal à éditer doit avoir l'attribut vide **data-magic-main-file** et l'attribut **data-magic-btn** égal à #idDuBoutonAssocié.
- les selects/input type text dont les valeurs doivent être enregistrées dans le back doivent posséder l'attribut **data-magic-col**, correspondant au nom de la colonne du recipient.
- Le bouton d'affichage de la modal de confirmation de suppression doit avoir l'attribut vide **data-magic-redirect-confirm**.
- le bouton de submit du formulaire doit avoir l'attribut vide **data-magic-submit**.
- pour éditer un fichier secondaire, il faut ajouter un input type file dans la modal avec plusieurs attributs data-magic-*:
    - **data-magic-optional**, pour le rendre "secondaire" et non bloquant pour le call API s'il n'est pas renseigné
    - **data-magic-secondary-file**, pour préciser à MagicModal que c'est un fichier secondaire,
    - **data-magic-primary-key-col**, pour indiquer le nom de la colonne dans son recipient qui prendra la valeur de l'ID du fichier principal,
    - **data-magic-secondary-recipient**, pour indiquer son recipient dans le back, en suivant le même pattern que le data-magic-recipient,
    - **data-magic-btn**, pour indiquer quel élément trigger son click 
    
```html
<!-- @@ data-magic-type, data-magic-recipient sur la modal -->
<div data-id="" document-path="" note-path=""  class="modal theme-modal fade" 
id="modal-edit-document"
data-magic-type="edit"
data-magic-recipient="Library::BNPPDocuments::Agreements::Accord">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title h4">Editer</div>
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">
                    <i class="bac-close"></i>
                </button>
            </div>
            <div class="form-group mb-0">
                <!-- @@ data-magic-main-file, data-magic-btn sur l'input du fichier principal -->
                <input class="hidden-input" type="file" 
                id="agreementEditFile" data-magic-main-file data-magic-btn="#agreementEditFileBtn"> 
                <button type="button" class="btn btn-dark btn-add-file btn-block" id="agreementEditFileBtn">
                    Cliquez ici pour ajouter un fichier
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <!-- @@ data-magic-col sur un input type text => la valeur ira dans la colonne Title -->
                    <input id="editDocumentName" type="text" class="form-control" placeholder="Nom du fichier"
                            data-magic-col="Title">
                </div>
                <div class="form-group">
                    <!-- @@ ira dans la colonne Company -->
                    <select id="editDocumentCompany" class="selectCompany form-control is-select2"
                            data-magic-col="Company">
                        <option class="d-none" disabled="disabled" selected >Société</option>
                    </select>
                </div>
                <div class="form-group">
                    <!-- @@ ira dans la colonne Topic -->
                    <select id="editDocumentTopic" class="selectTopic form-control is-select2"
                    data-magic-col="Topic">
                        <option class="d-none" disabled="disabled" selected>Thématique</option>
                    </select>
                </div>
                <div  class="form-group fg-date fc-shadow">
                    <!-- @@ ira dans la colonne Date -->
                    <input id="editDocumentDate" type="text" class="form-control" 
                        data-magic-col="Date">
                </div>
            </div>
            <div class="modal-footer">
                <!-- @@ data-magic-redirect-confirm sur le bouton qui amène sur la modal de confirmation de suppression -->
                <button id="deleteAgreement" type="button" class="btn btn-secondary" data-magic-redirect-confirm>Supprimer</button>
                <!-- @@ data-magic-submit sur le bouton qui va générer les calls API -->
                <button id="updateAgreement" type="button" class="btn btn-primary" data-magic-submit>Enregistrer</button>
            </div>
            <div class="modal-sub-footer">
                <a id="addQuickNote" href="javascript:void(0);" class="btn btn-secondary btn-block position-relative">
                    <!-- @@ si fichier secondaire -->
                    <input type="file" class="hidden-input" id="quickNoteEditModal"
                    data-magic-secondary-file
                    data-magic-optional
                    data-magic-primary-key-col="ParentId"
                    data-magic-secondary-recipient="Library::BNPPDocuments::AgreementsExplicativeNotes::Note explicative"
                    data-magic-btn="#edit-explicative-note-btn"
                    >
                    <span class="fa fa-info fai-circle rounded-circle align-middle"></span>
                    <span class="file-name align-middle ml-1" id="edit-explicative-note-btn">Ajouter une note explicative</span>
                </a>
            </div>
        </div>
    </div>
</div>
```

### Dans le fichier JS

Il faut faire en sorte dans le code que la modal d'edit ait en .data("idToEdit") l'ID de l'item à éditer.
On sélectionne la modal d'édition en jQuery, puis on lui applique la méthode magicModal en jouant avec onEditDone.

```js
$('#modal-edit-document').magicModal({
    onEditDone: function( editData )
    {
        // Ce code s'exécute une fois l'édition complètement terminé, et on peut manipuler les données insérées via le paramètre
        // Attention, le paramètre diffère selon édition simple ou complexe
        // Typiquement, après une édition, on s'attend à voir la modification de l'élément édité dans le DOM
        console.log( editData );
    }
})
```

Au moment du call à l'API, il faut faire en sorte dans le code que la modal d'edit ait en .data("idToEdit") l'ID de l'item à éditer. Une autre subtilité vient du fait que le paramètre retourné diffère selon les tâches exécutées. En cas d'édition simple (modifications des colonnes, mais pas du fichier), editData aura la forme suivante:

```js
{
    main: < updatedItem de SharePoint >
}
```

Cependant, si l'édition comprend une modification de fichier, il s'agit d'une édition complexe, c'est-à-dire d'une suppression totale de la row du fichier existant, suivie d'un rajout du nouveau fichier avec recopie des anciennes colonnes. Pour la recréation des colonnes, ce sont les éléments possédants les attributs data-magic-col qui sont collectés. La mise à jour des colonnes AccessibleName et DocumentType est automatique. En cas d'édition complexe, étant donné que c'est donc en réalité un ajout, le paramètre retourné est le même que celui de la magic modal d'ajout. Les données comprennent la propriété "addedItemID", correspondant à l'ID de la nouvelle row du back. 

```js
{
    main: < données identiques à celles d'un ajout > 
}
```

À noter que les fichiers secondaires suivent tous la même logique, on aura donc également les propriétés de chaque fichier secondaire édité, avec leurs données. Le traitement des fichiers secondaires au moment des calls API est le suivant:
- si (non trouvé dans le back ET input file rempli) alors ajout du file en fichier secondaire
- sinon si (trouvé dans le back ET le bouton lié à l'input file a été remis à un texte comme "Ajouter un fichier") alors suppression du fichier secondaire
- sinon si (non trouvé dans le back ET input file non rempli) alors rien ne se passe #trempette
- sinon alors le fichier secondaire est édit au niveau de sa clé primaire

### Côté back

En éditant le fichier ajouté dans l'exemple de 1. MagicModal d'ajout, on voit que son ID n'est plus le même car il a fallu supprimer la row puis en recréer une. 
![backend](https://zupimages.net/up/20/38/5qoc.png)

Cependant, son fichier secondaire est mise à jour pour concorder avec le nouvel ID.
![backend](https://zupimages.net/up/20/38/wgiz.png)


## 3. MagicModal de suppression

### Dans le fichier HTML

Lorem Ipsum.

### Dans le fichier JS

Lorem ipsum.

### Côté back

Lorem ipsum.
