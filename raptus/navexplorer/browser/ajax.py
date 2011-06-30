import json

from Acquisition import aq_base

from zope.component import getMultiAdapter
from zope.component import queryAdapter

from Products.Five.browser import BrowserView

from raptus.navexplorer.interfaces import IContextMenu


class AjaxView(BrowserView):
    """ generate json from plone content
    """
    def __call__(self):
        pstate = getMultiAdapter((self.context, self.request), name='plone_portal_state')
        self.portal = portal = pstate.portal()
        
        id = self.request.get('id', None)
        if not id:
            children = [self.build(obj) for obj in self.children(portal)]
            initdata = self.build(portal)
            initdata.update(dict(children=children))
            return json.dumps(initdata)
        
        node = portal.unrestrictedTraverse(id);
        children = [self.build(obj) for obj in self.children(node)]
        return json.dumps(children)

    def children(self, obj):
        if not hasattr(aq_base(obj), 'contentValues'):
            return []
        return obj.contentValues()

    def build(self, obj):
        state = ''
        if len(self.children(obj)):
            state='closed'
        return dict( data=dict(title=self.title(obj),
                               icon=self.icon(obj)),
                     state=state,
                     attr=dict(id=obj.absolute_url_path()),
                     metadata=self.metadata(obj))
    
    def title(self, obj):
        title = obj.Title()
        if not title:
            title = obj.getId()
        return title
    
    def icon(self, obj):
        if callable(obj.icon):
            icon = obj.icon()
        else:
            icon = obj.icon
        if not icon:
            icon = 'folder_icon.png'
        return '%s/%s' % (self.portal.absolute_url(), icon,)
    
    
    def metadata(self, obj):
        return dict(contextmenu=self.contextmenu(obj))
    
    def contextmenu(self, obj):
        contextmenu = queryAdapter(obj, interface=IContextMenu)
        if not contextmenu:
            return dict()
        return contextmenu.build()
    
            