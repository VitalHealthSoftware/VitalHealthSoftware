/**
 * editor_plugin_src.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */
 
//custom popup class
function TinyMCEPopup(id, title, width, height, url)
{
	this.constructor(id, title, width, height, url);
}

TinyMCEPopup.prototype = new Windowframe();
TinyMCEPopup.base = Windowframe.prototype;
TinyMCEPopup.prototype.url;
TinyMCEPopup.prototype.height;
TinyMCEPopup.prototype.id;
TinyMCEPopup.prototype.constructor = function TinyMCEPopup_prototype_constructor(id, title, width, height, url)
{
	//create window frame
	var dom = Petrel.Templater.getTemplate("windowframe");
	
	var windowframeArgs = {
		title: title,
		width: width + 10,
		height: height + 15,
		acceptWindowKeyDown: true,
		className: "iframepopup popup"
	};
	
	TinyMCEPopup.base.constructor.call(this, dom, windowframeArgs);
	
	this.height = height;
	this.url    = url;
	this.id     = id;
}

TinyMCEPopup.prototype.createContent = function TinyMCEPopup_prototype_createContent()
{
	//remove loading div
	var emptyDiv = getFirstElement(this.content);
	memLeakCheck(emptyDiv);
	removeNode(emptyDiv);
	
	//create content iframe
	var iframe = document.createElement('iframe');
	iframe.setAttribute('id', this.id + '_iframe');
	iframe.setAttribute('width', '100%');
	iframe.setAttribute('height', "98%");
	iframe.setAttribute('scrolling', 'no');
	iframe.setAttribute('frameBorder', '0');
	iframe.setAttribute('src', this.url);
	
	//add frame and show window
	this.content.appendChild(iframe);
	this.show();
}

function createTinyMCEPopup(id, title, width, height, url)
{
	return new TinyMCEPopup(id, title, width, height, url);
}

