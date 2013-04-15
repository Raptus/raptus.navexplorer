import json

from zope.component import getMultiAdapter
from zope.component import queryAdapter

from Acquisition import aq_base


from Products.CMFCore import permissions
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.app.layout.viewlets.common import ViewletBase

from raptus.navexplorer.interfaces import IContextMenu

class SidebarView(ViewletBase):

    @property
    def tree(self):
        pstate = getMultiAdapter((self.context, self.request), name='plone_portal_state')
        self.portal = portal = pstate.portal()

        path = self.request.get('path', None)
        if not path:
            children = [self.build(obj) for obj in self.children(portal)]
            initdata = self.build(portal)
            initdata.update(dict(children=children))
            return initdata

        node = portal.restrictedTraverse(path)
        children = [self.build(obj) for obj in self.children(node)]
        return children

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
