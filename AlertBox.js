/*********************************************************************************
 * pentadactyl plugin for extension AlertBox
 *          https://addons.mozilla.org/en-US/firefox/addon/alertbox/
 * 实现命令openunread，可列表显示当前未读链接
 * 拦截dactyl.open，自动标记链接为已读
 * 将未读列表集成到open/tabopen中，无输入时默认打开下一条未读链接:o<Enter>
 * ******************************************************************************/

var service = Cc['@ajitk.com/alertbox/alertbox;1'].getService().wrappedJSObject;
let AlertBoxUtil={
	//读取未读列表
	getUnread : function(){
		var il=[];
		service.Updaters.forEach(function(locator, updater, site) {
			if(updater.isUnread(locator)) il.push([
				site.url,
				(updater.getText(locator,0)+"").substr(0,60)+" - "+locator.name
			]);
		});    
		if(il.length==0) il.push(["about:blank","Congratulations,you have already read all."]);
		return il;
	},

	//将指定url的链接标记为已读
	markRead : function(url){
		var str=url+"";
		if(str=="") return;
		service.Updaters.forEach(function(locator, updater, site) {
			if(site.url.toLowerCase()==str.toLowerCase()){
				if(updater.isUnread(locator)) updater.markRead(locator);
				return;
			}
		}); 
	},

	//获取下一条未读的链接
	getNextUrl : function(){
		var str="";
		var bRun=true;
		//改不成for循环？
		service.Updaters.forEach(function(locator, updater, site) {
			if(bRun && updater.isUnread(locator)){
				str = site.url;
				brun=false;
			}
		}); 
		return str;
	},

	//打开下一条未读链接
	openUrl : function(url){		
		if(url=="") {
			dactyl.echo("AlertBox: No update found");
			Cc["@mozilla.org/alerts-service;1"].getService(Ci.nsIAlertsService).showAlertNotification(
				"chrome://alertbox/skin/icons/bell_32.png",
				"AlertBox: no update found", "远离电脑，珍爱生命...", true
			); 
			return;
		}
		AlertBoxUtil.markRead(url);
		if(dactyl.open_org!=null) dactyl.open_org(url);
	        else dactyl.open(url);
	},

	//未读链接的自动完成器
	completer: function (context) {
		context.title=["AlertBox Unread List","New Content"];
		context.completions=AlertBoxUtil.getUnread();
		context.filterFunc=function(items){
			var words = context.filter.toLowerCase().split(/\s+/g);
			return [item for each(item in items) if((item.text + " " + item.description).toLowerCase().indexOf(words)>=0)];
		}
	}
}


//打开未读链接，未指定时自动读取一条未读记录
group.commands.add(
	['openunread', 'ou[nread]'],
	'open unread site in alertbox',
	function(args){
		var url=(args.length>0) ? args[0] : url=AlertBoxUtil.getNextUrl();
		AlertBoxUtil.openUrl(url);
	},
	{
		bang: true,
		completer: AlertBoxUtil.completer,
		literal: 0
	},
	true
);


//拦截调用，开启此项可将通过dactyl打开的链接自动标记为已读
//检查是否为null避免重复注册
if(true && dactyl.open_org==null){
	dactyl.open_org = dactyl.open;
	dactyl.open = function open(urls, params = {}, force = false) {
		if(urls=="about:blank"){
			var next=AlertBoxUtil.getNextUrl();
			if(next!="") urls=next;
		}
		AlertBoxUtil.markRead(dactyl.parseURLs(urls)[0]);
		dactyl.open_org(urls,params,force);
	}
}

//拦截调用，开启此项可将未读链接显示在open/tabopen列表选项的首位,否则只能通过命令openunread来处理
if(true){
	completion.addUrlCompleter("AlertBox","Unread List",AlertBoxUtil.completer);
	var array=[];
	array.push("AlertBox");
	options["complete"].forEach(function(item){
		if(item!="AlertBox") array.push(item);
	})
	options["complete"]=array;
}

