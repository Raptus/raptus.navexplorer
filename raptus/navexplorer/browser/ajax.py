import re
import json
import transaction

from Acquisition import aq_base, aq_parent

from OFS.CopySupport import CopyError
from AccessControl import Unauthorized

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
        
        path = self.request.get('path', None)
        if not path:
            children = [self.build(obj) for obj in self.children(portal)]
            initdata = self.build(portal)
            initdata.update(dict(children=children))
            return json.dumps(initdata)
        
        node = portal.unrestrictedTraverse(path);
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
                     attr=self.attr(obj),
                     metadata=self.metadata(obj))
    
    def title(self, obj):
        title = None
        if hasattr(obj, 'Title'):
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

    def id(self, obj):
        return unicode(hash(obj.getPhysicalPath()))
    
    def attr(self, obj):
        return dict(id=self.id(obj))
    
    def metadata(self, obj):
        return dict(contextmenu=self.contextmenu(obj),
                    path='/'.join(obj.getPhysicalPath()),
                    url=obj.absolute_url(),
                    mtime=obj._p_mtime)
    
    def contextmenu(self, obj):
        contextmenu = queryAdapter(obj, interface=IContextMenu)
        if not contextmenu:
            return dict()
        return contextmenu.build()


class SyncView(AjaxView):
    """ reload tree nodes on a already existing jstree
    """
    
    
    def __call__(self):
        tree = json.loads(self.request.form.get('tree', '[]'))
        outdated = list()
        for node in tree:
            update = False
            reloadchildren = False
            try:
                obj = self.context.unrestrictedTraverse(str(node.get('path')))
            except (AttributeError, KeyError,):
                outdated.append(dict(id = node.get('id'),
                                     deletenode = True))
                continue
            
            if not obj._p_mtime == node.get('mtime'):
                update = True
            
            if node.get('children'):
                children_server = [self.id(i) for i in self.children(obj)]
                children_client = node.get('children')
                children_server.sort()
                children_client.sort()
                if not children_server == children_client:
                    update = True
                    reloadchildren = True
            
            if update:
                outdated.append(dict(id = self.id(obj),
                                     metadata = self.metadata(obj),
                                     title = self.title(obj),
                                     reloadchildren = reloadchildren))
        return json.dumps(outdated)


class DNDView(AjaxView):
    """ check if a one or more objects has
        drag and drop support
    """
    
    def __call__(self):
        try:
            dnd = json.loads(self.request.form.get('dnd'))
            dryrun = dnd.get('dryrun')
            drag = [self.context.unrestrictedTraverse(str(i)) for i in dnd.get('drag')]
            drop = self.context.unrestrictedTraverse(str(dnd.get('drop')))
            ids = [i.getId() for i in drag]
            
            parent = aq_parent(drag[0])
            parent.manage_cutObjects(ids, self.request)
            drop.manage_pasteObjects(self.request['__cp'])
        except (CopyError, Unauthorized, ValueError):
            transaction.abort()
            return json.dumps(dict(after=False, before=False, inside=False))
            
        if dryrun:
            transaction.abort()
            
        return self.response(False, False, True, drag)

    def response(self, after, before, inside, objects=[]):
        permission = dict(after=after, before=before, inside=inside)
        sync = list()
        for obj in objects:
            sync.append(dict(id=self.id(obj),
                             metadata = self.metadata(obj)))
        return json.dumps(dict(sync=sync,
                               permission=permission))

