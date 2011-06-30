from zope.interface import Interface

class IContextMenu(Interface):
    """ Build data for the contextmenu displayed in jstree.
    """
    
    def __init__(self, context):
        """
        """
    
    def build(self):
        """ http://www.jstree.com/documentation/contextmenu
            return a dict for one object like this:
            
            
            dict( rename = dict(
                label = 'Rename'
                action = 'function (obj) { this.rename(obj); }',
                _disabled = true,
                _class = 'class',
                separator_before = true,
                separator_after = false,
                icon = 'path',
                submenu = dict() #Collection of objects (the same structure)
            ))

            Note:  the attribute action are called with javascript eval !!
        """