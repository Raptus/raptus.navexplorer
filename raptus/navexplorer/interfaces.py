from zope.interface import Interface
from zope.interface import Attribute


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


class IAccordionItem(Interface):
    """ Render html to build the accordion below the jstree.
    """

    order = Attribute("int: order of the accordion item")
    permission = Attribute("string: permission needed to show this item")

    def __init__(self, context):
        """
        """

    def title(self):
        """ return the item title as string
        """

    def suffix(self):
        """ return title suffix as string or None
        """

    def content(self):
        """ return the content as html string
        """

    def available(self):
        """ return true or false if this item is available
        """
