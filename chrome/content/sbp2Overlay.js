/*
	Dieses Skript darf nur in sbp2Overlay.xul eingebunden werden, da in anderen Fenstern immer wieder die init-Funktion
	aufgerufen w�rde und dabei gBrowser nicht verf�gbar ist. In der Fehlerkonsole w�rde dies mit einer Meldung quittiert.
*/

var sbp2Overlay = {

	handleEvent : function(heEvent)
	{
		//Dient zur Steuerung der angezeigten Men�eintr�ge im Kontextmen� des Browsers. Die Funktion muss "handleEvent" hei�en,
		//da Sie 
		//
		//Ablauf:
		//1. Nur ausf�hren, wenn das Kontextmen�eintr�ge angezeigt werden soll
		//1a. Initialisierung
		//1b. Funktion verlassen, falls es sich nicht um das Kontextmen� eines Browser-Elements handelt.
		//1c. Zwischenspeichern von verschiedenen Stati zur sp�teren Verarbeitung
		//1d. Ein-/Ausblenden der Eintr�ge von ScrapBookPlus2 im Kontextmen�

		//1. Nur ausf�hren, wenn das Kontextmen�eintr�ge angezeigt werden soll
		if (heEvent.type == "popupshowing") {
			//1a. Initialisierung
			var heSelected;
			var heLink;
			var heFrame;
			//1b. Funktion verlassen, falls es sich nicht um das Kontextmen� eines Browser-Elements handelt.
			if (heEvent.originalTarget.id != "contentAreaContextMenu") { return; }
			//1c. Zwischenspeichern von verschiedenen Stati zur sp�teren Verarbeitung
			heSelected		= gContextMenu.isTextSelected;
			heLink			= gContextMenu.onLink && !gContextMenu.onMailtoLink;
			heFrame			= gContextMenu.inFrame;
			var heIsActive	= heSelected || heLink;
			var heElement	= function(heID) { return document.getElementById(heID); };
			//1d. Ein-/Ausblenden der Eintr�ge von ScrapBook Plus im Kontextmen�
			heElement("sbp2ContextMenu1").hidden = !heSelected;							//Auswahl archivieren
			heElement("sbp2ContextMenu2").hidden = !heSelected;							//Auswahl archivieren als...
			heElement("sbp2ContextMenu3").hidden = heLink || heSelected;				//Seite archivieren
			heElement("sbp2ContextMenu4").hidden = heLink || heSelected;				//Seite archivieren als...
			heElement("sbp2ContextMenu5").hidden = heLink || !heFrame;					//Frame archivieren
			heElement("sbp2ContextMenu6").hidden = heLink || !heFrame;					//Frame archivieren als...
			heElement("sbp2ContextMenu7").hidden = !heLink;								//Link archivieren
			heElement("sbp2ContextMenu8").hidden = !heLink;								//Link archivieren als...
			heElement("sbp2ContextMenu10").hidden = heLink || heSelected;				//Lesezeichen
			heElement("sbp2ContextMenu11").hidden = heLink || !heFrame;					//Lesezeichen f�r Frame
			heElement("sbp2ContextMenu12").hidden = !heLink || heSelected;				//Lesezeichen f�r Link
			heElement("sbp2ContextMenu13").hidden = heLink || heSelected || !heFrame;	//Screengrab Frame
			heElement("sbp2ContextMenu14").hidden = heLink || heSelected || heFrame;	//Screengrab Page
			//"Link zu Projekt hinzuf�gen" nur dann einblenden, wenn es Sinn macht
//			if ( heLink ) {
//				var heBool = false;
//				var heNode = gContextMenu.target;
//				while ( heNode.nodeName.toUpperCase() != "A" )
//				{
//					heNode = heNode.parentNode;
//				}
//				var heURL = window.content.location.href.match(this.sboRegExp);
//				if ( !heURL ) {
//					//angezeigte Seite ist nicht Bestandteil eines Eintrags, daher Eintrag ausblenden
//					heBool = true;
//				} else if ( heNode.href.match(this.sboRegExp) ) {
//					//Link geh�rt schon eines Eintrags an, daher Eintrag ausblenden
//					heBool = true;
//				}
//				heElement("sbp2ContextMenu9").hidden = heBool;
//			} else {
//				heElement("sbp2ContextMenu9").hidden = true;
//			}
//Zeile ersetzt momentan den Code f�r die 19 Zeilen dar�ber
heElement("sbp2ContextMenu9").hidden = true;
		}
	},

	init : function()
	{
		//1. Erm�glicht das Ein- und Ausblenden von Eintr�gen im Kontextmen� (handleEvent);
		if ( document.getElementById("contentAreaContextMenu") ) {
			document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", this, false);
		} else {
			alert("sbp2Overlay.init\n---\nError. Contact the developer.");
		}
		//2. Inhalt der RDF-Datei verf�gbar machen
		this.refresh();
		//3. Tastenk�rzel zuordnen
		var iElements = [document.getElementById("key_opensbp2Sidebar"),document.getElementById("key_sbp2SiteCapture"),document.getElementById("key_sbp2SiteCaptureAs"),document.getElementById("key_sbp2SiteBookmark"),document.getElementById("key_sbp2TabsCapture")];
		var iPrefs = ["extensions.scrapbookplus2.key.a.","extensions.scrapbookplus2.key.b.","extensions.scrapbookplus2.key.c.","extensions.scrapbookplus2.key.d.","extensions.scrapbookplus2.key.e."];
		for ( var iI=0; iI<5; iI++ )
		{
			iElements[iI].setAttribute("modifiers",	sbp2Prefs.getUnicharPref(iPrefs[iI]+(1), ""));
			iElements[iI].setAttribute("key",		sbp2Prefs.getUnicharPref(iPrefs[iI]+(2), ""));
		}
	},

	refresh : function()
	{
		//Wird bei der Initialisierung aufgerufen und beim Wechsel der Datenbank. Ohne diesen Schritt w�rden
		//Seiten, die �ber das Kontextmen� gespeichert werden, in die falsche Datenbank geschrieben
		sbp2DataSource.init();
		sbp2DataSource.initSearchCacheUpdate();
//		sbp2DataSource.initCrosslinkUpdate();
//		var rTemp = sbp2Common.getBuchVZ().path;
//		rTemp = rTemp.replace(/\\/g, "\\/");
//		rTemp = "file:\\/\\/\\/"+rTemp+"\\/data";
//		rTemp += "\\/\\\d\{14\}\\/";
//		this.sboRegExp = new RegExp(rTemp, "");
	},

};

window.addEventListener("load", function(){ sbp2Overlay.init(); }, false);