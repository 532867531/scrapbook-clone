
var sbMultiBookService = {

    file: null,

    showSidebarTitle: function() {
        var sidebarTitleId = sbCommonUtils.getSidebarId("sidebar-title");
        var elem = window.top.document.getElementById(sidebarTitleId);
        if (!elem) return;
        var dataPath = sbCommonUtils.getPref("data.path", "");
        var dataTitle = sbCommonUtils.getPref("data.title", "");
        elem.value = "ScrapBook X" + ((dataPath && dataTitle) ? " [" + dataTitle + "]" : "");
    },

    initMenu: function() {
        var dataPath = sbCommonUtils.getPref("data.path", "");
        var popup = document.getElementById("mbMenuPopup");
        if (!this.file) {
            var child;
            while ((child = popup.firstChild) && !child.id) {
                popup.removeChild(child);
            }
            var items = this.initFile();
            for (var i = items.length - 1; i >= 0; i--) {
                var elem = document.createElement("menuitem");
                elem.setAttribute("type", "radio");
                elem.setAttribute("autocheck", false);
                elem.setAttribute("label", items[i][0]);
                elem.setAttribute("path",  items[i][1]);
                popup.insertBefore(elem, popup.firstChild);
            }
        }
        if (!dataPath) {
            document.getElementById("mbMenuItemDefault").setAttribute("checked", true);
        } else {
            // if we don't remove the check explicitly,
            // the main sidebar could get both the default one and the picked one selected
            // when we set this to a non-default one in the "Manage" dialog
            document.getElementById("mbMenuItemDefault").setAttribute("checked", false);
            var nodes = popup.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].getAttribute("path") == dataPath) {
                    nodes[i].setAttribute("checked", true);
                    break;
                }
            }
        }
    },

    initFile: function() {
        this.file = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile).clone();
        this.file.append("ScrapBook");
        this.file.append("multibook.txt");
        if (!this.file.exists()) {
            this.file.create(this.file.NORMAL_FILE_TYPE, 0666);
            var path = sbCommonUtils.getPref("data.path", "");
            if (path)
                sbCommonUtils.writeFile(this.file, "My ScrapBook\t" + path + "\n", "UTF-8");
        }
        var ret = [];
        var lines = sbCommonUtils.readFile(this.file, "UTF-8").split("\n");
        for (var i = 0; i < lines.length; i++) {
            var item = lines[i].replace(/\r|\n/g, "").split("\t");
            if (item.length == 2)
                ret.push(item);
        }
        return ret;
    },

    change: function(aItem) {
        if (!this.validateRefresh()) return;
        // output tree requires correct pref and datasource,
        // we have to exec it before changing them
        sbDataSource.outputTreeAuto(window);
        aItem.setAttribute("checked", true);
        sbCommonUtils.setPref("data.path", aItem.getAttribute("path"));
        sbCommonUtils.setPref("data.title", aItem.label);
        sbDataSource.checkRefresh();
    },


    validateRefresh: function(aQuietWarning) {
        var winEnum = sbCommonUtils.WINDOW.getEnumerator("scrapbook");
        while (winEnum.hasMoreElements()) {
            var win = winEnum.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
            if (win != window) {
                if (!aQuietWarning)
                    alert(sbCommonUtils.lang("MB_CLOSE_WINDOW", win.document.title));
                return false;
            }
        }
        return true;
    },

    config: function() {
        window.openDialog(
            "chrome://scrapbook/content/mbManage.xul", "ScrapBook:mbManage",
            "chrome,centerscreen,modal,resizable"
        );
    },

};


