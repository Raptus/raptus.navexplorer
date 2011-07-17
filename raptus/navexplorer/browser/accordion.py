from zope.component import getAdapters

from Products.Five.browser import BrowserView
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

from plone.app.contentmenu import PloneMessageFactory as _p

from raptus.navexplorer.interfaces import IAccordionItem



class AjaxAccordion(BrowserView):

    template = ViewPageTemplateFile('templates/accordion.pt')
    
    def __call__(self):
        return self.template()
        
    def items(self):
        li = list()
        for name, item in getAdapters((self.context,), IAccordionItem):
            if not item.available():
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


class Archetypes(Base):
    
    template = ViewPageTemplateFile('templates/accordion_archetypes.pt')
    
    def type(self):
        type_info = self.context.getTypeInfo()
        return type_info.Title()
    
    @property
    def created(self):
        return self.context.created()
    
    @property
    def modified(self):
        return self.context.modified()
    
    
class Folder(Base):
    
    template = ViewPageTemplateFile('templates/accordion_folder.pt')
    
    def amount(self):
        return len(self.context)

    def layout(self):
        return [_p(i) for i in self.context.getDefaultLayout()]


class Security(Base):
    
    template = ViewPageTemplateFile('templates/accordion_security.pt')
    
    def creator(self):
        return self.context.Creator()
    
    def editor(self):
        rt = getToolByName(self.context, 'portal_repository', None)
        if rt is None or not rt.isVersionable(self.context):
            return None
        return rt.getHistoryMetadata()
        
