/*********************************************************************************
 * pentadactyl plugin for extension AlertBox
 *          https://addons.mozilla.org/en-US/firefox/addon/alertbox/
 * :openunread，command to list unread list
 * Intercept dactyl.open，auto mark unread to read
 * add completer to open/tabopen，if no input,will open first unread link:o<Enter>
 * ******************************************************************************/
var Service = Components.classes['@ajitk.com/alertbox/alertbox;1'].getService().wrappedJSObject;

//global UnRead list
let UnReadList=[];

//get unread list,will be called in 
// init
// when unread items changes
function FindUnReadList(){
	Service.store.SieveStore.find({
	  state: 40,  /* C.STATE_READY, */
	  'ts_view.lt': { name: 'ts_data', type: 'field' }
	}, {
	  only: ['id','uri','name', 'text', 'ts_data'],
	}, function(err, result) {
		UnReadList=result.data;		
	});
}

// Run At init
FindUnReadList();

// Number of unread items changes. Update global list.
Service.service.state.on('change:unread', function() {
	FindUnReadList();
});

let AlertBoxUtil={
	//get and return unread list
	getUnread : function(){	
		var il=[];
    	for each(item in UnReadList)
			il.push([item.uri,item.text.substr(0,60) + " - " + item.name]);		
		return il;
	},

	//mark url's item to readed
	markRead : function(url){
		Service.notify.Popup.hide();
		var id="";
		for each(item in UnReadList){
			if(item.uri==url){
				id=item.id;
				break;
			}
		}
		if(id && id.length>0){
			Service.store.SieveStore.update(
				id, 
				{ ts_view: Date.now() }
				//function(){FindUnReadList();}
			);
		}
	},

	//get next unread url
	getNextUrl : function(){
		return UnReadList && UnReadList.length > 0 
			? UnReadList[0].uri 
			: "";
	},

	//open given url,mark it as readed
	openUrl : function(url){		
		if(url=="") {
			Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService).showAlertNotification(
				"chrome://alertbox/skin/icons/bell_32.png",
				"AlertBox: no update found", "Away from the computer, cherish life...", true
			); 
			return;
		}
	
		AlertBoxUtil.markRead(url);

		if(dactyl.open_org!=null) dactyl.open_org(url);
	        else dactyl.open(url);
	},

	//completer for open/tabopen
	completer: function (context) {
		context.title=["AlertBox Unread List","New Content"];
		context.completions=AlertBoxUtil.getUnread();
		context.filterFunc=function(items){
			var words = context.filter.toLowerCase().split(/\s+/g);
			return [item for each(item in items) if((item.text + " " + item.description).toLowerCase().indexOf(words)>=0)];
		}
	}
}


//add command:open unread item,use first item if no input
group.commands.add(
	['openunread', 'ou[nread]'],
	'open unread site in alertbox',
	function(args){
		var url=(args && args.length>0) ? args[0] : url=AlertBoxUtil.getNextUrl();
		AlertBoxUtil.openUrl(url);
	},
	{
		bang: true,
		completer: AlertBoxUtil.completer,
		literal: 0
	},
	true
);


group.commands.add(
	['findunread'],
	'Find unread site in alertbox',
	function(){
		FindUnReadList();
	}
);



//add unread list to open/tabopen's completer
if(true){
	completion.addUrlCompleter("AlertBox","Unread List",AlertBoxUtil.completer);
	var array=[];
	array.push("AlertBox");
	options["complete"].forEach(function(item){
		if(item!="AlertBox") array.push(item);
	})
	options["complete"]=array;
}

//Intecept dactyl.open to mark unread to read
//check null to avoid repeat intecept
if(true && dactyl.open_org==null){
	dactyl.open_org = dactyl.open;
	dactyl.open = function open(urls, params = {}, force = false) {
		if(urls=="about:blank"){
			var next=AlertBoxUtil.getNextUrl();
			if(next && next.length>0) urls=next;
		}

		AlertBoxUtil.markRead(dactyl.parseURLs(urls)[0]);
		dactyl.open_org(urls,params,force);
		setTimeout(FindUnReadList,2000);
	}
}

