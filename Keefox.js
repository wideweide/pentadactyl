//Set to false if you don't use mapping,or you can set to other keys
//tryLogin:launch KeePass if not launched,directly login if has only one matched login,else list the matched logins
if(true){group.mappings.add(
	[modes.NORMAL],
	["sl"],
	"Security Login",
	function({count}){
		KeefoxUtil.tryLogin(count || 0)
	},{
		count: true
	}
	
);}


let keefox=keefox_org;

let KeefoxUtil = {

    LaunchToLogin : false,

    IsLaunched : function(){
		return keefox._keeFoxStorage.get("KeePassRPCActive", false);
	},

    //Perhaps there is easier way to get all logins?
    getAllLogins: function () {
            
		var container=[];
                   
        if (keefox._keeFoxStorage.get("KeePassDatabaseOpen", false)) {
            // start with the current root group uniqueID
            try {
                if (!keefox._keeFoxExtension.prefs.getValue("listAllOpenDBs",false))
                {
                    var rootGroup = keefox.KeePassDatabases[keefox.ActiveKeePassDatabaseIndex].root;
                    if (rootGroup != null && rootGroup != undefined && rootGroup.uniqueID)
                    {
                        var dbFileName = keefox.KeePassDatabases[keefox.ActiveKeePassDatabaseIndex].fileName;
                        KeefoxUtil.getOneLoginsMenu(container, rootGroup, dbFileName);
                    }
                } else
                {
                    for (var i=0; i<keefox.KeePassDatabases.length; i++)
                    {
                        var rootGroup = keefox.KeePassDatabases[i].root;
                        if (rootGroup != null && rootGroup != undefined && rootGroup.uniqueID)
                        {
                            var dbFileName = keefox.KeePassDatabases[i].fileName;
                            
                            if (keefox.KeePassDatabases.length > 1)
                            {
                                var dbName = keefox.KeePassDatabases[i].name;
                                
                                var item = new Object();
                                item.label= dbName + ' / ' + rootGroup.title;
                                item.tooltiptext= keefox.locale.$STR("loginsButtonGroup.tip");
                                item.class= "menu-iconic";
                                item.uuid = rootGroup.uniqueID;
                                item.fileName = dbFileName;
                                item.context= "KeeFox-group-context";
                                item.image= "data:image/png;base64,"+rootGroup.iconImageData;
                                container.push(item);
                                
                                KeefoxUtil.getOneLoginsMenu(container,rootGroup, dbFileName);
                            } else
                            {
                                KeefoxUtil.getOneLoginsMenu(container, rootGroup, dbFileName);
                            }
                        }
                    }
                }
            } catch (e) {
                dactyl.echoerr("getAllLogins exception: " + e);
                return;
            }
        } else {
		Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService).showAlertNotification(
			null,"Keefox: not launch", ":private launchKeePass ", true
		); 
        }
        return container;
    },

    // add all the logins and subgroups for one KeePass group
    getOneLoginsMenu: function(container, group, dbFileName)
    {
        var foundGroups = group.childGroups;
        var foundLogins = group.childLightEntries;
        if ((foundGroups == null || foundGroups.length == 0) && (foundLogins == null || foundLogins.length == 0)) {
            return;
        }
        for (var i = 0; i < foundGroups.length; i++) {
            var group = foundGroups[i];

            var item = new Object();
            item.label= group.title;
            item.tooltiptext= keefox.locale.$STR("loginsButtonGroup.tip");
            item.class= "menu-iconic";
            item.uuid = group.uniqueID;
            item.fileName = dbFileName;
            item.context= "KeeFox-group-context";
            item.image= "data:image/png;base64," + group.iconImageData;
			
	    container.push(item);

            KeefoxUtil.getOneLoginsMenu(container,group,dbFileName);

        }

        for (var i = 0; i < foundLogins.length; i++) {
            var login = foundLogins[i];
            var usernameValue = "";
            var usernameName = "";
            var usernameDisplayValue = "[" + keefox.locale.$STR("noUsername.partial-tip") + "]";
            usernameValue = login.usernameValue;
            if (usernameValue != undefined && usernameValue != null && usernameValue != "")
                usernameDisplayValue = usernameValue;
            usernameName = login.usernameName;

            var tempButton = new Object();
            tempButton.label= login.title;
            tempButton.tooltiptext= keefox.locale.$STRF(
                "loginsButtonLogin.tip", [login.uRLs[0], usernameDisplayValue]);

            tempButton.class= "menuitem-iconic";
            tempButton.fileName = dbFileName;
            tempButton.context= "KeeFox-login-context";
            tempButton.image= "data:image/png;base64," + login.iconImageData;
            tempButton.uuid= login.uniqueID;
            tempButton.usernameName= usernameName;
            tempButton.usernameValue= usernameValue;
            tempButton.url= login.uRLs[0];

	    container.push(tempButton);
        }
    },

    getLogins:function(host,completer){
	    function filter(all,host,ac){
			var i=0;
			for each(var item in all) {
				if(item==null || item.url==null || item.url.indexOf(host)<0) continue;
				i++;
				if(completer) ac.push([item.uuid,i+"--"+item.usernameValue+"@"+item.url]);
				else ac.push(item);
			}
		}
		
	    var ac=[];

	    if(host==null) return ac;

	    var all=KeefoxUtil.getAllLogins();
		
		filter(all,host,ac);
		
		if(ac.length>0) return ac;
		
		var strs=host.split(".");
		if(strs.length>3){
			var j=strs.length;
			var sub=strs[j-3]+"."+strs[j-2]+"."+strs[j-1];
			filter(all,sub,ac);		
			if(ac.length>0) return ac;
		}
		
		if(strs.length>2){
			var j=strs.length;
			var sub=strs[j-2]+"."+strs[j-1];
			filter(all,sub,ac);		
			if(ac.length>0) return ac;
		}
		
	    return ac;
    },

    getLogin : function(uuid){
	    for each(var item in KeefoxUtil.getAllLogins()) {
		    if(item.uuid==uuid) return item;
	    }
	    return null;
    },

    login : function(login){	
	keefox_win.ILM.fill(
		login.usernameName,login.usernameValue,login.formActionURL,
		login.usernameId,login.formId,login.uuid,
		buffer.uri.asciiSpec,login.fileName
	);
    },

    //当前页面可用登录
	BufferCompleter: function (context) {
		context.title=["KeePass UUID","User@Domain"];
		context.compare = CompletionContext.Sort.unsorted;
		context.completions=KeefoxUtil.getLogins(buffer.uri.host,true);
		context.filterFunc=function(items){
			var words = context.filter.toLowerCase().split(/\s+/g);
			return [item for each(item in items) if((item.text + " " + item.description).toLowerCase().indexOf(words)>=0)];
		}
	},
	
	//全部登录项
	LoadCompleter: function (context) {
		context.title=["KeePass UUID","User@Domain"];
		context.compare = CompletionContext.Sort.unsorted;
		context.completions=KeefoxUtil.getLogins(context.filter,true);
		context.filterFunc=function(items){
			var words = context.filter.toLowerCase().split(/\s+/g);
			return [item for each(item in items) if((item.text + " " + item.description).toLowerCase().indexOf(words)>=0)];
		}
	},

	//尝试登录
	tryLogin:function(number){
		if(!KeefoxUtil.IsLaunched()){
			Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService).showAlertNotification(
				null,"Keefox: Enter master password to launch KeePass", "Note: wait for a while to login", true
			); 
			CommandExMode().open("private launchKeePass ");
			return;
		}

		var logins=KeefoxUtil.getLogins(buffer.uri.host,false);
		if(logins.length==1){
			var login=logins[0];
			KeefoxUtil.login(login);
			return;
		}

		number=parseInt(number);
		if(number>=1 && number<=logins.length){
			var login=logins[number-1];
			KeefoxUtil.login(login);
			return;
		}

		CommandExMode().open("login ");
	}

}//end of KeefoxUtil


