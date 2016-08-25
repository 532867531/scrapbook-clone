
//Components.utils.import("resource://gre/modules/osfile.jsm");

var sbp2Common = {

	get IO()		{ return Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService); },
	get PVZ()		{ return Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties); },
	get RDF()		{ return Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService); },
	get RDFC()		{ return Components.classes['@mozilla.org/rdf/container;1'].getService(Components.interfaces.nsIRDFContainer); },
	get RDFCU()		{ return Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils); },
	get UNICODE()	{ return Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].getService(Components.interfaces.nsIScriptableUnicodeConverter); },

	cPosX	: -1,
	cPosY	: -1,

	absoluteURL : function()
	{
		var auFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		auFile.initWithPath("c:\\input.txt");
		var auData = sbp2Common.fileRead(auFile);
		var auLinks = auData.match(/url\(.*?\)/gi);
		//doppelte Links und chrome://... entfernen
		var auHash = {};
		for ( var auI=0; auI<auLinks.length; auI++ )
		{
			auHash[auLinks[auI]] = 0;
		}
		auLinks = [];
		for ( var auItem in auHash )
		{
			if ( auItem.match(/chrome:\/\//) ) continue;
			auLinks.push(auItem);
		}
		var auURLBase = "http://www.divinedivinity2.de/templates/divinity2/css/template_css.css";
		var auURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
		auURL.spec = auURLBase;
		var auStart = -1;
		var auEnd = -1;
		for ( var auI=0; auI<auLinks.length; auI++ )
		{
			var auSplit = auLinks[auI].match(/(url\().*?(\))/);
			var auString = auSplit[0].substring(auSplit[1].length,auSplit[0].length-auSplit[2].length);
			if ( auString.startsWith("'") ) auStart = 1;
			if ( auString.endsWith("'") ) auEnd = auString.length-1;
			if ( auStart > -1 || auEnd > -1 ) auString = auString.substring(auStart, auEnd);
			var auURLAbsolute = auURL.resolve(auString);
alert("sbp2Common.absoluteURL - "+auURLAbsolute);
		}
	},

	captureBookmark : function(cbURL, cbTitle, cbContRes, cbPosition)
	{
		//Erstellt ein Lesezeichen in cbContRes
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Funktion verlassen, wenn RDF-Daten nicht geladen sind (ist Fehler!)
		//3. Item initialisieren
		//4. Item in RDF-Daten eintragen
		//5. Aktualisieren der Ansicht
		//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)

		//1. Variablen initialisieren
		var cbData = sbp2DataSource.dbData;
		if ( cbContRes == null ) cbContRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		if ( cbPosition == null ) cbPosition = -1;
		//2. Funktion verlassen, wenn RDF-Daten nicht geladen sind (ist Fehler!)
		if ( !cbData ) alert("sbp2Common.captureBookmark\n---\nRDF nicht geladen");
		//3. Item initialisieren
		var cbItem = { id : "", type : "", title : "", chars : "", icon : "", source : "", comment : "" };
		cbItem.id = sbp2Common.createNewRDFURL(sbp2DataSource.dbData,"urn:scrapbook:item");
		cbItem.type = "bookmark";
		cbItem.title = cbTitle;
		cbItem.chars = "";
		cbItem.icon = "";
		//FaviconService funktioniert nicht, wenn Firefox im Private Modus läuft. Daher dieser Weg.
		var cbMainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
						   .getInterface(Components.interfaces.nsIWebNavigation)
						   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
						   .rootTreeItem
						   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
						   .getInterface(Components.interfaces.nsIDOMWindow);
		cbItem.icon = cbMainWindow.gBrowser.selectedTab.getAttribute("image");
		cbItem.source = cbURL;
		cbItem.comment = "";
		//4. Item in RDF-Daten eintragen
		sbp2DataSource.itemAdd(cbData, cbItem, cbContRes, cbPosition);
		//5. Aktualisieren der Ansicht
		var cbTree = document.getElementById("sbp2Tree");
		if ( cbTree ) cbTree.builder.rebuild();
		//6. RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		sbp2DataSource.dsFlush(cbData);
//Ist diese Zeile erforderlich?
//		sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
	},

	captureImage : function(ciMode)
	{
//wird von sbp2Overlay.xul aufgerufen
		//Entweder kann ein einzelnes Frame oder eine komplette Seite ohne Frames gespeichert werden.
		//
		//Ablauf:
		//1. Laufende Archivierung merken
		//2. Variablen initialisieren
		//3. ciMode auswerten (entire = ganze Seite, focused = einzelnes Frames)
		//4. Bild speichern

		//1. Laufende Archivierung merken
		sbp2CaptureSaver.scsCaptureRunning = 1;
		//2. Variablen initialisieren
		var ciData = sbp2DataSource.dbData;
		var ciElement = null;
		//3. ciMode auswerten (entire = ganze Seite, focused = einzelnes Frames)
		switch (ciMode)
		{
			case "entire":
			{
				ciElement = content;
				break;
			}
			case "focused":
			{
				ciElement = document.commandDispatcher.focusedWindow;
				break;
			}
		}
		//4. Bild speichern
		sbp2CaptureSaverImage.save(ciElement, ciData);
	},

	captureTab : function(ctURL, ctTitle, ctContRes, ctPosition, ctCaptureMode)
	{
		//Archiviert die Seite im aktiven Tab im Verzeichnis ctContRes
		//ctCaptureMode gibt an, welche Methode genutzt wird:
		//0 -> Normal
		//1 -> Capture As
		//2 -> Capture Add (einzelne Seite)
		//3 -> Capture Add (alle verlinkten Seiten im Archiv)
		//10 -> Capture Links (alle verlinkten Seiten im Tab)
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Parameter abfragen, die beim Speichern angewendet werden sollen (optional)
		//2.1.1 Benutzereingaben anfordern
		//2.1.2 Wurde Fenster mit OK beendet, wird die Seite archiviert
		//2.1.2.1 Verzeichnis erstellen
		//2.1.2.2 Seite speichern (Icon wird in sbp2CaptureSaver.capture heruntergeladen)
		//---
		//2.2.1 Benutzereingaben anfordern
		//2.2.2 Wurde Fenster mit OK beendet, wird die Seite archiviert
		//---
		//2.3.1 Verzeichnis erstellen
		//2.3.2 Seite speichern (Icon wird in sbp2CaptureSaver.capture heruntergeladen)

		//1. Variablen initialisieren
		var ctData = sbp2DataSource.dbData;
		if ( ctContRes == null ) ctContRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
		if ( ctPosition == null ) ctPosition = -1;
		var ctFile = null;
		var ctParameterIn = { window: null, title: null, url: null };
		var ctParameterOut = {
			autostart		: false,
			charset			: window.content.document.characterSet,
			comment			: "",
			dialogAccepted	: true,
			depthMax		: 0,
			embeddedImages	: true,
			embeddedStyles	: true,
			embeddedScript	: false,
			icon			: null,
			id				: null,
			linkedArchives	: false,
			linkedAudio		: false,
			linkedCustom	: false,
			linkedImages	: false,
			linkedMovies	: false,
//			mode			: 0,			//0=Single, 1=InDepth Phase 1, 2=InDepth Phase 2, 3=Add, 4=Add InDepth Phase 1, 5=Add InDepth Phase 2
			mode			: 0,			//0=Single, 1=InDepth, 2=Add, 3=InDepth Add, 9=Image, 10=Links
			position		: ctPosition,
			resCont			: ctContRes,
			source			: ctURL,
			timeout			: 0,
			title			: ctTitle,
			type			: "",
			window			: null,
			links			: [],
			types			: []
		};
		//2. Parameter abfragen, die beim Speichern angewendet werden sollen (optional)
		if ( ctCaptureMode == 1 ) {
			//2.1.0 Variablen initialisieren
			ctParameterIn.window = null;
			ctParameterIn.title = ctTitle;
			ctParameterIn.url = ctURL;
			//2.1.1 Benutzereingaben anfordern
			window.openDialog("chrome://scrapbookplus2/content/sbp2CaptureAs.xul", "", "chrome,modal,centerscreen,resizable", ctParameterIn, ctParameterOut);
			//2.1.2 Wurde Fenster mit OK beendet, wird die Seite archiviert
			if ( ctParameterOut.dialogAccepted ) {
				//2.1.2.1 Verzeichnis erstellen
				ctParameterOut.id = sbp2Common.directoryCreate();
				//2.1.2.2 Seite speichern (Icon wird in sbp2CaptureSaver.capture heruntergeladen)
				sbp2CaptureSaver.captureInitNormal(window.content, ctParameterOut);
			}
		} else if ( ctCaptureMode == 2 ) {
			//2.2.0 Variablen initialisieren
			ctParameterIn.window = null;
			ctParameterIn.title = null;
			ctParameterIn.url = ctURL;
			ctParameterOut.mode = 2;
			//2.2.1 Benutzereingaben anfordern
			window.openDialog("chrome://scrapbookplus2/content/sbp2CaptureAdd.xul", "", "chrome,modal,centerscreen,resizable", ctParameterIn, ctParameterOut);
			//2.2.2 Wurde Fenster mit OK beendet, wird die Seite archiviert
			if ( ctParameterOut.dialogAccepted ) {
				//2.2.2.1 Seite hinzufügen
				sbp2CaptureSaver.captureInitAdd(window.content, ctParameterOut);
			}
		} else if ( ctCaptureMode == 3 ) {
			//2.2.0 Variablen initialisieren
			ctParameterIn.window = null;
			ctParameterIn.title = sbp2DataSource.propertyGet(sbp2DataSource.dbData, document.getElementById('sbp2Tree').builderView.getResourceAtIndex(document.getElementById('sbp2Tree').currentIndex), 'title');
			ctParameterIn.url = sbp2DataSource.propertyGet(sbp2DataSource.dbData, document.getElementById('sbp2Tree').builderView.getResourceAtIndex(document.getElementById('sbp2Tree').currentIndex), 'id');;
			//2.2.1 Benutzereingaben anfordern
			window.openDialog("chrome://scrapbookplus2/content/sbp2CaptureAsAdd.xul", "", "chrome,modal,centerscreen,resizable", ctParameterIn, ctParameterOut);
			//2.2.2 Wurde Fenster mit OK beendet, wird InDepth-Capture-Add initiiert
			if ( ctParameterOut.dialogAccepted ) {
				sbp2CaptureSaver.captureInitAddMultiple(ctParameterOut);
			}
		} else if ( ctCaptureMode == 10 ) {
			//2.2.0 Variablen initialisieren
			ctParameterOut.mode = 10;
			//2.2.1 Benutzereingaben anfordern
			window.openDialog("chrome://scrapbookplus2/content/sbp2CaptureLinks.xul", "", "chrome,modal,centerscreen,resizable", ctParameterIn, ctParameterOut);
			//2.2.2 Wurde Fenster mit OK beendet, wird InDepth-Capture-Add initiiert
			if ( ctParameterOut.dialogAccepted ) {
				//Verweise in Array ablegen
				var ctLinks = [];
				var ctTypes = [];
				for ( var cilI=0; cilI<ctParameterOut.links.length; cilI++ )
				{
					ctLinks.push(ctParameterOut.links[cilI]);
					ctTypes.push(ctParameterOut.types[cilI]);
				}
				window.openDialog("chrome://scrapbookplus2/content/sbp2Capture.xul", "", "chrome,centerscreen,all,resizable", [], [], [], ctTypes, [], [], [], [], [], [0, 0], {}, {}, ctParameterOut, null, [], [], null, ctLinks);
			}
		} else {
			//2.3.1 Verzeichnis erstellen
			ctParameterOut.id = sbp2Common.directoryCreate();
			//2.3.2 Seite speichern (Icon wird in sbp2CaptureSaver.capture heruntergeladen)
			sbp2CaptureSaver.captureInitNormal(window.content, ctParameterOut);
		}
	},

	captureTabFinish : function(ctfItem, ctfResCont, ctfPosition, ctfMode, ctfFinishMessage)
	{
//Wird von sbp2Capture.close und sbp2CaptureSaver.captureComplete aufgerufen
		//Funktion wird aufgerufen, sobald die in sbp2CaptureSaver durchgeführten asynchronen Downloads beendet sind.
		//Es wird ein Eintrag in der Sidebar angelegt und die Datei index.dat erstellt. Außerdem werden die RDF-Dateien
		//gespeichert.
		//
		//Ablauf:
		//1. Modusabhängige Aktionen
		//1.1 Variablen initialisieren
		//1.2 index.dat erstellen
		//1.3 Eintrag im Tree erstellen
		//1.4 Aktualisieren der Ansicht
		//1.5 RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
		//2. weitere Archivierung ermöglichen
		//3. Popup anzeigen, falls zuvor wirklich etwas archiviert worden ist

		//1. Modusabhängige Aktionen
		if ( ctfMode < 3 || ctfMode == 9 || ctfMode == 10 ) {
			//1.1 Variablen initialisieren
			var ctfData = sbp2DataSource.dbData;
			//1.2 index.dat erstellen
			var ctfFile = sbp2Common.getBuchVZ();
			ctfFile.append("data");
			ctfFile.append(ctfItem.id);
			ctfFile.append("index.dat");
			this.fileWriteIndexDat(ctfFile.path, ctfItem);
			//1.3 Eintrag im Tree erstellen
			sbp2DataSource.itemAdd(ctfData, ctfItem, ctfResCont, ctfPosition);
			//1.4 Aktualisieren der Ansicht
			var ctfTree = document.getElementById("sbp2Tree");
			if ( ctfTree ) ctfTree.builder.rebuild();
			//1.5 RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(ctfData);
			sbp2DataSource.dsFlush(sbp2DataSource.dbDataSearchCacheUpdate);
		}
		//2. weitere Archivierung ermöglichen (eventuell nach sbp2CaptureSaver verlagern)
		sbp2CaptureSaver.scsCaptureRunning = 0;
		//3. Popup anzeigen, falls zuvor wirklich etwas archiviert worden ist
		if ( ctfFinishMessage > 0 ) this.captureFinishMessage(ctfItem);
	},

	captureFinishMessage : function(cfmItem)
	{
//wird von sbp2Common.captureTabFinish und sbp2CaptureSaver.captureComplete gerufen.
		//Nachricht bei abgeschlossener Archivierung ausgeben
		var cfmAlertsServiceListener = {
			observe: function(subject, topic, data) {
				if ( topic == "alertclickcallback" ) {
					var cfmFile = sbp2Common.getBuchVZ();
					cfmFile.append("data");
					cfmFile.append(cfmItem.id);
					cfmFile.append("index.html");
					sbp2Common.loadURL(cfmFile.path, true);
				}
			}
		}
		var cfmAlertsService = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
		try {
			cfmAlertsService.showAlertNotification("chrome://scrapbookplus2/skin/1.png", "ScrapBook Plus 2", cfmItem.title, true, "", cfmAlertsServiceListener, "");
		} catch (cfmEx) {
			alert("sbp2Common.captureFinishMessage\n---\n"+cfmEx+"\n\nProblem with nsIAlertsService.");
		}
	},

	convertToUnicode : function(ctuString, ctuCharset, ctuFile)
	{
//wird von sbp2NoteSidebar.load() und sbp2SearchCache.itemAdd() aufgerufen
		if ( !ctuString ) return "";
		try
		{
			this.UNICODE.charset = ctuCharset;
			//Doppelpunkt oder Umlaute führen zu einem Fehler!
			ctuString = this.UNICODE.ConvertToUnicode(ctuString);
		} catch(ctuEx)
		{
			//Keine Meldung ausgeben, um Benutzer nicht zu beunruhigen
			alert("sbp2Common.convertToUnicode"+ctuFile+"\n---\n"+ctuEx+"\n\nData:\n"+ctuString);
		}
		return ctuString;
	},

	createItem : function(ciTreeString, ciMode)
	{
		//Erstellt ein Verzeichnis, eine Trennlinie oder eine Notiz
		//
		//Ablauf:
		//1. Objekt für Übergabe-/Rückgabewert erstellen (ciParams)
		//2. Dialog zur Eingabe eines Verzeichnisnamen öffnen
		//3. ciParams verarbeiten

		//1. Objekt für Übergabe-/Rückgabewert erstellen
		var ciParams = { mode: ciMode, out: null};
		//2. Dialog zur Eingabe eines Verzeichnisnamen öffnen
		if ( ciMode == "folder" ) {
			window.openDialog('chrome://scrapbookplus2/content/sbp2InputDialog.xul', '', 'chrome,centerscreen,modal', ciParams);
		} else {
			ciParams.out = "";
		}
		//3. ciParams verarbeiten
		if ( ciParams.out != null ) {
			//Neue ID bestimmen
			var ciNewID;
			if ( ciMode == "note" ) {
				ciNewID = sbp2Common.directoryCreate();
				var ciDatei = sbp2Common.getBuchVZ();
				ciDatei.append("data");
				ciDatei.append(ciNewID);
				ciDatei.append("index.html");
				sbp2Common.fileWrite(ciDatei, "", "UTF-8");
			} else {
				ciNewID = sbp2Common.createNewRDFURL(sbp2DataSource.dbData,"urn:scrapbook:item");
			}
			//Variablen initialisieren
			var ciData = sbp2DataSource.dbData;
			var ciRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + ciNewID);
			while ( sbp2DataSource.propertyGet(ciData, ciRes, "id") != "" )
			{
alert("sbp2Common.createItem\n---\ID "+ciNewID+" already exists. Contact the developer.");
				ciNewID++;
				ciRes = sbp2Common.RDF.GetResource("urn:scrapbook:item" + ciNewID);
			}
			var ciTree = document.getElementById(ciTreeString);
			//Neues Item anlegen
			var ciItem = { id: ciNewID, type: ciMode, title: ciParams.out, chars: "", icon: "", source: "", comment: "" };
			if ( ciMode == "note" ) ciItem.chars = "UTF-8";
				//Zielcontainer und Position im Zielcontainer bestimmen
			var ciContRes;
			var ttt = [];
			var tttCont = [];
			var ciObject={};
			var ciRow={};
			if ( ciTree ) {
				ciTree.treeBoxObject.getCellAt(sbp2Common.cPosX, sbp2Common.cPosY, ciRow, {}, ciObject);
				var ciIdx = ciRow.value;
				if ( ciIdx > -1 ) {
					ciRes = ciTree.builderView.getResourceAtIndex(ciIdx);
					if ( sbp2DataSource.propertyGet(ciData, ciRes, "type") == "folder" ) {
						ciContRes = ciRes;
					} else {
						var ciResRoot = sbp2Common.RDF.GetResource("urn:scrapbook:root");
						ciContRes = ciResRoot;
						ttt.push(sbp2Common.RDF.GetResource("urn:scrapbook:root"));
						sbp2DataSource.containerGetAll(ciData, ciResRoot, ttt, tttCont, true);
						for ( var ciI=0; ciI<ttt.length; ciI++ )
						{
							if ( sbp2Common.RDFCU.indexOf(ciData, ttt[ciI], ciRes) > -1 ) {
								ciContRes = ttt[ciI];
								ciI = ttt.length;
							}
						}
					}
				} else {
					ciContRes = sbp2Common.RDF.GetResource("urn:scrapbook:root");
				}
			}
			//Eintrag im Tree erstellen (am Ende des Containers anhaengen)
			sbp2DataSource.itemAdd(ciData, ciItem, ciContRes, -1);
			//Aktualisieren der Ansicht
			ciTree.builder.rebuild();
			//RDF-Datei auf Platte aktualisieren (ohne geht der Datensatz beim Beenden von FF verloren)
			sbp2DataSource.dsFlush(ciData);
		}
	},

	createNewRDFURL : function(cnruData, cnruResString)
	{
		//Liefert an die aufrufende Funktion eine ID zurück, die garantiert nicht in der Datenbank vorhanden ist.
		//Wenn zwei IDs kurz hintereinander generiert werden, kann es vorkommen, dass beide innerhalb der gleichen
		//Sekunde entstehen und somit nicht mehr einzigartig wären. Dies passiert hioer nicht (siehe Punkt 2).
		//
		//Ablauf:
		//1. ID bilden
		//2. sicherstellen, dass ID nicht in Datenbank existiert
		//3. Neue ID an aufrufende Funktion zurueckliefern

		//1. ID bilden
		var cnruDate = new Date;
		var cnruYear = cnruDate.getFullYear();
		var cnruMonth = cnruDate.getMonth()+1; if ( cnruMonth < 10 ) cnruMonth = "0" + cnruMonth;
		var cnruDay = cnruDate.getDate(); if ( cnruDay < 10 ) cnruDay = "0" + cnruDay;
		var cnruHours = cnruDate.getHours(); if ( cnruHours < 10 ) cnruHours = "0" + cnruHours;
		var cnruMinutes = cnruDate.getMinutes(); if ( cnruMinutes < 10 ) cnruMinutes = "0" + cnruMinutes;
		var cnruSeconds = cnruDate.getSeconds(); if ( cnruSeconds < 10 ) cnruSeconds = "0" + cnruSeconds;
		//2. sicherstellen, dass ID nicht in Datenbank existiert
		var cnruID = cnruYear.toString() + cnruMonth.toString() + cnruDay.toString() + cnruHours.toString() + cnruMinutes.toString() + cnruSeconds.toString();
		var cnruRes = sbp2Common.RDF.GetResource(cnruResString + cnruID);
		while ( sbp2DataSource.propertyGet(cnruData, cnruRes, "id") != "" )
		{
			cnruID++;
			cnruRes = sbp2Common.RDF.GetResource(cnruResString + cnruID);
		}
		//3. Neue ID an aufrufende Funktion zurueckliefern
		return cnruID;
	},

	directoryCreate : function()
	{
		//Legt ein neues Verzeichnis an und liefert die dabei verwendete ID an die aufrufende Funktion zurück.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Neue ID bestimmen
		//3. Neues Datenverzeichnis anlegen
		//4. Neue ID an aufrufende Funktion zurueckliefern

		//1. Variablen initialisieren
		var dcFolderBase = sbp2Common.getBuchVZ();
		dcFolderBase.append("data");
		//2. Neue ID bestimmen
		var dcNewID = sbp2Common.createNewRDFURL(sbp2DataSource.dbData,"urn:scrapbook:item");
		//3. Neues Datenverzeichnis anlegen
		try
		{
			var dcDatenVZ = dcFolderBase.clone();
			dcDatenVZ.append(dcNewID);
			//Eine ID kann schon vergeben sein, falls Funktion "mehrere Links archivieren" verwendet wird. Daher muss diese gegebenenfalls korrigiert werden.
			while ( dcDatenVZ.exists() )
			{
//alert("sbp2Common.directoryCreate\n---\ID "+dcNewID+" already exists. Contact the developer.");
				dcNewID++;
				dcDatenVZ = dcFolderBase.clone();
				dcDatenVZ.append(dcNewID);
			}
			dcDatenVZ.create(dcDatenVZ.DIRECTORY_TYPE, parseInt("0700", 8));
		} catch(dcEx)
		{
			alert("sbp2Common.directoryCreate\n---\n"+dcEx);
		}
		//4. Neue ID an aufrufende Funktion zurueckliefern
		return dcNewID;
	},

	directoryRemove : function(drDirectory)
	{
		//Entfernt alle Dateien innerhalb des übergebenen Pfads und entfernt anschließend den Pfad selbst
		//
		//Ablauf:
		//1. Funktion beenden, falls Verzeichnis nicht mehr existiert
		//2. Dateien im Verzeichnis entfernen
		//3. Verzeichnis selbst entfernen

		//1. Funktion beenden, falls Verzeichnis nicht mehr existiert
		if ( !drDirectory.exists() ) return;
		//2. Dateien im Verzeichnis entfernen
		var drDirectoryEnum = drDirectory.directoryEntries;
		while ( drDirectoryEnum.hasMoreElements() )
		{
			var drFile = drDirectoryEnum.getNext().QueryInterface(Components.interfaces.nsIFile);
			if ( drFile.isFile() ) {
				drFile.remove(false);
			} else {
alert("sbp2Common.directoryRemove\n---\nThe directory "+drFile.path+" should not exist. Contact the developer.");
			}
		}
		//3. Verzeichnis selbst entfernen
		if ( drDirectory.isDirectory() ) {
			drDirectory.remove(false);
		}
	},

	directoryShow : function(dsTreeString, dsIsEntry)
	{
		//Zeigt den Inhalt eines Verzeichnises im Dateimanager des Betriebssystems an
		//
		//Ablauf:
		//1. ScrapBook-Verzeichnis bestimmen
		//2. Falls das Verzeichnis eines Eintrags angezeigt werden soll, muss dessen Verzeichnisname noch an dsDirectory angehängt werden
		//2a. Tree bestimmen
		//2b. Nummer des gewählten Eintrags bestimmen
		//2c. Funktion verlassen, wenn ein Verzeichnis (Container) selektiert ist und somit nichts angezeigt werden kann
		//2d. Verzeichnisnamen vervollständigen
		//3. Verzeichnis anzeigen

		//1. ScrapBook-Verzeichnis bestimmen
		var dsDirectory = sbp2Common.getBuchVZ();
		//2. Falls das Verzeichnis eines Eintrags angezeigt werden soll, muss dessen Verzeichnisname noch an dsDirectory angehängt werden
		if ( dsIsEntry )
		{
			//2a. Tree bestimmen
			var dsTree = document.getElementById(dsTreeString);
			//2b. Nummer des gewählten Eintrags bestimmen
			var dsIndex = dsTree.currentIndex;
			//2c. Funktion verlassen, wenn ein Verzeichnis (Container) selektiert ist und somit nichts angezeigt werden kann
			if ( dsTree.view.isContainer(dsIndex) ) return;
			//2d. Verzeichnisnamen vervollständigen
			var dsRes = dsTree.builderView.getResourceAtIndex(dsIndex);
			dsDirectory.append("data");
			dsDirectory.append(sbp2DataSource.propertyGet(sbp2DataSource.dbData, dsRes, "id"));
		}
		//3. Verzeichnis anzeigen
		const dsCi = Components.interfaces;
		try
		{
			dsDirectory = dsDirectory.QueryInterface(dsCi.nsILocalFile);
			dsDirectory.reveal();
		} catch(dsEx)
		{
			alert("sbp2Common.directoryShow\n---\n"+dsEx);
		}
	},

	ersetzeSonderzeichen : function(esString)
	{
		//Ersetzt Zeilenumbrüche und Tabs in esString, damit diese in RDF verwendet werden können.
		//Tabs sind dauerhaft verloren
		return esString.replace(/\r|\n|\t/g, " __BR__ ");
	},

	fileRead : function(frDatei)
	{
//wird von sbp2NoteSidebar.load() aufgerufen
		//Gibt den Inhalt der Datei frDatei an die aufrufende Funktion zurück.
		//Bei einem Fehler während des Lesens wird nichts zurückgegeben.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Lese Daten der Datei frDatei
		//3. Gebe Daten an aufrufende Funktion zurück

		//1. Variablen initialisieren
		var frData = "";
		//2. Lese Daten der Datei frDatei
		try
		{
			var frIStream = Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces.nsIFileInputStream);
			frIStream.init(frDatei, 1, 0, false);
			var frSStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
			frSStream.init(frIStream);
			frData = frSStream.read(frSStream.available());
			frSStream.close();
			frIStream.close();
		}
		catch(frEx)
		{
			dump("sbp2Common.fileRead\n---\n"+frDatei.path+"\n\n"+frEx+"\n-------\n");
			return "";
		}
		//3. Gebe Daten an aufrufende Funktion zurück (???)
		return frData;
	},

	fileReadIndexDat : function(fridDatei)
	{
		//Liefert den Inhalt von index.dat an aufrufende Funktion zurück
		//
		//Ablauf:
		//1. index.dat lesen
		//2. Daten aufbereiten
		//3. aufbereitete Daten an aufrufende Funktion zurückgeben

		//1. index.dat lesen
		if ( !(fridDatei instanceof Components.interfaces.nsILocalFile) ) return alert("Invalid agurments in sbTradeService::parseIndexDat.");
		var fridData = this.convertToUnicode(sbp2Common.fileRead(fridDatei), "UTF-8");
		//2. Daten aufbereiten
		fridData = fridData.split("\n");
		if ( fridData.length < 2 ) return null;
		var fridItem = { id: "", type: "", title: "", chars: "", comment: "", icon: "", source: "", folder: "", quellVZ: "", isZip: "0" };
		for ( var fridI=0; fridI<fridData.length; fridI++ )
		{
			if ( !fridData[fridI].match(/\t/) ) continue;
			var keyVal = fridData[fridI].split("\t");
			if ( keyVal.length == 2 ) {
				fridItem[keyVal[0]] = keyVal[1];
			} else {
				fridItem[keyVal.shift()] = keyVal.join("\t");
			}
		}
		//3. aufbereitete Daten an aufrufende Funktion zurückgeben
		return fridItem;
	},

	fileWrite : function(fwFile, fwData, fwChars)
	{
		//Schreibt fwData in fwFile. Wird fwChars mitgegeben, erfolgt eine Zeichenkonvertierung.
		//Tests haben gezeigt, dass Daten, die UTF-8-kodiert sind, nicht nochmals konvertiert werden dürfen,
		//da es sonst zu Fehlern im Text kommt. Daher ist die Angabe von fwChars nicht mehr zwingend.
		//
		//Ablauf:
		//1. Existiert fwFile -> löschen
		//2. fwFile mit fwData füllen

		//1. Existiert fwFile -> löschen
		if ( fwFile.exists() ) {
			try
			{
				fwFile.remove(false);
			} catch(fwEx) {
				dump("sbp2Common.fileWrite\n---\n"+fwFile.path+"\\"+fwFile.leafName+" could not be deleted.\n");
			}
		}
		//2. fwFile mit fwData füllen
		try
		{
			fwFile.create(fwFile.NORMAL_FILE_TYPE, parseInt("0666", 8));
			if ( fwChars ) {
				// Text umwandeln in fwChars
				sbp2Common.UNICODE.charset = fwChars;
				fwData = sbp2Common.UNICODE.ConvertFromUnicode(fwData);
			}
			var fwfoStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
			fwfoStream.init(fwFile, 0x02 | 0x08 | 0x20, parseInt("0666", 8), 0); 
			fwfoStream.write(fwData, fwData.length);
			fwfoStream.close();
		} catch(fwEx)
		{
			alert("sbp2Common.fileWrite\n---\n"+fwFile.path+"\\"+fwFile.leafName+" could not be created.\n");
		}
	},

	fileWriteIndexDat : function(fwidFileDirectory, fwidItem)
	{
		//Erstellt index.dat
		//
		//Ablauf:
		//1. Zieldatei festlegen
		//2. Daten für Zieldatei sammeln
		//3. Zieldatei schreiben

		//1. Zieldatei festlegen
		var fwidFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		fwidFile.initWithPath(fwidFileDirectory);
		//2. Daten für Zieldatei sammeln
		var fwidData = "";
		fwidData += "id\t"+fwidItem.id+"\n";
		fwidData += "type\t"+fwidItem.type+"\n";
		fwidData += "title\t"+fwidItem.title+"\n";
		fwidData += "chars\t"+fwidItem.chars+"\n";
		fwidData += "icon\t"+fwidItem.icon+"\n";
		fwidData += "source\t"+fwidItem.source+"\n";
		fwidData += "comment\t"+fwidItem.comment+"\n";
		if ( fwidItem.folder ) fwidData += "folder\t"+fwidItem.folder+"\n";
		//3. Zieldatei schreiben
		this.fileWrite(fwidFile, fwidData, "UTF-8");
	},

	getBuchVZ : function()
	{
		//Gibt ein File-Objekt mit dem aktuellen ScrapBook-Verzeichnis an die aufrufende Funktion zurück
		//
		//Ablauf:
		//1. ScrapBook-Verzeichnis bestimmen
		//2. File-Objekt an aufrufende Funktion zurückgeben

		//1. ScrapBook-Verzeichnis bestimmen
		var gbvzString = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.path");
		var gbvzVZ;
		if ( gbvzString == "" ) {
			gbvzVZ = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
			gbvzVZ.append("ScrapBookPlus2");
		} else {
			gbvzVZ = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			gbvzVZ.initWithPath(gbvzString);
		}
		//2. File-Objekt an aufrufende Funktion zurückgeben
		return gbvzVZ;
	},

	getFrameList : function(gflWin)
	{
		//Erstellen einer Liste mit allen Mainframes und Frames im aktuellen Fenster. Enthält das Fenster keine
		//Frames, wird lediglich gflWin an die aufrufende Funktion zurückgegeben.
		//Die Liste enthält die Frames in der Reihenfolge, in der sie Firefox kennt. Unterframes werden immer
		//sofort bestimmt und nicht erst, nachdem die aktuelle Ebene aufgenommen wurde.
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. alle Frames in gflWin bestimmen
		//3. Liste mit gefundenen Window-Objekten zurück an aufrufende Funktion

		//1. Variablen initialisieren
		var gflFrameList = [];		//Window-Objekt
		var gflFrameListNr = [];	//aktuelles Frame des Window-Objekts
		var gflFrameLevel = [];		//enthält Position in gflFrameList
		var gflFrameLevelNr = 0;	//ist Wert -1, sind alle Frames bekannt
		//2. alle Frames in gflWin bestimmen
		gflFrameList.push(gflWin);
		gflFrameListNr.push(0);
		gflFrameLevel.push(0);
		while ( gflFrameLevelNr > -1 ) {
			var gflFrameNr = gflFrameLevel[gflFrameLevelNr];
			while ( gflFrameListNr[gflFrameNr] < gflFrameList[gflFrameNr].frames.length ) {
				gflFrameList.push(gflFrameList[gflFrameNr].frames[gflFrameListNr[gflFrameNr]]);
				gflFrameListNr.push(0);
				if ( gflFrameList[gflFrameList.length-1].frames.length > 0 ) {
					gflFrameLevelNr++;
					if ( gflFrameLevelNr == gflFrameLevel.length ) {
						gflFrameLevel.push(gflFrameList.length-1);
					} else {
						gflFrameLevel[gflFrameLevelNr] = gflFrameList.length-1;
					}
					gflFrameLevelNr++;
				}
				gflFrameListNr[gflFrameNr]++;
			}
			gflFrameLevelNr--;
		}
		//3. Liste mit gefundenen Window-Objekten zurück an aufrufende Funktion
		return gflFrameList;
	},

	loadScrapbook : function(lsItem)
	{
		//
		//
		//Ablauf:
		//1. Funktion verlassen, falls "Verwalten ..." angeklickt wurde
		//2. Funktion verlassen, falls das ScrapBook schon geöffnet ist
		//3. Datenquelle von den Trees entfernen
		//4. Angaben von angeklicktem ScrapBook speichern, damit die Werte des neuen ScrapBooks von sbp2Sidebar.scrapbookLoad gefunden werden
		//5. angeklicktes ScrapBook laden
		//6. Titel des gerade geöffneten Scrapbook in der Sidebar anzeigen

		//1. Funktion verlassen, falls "Verwalten ..." angeklickt wurde
		if ( lsItem.id == "sbp2SidebarBSwitchMItemManage" ) return;
		//2. Funktion verlassen, falls das ScrapBook schon geöffnet ist
		if ( lsItem.getAttribute("checked") == "true" ) return;
		//3. Datenquelle von den Trees entfernen
		sbp2DataSource.dsRemoveFromTree(document.getElementById("sbp2Tree"));
		sbp2DataSource.dsRemoveFromTree(document.getElementById("sbp2TreeTag"));
		//4. Angaben von angeklicktem ScrapBook speichern, damit die Werte des neuen ScrapBooks von sbp2Sidebar.scrapbookLoad gefunden werden
		lsItem.setAttribute("checked", true);
		var lsVZ = lsItem.getAttribute("path");
		sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.path", lsVZ);
		sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.title", lsItem.label);
		try
		{
			var refWin = "sbp2Overlay" in window.top ? window.top : window.opener.top;
			refWin.sbp2Overlay.refresh();
		} catch(lsEx)
		{
			alert("sbp2Common.loadScrapbook\n---\n"+lsEx);
		}
		//5. angeklicktes ScrapBook laden
		sbp2Sidebar.scrapbookLoad();
		//6. Titel des gerade geöffneten Scrapbook in der Sidebar anzeigen
		sbp2Sidebar.showTitle();
	},

	loadURL : function(luAdresse, luInTab)
	{
		//Läd die übergebene Adresse
		//
		//Ablauf:
		//1. Variablen initialisieren
		//2. Laden der Seite in einem neuen Tab oder der aktuellen Ansicht
		//3. Listener anhängen, um bei fertig geladener Seite mit der Verarbeitung fortfahren zu können

		//1. Variablen initialisieren
		var luWin = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		if ( !luWin ) return;
		var luBrowser = luWin.document.getElementById("content");
		//2. Laden der Seite in einem neuen Tab oder der aktuellen Ansicht
		if ( luInTab ) {
			luBrowser.selectedTab = luBrowser.addTab(luAdresse);
		} else {
			luBrowser.loadURI(luAdresse);
		}
		//3. Listener anhängen, um bei fertig geladener Seite mit der Verarbeitung fortfahren zu können
		luBrowser.webProgress.addProgressListener(loadCompletedListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
	},

	openPrefWindow : function()
	{
		//Blendet das Fenster für die Einstellungen ein.
		var opwInstantApply = sbp2Prefs.getBoolPref("browser.preferences.instantApply", false);
		window.top.openDialog("chrome://scrapbookplus2/content/sbp2Preferences.xul", "ScrapBook Plus 2:Options", "chrome, titlebar, toolbar, centerscreen," + (opwInstantApply ? "dialog=no" : "modal"));
	},

};

