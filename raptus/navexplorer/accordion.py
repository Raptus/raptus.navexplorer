from zope import interface, component

from Products.CMFCore.interfaces._content import IFolderish
from Products.CMFPlone.interfaces.siteroot import IPloneSiteRoot
from Products.ATContentTypes.interfaces.interfaces import IATContentType

from raptus.navexplorer import _
from raptus.navexplorer.browser import accordion
from raptus.navexplorer.interfaces import IAccordionItem



class AccordionBase(object):

    interface.implements(IAccordionItem)
    
    view_class = None

    def __init__(self, context):
        self.context = context
        self.request = context.REQUEST
        
    def suffix(self):
        return None

    def content(self):
        return self.view_class(self.context, self.request)()

    def available(self):
        return True


class AccordionPlone(AccordionBase):
    
    component.adapts(IPloneSiteRoot)

    view_class = accordion.Plone

    def title(self):
        return _('Plone Site')


class AccordionArchetypes(AccordionBase):
    
    component.adapts(IATContentType)

    view_class = accordion.Archetypes

    def title(self):
        return _('General Information')


class AccordionFolder(AccordionBase):
    
    component.adapts(IFolderish)

    view_class = accordion.Folder

    def title(self):
        return _('Folder')


class AccordionSecurity(AccordionBase):
    
    component.adapts(IFolderish)

    view_class = accordion.Security

    def title(self):
        return _('Security')



