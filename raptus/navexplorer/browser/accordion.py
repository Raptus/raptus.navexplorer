from zope.i18n import translate
from zope.component import getAdapters

from Products.Five.browser import BrowserView
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

from plone.app.workflow.browser.sharing import SharingView
from plone.app.layout.viewlets.content import ContentHistoryViewlet
from plone.app.content.browser.folderfactories import _allowedTypes

from raptus.navexplorer import config
from raptus.navexplorer.interfaces import IAccordionItem


class AjaxAccordion(BrowserView):
    template = ViewPageTemplateFile('templates/accordion.pt')

    def __call__(self):
        return self.template()

    def items(self):
        ms_tool = getToolByName(self.context, 'portal_membership')
        li = list()
        for name, item in sorted(getAdapters((self.context,), IAccordionItem),
                                 key=lambda item: item[1].order):

            if not item.available():
                continue
            if not ms_tool.checkPermission(config.PERMISSIONS['accordion.default'], self.context):
                continue

            li.append(item)
        return li


class Base(object):
    template = None

    def __init__(self, context, request):
        self.context = context
        self.request = request

    def __call__(self):
        return self.template(self)

    def title(self):
        return self.context.Title()

    def defaultpage(self):
        if not hasattr(self.context, 'getDefaultPage'):
            return None
        page = self.context.getDefaultPage()
        if not page:
            return None
        if not self.context.get(page, None):
            return None
        return self.context.get(page).Title()


class Plone(Base):
    template = ViewPageTemplateFile('templates/accordion_plone.pt')

    def version(self):
        return self.context.portal_migration.getSoftwareVersion()

    def emailfromaddress(self):
        return self.context.email_from_address

    def emailfromname(self):
        return self.context.email_from_name


class Archetypes(Base, ContentHistoryViewlet):
    template = ViewPageTemplateFile('templates/accordion_archetypes.pt')

    def __init__(self, context, request):
        super(Archetypes, self).__init__(context, request)
        super(ContentHistoryViewlet, self).__init__(context, request, self)
        self.update()

    def type(self):
        type_info = self.context.getTypeInfo()
        return type_info.Title()

    @property
    def created(self):
        return self.context.created()

    @property
    def modified(self):
        return self.context.modified()

    def absolute_url(self):
        return self.context.absolute_url()

    def creator(self):
        return self.context.Creator()

    def editor(self):
        history = self.fullHistory()
        if not history:
            return

        actor = history.pop(0).get('actor', None)
        if not actor:
            return
        return actor.get('username')


class Folder(Base):
    template = ViewPageTemplateFile('templates/accordion_folder.pt')

    def amount(self):
        return len(self.context)

    def allowed_types(self):
        return [translate(i.Title(), domain=i.i18n_domain, context=self.request)
                for i in _allowedTypes(self.request, self.context)]


class Security(Base, SharingView):
    template = ViewPageTemplateFile('templates/accordion_security.pt')

    # overwrite the search string and display all entries
    def do_not_search_user(self, hunter, search_term):
        return hunter.searchUsers()

    def do_not_search_group(self, hunter, search_term):
        return hunter.searchGroups()

    def _principal_search_results(self,
                                  search_for_principal,
                                  get_principal_by_id,
                                  get_principal_title,
                                  principal_type,
                                  id_key):
        if principal_type == 'user':
            search_for_principal = self.do_not_search_user
        if principal_type == 'group':
            search_for_principal = self.do_not_search_group
        self.request.form['search_term'] = ' '
        return super(Security, self)._principal_search_results(search_for_principal,
                                                                get_principal_by_id,
                                                                get_principal_title,
                                                                principal_type,
                                                                id_key)
