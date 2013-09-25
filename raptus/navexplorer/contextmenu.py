from zope.i18n import translate
from zope import interface
from zope.component import getMultiAdapter

from Products.CMFPlone import PloneMessageFactory as _p
from Products.CMFCore.utils import getToolByName

from ordereddict import OrderedDict

from raptus.navexplorer import _
from raptus.navexplorer.interfaces import IContextMenu

try:
    from zope.browsermenu.menu import getMenu
except ImportError: # Plone < 4.3
    from zope.app.publisher.browser.menu import getMenu

try:
    import raptus.article.core
    RAPTUS_ARTICLE_INSTALLED = True
except ImportError:
    RAPTUS_ARTICLE_INSTALLED = False


class DefaultContextMenu(object):
    interface.implements(IContextMenu)

    def __init__(self, context):
        self.context = context
        self.request = context.REQUEST

    def build(self):
        menu = getMenu('plone_contentmenu', self.context, self.request)
        menu = self.separateMenu(menu)
        results = self._parse(menu)

        context_state = getMultiAdapter((self.context, self.request), name=u'plone_context_state')
        actions = context_state.actions
        action_list = []
        if context_state.is_structural_folder():
            action_list = actions('folder')
        action_list.extend(self.filterActionlist(actions('object')))

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

    # The method cuts the "Add new" contextmenu in two parts
    # This is necessary because a folderish element (e.g. an Article) and its default_page
    # share the same "Add new" menu since the parent element is not accessible anymore through plone
    def separateMenu(self, menu):
        if RAPTUS_ARTICLE_INSTALLED:
            _menu = []
            for value in menu:
                extra = value.get('extra', None)
                id = extra.get('id', None)
                if id == 'plone-contentmenu-factories':
                    if value.get('submenu', None):
                        before_separator_list = []
                        after_separator_list = []

                        switch = False
                        for element in value.get('submenu'):
                            element_extra = element.get('extra', None)
                            element_id = element_extra.get('id', None)
                            if element_id == 'add-to-default':
                                switch = True
                                continue

                            if switch:
                                after_separator_list.append(element)
                            else:
                                before_separator_list.append(element)

                    ptool = getToolByName(self.context, 'plone_utils', None)
                    if ptool is None:
                        return False

                    actual_list = []
                    if ptool.isDefaultPage(self.context):
                        actual_list = after_separator_list
                    else:
                        actual_list = before_separator_list

                    value['submenu'] = actual_list

                _menu.append(value)

        else:
            _menu = menu

        return _menu


    def filterActionlist(self, actionlist):
        _actionlist = []

        for action in actionlist:
            aid = action.get('id', None)
            if aid == 'open_navexplorer':
                continue

            _actionlist.append(action)

        return _actionlist

    def _action(self, link):
        return "raptus_navexplorer.goToLocation('%s');" % link
