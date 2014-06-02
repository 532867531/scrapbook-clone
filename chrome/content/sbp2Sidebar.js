
var sbp2Sidebar = {

	init : function()
	{
		//wird beim �ffnen der Sidebar aufgerufen oder beim Wechseln des Scrapbooks
		//
		//Ablauf:
		//1. SBP2-Verzeichnis im Profilordner anlegen, falls erforderlich
		//2. SBP2-Daten-Verzeichnis im Profilordner anlegen, falls erforderlich
		//3. SBP2-Grundeinstellungen setzen
		//5. SBP2-Datenquelle laden
		//6. Interpr�tation von resource://scrapbook erm�glichen
		//9. Verkn�pfen der Datenquelle mit dem Tree in der Sidebar
		//10. Verkn�pfen der Tag-Datenquelle mit dem Tree in der Sidebar
		//11. Suchfunktion initialisieren

		this.showTitle();
		//1. SBP2-Verzeichnis im Profilordner anlegen, falls erforderlich
		var iProfilVZ = sbp2Common.PVZ.get("ProfD", Components.interfaces.nsIFile);
		iProfilVZ.append("ScrapBookPlus2");
		if ( !iProfilVZ.exists() )
		{
			//Das Verzeichnis 'ScrapBookPlus2' muss angelegt werden
			iProfilVZ.create(iProfilVZ.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		//2. SBP2-Daten-Verzeichnis im Profilordner anlegen, falls erforderlich
		iProfilVZ.append("data");
		if ( !iProfilVZ.exists() )
		{
			//Das Verzeichnis 'data' muss angelegt werden
			iProfilVZ.create(iProfilVZ.DIRECTORY_TYPE, parseInt("0700", 8));
		}
		//3. SBP2-Grundeinstellungen setzen
		var iDataFolder = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.path");
		if ( iDataFolder == null )
		{
			sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.path", "");
		}
		var iTitle = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.title");
		if ( iTitle == null )
		{
			sbp2Prefs.setUnicharPref("extensions.scrapbookplus2.data.title", document.getElementById("sbp2CommonString").getString("PROFILEFOLDER"));
		}
		//5. SBP2-Datenquellen laden
		sbp2DataSource.init();
		sbp2DataSource.initSearchCacheUpdate();
		sbp2DataSource.initTag();
		//6. Interpr�tation von resource://scrapbook erm�glichen
		var iDir = sbp2DataSource.dbData.URI;
		var ssPos = iDir.lastIndexOf("/");
		iDir = iDir.substring(0, ++ssPos);
		var iRPH = sbp2Common.IO.getProtocolHandler("resource").QueryInterface(Components.interfaces.nsIResProtocolHandler);
		if ( iRPH.hasSubstitution("scrapbook") ) {
			if ( iRPH.getSubstitution("scrapbook").spec != iDir ) {
				var iURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
				iURL.spec = iDir;
				iRPH.setSubstitution("scrapbook", iURL);
			}
		} else {
			var iURL = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
			iURL.spec = iDir;
			iRPH.setSubstitution("scrapbook", iURL);
		}
		//9. Verkn�pfen der Datenquelle mit dem Tree in der Sidebar
		var iTree = document.getElementById("sbp2Tree");
		iTree.database.AddDataSource(sbp2DataSource.dbData);
			//Der rebuild() ist notwendig, da sonst immer noch nichts angezeigt wird!
		iTree.builder.rebuild();
			//Der observer ist notwendig, damit die Eintr�ge verschoben werden k�nnen
		iTree.builderView.addObserver(sbp2SDragAndDropObserver.ddTreeBuilderObserver);
		//10. Verkn�pfen der Tag-Datenquelle mit dem Tree in der Sidebar
		iTree = document.getElementById("sbp2TreeTag");
		iTree.database.AddDataSource(sbp2DataSource.dbDataTag);
			//Der rebuild() ist notwendig, da sonst immer noch nichts angezeigt wird!
		iTree.builder.rebuild();
		//11. Suchfunktion initialisieren
		sbp2Search.init();
	},

	showTitle : function()
	{
		//Zeigt die Bezeichnung des ge�ffneten Archivs im Titel der Sidebar an
		var stWin = "sbp2Overlay" in window.top ? window.top : window.opener.top;
		var stTitle = sbp2Prefs.getUnicharPref("extensions.scrapbookplus2.data.title", "");
		stWin.document.getElementById("sidebar-title").value = "ScrapBook Plus 2 ["+stTitle+"]"
	},

}