from Acquisition import aq_parent

from zope.component import queryAdapter

from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

from raptus.article.core.interfaces import IComponents
from raptus.navexplorer.browser.accordion import Base


class Article(Base):
    template = ViewPageTemplateFile('templates/accordion_article.pt')

    def __init__(self, context, request):
        super(Article, self).__init__(context, request)
        self.container = context

    def components(self):
        adapter = queryAdapter(self.context, IComponents)
        if adapter is None:
            return []
        return dict(adapter.activeComponents()).values()

    def selections(self):
        try:
            selections = self.context.Schema()['components'].get(self.context)
        except:
            selections = []
        adapter = queryAdapter(self.container, IComponents)
        if adapter is None:
            return []
        components = dict(adapter.getComponents())
        return [components[i] for i in selections]


class ArticleContent(Article):

    def components(self):
        return dict()

    def selections(self):
        self.container = aq_parent(self.context)
        return super(ArticleContent, self).selections()
