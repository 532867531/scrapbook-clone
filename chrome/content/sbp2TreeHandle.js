
var sbp2TreeHandle = {

	changeFolderState : function()
	{
		//Ist ein Container ge�ffnet, werden alle geschlossen. Andernfalls werden alle Container ge�ffnet.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Pr�fen, ob mindestens ein Container ge�ffnet ist
		//3. alle Container �ffnen/schlie�en

		//1. Variablen initialisieren
		var cfsIsFolderOpen = false;
		var cfsTree = document.getElementById("sbp2Tree");
		//2. Pr�fen, ob mindestens ein Container ge�ffnet ist
		for ( var cfsI=0; cfsI<cfsTree.view.rowCount; cfsI++ )
		{
			if ( !cfsTree.view.isContainer(cfsI) ) continue;
			if ( cfsTree.view.isContainerOpen(cfsI) ) { cfsIsFolderOpen = true; break; }
		}
		//3. alle Container �ffnen/schlie�en
		if ( cfsIsFolderOpen == false ) {
			for ( var cfsI=0; cfsI<cfsTree.view.rowCount; cfsI++ ) {
				if ( cfsTree.view.isContainer(cfsI) && cfsTree.view.isContainerOpen(cfsI) == false ) cfsTree.view.toggleOpenState(cfsI);
			}
		} else {
			for ( var cfsI=cfsTree.view.rowCount-1; cfsI>=0; cfsI-- ) {
				if ( cfsTree.view.isContainer(cfsI) && cfsTree.view.isContainerOpen(cfsI) == true ) cfsTree.view.toggleOpenState(cfsI);
			}
		}
	},

	onClick : function(ocTree, ocEvent)
	{
		//L�d die Seite im Browser
		//
		//Ablauf:
		//1. wurde weder die linke noch die mittlere Maustaste gedr�ckt, wird die Funktion verlassen
		//2. wir ein ung�ltiges Objekt angeklickt, wird die Funktion verlassen
		//3. Seite laden

		//1. wurde weder die linke noch die mittlere Maustaste gedr�ckt, wird die Funktion verlassen
		if ( ocEvent.button != 0 && ocEvent.button != 1 ) return;
		//2. wird ein ung�ltiges Objekt angeklickt, wird die Funktion verlassen
		var ocObject={};
		ocTree.treeBoxObject.getCellAt(ocEvent.clientX, ocEvent.clientY, {}, {}, ocObject);
		if ( ocObject.value == "" || ocObject.value == "twisty" ) return;
if ( ocObject.value != "cell" && ocObject.value != "image" && ocObject.value != "text" ) alert("ocObject.value - "+ocObject.value);
		//3. Seite laden
		this.itemShow(ocTree, ocEvent.ctrlKey || ocEvent.button == 1 || false );
	},

	onKeyPress : function(okpTree, okpEvent)
	{
		//Auswertung der Tastatureingabe (Enter, Entfernen und F2 werden ber�cksichtigt)
		switch ( okpEvent.keyCode )
		{
			case okpEvent.DOM_VK_RETURN:
			{
				this.itemShow(okpTree, okpEvent.ctrlKey);
				break;
			}
			case okpEvent.DOM_VK_DELETE:
			{
				this.itemDelete(okpTree.id, sbp2DataSource.dbData, sbp2DataSource.dbDataSearchCacheUpdate);
				break;
			}
			case okpEvent.DOM_VK_F2:
			{
				window.openDialog("chrome://scrapbookplus2/content/sbp2Properties.xul", "ScrapBook Plus 2", "chrome,centerscreen,modal", okpTree);
				break;
			}
			default: { break; }
		}
	},

	itemDelete : function(idTreeString, idData)
	{
		//Selektierte Eintraege werden vom Datentraeger und aus der RDF-Datenquelle entfernt
		//
		//Ablauf:
		//1. Sicherheitsabfrage
		//2. Initialisierung
		//3. selektierte Eintraege bestimmen
		//4. L�schvorgang Eintr�ge in Hauptdatenbank
		//5. L�schvorgang Eintr�ge in Stichwortdatenbank
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//8.

		//1. Sicherheitsabfrage
		if ( !window.confirm(document.getElementById("sbp2CommonString").getString("QUESTION_DELETE_M")) ) return 0;
		//2. Initialisierung
		var idResListe = [];
		var idResContListe = [];
		var idTree = document.getElementById(idTreeString);
		//3. selektierte Eintraege bestimmen
		var idNumRanges = idTree.view.selection.getRangeCount();
		var idStart = new Object();
		var idEnd = new Object();
		for (var idI=0; idI<idNumRanges; idI++)
		{
			idTree.view.selection.getRangeAt(idI,idStart,idEnd);
			for (var idJ=idStart.value; idJ<=idEnd.value; idJ++)
			{
				var idRes = idTree.builderView.getResourceAtIndex(idJ);
				//Sicherstellen, das gefundene Resource nicht in einem Container enthalten ist, der schon aufgenommen wurde
				var idGefunden = 0;
				for ( var idK=0; idK<idResContListe.length; idK++ )
				{
					if ( sbp2Common.RDFCU.indexOf(idData, idResContListe[idK], idRes) > -1 ) {
						idGefunden=1;
						idK=idResContListe.length;
					}
				}
				if ( idGefunden==1 ) continue;
				//Resource zum Loeschen vormerken
				idResListe.push(idRes);
				//bei einem Container m�ssen die enthaltenen Eintr�ge ber�cksichtigt werden
				if ( sbp2Common.RDFCU.IsContainer(idData, idRes) ) {
					idResContListe.push(idRes);
					this.getContentFromRDFContainer(idData, idRes, idResListe, idResContListe);
				}
			}
		}
		//4. L�schvorgang Eintr�ge in Hauptdatenbank
		for ( var idI=idResListe.length-1; idI>=0; idI-- )
		{
			var idType = sbp2DataSource.propertyGet(idData, idResListe[idI], "type");
			//4a. Dateien entfernen
			if ( idType == "site" || idType == "note" || idType == "combine" || idType == "" ) {
				//Verzeichnis initialisieren
				var idID = sbp2DataSource.propertyGet(idData, idResListe[idI], "id");
				var idDirectory = sbp2Common.getBuchVZ();
				idDirectory.append("data");
				idDirectory.append(idID);
				//Verzeichnis entfernen
				sbp2Common.directoryRemove(idDirectory);
			}
			//4b. Eintrag aus RDF-Datenquelle entfernen
			sbp2DataSource.itemDelete(idData, idResListe[idI]);
			if ( idType != "folder" && idType != "separator" && idType !="bookmark" ) {
//				sbp2DataSource.itemAddCrosslinkUpdate("urn:scrapbook:crosslinkupdate", idID, "2");
				sbp2DataSource.itemAddSearchCacheUpdate("urn:scrapbook:searchcacheupdate", idID, "2");
			}
		}
		//5. L�schvorgang Eintr�ge in Stichwortdatenbank
		sbp2Tags.itemRemoveFromEntriesManageIE(idResListe);
		//6. Damit die Boxen zum Auf-/Zuklappen von Verzeichnissen dargestellt werden, ist ein rebuild des Tree notwendig
		idTree.builder.rebuild();
		//7. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(idData);
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
//		sbp2DataSource.dsFlush(sbp2DataSource.dbDataCrosslinkUpdate);
		sbp2DataSource.dsFlush(sbp2DataSource.dbDataTag);
		//8. 
		return 1;
	},

	itemShow : function(isTree, isTabbed)
	{
		//
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Bei nicht ladbaren Elementen (folder, separator) Funktion verlassen
		//3. Anpassungen, falls ein bei einer Volltextsuche gefundener Eintrag angezeigt werden soll
		//4. Unterscheidung zwischen Notizen und sonstigen Eintr�gen

		//1. Variablen initialisieren
		var isFilename = "index.html";
		var isIndex = isTree.currentIndex;
		var isRes = isTree.builderView.getResourceAtIndex(isIndex);
		var isType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type");
		//2. Bei nicht ladbaren Elementen (folder, separator) Funktion verlassen
		if ( isType == "folder" ) return;
		if ( isType == "separator" ) return;
		//3. Anpassungen, falls ein bei einer Volltextsuche gefundener Eintrag angezeigt werden soll
		if ( isRes.Value.match(/#/) ) {
			var isSplit = isRes.Value.split(/#/);
			isRes = sbp2Common.RDF.GetResource(isSplit[0]);
			isFilename = isSplit[1];
//			var appcontent = window.top.document.getElementById("appcontent");
//			appcontent.addEventListener("DOMContentLoaded", sbpTreeHandle.highlightText, false);
		}
		//4. Unterscheidung zwischen Notizen und sonstigen Eintr�gen
//Problem derzeit: Probleme, falls mehrere Notizen auf einmal offen sind
		if ( sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type") == "note" ) {
			sbp2NoteSidebar.nsID = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "id");
			if ( isTabbed ) {
				sbp2NoteSidebar.tab();
			} else {
				sbp2NoteSidebar.load();
				document.getElementById("sbp2SplitterNoteSB").hidden = false;
				document.getElementById("sbp2NoteSBVB").hidden = false;
			}
		} else {
			//URL bestimmen
			var isURL;
			if ( sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "type") == "bookmark" ) {
				isURL = sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "source");
			} else {
				var isDatei = sbp2Common.getBuchVZ();
				isDatei.append("data");
				isDatei.append(sbp2DataSource.propertyGet(sbp2DataSource.dbData, isRes, "id"));
				isDatei.append(isFilename);
				isURL = isDatei.path;
			}
			//Seite laden
			sbp2Common.loadURL(isURL, isTabbed);
		}
	},

	getContentFromRDFContainer : function(gcfrcData, gcfrcContRes, gcfrcListe, gcfrcContListe)
	{
//Wird derzeit nur von sbp2TreeHandle.itemDelete() aufgerufen.
		//Nimmt alle Eintraege des Containers - Eintraege und Container - in gcfrcListe auf.
		//Die Inhalte von gefundenen Containern werden durch rekursiven Aufruf dieser Funktion ebenfalls aufgenommen.
		//
		//Ablauf:
		//1. Container initialisieren
		//2. Eintr�ge des Containers aufnehmen

		//1. Container initialisieren
		var gcfrcCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		gcfrcCont.Init(gcfrcData, gcfrcContRes);
		//2. Eintr�ge des Containers aufnehmen
		var gcfrcContEnum = gcfrcCont.GetElements();
		while ( gcfrcContEnum.hasMoreElements() )
		{
			//Resource bestimmen
			var gcfrcRes  = gcfrcContEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			//Resource in Liste aufnehmen
			gcfrcListe.push(gcfrcRes);
			//Der Inhalt eines Containers muss sofort aufgenommen werden
			if ( sbp2Common.RDFCU.IsContainer(gcfrcData, gcfrcRes) )
			{
				gcfrcContListe.push(gcfrcRes);
				this.getContentFromRDFContainer(gcfrcData, gcfrcRes, gcfrcListe, gcfrcContListe);
			}
		}
	},

	populatePopup : function(ppTreeString, ppEvent)
	{
		//Funktion blendet sinnlose Eintr�ge aus
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Type der Resource bestimmen, falls erfoderlich
		//3. Eintr�ge ein-/ausblenden

		//1. Variablen initialisieren
		var ppObj = {};
		var ppRes;
		var ppRow = {};
		var ppTree = document.getElementById(ppTreeString);
		var ppType;
		ppTree.treeBoxObject.getCellAt(ppEvent.clientX, ppEvent.clientY, ppRow, {}, ppObj);
		var ppIndex = ppRow.value;
		//2. Type der Resource bestimmen, falls erfoderlich
		if ( ppIndex > -1 ) {
			ppRes = ppTree.builderView.getResourceAtIndex(ppIndex);
			ppType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ppRes, "type");
		}
		//3. Eintr�ge ein-/ausblenden
		var ppStatus = false;
		var ppIsBookmark = false;
		var ppIsNote = false;
		if ( ppType == "bookmark" ) {
			ppIsBookmark = true;
		} else if ( ppType == "note" ) {
			ppIsNote = true;
		}
		if ( ppType == "folder" || ppType == "separator" || ppIndex == -1 ) ppStatus = true;
		if ( ppTreeString == "sbp2Tree" ) {
			document.getElementById("sbp2Open").hidden = ppStatus;
			document.getElementById("sbp2OpenInTab").hidden = ppStatus;
			document.getElementById("sbp2OpenURL").hidden = ppStatus || ppIsBookmark || ppIsNote;
			document.getElementById("sbp2Separator1").hidden = ppStatus || ppIsBookmark;
			if ( ppIsNote ) {
				document.getElementById("sbp2Update").hidden = true;
				document.getElementById("sbp2Separator2").hidden = true;
			} else {
				document.getElementById("sbp2Update").hidden = ppStatus || ppIsBookmark || true;		//true entfernen, falls wieder nutzbar
				document.getElementById("sbp2Separator2").hidden = ppStatus || ppIsBookmark || true;	//true entfernen, falls wieder nutzbar
			}
			if ( ppType == "folder" || ppIndex == -1 ) {
				document.getElementById("sbp2Separator7").hidden = false;
				document.getElementById("sbp2CaptureTabs").hidden = false;
			} else {
				document.getElementById("sbp2Separator7").hidden = true;
				document.getElementById("sbp2CaptureTabs").hidden = true;
			}
		}
		document.getElementById("sbp2ShowFiles").hidden = ppStatus || ppIsBookmark;
		document.getElementById("sbp2Separator3").hidden = ppStatus;
		if ( ppIndex == -1 )
			ppStatus = true;
		else
			ppStatus = false;
		document.getElementById("sbp2Separator4").hidden = ppStatus;
		document.getElementById("sbp2Delete").hidden = ppStatus;
		document.getElementById("sbp2Separator5").hidden = ppStatus;
		document.getElementById("sbp2Props").hidden = ppStatus;
	},

	populatePopupIEL : function(ppielEvent)
	{
		//Kontextmen� wird nur bei g�ltigen Eintr�gen im linken Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kontextmen� anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppielObj = {};
		var ppielRes;
		var ppielRow = {};
		var ppielTree	= document.getElementById("sbp2MIETree1");
		var ppielType;
		ppielTree.treeBoxObject.getCellAt(ppielEvent.clientX, ppielEvent.clientY, ppielRow, {}, ppielObj);
		var ppielIndex = ppielRow.value;
		//2. Type der Resource bestimmen, falls erfoderlich
		if ( ppielIndex > -1 ) {
			ppielRes = ppielTree.builderView.getResourceAtIndex(ppielIndex);
			ppielType = sbp2DataSource.propertyGet(sbp2DataSource.dbData, ppielRes, "type");
		}
		//2. Kontextmen� anzeigen, falls sinnvoll
		if ( ppielIndex == -1 ) {
			//Kein Kontextmen� anzeigen, wenn kein Eintrag angeklickt wurde
			ppielEvent.preventDefault();
		} else if ( ppielTree.view.selection.count == 1 ) {
			//Kontextmen� f�r genau 1 Eintrag anzeigen
			document.getElementById("sbp2ShowFiles").hidden = false;
			document.getElementById("sbp2Separator3").hidden = false;
//			document.getElementById("sbp2NewFolder").hidden = false;
//			document.getElementById("sbp2NewSeparator").hidden = false;
//			document.getElementById("sbp2NewNote").hidden = false;
//			document.getElementById("sbp2Separator4").hidden = false;
//			document.getElementById("sbp2Delete").hidden = false;
			document.getElementById("sbp2Separator5").hidden = false;
			document.getElementById("sbp2Props").hidden = false;
		} else if ( ppielTree.view.selection.count > 1 ) {
			//Kontextmen� f�r mehrere Eintr�ge anzeigen
			document.getElementById("sbp2ShowFiles").hidden = true;
			document.getElementById("sbp2Separator3").hidden = true;
//			document.getElementById("sbp2NewFolder").hidden = false;
//			document.getElementById("sbp2NewSeparator").hidden = false;
//			document.getElementById("sbp2NewNote").hidden = false;
//			document.getElementById("sbp2Separator4").hidden = false;
//			document.getElementById("sbp2Delete").hidden = false;
			document.getElementById("sbp2Separator5").hidden = true;
			document.getElementById("sbp2Props").hidden = true;
		}
	},

	populatePopupIER : function(ppierEvent)
	{
		//Kontextmen� wird nur bei g�ltigen Eintr�gen im Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kontextmen� anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppierTree	= document.getElementById("sbp2MIETree2");
		var ppierObject	= {};
		//2. Kontextmen� anzeigen, falls sinnvoll
		ppierTree.treeBoxObject.getCellAt(ppierEvent.clientX, ppierEvent.clientY, {}, {}, ppierObject);
		if ( ppierObject.value == "" ) {
			//Kein Kontextmen� anzeigen, wenn kein Eintrag angeklickt wurde
			ppierEvent.preventDefault();
		} else if ( ppierTree.view.selection.count == 1 ) {
			//Kontextmen� anzeigen, wenn genau 1 Eintrag selektiert ist
			document.getElementById("sbp2MIEShowFiles").hidden = false;
			document.getElementById("sbp2Separator6").hidden = false;
		} else if ( ppierTree.view.selection.count > 1 ) {
			//Kein Kontextmen� anzeigen, wenn mehr als 1 Eintrag selektiert ist
			document.getElementById("sbp2MIEShowFiles").hidden = true;
			document.getElementById("sbp2Separator6").hidden = true;
		}
	},

	populatePopupS : function(ppsEvent)
	{
		//Kontextmen� wird nur bei g�ltigen Eintr�gen im Export-Tree angezeigt
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Kontextmen� anzeigen, falls sinnvoll

		//1. Variablen initialisieren
		var ppsTree	= document.getElementById("sbp2MSTree");
		var ppsObject	= {};
		//2. Kontextmen� anzeigen, falls sinnvoll
		ppsTree.treeBoxObject.getCellAt(ppsEvent.clientX, ppsEvent.clientY, {}, {}, ppsObject);
		if ( ppsObject.value == "" ) {
			//Kein Kontextmen� anzeigen, wenn kein Eintrag angeklickt wurde
			ppsEvent.preventDefault();
		} else if ( ppsTree.view.selection.count == 1 ) {
			//Kontextmen� anzeigen, wenn genau 1 Eintrag selektiert ist
		} else if ( ppsTree.view.selection.count > 1 ) {
			//Kein Kontextmen� anzeigen, wenn mehr als 1 Eintrag selektiert ist
			ppsEvent.preventDefault();
		}
	}

}