//window manager implementation
(function()
{
	var DOM = tinymce.DOM, Element = tinymce.dom.Element, Event = tinymce.dom.Event, each = tinymce.each, is = tinymce.is;

	tinymce.create('tinymce.plugins.InlinePopups', {
		init : function(ed, url)
		{
			//replace window manager
			ed.onBeforeRenderUI.add(function() {
				ed.windowManager = new tinymce.InlineWindowManager(ed);
				
				//DOM.loadCSS(url + '/skins/' + (ed.settings.inlinepopups_skin || 'clearlooks2') + "/window.css");
			});
		},

		getInfo : function()
		{
			return {
				longname : 'VitalHealth Inline Popups plugin',
				author : 'VitalHealth Software',
				authorurl : 'http://vitalhealthsoftware.com',
				infourl : 'http://wiki/wiki/default.aspx/PetrelEN/Richtext%20field.html',
				version : "1.0"
			};
		}
	});

	tinymce.create('tinymce.InlineWindowManager:tinymce.WindowManager', {
		InlineWindowManager : function(ed)
		{
			var t = this;

			t.parent(ed);
			t.zIndex = 300000;
			t.count = 0;
			t.windows = {};
		},

		open : function(f, p)
		{
			var t = this, id, opt = '', ed = t.editor, dw = 0, dh = 0, vp, po, mdf, clf, we, w, u;

			f = f || {};
			p = p || {};
			
			//run native windows
			if (!f.inline)
				return t.parent(f, p);

			//only store selection if the type is a normal window
			if (!f.type)
				t.bookmark = ed.selection.getBookmark(1);

			id = DOM.uniqueId();
			vp = DOM.getViewPort();
			
			//set features
			f.width = parseInt(f.width || 320);
			f.height = parseInt(f.height || 240) + (tinymce.isIE ? 8 : 0);
			f.min_width = parseInt(f.min_width || 150);
			f.min_height = parseInt(f.min_height || 100);
			f.max_width = parseInt(f.max_width || 2000);
			f.max_height = parseInt(f.max_height || 2000);
			f.left = f.left || Math.round(Math.max(vp.x, vp.x + (vp.w / 2.0) - (f.width / 2.0)));
			f.top = f.top || Math.round(Math.max(vp.y, vp.y + (vp.h / 2.0) - (f.height / 2.0)));
			f.movable = f.resizable = true;
			
			//set params
			p.mce_width = f.width;
			p.mce_height = f.height;
			p.mce_inline = true;
			p.mce_window_id = id;
			p.mce_auto_focus = f.auto_focus;
			
			Log.debug("f", f); //features
			Log.debug("p", p); //params
			
			//dispatch event
			t.features = f;
			t.params = p;
			t.onOpen.dispatch(t, f, p);
			
			//check window type
			if (f.type == "confirm")
			{
				var dom = Petrel.Templater.getTemplate("windowframe");
				
				var finishHandler = function(args, button) { f.button_func(button.value == 'ok'); };
				
				var message = new MessageWindow(dom, f.content, okcancel, null, "", "question", finishHandler, null);
			}
			else if (f.type == "alert")
			{
				var dom = Petrel.Templater.getTemplate("windowframe");
				
				var finishHandler = function(args, button) { f.button_func(button.value == 'ok'); };
				
				var message = new MessageWindow(dom, f.content, ok, null, "", "warning", finishHandler, null, { });
			}
			else
			{
				//create popup
				var popup = createTinyMCEPopup(id, f.title, f.width, f.height, f.url || f.file);
				
				popup.createContent();
				
				//add window
				w = t.windows[id] = {
					id: id,
					popup: popup,
					//mousedown_func : mdf,
					//click_func : clf,
					//element : new Element(id, {blocker : 1, container : ed.getContainer()}),
					iframeElement: new Element(id + '_iframe'),
					features: f,
					width: f.width,
					height: f.height
				};

				//focus window on focus of iframe
				w.iframeElement.on('focus', function() {
					t.focus(id);
				});
				
				return w;
			}
		},
		
		focus : function(id)
		{
			var t = this, w;

			if (w = t.windows[id]) {
				w.popup.setFocus();
			}
		},
		
		resizeBy : function(dw, dh, id)
		{
			var w = this.windows[id];

			if (w) {
				w.width  += dw;
				w.height += dh;
				
				//w.popup.resize(w.width, w.height);
			}
		},

		close : function(win, id)
		{
			var t = this, w, d = DOM.doc, ix = 0, fw, id;

			id = t._findId(id || win);

			//probably not inline
			if (!t.windows[id]) {
				t.parent(win);
				return;
			}

			if (w = t.windows[id]) {
				w.popup.close(null, null);
				
				t.onClose.dispatch(t);
			}
		},
		
		setTitle : function(w, ti)
		{
			var e, t = this;

			var w = t._findId(w);
			
			if (w) {
				t.windows[w].popup.setTitle(ti);
			}
		},

		//shows an alert message
		alert : function(txt, cb, s)
		{
			var t = this, w;

			w = t.open({
				title : t,
				type : 'alert',
				button_func : function(s) {
					if (cb)
						cb.call(s || t, s);

					//t.close(null, w.id);
				},
				content : DOM.encode(t.editor.getLang(txt, txt)),
				inline : 1,
				width : 400,
				height : 130
			});
		},

		//opens a confirm window
		confirm : function(txt, cb, s)
		{
			var t = this, w;

			w = t.open({
				title : t,
				type : 'confirm',
				button_func : function(s) {
					if (cb)
						cb.call(s || t, s);

					//t.close(null, w.id);
				},
				content : DOM.encode(t.editor.getLang(txt, txt)),
				inline : 1,
				width : 400,
				height : 130
			});
		},

		//finds a window by string or window element
		_findId : function(w)
		{
			var t = this;

			if (typeof(w) == 'string')
				return w;

			each(t.windows, function(wo) {
				var ifr = DOM.get(wo.id + '_iframe');

				if (ifr && w == ifr.contentWindow) {
					w = wo.id;
					
					return false;
				}
			});

			return w;
		}
	});

	//register plugin
	tinymce.PluginManager.add('inlinepopups', tinymce.plugins.InlinePopups);
})();

