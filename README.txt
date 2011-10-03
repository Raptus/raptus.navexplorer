Introduction
============

This plone product is developed for support our customer and webmasters in
overlook, control and manipulating a plone site. All content of the plone site is represented as
a tree. The tree are strict separated in frames do not disrupt the main plone site. In addition
many information are displayed for each contenttype.

For manipulating a content, all regular actions are visible through a contextmenu available on
each treenode. With any few mouse click you can navigate miscellaneous views.

The tree supports drag and drop! This means, to move one or multiple contenttype to a other a 
simple mouse movement is sufficient.


User manual and feature
=======================

:Mouse click:           Show information about the selected content.

:Mouse double click:    Open content in the right frame

:Mouse right click:     Open contextmenu with additional actions.

:Arrow keys:            Navigation through the tree and open/close treenodes.

:Enter key:             Open content in the right frame.

:Drag and Drop:         Move one or more treenodes in a other.

:Multiselection:        keep the key 'shift' or 'alt' and press with the mouse all desired treenodes.



Developer Manual
================

contextmenu
-----------

The default contextmenu for archetypes are the full plone menu named "plone_contentmenu". For customizing
the contextmenu use a new Adapter implementing IContextMenu.


accordion
---------

Additional information of a contenttype are displayed in separated jqueryui accordion item. For more
information please read the interface description: IAccordionItem. 


logo change
-----------
use the settings in portal_propertis at raptus_navexplorer/additional_development_info


Future feature
==============
blup

Tests
=====
Currently, there are no automated tests (yet). This project was created on FireFox 5


Copyright and credits
=====================

raptus.navexplorer is copyright 2011 by samuel riolo and raptus ag, and is licensed under the GPL.
See LICENSE.txt for details.

.. _raptus: http://www.raptus.com/
