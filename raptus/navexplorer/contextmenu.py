from zope.i18n import translate
from zope import interface
from zope.component import getMultiAdapter
from zope.app.publisher.browser.menu import getMenu

from Products.CMFPlone import PloneMessageFactory as _p

from ordereddict import OrderedDict

from raptus.navexplorer import _
from raptus.navexplorer.interfaces import IContextMenu


class DefaultContextMenu(object):
    interface.implements(IContextMenu)

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
            action_list = actions('folder')
        action_list.extend(actions('object'))

        contentaction = OrderedDict()

        for action in action_list:
            di = OrderedDict(label=translate(_p(action.get('title')), context=self.request),
                       action=self._action(action.get('url')),
                       icon=action.get('id'),
                      )
            contentaction[action.get('id')] = di

        results['contentaction'] = OrderedDict(label=translate(_('Content actions'), context=self.request), submenu=contentaction)

        return results

    def _parse(self, menu):
        di = OrderedDict()
        for value in menu:
            id = value.get('id', value.get('title'))
            extra = value.get('extra', None)
            separator = False
            if extra:
                separator = extra.get('separator', None)

            title = value.get('title')
            if isinstance(title, str):
                translated_title = translate(_p(title), context=self.request)
            else:
                translated_title = translate(value.get('title'), domain=_p, context=self.request)
            su = OrderedDict(label=translated_title,
                       action=self._action(value.get('action', '')),
                       icon=value.get('icon', ''),
                       _class=value.get('class', ''),
                       separator_before=separator,
                       _disabled=(not value.get('action', False) and separator) and True or False,
                      )

            if value.get('submenu', None):
                su.update(OrderedDict(submenu=self._parse(value.get('submenu'))))
            di[id] = su
        return di

    def _action(self, link):
        return "raptus_navexplorer.goToLocation('%s');" % link
