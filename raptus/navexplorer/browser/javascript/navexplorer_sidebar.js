raptus_navexplorer = {

    // Default configuration
    settings : { refreshtime: 5000,
                 observetime: 33,
                 hidden_expires: 300,
                 width_expires: 300,
                 standaloneWindow: 'width=1000,height=600,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,copyhistory=no,resizable=no',
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

            crrm: { move: { check_move: raptus_navexplorer.dndCheck } },

            plugins: ['themes', 'json_data', 'crrm', 'dnd', 'ui', 'hotkeys', 'contextmenu', 'cookies']

        })

        // Event notifications
        inst.bind({
            'select_node.jstree': function (event, data) {
                raptus_navexplorer.elements.navexplorer_tree.resize(raptus_navexplorer.resizeAccordion());
                if(typeof data.rslt.e != 'undefined')
                    raptus_navexplorer.goToLocation(data.rslt.obj.data('url'));
            },
            'hover_node.jstree': raptus_navexplorer.reloadAccordion,
            'before.jstree': raptus_navexplorer.resizeAccordion,
            'move_node.jstree': raptus_navexplorer.dndMoved,
        })

        // Keep a referer, this is necessary because the reference gets lost if the object changes.
        inst.delegate('div', 'mousedown.jstree', function(event){
            raptus_navexplorer.referer_id = $(event.target).parent().attr('id');
        });

        // Overwrite default click function
        inst.undelegate('a', 'click.jstree');
        inst.delegate('a', 'click.jstree', $.proxy(function (event) {
          event.preventDefault();
          event.currentTarget.blur();
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

            var settings = this.get_settings().ui;
            if (!(event[settings.select_multiple_modifier + 'Key'] || event[settings.select_range_modifier + 'Key']))
                return;
            event.preventDefault();
            event.currentTarget.blur();
            if(!$(event.currentTarget).hasClass("jstree-loading")) {
                this.select_node(event.currentTarget, true, event);
            }
        }, inst.jstree('')));

        // Force a reset of all values and initiate a new check
        inst.undelegate('a', 'mouseleave.jstree');
        inst.undelegate('a', 'mouseenter.jstree');

        inst.delegate('div', 'mouseleave.jstree', $.proxy(function (event){
            if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree)
                this.dnd_leave(event);
        },inst.jstree('')));


        inst.delegate('div', 'click.jstree', $.proxy(function (event){
            this.hover_node(event.target);
            $('#vakata-contextmenu').fadeOut('fast');
        }, inst.jstree('')));

        $('body').delegate('.jstree-node, #navexplorer_info_wrap, #vakata-contextmenu', 'mouseleave', function (event){
            inst.timeout = setTimeout(function(){
                $('#navexplorer_info_wrap').fadeOut('fast');
                $('#vakata-contextmenu').fadeOut('fast');
                inst.find('div').removeClass('jstree-node-hovered jstree-node-clicked');
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


        raptus_navexplorer.makeDraggable();

        if($.cookie('raptus_navexplorer_hidden') == 'true') {
            $('#navexplorer_sidebar').addClass('hiddenPanel')
            $('#navexplorer_sidebar').css('left', '-'+(raptus_navexplorer.elements.navexplorer_content.width()-20)+'px')
        }


        inst.undelegate('li > div > ins', 'click.jstree');

        // Set sync interval
        window.setInterval(raptus_navexplorer.sync,
                           raptus_navexplorer.settings.refreshtime);

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
        $('#header_close').click(function (e){
            e.preventDefault();

            if($('#navexplorer_sidebar').hasClass('hiddenPanel')){
                $.cookie('raptus_navexplorer_hidden', 'false', {
                    expires: raptus_navexplorer.settings.hidden_expires,
                    path: '/',
                });
                $('#navexplorer_sidebar').animate({
                    left: '0px'
                }, 250);
            } else {
                $.cookie('raptus_navexplorer_hidden', 'true', {
                    expires: raptus_navexplorer.settings.hidden_expires,
                    path: '/',
                });
                $('#navexplorer_sidebar').animate({
                    left: '-'+(raptus_navexplorer.elements.navexplorer_content.width()-20)+'px'
                }, 250);
            }
            $('#navexplorer_sidebar').toggleClass('hiddenPanel');
        });

        $('#header_help').click(function (e){
            e.preventDefault();
            $('#manual_message').toggleClass('hidden');
        });

        $('#header_newwin').click(function(){
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
        $.cookie('raptus_navexplorer_hidden', 'true', {
            expires: raptus_navexplorer.settings.hidden_expires,
            path: '/',
        });

        $('#navexplorer_sidebar').animate({
            left: '-'+(raptus_navexplorer.elements.navexplorer_content.width()-20)+'px'
        }, 250);

        $('#navexplorer_sidebar').toggleClass('hiddenPanel');

        target = portal_url + '/navexplorer_window';
        var tree_window = window.open(target, 'own_window_tree', raptus_navexplorer.settings.standaloneWindow);
        //parent.location = raptus_navexplorer.getPloneFrame().location;
        //tree_window.parent.frames.plone_frame = parent;
    },


    resizeAccordion: function(){
        var size_window = $(window).height();
        var offsetTop = raptus_navexplorer.elements.navexplorer_tree.offset().top;
        var margin = parseInt(raptus_navexplorer.elements.navexplorer_content.css('margin-top')) +
                     parseInt(raptus_navexplorer.elements.navexplorer_content.css('margin-bottom'));
        var size_error = raptus_navexplorer.elements.navexplorer_info_error.is(':visible') ?
                         raptus_navexplorer.elements.navexplorer_info_error.height() : 0;
        raptus_navexplorer.elements.navexplorer_tree.height(size_window - margin - size_error - offsetTop);
    },


    reloadAccordion : function(event, data){
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
                     dryrun: dryrun}
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
                    if (data.permission) {
                        $.vakata.dnd.helper.children('ins').attr('class', 'jstree-ok');
                        var tree = $('.jstree').jstree('');
                        tree.data.dnd.inside = true;
                        tree.dnd_show();
                    }
                    if (data.permission && !dryrun) {
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
            frame.location.href = url;

            // Ajax requests can lead to an invalid redirection, check again in 200ms and redirect correctly.
            // This might happen while copying or cutting content.
            window.setTimeout(function() {
                if (frame.location.href.match(/navexplorer_window$/))
                    frame.location.href = url.substring(0, url.lastIndexOf("/") + 1);
            }, 500);
        }
    },

    makeDraggable: function(){
        var dragging = false;
        $('#dragbar').mousedown(function(e){
            e.preventDefault();

            dragging = true;
            var ghostbar = $('<div>',
                    {id:'ghostbar',
                        css: {
                        height: raptus_navexplorer.elements.navexplorer_content.outerHeight(),
                        top: raptus_navexplorer.elements.navexplorer_content.offset().top,
                        left: raptus_navexplorer.elements.navexplorer_content.offset().right
                    }
            }).appendTo('body');

            $(document).mousemove(function(e){
                ghostbar.css("left",e.pageX+2);
            });
        });

        $(document).mouseup(function(e){
            if (dragging) {
                $('#navexplorer_sidebar').css("width",e.pageX+2);
                $('#ghostbar').remove();
                $(document).unbind('mousemove');
                dragging = false;
                $.cookie('raptus_navexplorer_width', e.pageX+2, {
                    expires: raptus_navexplorer.settings.width_expires,
                    path: '/',
                });
            }
        });

        if($.cookie('raptus_navexplorer_width')) {
            $('#navexplorer_sidebar').css("width", $.cookie('raptus_navexplorer_width'));
        }
    },

}

jQuery(document).ready(raptus_navexplorer.init);
