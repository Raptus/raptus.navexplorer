raptus_navexplorer = {
    init: function($){
        
        // host url
        
        var regex = /(^.*?:\/\/.*?)\/.*$/;
        raptus_navexplorer.host_url = portal_url.match(regex)[1];
        
        
        // jstree
        $.jstree._themes = 'navexplorer_tree_themes/';
        $('#navexplorer_tree').jstree({
            json_data: {
                ajax: {
                    url: portal_url + '/navexplorer_ajax',
                    data: function(n){
                        return {
                            id: n.attr ? n.attr("id") : '',
                        };
                    }
                }
            },
            
            themes : {
                theme : 'apple',
                dots : false,
                icons : true
            },
            ui : { select_limit : 1},
            
            contextmenu: {items: raptus_navexplorer.customContextMenu },
            
            hotkeys: { 'del' : false,
                       'f2' : false,
                       'return' : function(){ var o = this.data.ui.hovered || this.data.ui.last_selected;
                                               this.deselect_all();
                                               this.select_node(o)}},
                                               
            plugins : ['themes', 'json_data', 'ui','hotkeys', 'contextmenu']

        }).bind('select_node.jstree', function (event, data) {
            $('#navexplorer_tree').resize(raptus_navexplorer.resizeAccordion());
            var url = raptus_navexplorer.host_url + data.rslt.obj.attr('id');
            raptus_navexplorer.goToLocation(url);
        }).bind('hover_node.jstree', raptus_navexplorer.reloadAccordion
        ).bind('before.jstree',raptus_navexplorer.resizeAccordion);
        
        
        //info box
        raptus_navexplorer.initAccordion();
        
    },
    
    initAccordion : function(){
        $('#navexplorer_info').accordion({
            header: 'h3',
        });
    },
    
    resizeAccordion: function(){
        var size_window= $(window).height();
        var size_info = $('#navexplorer_info').height();
        var size_tree = $('#navexplorer_tree').height();
        var absolute = size_window - size_info;
        if (absolute <= size_tree)
            absolute = size_tree;
        $('#navexplorer_info').css('bottom', 'auto').css('top', absolute + 'px');
    },
    
    reloadAccordion : function(evnet, data){
        var url = data.rslt.obj.attr('id') + '/navexplorer_accordion';
        $.get(url, function(data) {
              $('#navexplorer_info_wrap').html(data);
              raptus_navexplorer.initAccordion();
        });
    },
    
    customContextMenu : function(node){
        
        var eval_action = function(menu){
            var mdi = {};
            jQuery.each(menu,function(mkey, mvalue){
                var di = {};
                jQuery.each(mvalue, function(key, value) {
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

    goToLocation : function(url){
        document.plone_frame.location = url;
    }
}

jQuery(document).ready(raptus_navexplorer.init);