//登录当前页面，根据url匹配记录
group.commands.add(
	['login'],
	'List Keepass logins,chose account to login current page',
	function(args){
		if(args.length==0) {
			dactyl.echomsg("You must select one account to login.");
			return;
		}
		var login=KeefoxUtil.getLogin(args[0]);
		if(login==null) {
			dactyl.echomsg("Use Tab to confirm select one account to login.");
			return;
		}
		KeefoxUtil.login(login);
	},
	{
		bang: true,
		completer: KeefoxUtil.BufferCompleter,
		literal: 0
	},
	true
);


//列出所有登录项，自动打开登录页并登录
group.commands.add(
	['openlogin','olo[gin]'],
	'List Keepass logins,choose item to open the url then login',
	function(args){
		if(args.length==0) {
			dactyl.echomsg("You must select one account to login.");
			return;
		}
		var login=KeefoxUtil.getLogin(args[0]);
		keefox_win.ILM.loadAndAutoSubmit(
			0,false,
			login.usernameName,login.usernameValue,login.url,
			null,null,login.uuid,login.fileName
		);
	},
	{
		bang: true,
		completer: KeefoxUtil.LoadCompleter,
		literal: 0
	},
	true
);

//列出所有登录项，选择记录进行编辑
group.commands.add(
	['editl[ogin]'],
	'List Keepass logins,choose item to edit',
	function(args){
		if(args.length==0) {
			dactyl.echomsg("You must select one account to login.");
			return;
		}
		var login=KeefoxUtil.getLogin(args[0]);
		keefox.launchLoginEditor(login.uuid,login.fileName);
	},
	{
		bang: true,
		completer: KeefoxUtil.LoadCompleter,
		literal: 0
	},
	true
);

group.commands.add(
	['generatePassword','gp'],
	'generate password,copy to clipboard',
	function(){
		keefox.generatePassword();
	}
);

group.commands.add(
	['launchK[eePass]'],
	'Note:use private launchKeepass pwd to protect your pwd',
	function(args){
		if(KeefoxUtil.IsLaunched()){
			dactyl.echomsg('KeePass was launched.');
			return;
		}
		if(args.length==0) keefox.launchKeePass('');
		else keefox.launchKeePass(["-pw:"+args[0]]);

		KeefoxUtil.LaunchToLogin=true;
	}
);


//Try Login Current Page after launch KeePass
//Perhaps there is other way not crack the Keefox?
if(true && keefox.updateKeePassDatabases_org==null){
	keefox.updateKeePassDatabases_org=keefox.updateKeePassDatabases;

	keefox.updateKeePassDatabases=function(newDatabases){
		keefox.updateKeePassDatabases_org(newDatabases);
		if(KeefoxUtil.LaunchToLogin && KeefoxUtil.IsLaunched()) {
			KeefoxUtil.tryLogin();
			KeefoxUtil.LaunchToLogin=false;
		}
	}
}



