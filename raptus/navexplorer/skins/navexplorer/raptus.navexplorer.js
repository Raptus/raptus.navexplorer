raptus_navexplorer = {

    // Default configuration
    settings : { refreshtime: 5000,
                 observetime: 33,
                 manual_expires: 300,
                 standaloneWindow: 'width=800,height=1000,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=yes',
                 theme: { theme : 'apple',
                          dots : false,
                          icons : true}
                },

    elements : { navexplorer_content: undefined,
                 navexplorer_info: undefined,
                 navexplorer_info_wrap: undefined,
                 navexplorer_info_error: undefined,
                 navexplorer_tree: undefined,
                },

    init: function($){
        
        // Fill elements
        raptus_navexplorer.elements.navexplorer_content = $('#navexplorer_content');
        raptus_navexplorer.elements.navexplorer_info = $('#navexplorer_info');
        raptus_navexplorer.elements.navexplorer_info_wrap = $('#navexplorer_info_wrap');
        raptus_navexplorer.elements.navexplorer_info_error = $('#navexplorer_info_error');
        raptus_navexplorer.elements.navexplorer_tree = $('#navexplorer_tree');


        // jstree
        $.jstree._themes = 'navexplorer_tree_themes/';
        
        var inst = raptus_navexplorer.treeinst = raptus_navexplorer.elements.navexplorer_tree;
        inst.jstree({
            json_data: {
                progressive_unload : true,
                ajax: {
                    url: portal_url + '/navexplorer_ajax',
                    async_data: function () { return { "ts": new Date().getTime()} },
                    cache: false,
                    data: function(n){
                        return {
                            path: n.data ? n.data('path') : '',
                        };
                    }
                }
            },
            
            themes: raptus_navexplorer.settings.theme,
            
            ui: { select_limit : -1,
                  select_multiple_modifier: 'alt'},
            
            contextmenu: {items: raptus_navexplorer.customContextMenu },
            
            hotkeys: { 'del': false,
                       'f2': false,
                       'return': function(){ var o = this.data.ui.hovered || this.data.ui.last_selected;
                                               this.deselect_all();
                                               this.select_node(o)}},
                                               
            dnd: { drag_target: false,
                   drop_target: false,
                   check_timeout: 800,
            },

            crrm: { move: { check_move: raptus_navexplorer.dndCheck}},

            plugins: ['themes', 'json_data', 'crrm', 'dnd', 'ui', 'hotkeys', 'contextmenu', 'cookies']

        })
        
        // Event notifications
        inst.bind({
            'select_node.jstree': function (event, data) {
                raptus_navexplorer.elements.navexplorer_tree.resize(raptus_navexplorer.resizeAccordion());
                raptus_navexplorer.goToLocation(data.rslt.obj.data('url'));
            },
            'hover_node.jstree': raptus_navexplorer.reloadAccordion,
            'before.jstree': raptus_navexplorer.resizeAccordion,
            'move_node.jstree': raptus_navexplorer.dndMoved,
        })

        // Keep a referer, this is necessary because the reference gets lost if the object changes.
        inst.delegate('a', 'mousedown.jstree', function(event){
            raptus_navexplorer.referer_id = $(event.target).parent().attr('id');
        });

        // Overwrite default click function
        inst.undelegate('a', 'click.jstree');
        inst.delegate('a', 'dblclick.jstree', $.proxy(function (event) {
            event.preventDefault();
            event.currentTarget.blur();
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
            }
        }, inst.jstree('')));

        // Restore selection function from ui plugin.
        // First, check for a key down event.
        inst.delegate('a', 'click.jstree', $.proxy(function (event) {
            var settings = this.get_settings().ui;
            if (!(event[settings.select_multiple_modifier + 'Key'] || event[settings.select_range_modifier + 'Key']))
                return;
            event.preventDefault();
            event.currentTarget.blur();
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
            }
        }, inst.jstree('')));
        inst.undelegate('a', 'mouseenter.jstree');
        inst.delegate('a', 'click.jstree', $.proxy(function (event) {
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.hover_node(event.target);
            }
        }, inst.jstree('')));

        // Force a reset of all values and initiate a new check
        inst.undelegate('a', 'mouseleave.jstree');
        inst.delegate('a', 'mouseleave.jstree', $.proxy(function (event){
            if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree)
                this.dnd_leave(event);
        },inst.jstree('')));

        
        // Set sync interval
        window.setInterval(raptus_navexplorer.sync,
                           raptus_navexplorer.settings.refreshtime);
                           
        // Set url change notification interval
        window.setInterval(raptus_navexplorer.urlObserve, raptus_navexplorer.settings.observetime);
       
        // Info box
        raptus_navexplorer.initAccordion();
        
        // Init buttons
        raptus_navexplorer.initButtons();
        
    },
    
    
    sync : function(){
            
        var li = new Array();
        raptus_navexplorer.treeinst.find('li').each(function(){
            if (!$(this).data('path') || !$(this).data('mtime'))
                return;
            
            var children = null;
            if (!($(this).hasClass('jstree-closed') || $(this).hasClass('jstree-leaf'))){
                children = new Array();
                $(this).children('ul').children('li').each(function(){
                    children.push(this.id);
                });
            }
            
            li.push({path:$(this).data('path'),
                     mtime:$(this).data('mtime'),
                     id:$(this).id,
                     children:children});
        });
        var data = {tree: JSON.stringify(li)};
        
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: portal_url + '/navexplorer_sync',
            data: data,
            success: function(data){
                $.each(data, function(){
                    raptus_navexplorer.update(this.id, this);
                });
            }
        });
    },
    
    
    update: function(id, obj){
        var el = $('#'+id);
        var tree = raptus_navexplorer.treeinst.jstree('');
        if (obj.metadata){
            $.each(obj.metadata, function(key, value){
                el.data(key, value);
            });
        }
        
        if (obj.title){
            tree.set_text(el, obj.title);
        }
        
        if (obj.reloadchildren){
            tree.refresh(el);
        }
        
        if (obj.deletenode){
            tree.delete_node(el);
        }
        
        if (obj.newid){
            el.attr('id', obj.newid);
        }
    },
    
    
    urlObserve: function(){
        if (!raptus_navexplorer.getPloneFrame())
            return;
        if (raptus_navexplorer.url_observation != raptus_navexplorer.getPloneFrame().location)
            if (raptus_navexplorer.url_observation)
                jQuery(raptus_navexplorer.getPloneFrame().window).load(raptus_navexplorer.urlChanged);
            else 
                jQuery(raptus_navexplorer.getPloneFrame().document).ready(raptus_navexplorer.urlChanged);
        raptus_navexplorer.url_observation = raptus_navexplorer.getPloneFrame().location;
    },
    
    
    urlChanged: function(){
        if (!raptus_navexplorer.getPloneFrame())
          return;
        raptus_navexplorer.urlPatches();
        parent.document.title = raptus_navexplorer.getPloneFrame().document.title;
        raptus_navexplorer.sync();
        if (raptus_navexplorer.getPloneFrame().jq)
            raptus_navexplorer.getPloneFrame().jq('#contentview-open_navexplorer').remove();
    },
    
    
    urlPatches: function(){
      // URL referer does not work at this time.
      // Remove the params orig_template from the redirect.
      var url = $.url.parse(raptus_navexplorer.getPloneFrame().location);
      if ('params' in url &&
          'orig_template' in url.params &&
          url.params['orig_template'].search('navexplorer_tree') != -1){
              delete url['path'];
              delete url['ralative'];
              delete url['source'];
              delete url['query'];
              delete url.params['orig_template'];
              raptus_navexplorer.goToLocation($.url.build(url));
      }
      if (raptus_navexplorer.getPloneFrame() && 
          raptus_navexplorer.getPloneFrame().location.href.search('navexplorer_tree') != -1){
          $('#'+raptus_navexplorer.referer_id).trigger('dblclick.jstree');
      }
    },
    
    
    initButtons: function(){
        $('#header_close').button({
            icons: { primary: 'ui-icon-close' },
            text: false
        }).click(function(){
            if ($('#header_newwin').attr('checked'))
                window.close();
            else
                parent.location = raptus_navexplorer.getPloneFrame().document.location;
        });
        if (!parent.frames.tree_frame)
            $('#header_newwin').attr('checked', 'checked');
        $('#header_newwin').button({
            icons: { primary: 'ui-icon-newwin' },
            text: false
        }).click(function(){
            if ($(this).attr('checked'))
                raptus_navexplorer.openStandalone();
            else
                raptus_navexplorer.closeStandalone();
        });
        $('#header_notice').button({
            icons: { primary: 'ui-icon-notice' },
            text: false
        }).click(function(){
            $('#manual-message').dialog('open');
        });
        $('#manual-message').dialog({
            modal: true,
            autoOpen: $.cookie('raptus_navexplorer_manual') ? false : true,
            draggable: false,
            buttons: {
                Ok: function() {
                    $( this ).dialog('close');
                }
            }
        });
        $('#manual-message-tabs').tabs();
        $.cookie('raptus_navexplorer_manual', true, {
            expires: raptus_navexplorer.settings.manual_expires,
        });
    },
    
    
    openStandalone: function(){
        $('body>*').remove();
        var tree_window = window.open(document.location, 'own_window_tree', raptus_navexplorer.settings.standaloneWindow);
        parent.location = raptus_navexplorer.getPloneFrame().location
        tree_window.parent.frames.plone_frame = parent;
    },


    closeStandalone: function(){
        $('body>*').remove();
        raptus_navexplorer.getPloneFrame().location = portal_url + '/@@navexplorer_view';
        self.close();
    },


    initAccordion : function(){
        $('#navexplorer_info').accordion({
            header: 'h3',
        });
    },
    
    
    resizeAccordion: function(){
        var size_window= $(window).height();
        var space = 30;
        var margin = parseInt(raptus_navexplorer.elements.navexplorer_content.css('margin-top')) + 
                     parseInt(raptus_navexplorer.elements.navexplorer_content.css('margin-bottom'));
        var size_info = raptus_navexplorer.elements.navexplorer_info_wrap.height();
        var size_error = raptus_navexplorer.elements.navexplorer_info_error.is(':visible') ? 
                         raptus_navexplorer.elements.navexplorer_info_error.height() : 0;
        raptus_navexplorer.elements.navexplorer_tree.height(size_window - margin - size_info - size_error - space);
    },
    
    
    reloadAccordion : function(event, data){
        var url = data.rslt.obj.data('url') + '/navexplorer_accordion';
        $.ajax({url: url,
                success: function(data) {
                  var tabindex = raptus_navexplorer.elements.navexplorer_info.accordion('option','active');
                  raptus_navexplorer.elements.navexplorer_info_wrap.html(data);
                  raptus_navexplorer.initAccordion();
                  raptus_navexplorer.resizeAccordion();
                  raptus_navexplorer.elements.navexplorer_info_error.hide(0);
                  raptus_navexplorer.elements.navexplorer_info.accordion('option','active', tabindex);
                  raptus_navexplorer.elements.navexplorer_tree.jstree('').set_focus();
                },
                error: function(){
                    $('#navexplorer_info_wrap>*').remove();
                    raptus_navexplorer.elements.navexplorer_info_error.show('bounce', {}, 500);
                }
        })
    },
    

    customContextMenu : function(node){
        
        var eval_action = function(menu){
            var mdi = {};
            $.each(menu,function(mkey, mvalue){
                var di = {};
                $.each(mvalue, function(key, value) {
                    switch(key) {
                    case 'action':
                        di['action'] = function(obj){eval(value)};
                        break;
                    case 'submenu':
                        di['submenu'] = eval_action(value);
                        break;
                    default: 
                        di[key]=value;
                    }
                });
                mdi[mkey] = di;
            });
          return mdi;
        }
        return eval_action(node.data('contextmenu'));
    },


    dndMoved: function(e, data){
        raptus_navexplorer.dndAjax(data.rslt, false);
    },
    

    dndCheck: function(dnd){
        if ((!$.vakata.dnd.helper.hasClass('jstree-loading') &&
            $.vakata.dnd.helper.children('ins').hasClass('jstree-ok')))
            return true;
        raptus_navexplorer.dndAjax(dnd, true);
        return false;
    },
    

    dndAjax: function(dnd, dryrun){
        var li = [];
        dnd.o.each(function(){
            var path = $(this).data('path');
            if (!path)
                return false;
            li.push(path);
        });
        if (!li.length) 
            return false;
        var data = { drag: li,
                     drop: dnd.r.data('path'),
                     dryrun: dryrun}
        data = {dnd: JSON.stringify(data)};

        $.vakata.dnd.helper.append('<img src="throbber.gif">');
        $.vakata.dnd.helper.addClass('jstree-loading');

        $.ajax({
                type: 'POST',
                dataType: 'json',
                url: portal_url + '/navexplorer_dnd',
                data: data,
                success: function(data,textStatus, xhr){
                    if (data.permission) {
                        $.vakata.dnd.helper.children('ins').attr('class', 'jstree-ok');
                        var tree = $('.jstree').jstree('');
                        tree.data.dnd.inside = true;
                        tree.dnd_show()
                    }
                    if (data.permission && !dryrun) {
                        $.each(data.sync, function(){
                            raptus_navexplorer.update(this.id, this);
                        });
                        raptus_navexplorer.goToLocation(dnd.r.data('url') + '/folder_contents');
                    }
                },
                complete: function(jqXHR, textStatus){
                    $.vakata.dnd.helper.removeClass('jstree-loading');
                    $.vakata.dnd.helper.children('img').remove();
                }
        });
    },


    getPloneFrame: function(){
        return parent.frames.plone_frame;
    },


    goToLocation: function(url){
        var frame = raptus_navexplorer.getPloneFrame();
        if (frame) {
            frame.location.href = url;

            // Ajax requests can lead to an invalid redirection, check again in 200ms and redirect correctly.
            // This might happen while copying or cutting content.
            window.setTimeout(function() {
                if (frame.location.href.match(/navexplorer_tree$/))
                    frame.location.href = url.substring(0, url.lastIndexOf("/") + 1);
            }, 500);
        }
    },
    
}

jQuery(document).ready(raptus_navexplorer.init);
