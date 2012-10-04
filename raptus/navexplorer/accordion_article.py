from zope import component

from Products.ATContentTypes.interfaces.interfaces import IATContentType

from raptus.article.core.interfaces import IArticle

from raptus.navexplorer import _
from raptus.navexplorer.browser.accordion_article import Article, ArticleContent
from raptus.navexplorer.accordion import AccordionBase


class AccordionArticle(AccordionBase):
    component.adapts(IArticle)

    view_class = Article
    order = 300

    def title(self):
        return _('Article')


class AccordionArticleContent(AccordionArticle):
    component.adapts(IATContentType)

    view_class = ArticleContent
    order = 400

    def suffix(self):
        return _('Subcontent')

    def available(self):
        if IArticle.providedBy(self.context):
            return False
        try:
            self.context.Schema()['components']
        except:
            return False
        return True
