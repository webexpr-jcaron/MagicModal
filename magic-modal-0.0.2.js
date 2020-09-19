    var _lists = $pnp.sp.web.lists;

    function sharepointNameFormat( name )
    {
        var legalName = name.replace(/(\||\/|:|-|\+|"|'|`|<|>|#|%|\*|\?| |\x28|\x29|\\)/g, '').trim();
        return legalName.length ? legalName : '_illegalname'+ Date.now();
    }

    function ListBackEndManagement( ListName )
    {
        if(! ListName || ( ListName && typeof ListName !== 'string') )
        {
            console.log('ListBackEndManagement: ListName (String) attendu en paramètre', ListName );
            return;
        }
 
        var _ = this;
        _.ListName = ListName;

        _.add = function( dataToAdd )
        {
            return $pnp.sp.web.lists.getByTitle( _.ListName ).items.add( dataToAdd );
        }
        _.edit = function( id, dataToUpdate )
        {
            return edit( _.ListName, id, dataToUpdate );
        }

        _.delete = function( id )
        {
            return $pnp.sp.web.lists.getByTitle( _.ListName ).items.getById( id ).delete();
        }
    }

    function getFileFromServerRelativeUrl( fileServerRelativeUrl, fileName )
    {
        return new Promise( function( resolve )
        {
            var request = new XMLHttpRequest();
            request.open('GET', fileServerRelativeUrl, true);
            request.responseType = 'blob';
            request.onload = function() 
            {
                var reader = new FileReader();
                reader.readAsDataURL( request.response );
                reader.onload =  function( e )
                {
                    var dataURL = e.target.result;

                    var arr     = dataURL.split(',');
                    var mime    = arr[0].match( /:(.*?);/ )[1];
                    var bstr    = atob( arr[1] );
                    var n       = bstr.length;
                    var u8arr   = new Uint8Array( n );
                        
                    while(n--)
                        u8arr[n] = bstr.charCodeAt(n);
                    
                    resolve( new File([u8arr], fileName, { type: mime }) );
                };
            };
            request.send();
        });      
    }

    function edit( listName, rowId, dataToUpdate )
    {
        var file = dataToUpdate.File;
        var fileName = dataToUpdate.FileName;

        return _lists.getByTitle( listName ).items.getById( rowId ).update( dataToUpdate )
        .then( function( updatedItem )
        {   
            return new Promise( function( resolve )
            {
                // Suppression du fichier existant
                file && fileName ? _lists.getByTitle( listName ).items.getById( rowId )
                .attachmentFiles.get()
                .then( function( files )
                {
                    return files[0].FileName;
                })
                .then( function( nameOfFileToDelete )
                {
                    return _lists.getByTitle( listName ).items.getById( rowId )
                    .attachmentFiles.getByName( nameOfFileToDelete ).delete()
                })
                // Puis ajout du nouveau 
                .then( function()
                {
                    _lists.getByTitle( listName ).items.getById( rowId )
                    .attachmentFiles.add( fileName, file, true )
                    .then( function( updatedFile )
                    {
                        // Et enfin mise à jour de la colonne FileServerRelativeUrl de la liste
                        _lists.getByTitle( listName ).items.getById( rowId ).update({
                            FileServerRelativeUrl: updatedFile.data.ServerRelativeUrl
                        })
                        .then( function()
                        {   
                            resolve({
                                updatedFile: updatedFile,
                                updatedItem: updatedItem
                            });
                        })
                    });
                }) :resolve({
                    updatedItem: updatedItem
                });
            });
        });
    }

    /*
        LibraryBackEndBundle: permet de gérer facilement et simplement le backend avec une Librairie
            - LibraryName:   nom de la Librairie
            - FolderName:    nom d'un dossier de la Librairie
            - DocumentType:  valeur à insérer dans la colonne "DocumentType" de la Librairie
            - CustomColumns: array contenant les colonnes ni gérées par Sharepoint (ID, Name, Modified, ...), 
                             ni gérées par le Bundle (AccessibleName et DocumentType)
        

        /!\ 1.  La Librairie doit avoir les colonnes "AccessibleName" (string) et "DocumentType" (string)
                pour que le Bundle puisse fonctionner correctement.
        /!\ 2.  Le Bundle a besoin de la fonction edit() ci-dessus pour fonctionner correctement.


        Exemples d'utilisation:
        
        var PrintsManagement = new LibraryBackEndBundle({
            LibraryName:    'BNPPDocuments',
            FolderName:     'Prints',
            DocumentType:   'Print',
            CustomColumns:  [ 'Title', 'Reference', 'ParentId' ]
        });

        PrintsManagement.add({                                          => Ajout dans la librairie du File
            File: <un File récupéré depuis un input change>,                       en mettant également les colonnes Title,
            Title: <une string>,                                                   Reference, et ParentId avec les valeurs indiquées
            Reference: <une string>,
            ParentId: <un ID> 
        })
        .then( function(x) { console.log(x) });                                 => x = données utiles comme l'ID juste inséré ou le
                                                                                   fileName qui a été renommé

        PrintsManagement.edit( <ID de l'item à édit>, {                 => Édition (suppression puis recréation) du fichier et update des
            File: <un File récupéré depuis un input change>,                       colonnes "Title" et "Reference" pour l'item qui a l'ID
            Title: <une autre string>,                                             passé en argument  
            Reference: <une autre string>                                         
        })
        .then( function(x) { console.log(x) });                                 

    */
    function LibraryBackEndBundle( data )
    {
        if( ! data || typeof data !== 'object' )
        {
            console.log('LibraryBackEndBundle: un objet doit être fourni en paramètre.');
            return;
        }
        if(! data.LibraryName || ! data.FolderName || ! data.DocumentType || ! data.CustomColumns )
        {
            ! data.LibraryName   ? console.log('LibraryBackEndBundle: "LibraryName" n\'est pas spécifié.')  :0;
            ! data.FolderName    ? console.log('LibraryBackEndBundle: "FolderName" n\'est pas spécifié.')   :0;
            ! data.DocumentType  ? console.log('LibraryBackEndBundle: "DocumentType" n\'est pas spécifié.') :0;
            ! data.CustomColumns ? console.log('LibraryBackEndBundle: "CustomColumns" n\'est pas spécifié. '
                                             + 'Correspond aux colonnes custom, ni gérées par le bundle, ni par sharepoint.')   :0;
            ! data.CustomColumns instanceof Array ? console.log('LibraryBackEndBundle: "CustomColumns" doit être un array.')    :0;

            return;
        }

        var _                 = this;
        this.LibraryName      = data.LibraryName;
        this.FolderName       = data.FolderName;
        this.DocumentType     = data.DocumentType;
        this.CustomColumns    = data.CustomColumns;
        this.Files            = ( function() 
        {
            // Commence par "/" => c'est directement un chemin relatif vers l'endroit désiré
            if( /^\/.+?/.test( data.FolderName ) )
                return $pnp.sp.web
                .getFolderByServerRelativeUrl( _spPageContextInfo.webServerRelativeUrl +'/'+ data.LibraryName + data.FolderName )
                .files;
            
            // Différent de "none", c'est un vrai name de folder: on get le folder by name
            else if(data.FolderName != 'none')
                return $pnp.sp.web
                .getFolderByServerRelativeUrl(_spPageContextInfo.webServerRelativeUrl + '/'+ data.LibraryName )
                .folders.getByName( data.FolderName )
                .files;
            
            // "none" => pas de folder ciblé
            else
                return $pnp.sp.web
                .getFolderByServerRelativeUrl(_spPageContextInfo.webServerRelativeUrl + '/'+ data.LibraryName )
                .files;
        })();

        this.add    = function( data )
        {
            if( ! data.File )
            {
                console.log('LibraryBackEndBundle.add: File n\'est pas spécifié.');
                return;
            }

            var addedItemID = undefined;
            var file        = data.File;
            var fileName    = sharepointNameFormat( file.name );
            var dataToAdd   = {
                DocumentType:   _.DocumentType,
                AccessibleName: fileName
            };

            delete data.File;
            for(var prop in data)
                dataToAdd[prop] = data[prop];

            console.log( dataToAdd );
            return _lists.getByTitle( _.LibraryName ).items
            .filter('DocumentType eq \''+ _.DocumentType +'\'')
            .get()
            .then( function( items )
            {
                console.log(1);
                var highestEncountered = 0;
                var captures;
                var filesWithTheSameName = items.filter( function( item )
                {
                    if( ! item.AccessibleName ) return false; 
                    if( item.AccessibleName.replace(/___\d+?___/, '') === fileName )
                    {
                        captures = /___(\d+?)___/.exec( item.AccessibleName );
                        highestEncountered = captures && captures[1]
                        ? Math.max( highestEncountered, parseInt( captures[1] ) )
                        : highestEncountered;

                        return true;
                    }
                });

                console.log(1.5);
                // Renommage du fichier si ce fileName existe déjà
                if( filesWithTheSameName.length )
                {
                    var extension = fileName.split('.')[ fileName.split('.').length - 1 ];
                    var fileNameWithoutExtension = fileName.split('.');
                    fileNameWithoutExtension.pop();
                    fileNameWithoutExtension += '___'+ (highestEncountered + 1) +'___';
                    
                    fileName = [ fileNameWithoutExtension, extension ].join('.');
                    dataToAdd.AccessibleName = fileName;
                } 
                console.log(1.9);
                console.log(_);
                return _.Files.add( fileName, file, true );
            })
            .then( function()
            {
                console.log(2);
                return _.Files.getByName( fileName ).getItem();
            })
            .then( function( addedItem )
            {
                addedItemID = addedItem.ID;
                return edit( _.LibraryName, addedItemID, dataToAdd );
            })
            .then( function()
            {
                dataToAdd.addedItemID = addedItemID;
                return dataToAdd;
            });
        };
        this.edit   = function( id, data )
        {
            var file = data && data.File ? data.File :0;
            var fileName = file ? file.name :0;   

            // Pas de changement de File => simple édit
            if( ! file && ! fileName )
            {
                var dataToUpdate = {};

                if(data.hasOwnProperty('File'))
                    delete data.File;

                for(var prop in data)
                    dataToUpdate[ prop ] = data[ prop ];

                return edit( _.LibraryName, id, dataToUpdate );
            }

            // Changement de File => delete puis add
            else if( file && fileName )
            {
                var rowBackUp             = undefined;
                var nameOfFileToBeDeleted = undefined;

                return _lists.getByTitle( _.LibraryName ).items
                .filter('DocumentType eq \''+ _.DocumentType +'\'')
                .getById( id ).get()
                .then( function( itemToEdit )
                {
                    nameOfFileToBeDeleted = itemToEdit.AccessibleName;
                    rowBackUp = itemToEdit;

                    return _.Files.getByName( nameOfFileToBeDeleted ).delete()
                })
                .then( function()
                {
                    var dataToAdd = {
                        File: file
                    };

                    _.CustomColumns.forEach( function( column )
                    {
                        dataToAdd[ column ] = data[ column ] ? data[ column ] : rowBackUp[ column ];
                    });

                    return _.add( dataToAdd );
                });
            }
        }
        this.delete = function( id )
        {
            return  _lists.getByTitle( _.LibraryName ).items
            .filter('DocumentType eq \''+ _.DocumentType +'\'')
            .getById( id )
            .get()
            .then( function( itemToDelete )
            {
                return _.Files.getByName( itemToDelete.AccessibleName ).delete();
            })
            .then( function()
            {
                return id;
            });
        }
    }

    /*
        ModalEventsBundle: Permet de faciliter le processus d'insertion, d'édition et de délétion depuis une modal
    */
    function ModalEventsBundle()
    {
        var _ = this;
        
        this.ActivateAddProcess = function( data )
        {
            if( ! data || typeof data !== 'object')
            {
                console.log('ModalEventsBundle.ActivateAddProcess: Un objet est attendu en paramètre.');
                return;
            }
            if( ! data.modalSelector || ! data.addBtnSelector || ! data.add || ! data.fieldsSelectors )
            {
                console.log('ModalEventsBundle.ActivateAddProcess: Tous les paramètres ne sont pas renseignés.');
                return;
            }
            if( ! $( data.modalSelector ).is('*')) 
            {
                console.log('ModalEventsBundle.ActivateAddProcess: le paramètre "modalSelector" est incorrect.');
                return;
            }
            if( ! $( data.addBtnSelector).is('*'))
            {
                console.log('ModalEventsBundle.ActivateAddProcess: le paramètre "addBtnSelector" est incorrect.');
                return;
            }
            if( typeof data.fieldsSelectors !== 'object' )
            {
                console.log('ModalEventsBundle.ActivateAddProcess: le paramètre "fieldsSelectors" est incorrect.');
                return;
            }
            if( data.fieldsSelectors.TypeText && ! data.fieldsSelectors.TypeText instanceof Array)
            {
                console.log('ModalEventsBundle.ActivateAddProcess: La prop "TypeText" du paramètre '
                            + '"fieldsSelectors" doit être un array contenant les sélecteurs des input type="text" de la modal');
                return;
            }
            if( data.fieldsSelectors.TypeFile && ! data.fieldsSelectors.TypeFile instanceof Array)
            {
                console.log('ModalEventsBundle.ActivateAddProcess: La prop "TypeFile" du paramètre ' 
                            + '"fieldsSelectors" doit être un array contenant un objet { FileSelector: String, '
                            + 'BtnTargettingFileSelector: String  }.');
                return;
            }
            if( typeof data.add !== 'function' )
            {
                console.log('ModalEventsBundle.ActivateAddProcess: Le paramètre "add" n\'est pas valide. '
                            + 'add doit être une fonction retournant une Promise à exécuter au clic sur le $( addSelectorBtn ).');
                return;
            }

            return new Promise( function( resolve )
            {
                var $addModal        = $( data.modalSelector );
                var $addBtn          = $addModal.find( data.addBtnSelector );
                var $fields          = {
                    Select:   [],
                    TypeFile: [],
                    TypeText: []
                };

                // Ajout des éléments dans $fields
                data.fieldsSelectors.Select 
                ? data.fieldsSelectors.Select.forEach( function( selectSelector )
                {
                    typeof selectSelector === 'string'
                    && $( selectSelector ).is('*')
                    ? $fields.Select.push( $( selectSelector ) )
                    : console.log('ModalEventsBundle.ActivateAddProcess: le sélecteur de select donné n\'est pas une string '
                                + 'ou n\'existe pas dans le DOM', selectSelector );
                })
                :0;

                data.fieldsSelectors.TypeText
                ? data.fieldsSelectors.TypeText.forEach( function( inputTypeTextSelector )
                {
                    typeof inputTypeTextSelector === 'string'
                    && $( inputTypeTextSelector ).is('*')
                    ? $fields.TypeText.push( $( inputTypeTextSelector ) )
                    : console.log('ModalEventsBundle.ActivateAddProcess: le sélecteur d\'input="text" donné n\'est pas une string '
                                + 'ou n\'existe pas dans le DOM', inputTypeTextSelector );
                })
                :0;

                data.fieldsSelectors.TypeFile
                ? data.fieldsSelectors.TypeFile.forEach( function( fileSelectorData )
                {
                    typeof fileSelectorData === 'object'
                    &&     fileSelectorData.hasOwnProperty('FileSelector')
                    &&     fileSelectorData.hasOwnProperty('BtnTargettingFileSelector')
                    &&     $( fileSelectorData.FileSelector ).is('*')
                    &&     $( fileSelectorData.BtnTargettingFileSelector ).is('*') 
                    ? $fields.TypeFile.push({
                        $InputFileElement:              $( fileSelectorData.FileSelector ),
                        $BtnTargettingInputFileElement: $( fileSelectorData.BtnTargettingFileSelector )
                    })
                    : console.log('ModalEventsBundle.ActivateAddProcess: l\'item de l\'array TypeFile n\'est pas un objet '
                                + '{ FileSelector: String, BtnTargettingFileSelector: String }', fileSelectorData );                            
                }) 
                :0;
            
                $addBtn.on('click', function( e )
                {
                    var allFieldsAreFulfilled = true;
                    var errorStyle            = 'border:1px solid red!important;';

                    // Les select non remplis prennent le CSS errorStyle jusqu'à être remplis
                    $fields.Select.length
                    ? $fields.Select.forEach( function( $select )
                    {
                        if( ! $select.val()
                        &&  ! $select.is('*[data-magic-optional]') )
                        {
                            allFieldsAreFulfilled = false;

                            // Si select2 est utilisé
                            if( /select2/.test( $select.attr('class') ) )
                            {
                                $select.next().find('.select2-selection').attr('style',
                                    errorStyle +' '+ $select.next().find('.select2-selection').attr('style')
                                );
                                $select.on('change.removeErrorStyle', function()
                                {
                                    if(! $select.next().find('.select2-selection').attr('style') )
                                    {
                                        console.log('ModalEventsBundle.ActivateAddProcess: impossible de retirer la border red du select2');
                                        return;
                                    }

                                    $select.next().find('.select2-selection').attr('style',
                                        $select.next().find('.select2-selection').attr('style').replace( errorStyle, '')
                                    );
                                    $select.off('change.removeErrorStyle');
                                });
                            }
                            else
                            {
                                console.log('ModalEventsBundle.ActivateAddProcess: Le format de select utilisé n\'est pas supporté. '
                                          + 'Formats supportés: select2');
                            }
                        }
                    })
                    :0;

                    // Les inputs type Text non remplis prennent la class input-error jusqu'à être remplis
                    $fields.TypeText.length
                    ? $fields.TypeText.forEach( function( $inputText )
                    {
                        if( ! $inputText.val().trim().length
                        &&  ! $inputText.is('*[data-magic-optional]') )
                        {
                            allFieldsAreFulfilled = false;
                            $inputText.addClass('input-error').on('keyup.removeErrorClass', function()
                            {
                                $( this ).off('keyup.removeErrorClass').removeClass('input-error');
                            });
                        }
                    })
                    :0;

                    // Les inputs type File non remplis affichent "Aucun fichier reçu" pendant 1.5 secondes
                    $fields.TypeFile.length
                    ? $fields.TypeFile.forEach( function( fileElements )
                    {
                        if( ! fileElements.$InputFileElement[0].files.length
                        &&  ! fileElements.$InputFileElement.is('*[data-magic-optional]') )
                        {
                            allFieldsAreFulfilled = false;
                            new Promise( function( subResolve )
                            {
                                var originalText = fileElements.$BtnTargettingInputFileElement.text();
                                fileElements.$BtnTargettingInputFileElement.text('Aucun fichier reçu');
                                setTimeout( function() {
                                    subResolve( originalText ) 
                                }, 1500 );
                            })
                            .then( function( originalText ) 
                            {
                                fileElements.$BtnTargettingInputFileElement.text( originalText );
                            });
                        }
                    })
                    :0;

                    if( allFieldsAreFulfilled )
                    {
                        if( $('#'+ $addBtn.attr('id') +'Loading').is('*') ) return;

                        var $loading = $('<i>', {
                            id:     $addBtn.attr('id') +'Loading',
                            class: 'fas fa-spin fa-spinner',
                            css: { marginRight: '5px' }
                        });
                        $addBtn.prepend( $loading );

                        data.add( e ).then( function( result )
                        {
                            $addModal.modal('hide');
                            $fields.TypeFile.forEach( function( fileElements )
                            {
                                fileElements.$InputFileElement.val('');
                            });
                            $fields.TypeText.forEach( function( $inputText )
                            {
                                $inputText.val('');
                            });
                            $fields.TypeFile.forEach( function( fileElements )
                            {
                                fileElements.$BtnTargettingInputFileElement.text('Cliquez ici pour ajouter un fichier');
                            });

                            return data.onAddDone( result );
                        })
                        .then( function() { $loading.remove() });
                    }
                    else
                        console.log('ModalEventsBundle.ActivateAddProcess: Tous les champs ne sont pas remplis, ajout non effectué.');
                });

                // En uploadant un File, le bouton associé à l'input type File prend le nom du fichier téléchargé
                $fields.TypeFile.length
                ? $fields.TypeFile.forEach( function( fileElements )
                {
                    fileElements.$InputFileElement.on('change', function( e )
                    {
                        fileElements.$BtnTargettingInputFileElement.text( e.target.files[0].name );
                    });
                })
                :0;
                
                // En faisant Entrée sur un input type Text, c'est considéré comme un submit
                $fields.TypeText.length
                ? $fields.TypeText.forEach( function( $inputTextElement )
                {
                    $inputTextElement.on('keydown', function( e )
                    {
                        if(e.keyCode === 13) // 13 = entrée
                        {
                            e.preventDefault();
                            $addBtn.trigger('click');
                        }
                    });
                })
                :0;

                resolve();
            });
        };

        this.ActivateEditProcess = function( data )
        {
            if( ! data || typeof data !== 'object')
            {
                console.log('ModalEventsBundle.ActivateEditProcess: Un objet est attendu en paramètre.');
                return;
            }
            if( ! data.modalSelector || ! data.editBtnSelector || ! data.edit || ! data.fieldsSelectors )
            {
                console.log('ModalEventsBundle.ActivateEditProcess: Tous les paramètres ne sont pas renseignés.');
                return;
            }
            if( ! $( data.modalSelector ).is('*')) 
            {
                console.log('ModalEventsBundle.ActivateEditProcess: le paramètre "modalSelector" est incorrect.');
                return;
            }
            if( ! $( data.editBtnSelector).is('*'))
            {
                console.log('ModalEventsBundle.ActivateEditProcess: le paramètre "editBtnSelector" est incorrect.');
                return;
            }
            if( typeof data.fieldsSelectors !== 'object' )
            {
                console.log('ModalEventsBundle.ActivateEditProcess: le paramètre "fieldsSelectors" est incorrect.');
                return;
            }
            if( data.fieldsSelectors.TypeText && ! data.fieldsSelectors.TypeText instanceof Array)
            {
                console.log('ModalEventsBundle.ActivateEditProcess: La prop "TypeText" du paramètre '
                            + '"fieldsSelectors" doit être un array contenant les sélecteurs des input type="text" de la modal');
                return;
            }
            if( data.fieldsSelectors.TypeFile && ! data.fieldsSelectors.TypeFile instanceof Array)
            {
                console.log('ModalEventsBundle.ActivateEditProcess: La prop "TypeFile" du paramètre ' 
                            + '"fieldsSelectors" doit être un array contenant un objet { FileSelector: String, '
                            + 'BtnTargettingFileSelector: String  }.');
                return;
            }
            if( typeof data.edit !== 'function' )
            {
                console.log('ModalEventsBundle.ActivateEditProcess: Le paramètre "edit" n\'est pas valide. '
                            + 'edit doit être une fonction retournant une Promise à exécuter au clic sur le $( editBtnSelector ).');
                return;
            }

            return new Promise( function( resolve )
            {
                var $editModal       = $( data.modalSelector ); 
                var $fields          = {
                    TypeFile: [],
                    TypeText: []
                };

                data.fieldsSelectors.TypeText
                ? data.fieldsSelectors.TypeText.forEach( function( inputTypeTextSelector )
                {
                    typeof inputTypeTextSelector === 'string'
                    && $( inputTypeTextSelector ).is('*')
                    ? $fields.TypeText.push( $( inputTypeTextSelector ) )
                    : console.log('ModalEventsBundle.ActivateEditProcess: le sélecteur d\'input="text" donné n\'est pas une string '
                                + 'ou n\'existe pas dans le DOM.', inputTypeTextSelector );
                })
                :0;

                data.fieldsSelectors.TypeFile
                ? data.fieldsSelectors.TypeFile.forEach( function( fileSelectorData )
                {
                    typeof fileSelectorData === 'object'
                    &&     fileSelectorData.hasOwnProperty('FileSelector')
                    &&     fileSelectorData.hasOwnProperty('BtnTargettingFileSelector')
                    &&     $( fileSelectorData.FileSelector ).is('*')
                    &&     $( fileSelectorData.BtnTargettingFileSelector ).is('*') 
                    ? $fields.TypeFile.push({
                        $InputFileElement:              $( fileSelectorData.FileSelector ),
                        $BtnTargettingInputFileElement: $( fileSelectorData.BtnTargettingFileSelector )
                    })
                    : console.log('ModalEventsBundle.ActivateEditProcess: l\'item de l\'array TypeFile n\'est pas un objet '
                                + '{ FileSelector: String, BtnTargettingFileSelector: String }.', fileSelectorData );                            
                }) 
                :0;

                $editModal.find( data.editBtnSelector ).on('click', function( e )
                {
                    var allFieldsAreFulfilled = true;

                    // Les inputs type Text non remplis prennent la class input-error jusqu'à être remplis
                    $fields.TypeText.length
                    ? $fields.TypeText.forEach( function( $inputText )
                    {
                        if( ! $inputText.val().trim().length
                        &&  ! $inputText.is('*[data-magic-optional]') )
                        {
                            allFieldsAreFulfilled = false;
                            $inputText.addClass('input-error').on('keyup.removeErrorClass', function()
                            {
                                $( this ).off('keyup.removeErrorClass').removeClass('input-error');
                            });
                        }
                    })
                    :0;

                    if( allFieldsAreFulfilled  )
                    {
                        if( $('#'+ $editModal.find( data.editBtnSelector ).attr('id') +'Loading').is('*') ) return;

                        var $loading = $('<i>', {
                            id:     $editModal.find( data.editBtnSelector ).attr('id') +'Loading',
                            class: 'fas fa-spin fa-spinner',
                            css: { marginRight: '5px' }
                        });
                        $editModal.find( data.editBtnSelector ).prepend( $loading );

                        data.edit( e ).then( function( result )
                        {
                            $editModal.modal('hide');

                            return data.onEditDone( result );
                        })
                        .then( function() {
                            $loading.remove();
                        })
                    }
                    else console.log('ModalEventsBundle.ActivateEditProcess: tous les champs ne sont pas remplis, édition non effectuée.');
                }); 

                $fields.TypeFile.length
                ? $fields.TypeFile.forEach( function( fileElements )
                {
                    fileElements.$InputFileElement.on('change', function( e )
                    {
                        fileElements.$BtnTargettingInputFileElement.text( e.target.files[0].name );
                    });
                })
                :0;

                $fields.TypeFile.length
                ? $editModal.on('hide.bs.modal', function()
                {
                    $fields.TypeFile.forEach( function( fileElements )
                    {
                        fileElements.$InputFileElement.val('');
                    });
                })
                :0;

                $fields.TypeFile.length === 1 && $('.btn-refresh').is('*')
                ? $('.btn-refresh').on('click', function( e )
                {
                    e.preventDefault();
                    $fields.TypeFile[0].$InputFileElement.trigger('click');
                })
                :0;

                // En faisant Entrée sur un input type Text, c'est considéré comme un submit
                $fields.TypeText.length
                ? $fields.TypeText.forEach( function( $inputTextElement )
                {
                    $inputTextElement.on('keydown', function( e )
                    {
                        if(e.keyCode === 13) // 13 = entrée
                        {
                            e.preventDefault();
                            $editModal.find( data.editBtnSelector ).trigger('click');
                        }
                    });
                })
                :0;

                resolve();
            });
        };

        this.ActivateDeleteProcess = function( data )
        {
            if( ! data || typeof data !== 'object')
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: Un objet est attendu en paramètre.');
                return;
            }
            if( ! data.modalSelector || ! data.deleteBtnSelector || ! data.delete
            ||  ! data.confirmDeleteBtnSelector || ! data.confirmCancelBtnSelector || ! data.confirmModalSelector )
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: Tous les paramètres ne sont pas renseignés.');
                return;
            }
            if( ! $( data.modalSelector ).is('*')) 
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: le paramètre "modalSelector" est incorrect. '
                            + 'Il doit être le sélecteur de la modal dont le bouton Supprimer redirige vers la modal de confirmation.' );
                return;
            }
            if( ! $( data.deleteBtnSelector).is('*'))
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: le paramètre "deleteBtnSelector" est incorrect.'
                            + 'Il doit être le sélecteur du bouton qui redirige vers la modal de confirmation.' );
                return;
            }
            if( ! $( data.confirmDeleteBtnSelector ).is('*'))
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: le paramètre "confirmDeleteBtnSelector" est incorrect.'
                            + 'Il doit être le sélecteur du bouton qui effectue la réelle suppression côté back.' );
                return;
            }
            if( ! $( data.confirmModalSelector ).is('*'))
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: le paramètre "confirmModalSelector" est incorrect.'
                            + 'Il doit être le sélecteur de la modal de confirmation de suppression.' );
                return;
            }
            if( ! $( data.confirmCancelBtnSelector ).is('*'))
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: le paramètre "confirmCancelBtnSelector" est incorrect.'
                            + 'Il doit être le sélecteur du bouton "Cancel" qui permet de retourner à la modal de base.' );
                return;
            }
            if( typeof data.delete !== 'function' )
            {
                console.log('ModalEventsBundle.ActivateDeleteProcess: Le paramètre "delete" n\'est pas valide. '
                            + 'delete doit être une fonction retournant une Promise à exécuter au clic sur le $( deleteBtnSelector ).');
                return;
            }

            return new Promise( function( resolve )
            {
                var $editModal    = $( data.modalSelector );
                var $confirmModal = $( data.confirmModalSelector );

                $editModal.find( data.deleteBtnSelector )
                .on('click', function( e )
                {
                    e.preventDefault();
                    $editModal.modal('hide');
                    setTimeout(function()
                    {
                        $confirmModal.modal('show');
                    }, 150);
                });

                $confirmModal.find( data.confirmCancelBtnSelector )
                .on('click', function( e )
                {
                    e.preventDefault();
                    $confirmModal.modal('hide');
                    setTimeout( function()
                    {
                        $editModal.modal('show');
                    });
                });

                $confirmModal.find( data.confirmDeleteBtnSelector )
                .on('click', function( e )
                {
                    e.preventDefault();
                    data.delete( e ).then( function( result )
                    {
                        $confirmModal.modal('hide');
                        $editModal.modal('hide');

                        return data.onDeleteDone( result );
                    });
                }); 

                resolve();
            });
        };
    }

    /* MagicModal à proprement parler, qui utilise les fonctions ci-dessus */
    jQuery.fn.extend({
        magicModal: function( magicData )
        {
            console.log( magicData );
            var $modal      = $( this );
            var modalType   = $( this ).data('magic-type');

            if(! $modal.attr('id') )
            {
                console.log('MagicModal: la modal doit avoir un id unique.');
                return;
            }

            if( modalType != 'add' && modalType != 'edit' && modalType != 'delete')
            {  
                console.log('MagicModal: la modal doit avoir un attribut '
                            + 'data-magic-type égal à add, edit, ou delete.');
                return;
            }

            if( ! $modal.find('*[data-magic-submit]').is('*')) 
            {
                console.log('MagicModal: la modal doit comprendre un élément avec un attribut '
                            + 'vide data-magic-submit qui déclenchera l\'action '+ modalType );
                return;
            }

            if( ! $modal.find('*[data-magic-submit]').attr('id'))
            {
                console.log('MagicModal: l\'élément data-magic-submit doit avoir un id unique.');
                return;
            }

            if( modalType === 'add' || modalType === 'edit')
            {
                if( ! $modal.find('input[data-magic-main-file]').is('input[type="file"]')
                || (
                    $modal.find('input[data-magic-main-file]').is('input[type="file"]')
                    && ! $modal.find('input[data-magic-main-file]').data('magic-btn')
                ))
                {
                    console.log('MagicModal: la modal doit comprendre un input de type file '
                                + ' avec un attribut vide data-magic-main-file et un attribut '
                                + ' data-magic-btn égal à "#"+ id du bouton qui trigger son click.');
                    return;
                }

                if( ! $modal.find('input[data-magic-main-file]').attr('id'))
                {
                    console.log('MagicModal: l\'élément data-magic-main-file doit avoir un id unique.');
                    return;
                }

                if( ! $( $modal.find('input[data-magic-main-file]').data('magic-btn') ).is('*'))
                {
                    console.log('MagicModal: l\'attribut data-magic-btn de l\'input data-magic-main-file '
                                + 'ne permet de sélectionner aucun élément dans le DOM.');
                    return;
                }

                if( $modal.find('input[data-magic-secondary-file]').is('input[type="file"]') )
                {
                    ! $modal.find('input[data-magic-secondary-file]').data('magic-secondary-recipient')
                    ? console.log('MagicModal: l\'input de secondary file doit avoir un attribut data-magic-secondary-recipient '
                                    + 'suivant le même pattern que l\'attribut data-magic-recipient de la modal.') :0;
                    
                    ! $modal.find('input[data-magic-secondary-file]').data('magic-primary-key-col')
                    ? console.log('MagicModal: l\'input de secondary file doit avoir un attribut data-magic-primary-key-col '
                                    + 'égal au nom de la colonne qui va contenir la clé primaire vers le main file.') :0;
                }

                $modal.find('*[data-magic-col]').each( function( index, elem )
                {
                    if( ! $(elem).attr('id') ) console.log('MagicModal: l\'élement suivant doit avoir un id unique: ', elem );
                });
            }
            else if( modalType === 'delete' )
            {
                if( ! $modal.data('magic-from'))
                {
                    console.log('MagicModal: la modal doit avoir un attribut data-magic-from égal '
                                + 'à "#"+ l\'id de la modal possédant l\'élement data-magic-redirect-confirm '
                                + '(qui trigger son apparition).');
                    return;
                }

                if( ! $('#'+ $( $modal.data('magic-from') ).find('*[data-magic-redirect-confirm]').is('*')))
                {
                    console.log('MagicModal: l\'attribut data-magic-from donné ne permet de sélectionner aucun '
                                + 'élément dans le DOM.');
                    return;
                }

                if( ! $('#'+ $( modalSourceSelector ).find('*[data-magic-redirect-confirm]').attr('id')))
                {
                    console.log('MagicModal: l\'élément avec l\'attribut data-magic-redirect-confirm dans la modal '
                                + $modal.data('magic-from') +' doit avoir un id unique.');
                    return;
                }

                if( ! $modal.find('*[data-magic-go-back]').is('*'))
                {
                    console.log('MagicModal: la modal doit comprendre un élément avec un attribut vide '
                                + 'data-magic-go-back correspondant au bouton cancel pour ne pas procéder à '
                                + 'la suppression et revenir à la modal précédente.');
                    return;
                }

                if( ! $modal.find('*[data-magic-go-back]').attr('id'))
                {
                    console.log('MagicModal: l\'élement data-magic-go-back doit avoir un id unique.');
                    return;
                }

                if( $modal.find('*[data-magic-submit]').is('*[data-magic-also-delete]'))
                {
                    $modal.find('*[data-magic-submit]').data('magic-also-delete').split(',')
                    .forEach( function( idSelector )
                    {  
                        if( ! $( idSelector ).is('*') )
                            console.log('MagicModal: dans le data-magic-also-delete, aucun élément ne correspond à '+ idSelector +'. '
                                        + 'Si plusieurs à supprimer, les sélecteurs d\'identifiant doivent être séparés par une virgule.')
                    });
                }
            }

            var $fields     = {
                Select: [],
                TypeText: [],
                TypeFile: ( function() {
                    // Définition des $fields TypeFile
                    var fileElements = [];

                    fileElements.push({
                        InputFile:              $modal.find('input[data-magic-main-file]'), 
                        BtnTargettingInputFile: $modal.find( $modal.find('input[data-magic-main-file]').data('magic-btn') )
                    });

                    $modal.find('input[data-magic-secondary-file]').is('*')
                    ? $modal.find('input[data-magic-secondary-file]').each( function( index, element )
                    {
                        fileElements.push({
                            InputFile:              $( element ),
                            BtnTargettingInputFile: $( $( element ).data('magic-btn') )
                        })
                    }) :0;

                    return fileElements;
                })()
            }
            var $submitBtn     = $( this ).find('*[data-magic-submit]');
            var recipientData  = $( this ).data('magic-recipient');
            var customColumns  = [];

            // Définition des custom columns et des fields TypeText et Select
            $( this ).find('*[data-magic-col]').each( function( i, element )
            {
                var magicCol =  $( element ).data('magic-col');
                ! customColumns.includes( magicCol )
                ? customColumns.push( magicCol ) :0;

                $( element ).is('select') ? $fields.Select.push( $( element ) ) :0;
                $( element ).is('input[type="text"]') || $( element ).is('textarea') ? $fields.TypeText.push( $( element ) ) :0;
            });

            var recipientType    = recipientData.split('::')[0];

            // Gestion des librairies
            if( recipientType.toLowerCase() === 'library' )
            {
                var backEndData = {
                    LibraryName:    recipientData.split('::')[1],
                    FolderName:     recipientData.split('::')[2],
                    DocumentType:   recipientData.split('::')[3],
                    CustomColumns:  customColumns
                };
                var backend         = new LibraryBackEndBundle( backEndData );
                var modalSelector   = '#'+ $modal.attr('id');
                var submitBtnSelector  = '#'+ $submitBtn.attr('id');
                var fieldsSelectors = {
                    Select: $fields.Select.map( function( $mappedSelect )
                    {
                        return '#'+ $mappedSelect.attr('id');
                    }),
                    TypeText: $fields.TypeText.map( function( $mappedInputText )
                    {
                        return '#'+ $mappedInputText.attr('id');
                    }),
                    TypeFile: $fields.TypeFile.map( function( $mappedFileElements )
                    {
                        return {
                            FileSelector: '#'+ $mappedFileElements.InputFile.attr('id'),
                            BtnTargettingFileSelector: $mappedFileElements.InputFile.data('magic-btn')
                        }
                    })
                };

                switch( modalType )
                {
                    case 'add':
                        var add             = function()
                        {
                            // Définition des données à ajouter
                            var dataToAdd = {};
                            [ $fields.TypeText, $fields.Select ].forEach( function( array )
                            {
                                array.length ? array.forEach( function( $tag )
                                {
                                    if( $tag.data('magic-col'))
                                        dataToAdd[ $tag.data('magic-col') ] = $tag.val();
                                }) :0;
                            });
                            /*dataToAdd[ 'File' ] = $fields.TypeFile.length ? $fields.TypeFile.filter( function( $filteredFileElements )
                            {
                                return $filteredFileElements.InputFile.is('*[data-magic-main-file]');
                            })[0].InputFile[0].files[0] :0;*/

                            // Ajout dans la Lib
                            var backEndCall = new Promise( function( resolve )
                            {
                                var $mainFile = $fields.TypeFile.filter( function( $filteredFileElements )
                                {
                                    return $filteredFileElements.InputFile.is('*[data-magic-main-file]');
                                })[0];

                                if($mainFile.InputFile[0].files.length && ! $mainFile.InputFile.is('*[data-magic-link]') )
                                {
                                    dataToAdd.File = $mainFile.InputFile[0].files[0];
                                    console.log( backend);
                                    console.log( dataToAdd );
                                    resolve( backend.add( dataToAdd ));
                                }
                                else if(! $mainFile.InputFile[0].files.length && $mainFile.InputFile.is('*[data-magic-link]'))
                                {
                                    console.log('Utilisation de '+ _spPageContextInfo.webServerRelativeUrl + '/BlankLinkFile/blank.jpg - vérifier existence');
                                    $pnp.sp.web.getFolderByServerRelativeUrl(_spPageContextInfo.webServerRelativeUrl + '/BlankLinkFile' )
                                    .files.getByName( 'blank.jpg' ).get()
                                    .then( function( fileData ) 
                                    {
                                        return getFileFromServerRelativeUrl( fileData.ServerRelativeUrl, 'blank.jpg' );
                                    })
                                    .then( function( FileInstance )
                                    {
                                        dataToAdd.File = FileInstance;
                                        console.log( dataToAdd );
                                        resolve( backend.add( dataToAdd ));
                                    });  
                                }
                                else dataToAdd.File = 0;   
                            });

                            // Y'a-t-il des fichiers secondaires ?
                            var secondaryFiles = $fields.TypeFile.filter( function( $filteredFileElements )
                            {
                                return $filteredFileElements.InputFile.is('*[data-magic-secondary-file]')
                                &&     $filteredFileElements.InputFile[0].files.length;
                            });

                            if(! secondaryFiles.length)
                                return backEndCall
                                .then( function( result )
                                {
                                    // Mise en forme du result
                                    return { main: result };
                                })
                            else
                                return backEndCall
                                .then( function( result ) 
                                {
                                    var resolvedData = {
                                        main: result
                                    };
                                    var secondaryFilesSent = 0;

                                    return new Promise( function( resolve )
                                    {
                                        secondaryFiles.forEach( function( secondaryFileElement )
                                        {
                                            var secondaryFileRecipient = secondaryFileElement.InputFile.data('magic-secondary-recipient');
                                            var secondaryFileBackendData = {
                                                LibraryName:   secondaryFileRecipient.split('::')[1],
                                                FolderName:    secondaryFileRecipient.split('::')[2],
                                                DocumentType:  secondaryFileRecipient.split('::')[3],
                                                CustomColumns: [ secondaryFileElement.InputFile.data('magic-primary-key-col') ]
                                            };
                                            var secondaryFileBackend = new LibraryBackEndBundle( secondaryFileBackendData );
                                            secondaryFileBackend.add({
                                                File: secondaryFileElement.InputFile[0].files[0],
                                                [ secondaryFileElement.InputFile.data('magic-primary-key-col') ]: result.addedItemID
                                            })
                                            .then( function( resultSecondaryFile )
                                            {
                                                secondaryFilesSent++;
                                                resolvedData[ secondaryFileElement.InputFile.attr('id') ] = resultSecondaryFile;
                                                secondaryFilesSent === secondaryFiles.length ? resolve( resolvedData ) :0;
                                            }); 
                                        });                                                                                
                                    });
                                });
                        };
                        var onAddDone       = magicData.onAddDone;

                        console.log( fieldsSelectors );
                        new ModalEventsBundle().ActivateAddProcess({
                            modalSelector:      modalSelector,
                            addBtnSelector:     submitBtnSelector,
                            fieldsSelectors:    fieldsSelectors,
                            add:                add,
                            onAddDone:          onAddDone
                        });
                        break;
                    
                    case 'edit':
                        var edition = function()
                        {
                            if(! $( modalSelector ).data('idToEdit'))
                                console.log('MagicModal.edit: la modal d\'edit doit avoir en .data("idToEdit") l\'id de l\'item à éditer');

                            var idToEdit = $( modalSelector ).data('idToEdit');
                            var dataToEdit = {};
                            [ $fields.TypeText, $fields.Select ].forEach( function( array )
                            {
                                array.length ? array.forEach( function( $tag )
                                {
                                    if( $tag.data('magic-col'))
                                        dataToEdit[ $tag.data('magic-col') ] = $tag.val();
                                }) :0;
                            });

                            var $mainFileData = $fields.TypeFile.filter( function( $filteredFileElements )
                            {
                                return $filteredFileElements.InputFile.is('*[data-magic-main-file]');
                            })[0];

                            // Le input file du data-magic-main-file n'est pas vide => update du fichier
                            if( $mainFileData.InputFile[0].files.length )
                                dataToEdit[ 'File' ] = $mainFileData.InputFile[0].files[0];

                            // Edit 
                            var backendCall = backend.edit( idToEdit, dataToEdit );

                            // Y'a-t-il des fichiers secondaires à prendre en compte
                            var secondaryFiles = $fields.TypeFile.filter( function( $filteredFileElements )
                            {
                                return $filteredFileElements.InputFile.is('*[data-magic-secondary-file]')
                            });

                            return backendCall
                            .then( function( result )
                            {
                                var resolvedData = {
                                    main: result
                                };
                                var secondaryFilesUpdated = 0;

                                return new Promise( function( resolve )
                                {
                                    ! secondaryFiles.length ? resolve( resolvedData ) : secondaryFiles.forEach( function( secondaryFileElement )
                                    {
                                        var secondaryFileRecipient   = secondaryFileElement.InputFile.data('magic-secondary-recipient');
                                        var secondaryFileBackendData = {
                                            LibraryName:   secondaryFileRecipient.split('::')[1],
                                            FolderName:    secondaryFileRecipient.split('::')[2],
                                            DocumentType:  secondaryFileRecipient.split('::')[3],
                                            CustomColumns: [ secondaryFileElement.InputFile.data('magic-primary-key-col') ]
                                        };
                                        var secondaryFileBackend = new LibraryBackEndBundle( secondaryFileBackendData );

                                        $pnp.sp.web.lists.getByTitle( secondaryFileBackendData.LibraryName ).items
                                        .filter('DocumentType eq \''+ secondaryFileBackendData.DocumentType +'\' and '+ secondaryFileElement.InputFile.data('magic-primary-key-col') +' eq '+ idToEdit)
                                        .get()
                                        .then( function( secondaryFile )
                                        {
                                            var secondaryFileDataToEdit = {};

                                            var secondaryFileID = secondaryFile.length ? secondaryFile[0].ID :0; 
                                            var secondaryFilePrimaryKey      = result.addedItemID ? result.addedItemID : idToEdit;
                                            
                                            result.addedItemID ? console.log('Edit du main file: utilisation de la nouvelle '
                                                                            + 'primary key pour le secondary file') :0;

                                            if( secondaryFileElement.InputFile[0].files.length )
                                                secondaryFileDataToEdit.File = secondaryFileElement.InputFile[0].files[0]; 
                                            secondaryFileDataToEdit[ secondaryFileElement.InputFile.data('magic-primary-key-col') ] = secondaryFilePrimaryKey;
                                            
                                            if( ! secondaryFile.length && secondaryFileElement.InputFile[0].files.length)
                                                return secondaryFileBackend.add( secondaryFileDataToEdit );
                                            else if( secondaryFile.length 
                                            && ! /.+?\..{1,4}$/.test( $(secondaryFileElement.InputFile.data('magic-btn')).text() ) )
                                                return secondaryFileBackend.delete( secondaryFileID )
                                                .then( function( deletedID )
                                                {
                                                    return { deletedItemID: deletedID };
                                                })
                                            else if( ! secondaryFile.length )
                                                return 0;
                                            else
                                                return secondaryFileBackend.edit( secondaryFileID , secondaryFileDataToEdit);
                                        })
                                        .then( function( resultSecondaryFile )
                                        { 
                                            secondaryFilesUpdated++;
                                            resolvedData[ secondaryFileElement.InputFile.attr('id') ] = resultSecondaryFile;
                                            secondaryFilesUpdated === secondaryFiles.length ? resolve( resolvedData ) :0;
                                        });
                                    });       
                                });                                   
                            });
                        };
                        var onEditDone      = magicData.onEditDone;

                        new ModalEventsBundle().ActivateEditProcess({
                            modalSelector:   modalSelector,
                            fieldsSelectors: fieldsSelectors,
                            editBtnSelector: submitBtnSelector,
                            edit:            edition,
                            onEditDone:      onEditDone
                        });
                        break;

                    case 'delete':
                        var modalSourceSelector     = $modal.data('magic-from');
                        var confirmModalSelector    = modalSelector;
                        var firstDeleteBtnSelector  = '#'+ $( modalSourceSelector ).find('*[data-magic-redirect-confirm]').attr('id');
                        var confirmDeleteBtnSelector= '#'+ $modal.find('*[data-magic-submit]').attr('id');
                        var confirmCancelBtnSelector= '#'+ $modal.find('*[data-magic-go-back]').attr('id');
                        var del = function()
                        {
                            var idToDelete                 = $( modalSourceSelector ).data('idToEdit');
                            var secondaryFilesToAlsoDelete = $( confirmDeleteBtnSelector ).data('magic-also-delete');

                            if( ! secondaryFilesToAlsoDelete )
                                return backend.delete( idToDelete )
                                .then( function( result )
                                {
                                    // Mise en forme du result
                                    return { main: { deletedItemID: result } };
                                });
                            else
                                return backend.delete( idToDelete )
                                .then( function( deletedID )
                                {
                                    var resolvedData = {
                                        main: {
                                            deletedItemID: deletedID
                                        }
                                    };
                                    var secondaryFilesDeleted = 0;
                                    var secondaryFilesToDeleteTotal = secondaryFilesToAlsoDelete.split(',').length;

                                    return new Promise( function( resolve )
                                    {
                                        secondaryFilesToAlsoDelete.split(',').forEach( function( secondaryFileSelector )
                                        {
                                            secondaryFileSelector        = secondaryFileSelector.trim();
                                            var $secondaryFile           = $( secondaryFileSelector );
                                            var primaryKeyColName        = $secondaryFile.data('magic-primary-key-col');
                                            var secondaryFileRecipient   = $secondaryFile.data('magic-secondary-recipient');
                                            var secondaryFileBackendData = {
                                                LibraryName:   secondaryFileRecipient.split('::')[1],
                                                FolderName:    secondaryFileRecipient.split('::')[2],
                                                DocumentType:  secondaryFileRecipient.split('::')[3],
                                                CustomColumns: [ primaryKeyColName ]
                                            };
                                            var secondaryFileBackend = new LibraryBackEndBundle( secondaryFileBackendData );
                                            
                                            $pnp.sp.web.lists.getByTitle( secondaryFileBackend.LibraryName ).items
                                            .filter('DocumentType eq \''+ secondaryFileBackend.DocumentType +'\' and '+ primaryKeyColName +' eq '+ deletedID )
                                            .get()
                                            .then( function( secondaryFiles )
                                            {
                                                if(! secondaryFiles.length )
                                                {
                                                    secondaryFilesToDeleteTotal--;
                                                    return false;
                                                } 
                                
                                                console.log('MagicModal => delete: '+ secondaryFiles.length +' secondary file trouvé pour '+ secondaryFileSelector.replace('#', '') );
                                                //var secondaryFileToDelete = secondaryFiles[0];
                                                //return secondaryFileBackend.delete( secondaryFileToDelete.ID );

                                                var resolved2Data = [];
                                                return new Promise( function( resolve2 )
                                                {
                                                    secondaryFiles.forEach( function( secondaryFile, index )
                                                    {
                                                        secondaryFileBackend.delete( secondaryFile.ID )
                                                        .then( function( deletedItemID )
                                                        {
                                                            resolved2Data.push( deletedItemID );
                                                            index + 1 === secondaryFiles.length ? resolve2( resolved2Data ) :0;
                                                        })
                                                    })
                                                });
                                            })
                                            .then( function( secondaryFileDeletedID )
                                            {
                                                if( secondaryFileDeletedID )
                                                {
                                                    secondaryFilesDeleted++; 
                                                    resolvedData[ secondaryFileSelector.replace('#','') ] = { deletedItemID: secondaryFileDeletedID };
                                                }
                                                secondaryFilesDeleted === secondaryFilesToDeleteTotal ? resolve( resolvedData ) :0;
                                            });
                                        });
                                    });
                                });
                        };
                        var onDeleteDone = magicData.onDeleteDone;

                        new ModalEventsBundle().ActivateDeleteProcess({
                            modalSelector:              modalSourceSelector,
                            confirmModalSelector:       confirmModalSelector,
                            deleteBtnSelector:          firstDeleteBtnSelector,                 // 1er bouton delete qui déclenche l'apparrition de la modal de confirmation
                            confirmDeleteBtnSelector:   confirmDeleteBtnSelector,               // 2nd btn delete qui déclenche la réelle suppression
                            confirmCancelBtnSelector:   confirmCancelBtnSelector,
                            delete:                     del,
                            onDeleteDone:               onDeleteDone
                        });
                        break;
                }
            }
            // Gestion des listes
            else if( recipientType.toLowerCase() === 'list' )
                console.log('MagicModal: MagicModal ne prend pas encore en charge les listes. À venir?');
            else
                console.log('MagicModal: MagicModal ne prend en charge que les librairies avec un format '
                          + 'Library::NomDeLaLibrairie::NomDuDossier ou none::ValeurDeLaColonneDocumentType');

            return this;
        }
    });