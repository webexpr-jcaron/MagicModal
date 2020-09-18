# MagicModal
jQuery plugin. Turns a static HTML modal into a dynamic modal linked to SharePoint's back-end.

## Fonctionnement global

### Dans le fichier HTML

### Dans le fichier JS

```html
<!-- @@ Add procedure modal -->
<div class="modal theme-modal fade" id="modal-add-procedure"
    data-magic-type="add"
    data-magic-recipient="Library::BNPPDocuments::Process::Procédure"
>
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title h4">Ajouter une procédure</div>
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">
                    <i class="bac-close"></i>
                </button>
            </div>
            <div class="form-group mb-0">
                <input class="hidden-input" type="file" id="procedureParentItemFile"
                    data-magic-main-file 
                    data-magic-btn="#btn-targetting-procedure-file">
                <button type="button" class="btn btn-dark btn-add-file btn-block file-name" id="btn-targetting-procedure-file">
                    Cliquez ici pour ajouter un fichier
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <select class="is-select2" data-magic-col="ParentId" id="parent-cat-id">
                        <option disabled selected value="0">Ajouter dans ...</option>
                    </select>
                </div>
                <div class="form-group">
                    <input id="procedureParentItemName" data-magic-col="Title" type="text" class="form-control" placeholder="Nom du fichier">
                </div>
                <div class="form-group">
                    <input id="procedureParentItemReference" data-magic-col="Reference" type="text" class="form-control" placeholder="Référence (ex: RH-NP-3361)">
                </div>
                <div class="form-group">
                    <textarea id="procedureParentItemDescription" data-magic-col="Description" class="form-control" rows="5" placeholder="Description"></textarea>
                </div>
                <div class="form-group">
                    <input id="procedureParentItemLinkUrl" data-magic-col="Link" type="text" class="form-control is-link-field" placeholder="https://...">
                </div>
            </div>
            <div class="modal-footer">
                <button id="procedureParentItemSubmit" type="button" class="btn btn-primary" data-magic-submit>Ajouter</button>
            </div>
        </div>
    </div>
</div>
```
