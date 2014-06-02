/*
	Dieses Skript stellt Funktionen zur Nutzung des preferences-service bereit.
*/

var sbp2Prefs = {

	get PREF()		{ return Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch); },

	getBoolPref : function(gbpPrefName, gbpDefVal)
	{
		//Liefert den aktuellen Wert f�r gboPrefName zur�ck.

		try
		{
			return this.PREF.getBoolPref(gbpPrefName);
		} catch(gbpEx)
		{
			return gbpDefVal != undefined ? gbpDefVal : null;
		}
	},

	setBoolPref : function(sbpPrefName, sbpValue)
	{
		//�ndert den Wert f�r sbpPrefName.
		//
		//Ablauf:
		//1. Wert �ndern
		//2. �nderung speichern

		try
		{
			//1. Wert �ndern
			this.PREF.setBoolPref(sbpPrefName, sbpValue);
			//2. �nderung speichern
			var supPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			supPrefService.savePrefFile(null);
		} catch(sbpEx)
		{
			alert("sbp2Prefs.setBoolPref\n---\n"+sbpEx);
		}
	},

	getIntPref : function(gipPrefName)
	{
		//Liefert den aktuellen Wert f�r gipPrefName zur�ck.
		try
		{
			return this.PREF.getIntPref(gipPrefName);
		} catch (gupEx)
		{
			return -1;
		}
	},

	getUnicharPref : function(gupPrefName, gupDefVal)
	{
		//Liefert den aktuellen Wert f�r gupPrefName zur�ck.

		try
		{
			return this.PREF.getComplexValue(gupPrefName, Components.interfaces.nsISupportsString).data;
		} catch (gupEx)
		{
			return gupDefVal != undefined ? gupDefVal : null;
		}
	},

	setUnicharPref : function(supPrefName, supPrefValue)
	{
		//�ndert den Wert f�r supPrefName.
		//
		//Ablauf:
		//1. Wert �ndern
		//2. �nderung speichern

		try
		{
			//1. Wert �ndern
			var supString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
			supString.data = supPrefValue;
			this.PREF.setComplexValue(supPrefName, Components.interfaces.nsISupportsString, supString);
			//2. �nderung speichern
			var supPrefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			supPrefService.savePrefFile(null);
		} catch(supEx)
		{
			alert("sbp2Prefs.setUnicharPref\n---\n"+supEx);
		}
	},
}