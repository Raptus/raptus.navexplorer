from setuptools import setup, find_packages
import os

version = '1.0'

setup(name='raptus.navexplorer',
      version=version,
      description='Provide a navigation to explore and manage plone content',
      long_description=open("README.txt").read() + "\n" +
                       open(os.path.join("docs", "HISTORY.txt")).read(),
      # Get more strings from
      # http://pypi.python.org/pypi?%3Aaction=list_classifiers
      classifiers=[
        "Framework :: Plone",
        "Framework :: Zope2",
        "Framework :: Zope3",
        "Programming Language :: Python",
        ],
      keywords='plone navigation manage explore',
      author='sriolo',
      author_email='sriolo@raptus.com',
      url='http://svn.plone.org/svn/collective/raptus.navexplorer',
      license='GPL',
      packages=find_packages(exclude=['ez_setup']),
      namespace_packages=['raptus'],
      include_package_data=True,
      zip_safe=False,
      install_requires=[
          'setuptools',
          'ordereddict'
          # -*- Extra requirements: -*-
      ],
      entry_points="""
      # -*- Entry points: -*-
      """,
      )
