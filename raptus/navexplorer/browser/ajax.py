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
                               icon=self.icon(obj),
                               type=self.type(obj),
                               defaultpage=self.defaultpage(obj)),
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

    def type(self, obj):
        ptype = None
        if hasattr(obj, 'portal_type'):
            ptype = obj.portal_type
        return ptype

    def defaultpage(self, obj):
        ptool = getToolByName(obj, 'plone_utils', None)
        if ptool is None:
            return False

        if ptool.isDefaultPage(obj):
            return True
        return False

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
        place = dnd.get('place')
        drag = [self.context.restrictedTraverse(str(i)) for i in dnd.get('drag')]
        drop = self.context.restrictedTraverse(str(dnd.get('drop')))
        ms_tool = getToolByName(self.context, 'portal_membership')
        parent = None

        # Check if all drag elements share the same parent
        for element in drag:
            if parent is None:
                parent = aq_parent(element)
                continue

            if parent == aq_parent(element):
                parent = aq_parent(element)
            else:
                return self.response(False)



        if place in ['inside', 'last']:
            if parent == drop:
                return self.response(False)

            if not IFolderish.providedBy(drop):
                return self.response(False)

            if not ms_tool.checkPermission(config.PERMISSIONS['dnd'], self.context):
                return self.response(False)

            copy_return = self.copy(drag, drop, parent, dryrun)
            if copy_return != False:
                return self.response(True, copy_return)
            return self.response(False)

        elif place in ['before', 'after']:
            if parent == aq_parent(drop):

                self.move(drag, drop, parent, place, dryrun)

                return self.response(True)

            else:
                drop_parent = aq_parent(drop)

                if not IFolderish.providedBy(drop_parent):
                    return self.response(False)

                if not ms_tool.checkPermission(config.PERMISSIONS['dnd'], self.context):
                    return self.response(False)

                copy_return = self.copy(drag, drop_parent, parent, dryrun)

                if dryrun:
                    if copy_return != False:
                        return self.response(True, copy_return)
                    return self.response(False)

                new_drag = [i[1] for i in copy_return]
                new_parent = aq_parent(new_drag[0])
                self.move(new_drag, drop, new_parent, place, dryrun)

                return copy_return

        else:
            return self.response(False)

    def copy(self, drag, drop, parent, dryrun):
        try:
            ids = [i.getId() for i in drag]
            parent.manage_cutObjects(ids, self.request)
            drop.manage_pasteObjects(self.request['__cp'])
            drag_old_new = [(i, drop[i.getId()],) for i in drag]

        except (CopyError, Unauthorized, ValueError):
            transaction.abort()
            return False
            #return self.response(False)

        if dryrun:
            transaction.abort()

        return drag_old_new
        #return self.response(True, drag_old_new)

    def move(self, drag, drop, parent, place, dryrun):
        delta_list = []

        for element in drag:
            dragPos = parent.getObjectPosition(element.getId())
            dropPos = aq_parent(drop).getObjectPosition(drop.getId())
            delta = dropPos - dragPos

            if (dropPos > dragPos and place == 'before'):
                delta -= 1

            if (dropPos < dragPos and place == 'after'):
                delta += 1

            delta_list.append(delta)

        if not dryrun:
            for idx, element in enumerate(drag):
                parent.moveObjectsByDelta(element.getId(), delta_list[idx])
            self.context.plone_utils.reindexOnReorder(self.context)
            self.context.portal_catalog.reindexIndex(['getObjPositionInParent'], None)


    def response(self, permission, drag_old_new=[]):
        sync = list()
        for old, new in drag_old_new:
            sync.append(dict(id=self.id(old),
                             newid=self.id(new),
                             metadata=self.metadata(new)))
        return json.dumps(dict(sync=sync,
                               permission=permission))
