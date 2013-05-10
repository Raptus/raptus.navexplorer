raptus_navexplorer = {

    // Default configuration
    settings : { refreshtime: 2000,
                 observetime: 100,
                 hidden_expires: 300,
                 width_expires: 300,
                 standaloneWindow: 'width=400,height=800,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=no',
                 theme: { theme : 'raptus',
                          dots : false,
                          icons : true}
                },

    elements : { navexplorer_content: undefined,
                 navexplorer_info: undefined,
                 navexplorer_info_wrap: undefined,
                 navexplorer_info_error: undefined,
                 navexplorer_tree: undefined,
                },

    timeout : null,

    init: function($){

        if(!$('#navexplorer_sidebar').size())
          return;

        // Fill elements
        raptus_navexplorer.elements.navexplorer_content = $('#navexplorer_content');
        raptus_navexplorer.elements.navexplorer_info = $('#navexplorer_info');
        raptus_navexplorer.elements.navexplorer_info_wrap = $('#navexplorer_info_wrap');
        raptus_navexplorer.elements.navexplorer_info_error = $('#navexplorer_info_error');
        raptus_navexplorer.elements.navexplorer_tree = $('#navexplorer_tree');

        // Disabling text selection
        raptus_navexplorer.elements.navexplorer_content.disableTextSelect();

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
                  select_multiple_modifier: 'alt',
                  selected_parent_close: false,
                  disable_selecting_children: true,
                  allow_only_siblings: true},

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

            crrm: { move: { check_move: raptus_navexplorer.dndCheck } },

            plugins: ['themes', 'json_data', 'crrm', 'dnd', 'ui', 'hotkeys', 'contextmenu', 'cookies']

        })

        // Event notifications
        inst.bind({
            'select_node.jstree': function (event, data) {
                raptus_navexplorer.elements.navexplorer_tree.resize(raptus_navexplorer.resizeElements());
                if(typeof data.rslt.e != 'undefined' &&  data.rslt.e.type == 'dblclick') {
                    raptus_navexplorer.goToLocation(data.rslt.obj.data('url'));
                }
            },
            'hover_node.jstree': raptus_navexplorer.reloadAccordion,
            'before.jstree': raptus_navexplorer.resizeElements,
            'move_node.jstree': raptus_navexplorer.dndMoved,
        })

        // Keep a referer, this is necessary because the reference gets lost if the object changes.
        inst.delegate('div', 'mousedown.jstree', function(event){
            raptus_navexplorer.referer_id = $(event.target).parent().attr('id');
        });

        // Overwrite default click function
        inst.undelegate('a', 'click.jstree');
        inst.delegate('div', 'click.jstree', $.proxy(function (event) {
            event.preventDefault();
            event.currentTarget.blur();

            $('#vakata-contextmenu').fadeOut('fast');
            var settings = this.get_settings().ui;
            if (!(event[settings.select_multiple_modifier + 'Key'] || event[settings.select_range_modifier + 'Key'])) {
                this.deselect_all(inst);
                return;
            }

            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
            }
        }, inst.jstree('')));

        inst.delegate('div', 'dblclick.jstree', $.proxy(function (event) {
            event.preventDefault();
            event.currentTarget.blur();
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
            }
        }, inst.jstree('')));

        // Restore selection function from ui plugin.
        // First, check for a key down event.
        inst.delegate('div > ins', 'click.jstree', $.proxy(function (event) {
            var trgt = $(event.target);
            this.toggle_node(trgt);
        }, inst.jstree('')));

        // Force a reset of all values and initiate a new check
        inst.undelegate('a', 'mouseleave.jstree');
        inst.undelegate('a', 'mouseenter.jstree');

        inst.delegate('div', 'mouseleave.jstree', $.proxy(function (event){
            if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree)
                this.dnd_leave(event);
        }, inst.jstree('')));

        $('body').delegate('.jstree-node, #navexplorer_info_wrap, #vakata-contextmenu', 'mouseleave', function (event){
            inst.timeout = setTimeout(function(){
                $('#navexplorer_info_wrap').fadeOut('fast');
                $('#vakata-contextmenu').fadeOut('fast');
                inst.find('div').removeClass('jstree-node-hovered');
                inst.find('a').removeClass('jstree-hovered');
            }, 500);
        });

        $('body').delegate('.jstree-node', 'mouseenter', function (event){
            clearTimeout(inst.timeout)
            inst.find('div').removeClass('jstree-node-hovered');
            inst.find('a').removeClass('jstree-hovered');
            $(this).addClass('jstree-node-hovered');
            $(this).children('a').addClass('jstree-hovered');
        });

        $('body').delegate('#navexplorer_info_wrap', 'mouseenter', function (event){
            clearTimeout(inst.timeout);
        });

        $('body').delegate('#vakata-contextmenu', 'mouseenter', function (event){
            clearTimeout(inst.timeout);
        });

        // Resize Event
        timeout_resizeElements = false;
        $(window).resize(function() {
            if(timeout_resizeElements) {
                return false;
            }
            timeout_resizeElements = setTimeout(function(){
                timeout_resizeElements = false;
                raptus_navexplorer.resizeElements();
            }, 1000);
        });

        // Initiate dragbar
        raptus_navexplorer.makeDraggable();

        // Hide sidebar if cookie says so
        if($.cookie('raptus_navexplorer_hidden') == 'true') {
            $('#navexplorer_sidebar').addClass('hiddenPanel')
            $('#navexplorer_sidebar').css('left', '-'+(raptus_navexplorer.elements.navexplorer_content.width()-20)+'px')
        }


        inst.undelegate('li > div > ins', 'click.jstree');

        // Set sync interval
        timeout_sync = false;
        $(window).mousemove(function() {
            if(timeout_sync)
                return false;
            timeout_sync = setTimeout(function(){
                timeout_sync = false;
                raptus_navexplorer.sync();
            }, raptus_navexplorer.settings.refreshtime)
        })

        // ONLY ON STANDALONE WINDOW
        if($('#navexplorer_window').length) {
            $(window).bind("beforeunload", function() {
                raptus_navexplorer.closeStandalone();
            })
        }

        // Set url change notification interval
        //window.setInterval(raptus_navexplorer.urlObserve, raptus_navexplorer.settings.observetime);

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


    initButtons: function(){
        $('#header_hide').click(function (e){
            e.preventDefault();

            if($('#navexplorer_sidebar').hasClass('hiddenPanel')){
                raptus_navexplorer.slideOpenSidebar();
            } else {
                raptus_navexplorer.slideCloseSidebar();
            }
            $('#navexplorer_sidebar').toggleClass('hiddenPanel');
        });

        $('#header_reload').click(function (e){
            raptus_navexplorer.treeinst.jstree('').refresh();
        });

        $('#header_close').click(function (e){
            window.location = $('#navexplorer_plone_frame').attr('src');
        });

        $('#header_help').click(function (e){
            e.preventDefault();
            $('#manual_message').toggleClass('hidden');
        });

        $('#header_newwin').click(function(e){
            e.preventDefault();
            raptus_navexplorer.openStandalone();
        });

        $('#tab_manual_close').click(function (e) {
            e.preventDefault();
            $('#manual_message').toggleClass('hidden');
        });

        $('#tab_manual_link').click(function (e) {
            e.preventDefault();
            if($('#tab_manual').hasClass('hidden')){
                $('#tab_development').addClass('hidden');
                $('#tab_manual').removeClass('hidden');
                $('#tab_manual_link').toggleClass('active');
                $('#tab_development_link').toggleClass('active');
            }

        });

        $('#tab_development_link').click(function (e) {
            e.preventDefault();
            if($('#tab_development').hasClass('hidden')){
                $('#tab_manual').addClass('hidden');
                $('#tab_development').removeClass('hidden');
                $('#tab_manual_link').toggleClass('active');
                $('#tab_development_link').toggleClass('active');
            }
        });

        raptus_navexplorer.elements.navexplorer_tree.bind('mousewheel DOMMouseScroll', function(e) {
            var scrollTo = null;
            if (e.type == 'mousewheel') {
                scrollTo = (e.originalEvent.wheelDelta * -1);
            } else if (e.type == 'DOMMouseScroll') {
                scrollTo = 40 * e.originalEvent.detail;
            }
            if (scrollTo) {
                e.preventDefault();
                $(this).scrollTop(scrollTo + $(this).scrollTop());
            }
        });

    },


    openStandalone: function(){
        //$('body>*').remove();
        raptus_navexplorer.slideCloseSidebar();

        $('#navexplorer_sidebar').toggleClass('hiddenPanel');

        target = portal_url + '/navexplorer_window';
        window.open(target, 'own_window_tree', raptus_navexplorer.settings.standaloneWindow);
        window.location = $('#navexplorer_plone_frame').attr('src');
    },

    closeStandalone: function(){
        raptus_navexplorer.getPloneFrame().location = raptus_navexplorer.getPloneFrame().location.href + '/@@navexplorer_view';
        self.close();
    },

    resizeElements: function(){
        offsetTop = raptus_navexplorer.elements.navexplorer_tree.offset().top
        raptus_navexplorer.elements.navexplorer_tree.height($(window).height() - offsetTop);

        sidebar_width = 20;
        if($.cookie('raptus_navexplorer_hidden') !== 'true') {
            sidebar_width = raptus_navexplorer.elements.navexplorer_content.width()
        }
        $('#navexplorer_plone_frame').height($(window).height());
        $('#navexplorer_plone_frame').width($(window).width() - sidebar_width);
    },


    reloadAccordion : function(event, data){
        //Temporary deactivated
        return true;

        if($('div.jstree-node-clicked').length > 0) {
            var url = data.rslt.obj.data('url') + '/navexplorer_accordion';
            $.ajax({url: url,
                    success: function(data) {
                      raptus_navexplorer.elements.navexplorer_info_wrap.html(data);
                      $('.infoTitle').click(function(e){
                        raptus_navexplorer.elements.navexplorer_info_wrap.find('a').removeClass('active');
                        $(this).addClass('active');
                        e.preventDefault();
                        $('#info-'+$(this).attr('id')).siblings("div").addClass("hidden");
                        $('#info-'+$(this).attr('id')).removeClass("hidden");
                      });

                      top_ = $('.jstree-hovered').offset().top;
                      height = raptus_navexplorer.elements.navexplorer_info_wrap.height();
                      window_height = $(window).height();
                      spacer_offset = 0;
                      if((top_+height) > window_height) {
                          spacer_offset = (top_ + height) - window_height;
                          top_ = window_height - height;
                      }
                      if(top_ < 0) {
                          top_ = 0;
                      }
                      margin = raptus_navexplorer.elements.navexplorer_content.offset().top + 6;
                      raptus_navexplorer.elements.navexplorer_info_wrap.css('top', top_ - margin);
                      raptus_navexplorer.elements.navexplorer_info_wrap.css('left', raptus_navexplorer.elements.navexplorer_content.width()+15);
                      raptus_navexplorer.elements.navexplorer_info_wrap.prepend("<div id='info_spacer' />");
                      $('#info_spacer', raptus_navexplorer.elements.navexplorer_info_wrap).css('top', spacer_offset);

                      raptus_navexplorer.elements.navexplorer_info_wrap.show();

                      raptus_navexplorer.elements.navexplorer_info_error.hide(0);

                    },
                    error: function(){
                        $('#navexplorer_info_wrap>*').remove();
                        //raptus_navexplorer.elements.navexplorer_info_error.show('bounce', {}, 500);
                    }
            })
        } else {
            raptus_navexplorer.elements.navexplorer_info_wrap.hide();
        }
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
                     dryrun: dryrun,
                     place: dnd.p}
        data = {dnd: JSON.stringify(data)};
        if(!$.vakata.dnd.helper.find('img').length)
            $.vakata.dnd.helper.append('<img src="++resource++raptus.navexplorer.images/throbber.gif">');
        $.vakata.dnd.helper.addClass('jstree-loading');

        $.ajax({
                type: 'POST',
                dataType: 'json',
                url: portal_url + '/navexplorer_dnd',
                data: data,
                success: function(data,textStatus, xhr){
                    var tree = $('.jstree').jstree('');
                    tree.data.dnd.before = true;
                    tree.data.dnd.after = true;
                    if (data.permission) {
                        if (dnd.p == 'inside') {
                            tree.data.dnd.inside = true;
                        }
                        tree.dnd_show();
                    }
                    if ((data.permission_insert || data.permission_move) && !dryrun) {
                        $.each(data.sync, function(){
                            raptus_navexplorer.update(this.id, this);
                        });
                    }
                },
                complete: function(jqXHR, textStatus){
                    $.vakata.dnd.helper.removeClass('jstree-loading');
                    $.vakata.dnd.helper.children('img').remove();
                }
        });
    },

    getPloneFrame: function(){
        if (window.opener == null)
            return window;
        return window.opener;
    },

    goToLocation: function(url){
        var frame = raptus_navexplorer.getPloneFrame();
        if (frame) {
            if($('#navexplorer_plone_frame').length) {
                $('#navexplorer_plone_frame').attr('src', url);
            } else {
                frame.location.href = url;
            }

            // Ajax requests can lead to an invalid redirection, check again in 200ms and redirect correctly.
            // This might happen while copying or cutting content.
            window.setTimeout(function() {
                if (frame.location.href.match(/navexplorer_view/))
                    url = url.substring(0, url.lastIndexOf("/") + 1)
                    if($('#navexplorer_plone_frame').length) {
                        $('#navexplorer_plone_frame').attr('src', url);
                    } else {
                        frame.location.href = url;
                    }
            }, 200);
        }
    },

    urlChanged: function(){
        if (!raptus_navexplorer.getPloneFrame())
          return;
        raptus_navexplorer.urlPatches();
        raptus_navexplorer.sync();
        if (raptus_navexplorer.getPloneFrame().jQuery) {
            iframe = raptus_navexplorer.getIframe();
            document.title = iframe.contents().find("title").html();
            $('#contentview-open_navexplorer', iframe).remove();
        }
    },

    urlPatches: function(){
      // URL referer does not work at this time.
      // Remove the params orig_template from the redirect.
      var url = $.url.parse(raptus_navexplorer.getIframe().attr('src'));
      if ('params' in url &&
          'orig_template' in url.params &&
          url.params['orig_template'].search('navexplorer_tree') != -1){
              delete url['path'];
              delete url['relative'];
              delete url['source'];
              delete url['query'];
              delete url.params['orig_template'];
              raptus_navexplorer.goToLocation($.url.build(url));
      }
      if (raptus_navexplorer.getIframe() &&
          raptus_navexplorer.getIframe().attr('src').search('navexplorer_tree') != -1){
          $('#'+raptus_navexplorer.referer_id).trigger('dblclick.jstree');
      }
    },

    getIframe: function(){
        return raptus_navexplorer.getPloneFrame().jQuery('#navexplorer_plone_frame');
    },

    makeDraggable: function(){
        var dragging = false;
        $('#dragbar').mousedown(function(e){
            e.preventDefault();
            raptus_navexplorer.activateDragSurface();
            dragging = true;
            var ghostbar = $('<div>',
                    {id:'ghostbar',
                        css: {
                        height: '100%',
                        top: raptus_navexplorer.elements.navexplorer_content.offset().top,
                        left: raptus_navexplorer.elements.navexplorer_content.offset().right
                    }
            }).appendTo('body');

            $(document).mousemove(function(e){
                ghostbar.css("left",e.pageX);
            });
        });

        $(document).mouseup(function(e){
            if (dragging) {
                $('#navexplorer_sidebar').css("width",e.pageX);
                $('#ghostbar').remove();
                $('#dragsurface').css("visibility", "hidden");
                $(document).unbind('mousemove');
                raptus_navexplorer.resizeElements();
                dragging = false;
                $.cookie('raptus_navexplorer_width', e.pageX, {
                    expires: raptus_navexplorer.settings.width_expires,
                    path: '/',
                });
            }
        });

        if($.cookie('raptus_navexplorer_width')) {
            $('#navexplorer_sidebar').css("width", $.cookie('raptus_navexplorer_width'));
        }
    },

    activateDragSurface: function() {
        var surface = $('#dragsurface');
        if ( surface == null ) return;

        if ( typeof window.innerWidth != 'undefined' ) {
            viewportheight = window.innerHeight;
        } else {
            viewportheight = document.documentElement.clientHeight;
        }

        if ( ( viewportheight > document.body.parentNode.scrollHeight ) && ( viewportheight > document.body.parentNode.clientHeight ) ) {
            surface_height = viewportheight;
        } else {
            if ( document.body.parentNode.clientHeight > document.body.parentNode.scrollHeight ) {
                surface_height = document.body.parentNode.clientHeight;
            } else {
                surface_height = document.body.parentNode.scrollHeight;
            }
        }

        surface.height(surface_height);
        surface.css("visibility", "visible");
    },

    slideOpenSidebar: function() {
        $.cookie('raptus_navexplorer_hidden', 'false', {
            expires: raptus_navexplorer.settings.hidden_expires,
            path: '/',
        });

        $('#navexplorer_plone_frame').animate({
            width: $(window).width() - raptus_navexplorer.elements.navexplorer_content.width()
        }, 250);

        $('#navexplorer_sidebar').animate({
            left: '0px'
        }, 250);
    },

    slideCloseSidebar: function() {
        $.cookie('raptus_navexplorer_hidden', 'true', {
            expires: raptus_navexplorer.settings.hidden_expires,
            path: '/',
        });

        $('#navexplorer_plone_frame').animate({
            width: '100%'
        }, 250);

        $('#navexplorer_sidebar').animate({
            left: '-'+(raptus_navexplorer.elements.navexplorer_content.width()-20)+'px'
        }, 250);
    }
}

jQuery(document).ready(raptus_navexplorer.init);

