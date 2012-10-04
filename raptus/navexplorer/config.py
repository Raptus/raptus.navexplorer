"""Common configuration constants
"""
from AccessControl import ModuleSecurityInfo

PROJECTNAME = 'raptus.article.navexplorer'

security = ModuleSecurityInfo('raptus.article.navexplorer.config')

PERMISSIONS = dict()

PERMISSIONS['view'] = 'raptus.navexplorer: View'
PERMISSIONS['dnd'] = 'raptus.navexplorer: DND'
PERMISSIONS['accordion.default'] = 'raptus.navexplorer: Accordion Default'
