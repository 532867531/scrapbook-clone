/**************************************************
// captureURL.js
// Implementation file for captureURL.xul
// 
// Description: 
// Author: Gomita
// Contributors: 
// 
// Version: 
// License: see LICENSE.txt
**************************************************/


//////////////////////////////////////////////////
// global parameters
//////////////////////////////////////////////////

var SBstring;
var SBstatus;
var SBURL;


//////////////////////////////////////////////////
// functions
//////////////////////////////////////////////////

function SB_initURL()
{
	// XUL
	SBstring = document.getElementById("ScrapBookString");
	SBstatus = document.getElementById("ScrapBookStatus");
	SBURL    = document.getElementById("ScrapBookCaptureURLTextbox");
	// OK�{�^���̃��x����ݒ�
	document.documentElement.getButton("accept").label = SBstring.getString("CAPTURE_OK_BUTTON");
	document.documentElement.getButton("accept").accesskey = "C";
	// �t�H�[�J�X
	SBURL.focus();
	// �N���b�v�{�[�h����URL�擾
	setTimeout(SB_pasteClipboardURL, 0);
	// �t�H���_���X�g������
	setTimeout(SB_initFolderWithDelay, 100);
}


function SB_acceptURL()
{
	// URL�̔z��𐶐�
	var URLs = [];
	var lines = SBURL.value.split("\n");
	for ( var i = 0; i < lines.length; i++ )
	{
		if ( lines[i].length < 3 ) continue;
///		if ( !lines[i].match(/^(http|https|file):\/\//i) ) lines[i] = "http://" + lines[i];	// add default HTTP protocol
		URLs.push(lines[i]);
	}
	if ( URLs.length < 1 ) return;
	// �^�[�Q�b�g�̃R���e�i���\�[�X��
	var tarResName = SBarguments.resName ? SBarguments.resName : "urn:scrapbook:root";
	// browser.xul����openDialog
	if ( !SB_ensureWindowOpener() ) return;
	window.opener.openDialog(
		"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
		URLs, "", false, false, tarResName, 0, false
	);
}


function SB_ensureWindowOpener()
{
	// window.opener�̊m�F�ibrowser.xul����openDialog����Ȃ���΂Ȃ�Ȃ��j
	var flag = false;
	try {
		if ( window.opener.location.href != "chrome://browser/content/browser.xul" ) flag = true;
	} catch(ex) {
		flag = true;
	}
	if ( flag ) { alert("ScrapBook ERROR: can't specify window.opener"); return false; }
	return true;
}



//////////////////////////////////////////////////
// functions for URL Detector
//////////////////////////////////////////////////

function SB_clearURL()
{
	SBURL.value = "";
}


function SB_pasteClipboardURL()
{
	try {
		var myClip  = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
		var myTrans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
		myTrans.addDataFlavor("text/unicode");
		myClip.getData(myTrans, myClip.kGlobalClipboard);
		// �f�[�^���擾
		var str = new Object();
		var len = new Object();
		myTrans.getTransferData("text/unicode", str, len);
		// ������֕ϊ�
		if ( str ) {
			str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
			if ( str.toString().match(/^(http|https|file):\/\//) ) SBURL.value = str + "\n";
		}
	} catch(ex) {	// quiet warning
	}
}


function SB_detectURLTabs()
{
	SB_clearURL();
	var nodeList = window.opener.gBrowser.mTabContainer.childNodes;
	for ( var i = 0; i < nodeList.length; i++ )
	{
		SBURL.value += window.opener.gBrowser.getBrowserForTab(nodeList[i]).contentDocument.location + "\n";
	}
}


var SBlocalURLDetector = {

	index : 0,

	init : function()
	{
		this.index = 0;
		// �t�@�C���s�b�J�[
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, "", FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			SB_clearURL();
			this.inspectDirectory(FP.file, 0);
		}
	},

	inspectDirectory : function(aDir, curIdx)
	{
		SBstatus.value = SBstring.getString("SCANNING") + " (" + curIdx + "/" + this.index + ")... " + aDir.path;
		// �f�B���N�g������S�t�@�C�����擾
		var aEntries = aDir.directoryEntries;
		while ( aEntries.hasMoreElements() )
		{
			var aEntry = aEntries.getNext().QueryInterface(Components.interfaces.nsILocalFile);
			///alert(aEntry.leafName);
			if ( aEntry.isDirectory() ) {
				// �T�u�f�B���N�g�����ċA�I�Ɍ���
				this.inspectDirectoryWithDelay(aEntry, ++this.index);
			} else {
				// �t�@�C�����Ƀ}�b�`���O
				if ( aEntry.leafName.match(/\.(html|htm)$/i) ) SBURL.value += SBcommon.convertFilePathToURL(aEntry.path) + "\n";
			}
		}
		if ( curIdx == this.index ) SBstatus.value = "";	// ����
	},

	inspectDirectoryWithDelay : function(aDir, aIndex)
	{
///		dump(aIndex + " " + aDir.leafName + "\n");
		setTimeout(function(){ SBlocalURLDetector.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
	},

};


var SBweboxURLDetector = {

	index : 0,
	baseURL : "",

	init : function()
	{
		this.index = 0;
		this.baseURL = "";
		// �t�@�C���s�b�J�[
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
		FP.init(window, "Select default.html for WeBoX.", FP.modeOpen);
		FP.appendFilters(FP.filterHTML);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			SB_clearURL();
			this.baseURL = FP.file.parent.path + '\\Data\\';
			var lines = SBcommon.readFile(FP.file).split("\n");
			for ( this.index = 0; this.index < lines.length; this.index++ )
			{
				this.inspectWithDelay(lines[this.index], this.index);
			}
		}
	},

	inspect : function(aLine, curIdx)
	{
		SBstatus.value = SBstring.getString("SCANNING") + "... (" + curIdx + "/" + (this.index-1) + ")";
		if ( aLine.match(/ LOCALFILE\=\"([^\"]+)\" /) )
		{
			SBURL.value += SBcommon.convertFilePathToURL(this.baseURL + RegExp.$1) + "\n";
		}
		if ( curIdx == (this.index-1) ) SBstatus.value = "";	// ����
	},

	inspectWithDelay : function(aLine, curIdx)
	{
		setTimeout(function(){ SBweboxURLDetector.inspect(aLine, curIdx); }, 50 * curIdx);
	},

};