var loadCompletedListener = {
	QueryInterface: function(aIID)
	{
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
		aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
		aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	},

	onStateChange: function(oscWebProgress, oscRequest, oscFlag, oscStatus)
	{
		if ( oscFlag == 786448 )
		{
			//Progress-Listener nach getaner Arbeit entfernen
			oscWebProgress.removeProgressListener(loadCompletedListener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
			//Adresse der Seite bestimmen
			var oscURL = oscWebProgress.DOMWindow.location.href;
			//Hauptfenster bestimmen
			var oscMainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								.getInterface(Components.interfaces.nsIWebNavigation)
								.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
								.rootTreeItem
								.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
								.getInterface(Components.interfaces.nsIDOMWindow);
			//Das Einblenden des Editors soll vom Anwender manuell per Kontextmenü vorgenommen werden -> Editor ausblenden
			oscMainWindow.document.getElementById("sbp2Toolbox").hidden = true;
/*
			//Ein-/Ausblenden von Editor
			if ( oscMainWindow.document.getElementById("content").currentURI.spec == oscURL ) {
				//ID bestimmen
				var oscEditierbar = (oscURL.indexOf("file") == 0 && oscURL.match(/\/data\/(\d{14})\//));
				var oscID = oscEditierbar ? RegExp.$1 : null;
				//Editor einblenden, falls vom Anwender gewünscht
				if ( oscID ) {
					oscMainWindow.document.getElementById("sbp2Toolbox").hidden = false;
					//Highlighter initialisieren
					oscMainWindow.sbp2Editor.hlInit();
				} else {
					oscMainWindow.document.getElementById("sbp2Toolbox").hidden = true;
				}
			}
*/
		}
	},

	//Weitere Funktionen, die derzeit keine Verwendung finden
	onLocationChange: function(aProgress, aRequest, aURI) { },
	onProgressChange: function(aWebProgress, aRequest, curSelf, maxSelf, curTot, maxTot) { },
	onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) { },
	onSecurityChange: function(aWebProgress, aRequest, aState) { }
}