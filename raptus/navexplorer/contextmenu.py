from zope.i18n import translate
from zope import interface, component
from zope.component import getMultiAdapter
from zope.app.publisher.browser.menu import getMenu

from Products.ATContentTypes.interfaces.interfaces import IATContentType
from Products.CMFPlone import PloneMessageFactory as _p

from raptus.navexplorer import _
from raptus.navexplorer.interfaces import IContextMenu


class DefaultContextMenu(object):
    
    interface.implements(IContextMenu)
    component.adapts(IATContentType)
    
    
    def __init__(self, context):
        self.context = context
        self.request = context.REQUEST
    
    def build(self):
        
        menu = getMenu('plone_contentmenu', self.context, self.request)
        results = self._parse(menu)
        
        context_state = getMultiAdapter((self.context, self.request), name=u'plone_context_state')
        actions = context_state.actions
        action_list = []
        if context_state.is_structural_folder():
            action_list = context_state.actions('folder')
        action_list.extend(context_state.actions('object'))
        
        contentaction = dict()
        for action in action_list:
            di = dict( label = translate(_p(action.get('title')),context=self.request),
                       action = self.action(action.get('url')),
                       icon = action.get('id'),
                      )
            contentaction[action.get('id')] = di
        
        results['contentaction'] = dict(label=translate(_('Content Actions'),context=self.request),
                                        submenu=contentaction)
        return results
    
    def _parse(self, menu):
        di = dict()
        for value in menu:
            id = value.get('id', value.get('title'))
            extra = value.get('extra', None)
            separator = False
            if extra:
                separator = extra.get('separator', None)
            
            su = dict( label = translate(_p(value.get('title')),context=self.request),
                       action = self.action(value.get('action','')),
                       icon = value.get('icon',''),
                       _class = value.get('class',''),
                       separator_before = separator,
                       _disabled = separator,
                      )
                
            if value.get('submenu', None):
                       su.update(dict(submenu = self._parse(value.get('submenu'))))
            di[id] = su
        
        return di
    
    def action(self, link):
        return "raptus_navexplorer.goToLocation('%s');" % link
    
    
    
    