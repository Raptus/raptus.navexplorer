"""Common configuration constants
"""
from AccessControl import ModuleSecurityInfo
from Products.CMFCore.permissions import setDefaultRoles

PROJECTNAME = 'raptus.article.navexplorer'

security = ModuleSecurityInfo('raptus.article.navexplorer.config')
