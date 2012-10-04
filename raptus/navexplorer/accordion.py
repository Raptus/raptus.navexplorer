from zope import interface, component

from Products.CMFCore.interfaces import IFolderish
from Products.CMFPlone.interfaces.siteroot import IPloneSiteRoot
from Products.ATContentTypes.interfaces.interfaces import IATContentType

from raptus.navexplorer import _
from raptus.navexplorer import config
from raptus.navexplorer.browser import accordion
from raptus.navexplorer.interfaces import IAccordionItem


class AccordionBase(object):
    interface.implements(IAccordionItem)

    view_class = None
    order = 0
    permission = config.PERMISSIONS['accordion.default']

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
    order = 100

    def title(self):
        return _('Plone Site')


class AccordionArchetypes(AccordionBase):
    component.adapts(IATContentType)

    view_class = accordion.Archetypes
    order = 200

    def title(self):
        return _('General information')


class AccordionFolder(AccordionBase):
    component.adapts(IFolderish)

    view_class = accordion.Folder
    order = 500

    def title(self):
        return _('Folder')


class AccordionSecurity(AccordionBase):
    component.adapts(IFolderish)

    view_class = accordion.Security
    order = 600

    def title(self):
        return _('Security')
