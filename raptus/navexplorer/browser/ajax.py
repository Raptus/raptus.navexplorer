import json
import transaction

from Acquisition import aq_base, aq_parent

from OFS.CopySupport import CopyError
from AccessControl import Unauthorized

from zope.component import getMultiAdapter
from zope.component import queryAdapter

from Products.Five.browser import BrowserView

from Products.CMFCore import permissions
from Products.CMFCore.interfaces import IFolderish
from Products.CMFCore.utils import getToolByName

from raptus.navexplorer import config
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

        node = portal.restrictedTraverse(path)
        children = [self.build(obj) for obj in self.children(node)]
        return json.dumps(children)

    def children(self, obj):
        if not hasattr(aq_base(obj), 'contentValues'):
            return []
        ms_tool = getToolByName(self.context, 'portal_membership')
        children = list()
        for child in obj.contentValues():
            if ms_tool.checkPermission(permissions.View, child):
                children.append(child)
        return children

    def build(self, obj):
        state = ''
        if len(self.children(obj)):
            state = 'closed'
        return dict(data=dict(title=self.title(obj),
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
            icon = '%s/folder_icon.png' % self.portal.absolute_url(True)
        return '%s/%s' % (self.request.other.get('SERVER_URL', ''), icon,)

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
                obj = self.context.restrictedTraverse(str(node.get('path')))
            except (AttributeError, KeyError,):
                outdated.append(dict(id=node.get('id'),
                                     deletenode=True))
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
                outdated.append(dict(id=self.id(obj),
                                     metadata=self.metadata(obj),
                                     title=self.title(obj),
                                     reloadchildren=reloadchildren))
        return json.dumps(outdated)


class DNDView(AjaxView):
    """ check if a one or more objects has
        drag and drop support
    """

    def __call__(self):
        dnd = json.loads(self.request.form.get('dnd'))
        dryrun = dnd.get('dryrun')
        drag = [self.context.restrictedTraverse(str(i)) for i in dnd.get('drag')]
        drop = self.context.restrictedTraverse(str(dnd.get('drop')))
        ids = [i.getId() for i in drag]
        parent = aq_parent(drag[0])
        ms_tool = getToolByName(self.context, 'portal_membership')

        if parent == drop:
            return self.response(False)

        if not IFolderish.providedBy(drop):
            return self.response(False)

        if not ms_tool.checkPermission(config.PERMISSIONS['dnd'], self.context):
            return self.response(False)

        try:
            parent.manage_cutObjects(ids, self.request)
            drop.manage_pasteObjects(self.request['__cp'])
            drag_old_new = [(i, drop[i.getId()],) for i in drag]

        except (CopyError, Unauthorized, ValueError):
            transaction.abort()
            return self.response(False)

        if dryrun:
            transaction.abort()

        return self.response(True, drag_old_new)

    def response(self, permission, drag_old_new=[]):
        sync = list()
        for old, new in drag_old_new:
            sync.append(dict(id=self.id(old),
                             newid=self.id(new),
                             metadata=self.metadata(new)))
        return json.dumps(dict(sync=sync,
                               permission=permission))
